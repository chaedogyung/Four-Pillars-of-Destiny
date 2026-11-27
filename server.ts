import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const KASI_BASE = 'https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService';

function createGeminiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseIntInRange(raw: unknown, min: number, max: number): number | null {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null;
  const val = Number.parseInt(raw, 10);
  if (Number.isNaN(val) || val < min || val > max) return null;
  return val;
}

function encodeKasiKey(rawKey: string): string {
  return rawKey.includes('%') ? rawKey : encodeURIComponent(rawKey);
}

function decodeXmlText(raw: string): string {
  const unwrapped = raw.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim();
  return unwrapped
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractXmlTag(xml: string, tagName: string): string | null {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i'));
  return match ? decodeXmlText(match[1]) : null;
}

function parseKasiXml(xml: string): Record<string, string>[] {
  const returnAuthMsg = extractXmlTag(xml, 'returnAuthMsg');
  if (returnAuthMsg) {
    if (returnAuthMsg.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
      throw new Error('등록되지 않은 KASI 인증키입니다. 공공데이터포털 인증키를 다시 확인해 주세요.');
    }
    if (returnAuthMsg.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR')) {
      throw new Error('KASI 일일 호출 한도를 초과했습니다.');
    }
    const errMsg = extractXmlTag(xml, 'errMsg');
    throw new Error(`KASI 인증/호출 오류: ${returnAuthMsg}${errMsg ? ` (${errMsg})` : ''}`);
  }

  const resultCode = extractXmlTag(xml, 'resultCode');
  const resultMsg = extractXmlTag(xml, 'resultMsg');
  if (resultCode && resultCode !== '00') {
    throw new Error(`KASI API 오류 (${resultCode}): ${resultMsg || '요청 실패'}`);
  }

  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi);
  if (!itemBlocks || itemBlocks.length === 0) return [];

  return itemBlocks.map((block) => {
    const record: Record<string, string> = {};
    const inner = block.replace(/^<item>/i, '').replace(/<\/item>$/i, '');
    const fieldRegex = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = fieldRegex.exec(inner)) !== null) {
      record[fieldMatch[1]] = decodeXmlText(fieldMatch[2]);
    }
    return record;
  });
}

interface KasiApiResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: unknown } };
  };
}

async function fetchKasiEndpoint(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url, {
    headers: { Accept: 'application/xml, text/xml, */*' },
  });
  const text = (await res.text()).trim();
  if (!res.ok) {
    throw new Error(`KASI 서버 응답 오류 (HTTP ${res.status})`);
  }

  // 공식 XML 포맷 우선 파싱
  if (text.startsWith('<')) {
    return parseKasiXml(text);
  }

  // JSON 응답일 경우 보조 파싱
  try {
    const json = JSON.parse(text) as KasiApiResponse;
    const header = json?.response?.header;
    if (header && header.resultCode && header.resultCode !== '00') {
      throw new Error(`KASI API 오류 (${header.resultCode}): ${header.resultMsg || '요청 실패'}`);
    }
    const rawItem = json?.response?.body?.items?.item;
    if (!rawItem) return [];
    const items = Array.isArray(rawItem) ? rawItem : [rawItem];
    return items as Record<string, string>[];
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('KASI')) {
      throw err;
    }
    throw new Error('KASI XML 응답을 해석하지 못했습니다. 인증키 또는 날짜 범위를 확인해 주세요.');
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const getServerKasiKey = () => (process.env.KASI_API_KEY || '').trim();

  // KASI 설정 여부 확인 (키 값은 절대 노출하지 않음)
  app.get('/api/kasi/status', (_req, res) => {
    res.json({ configured: Boolean(getServerKasiKey()) });
  });

  // KASI API Proxy 1: 양력 -> 음력 및 일진 조회 (XML 포맷)
  app.get('/api/kasi/lunar-from-solar', async (req, res) => {
    const rawKey = getServerKasiKey();
    if (!rawKey) {
      res.json({ item: null, configured: false });
      return;
    }
    const year = parseIntInRange(req.query.year, 1890, 2100);
    const month = parseIntInRange(req.query.month, 1, 12);
    const day = parseIntInRange(req.query.day, 1, 31);
    if (year === null || month === null || day === null) {
      res.status(400).json({ error: '유효한 연·월·일 값을 입력해 주세요.' });
      return;
    }

    try {
      const url = `${KASI_BASE}/getLunCalInfo?solYear=${year}&solMonth=${String(month).padStart(2, '0')}&solDay=${String(day).padStart(2, '0')}&serviceKey=${encodeKasiKey(rawKey)}`;
      const items = await fetchKasiEndpoint(url);
      res.json({ item: items[0] ?? null, configured: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'KASI 음력 조회에 실패했습니다.';
      res.status(502).json({ error: message, configured: true });
    }
  });

  // KASI API Proxy 2: 음력 -> 양력 변환 (XML 포맷)
  app.get('/api/kasi/solar-from-lunar', async (req, res) => {
    const rawKey = getServerKasiKey();
    if (!rawKey) {
      res.status(503).json({
        error:
          '서버에 KASI_API_KEY가 아직 설정되지 않았습니다. Settings > Secrets에 한국천문연구원 음양력 인증키를 등록하면 음력 변환이 자동 적용됩니다.',
      });
      return;
    }
    const year = parseIntInRange(req.query.year, 1890, 2100);
    const month = parseIntInRange(req.query.month, 1, 12);
    const day = parseIntInRange(req.query.day, 1, 30);
    const isLeap = req.query.isLeap === '1';

    if (year === null || month === null || day === null) {
      res.status(400).json({ error: '유효한 음력 연·월·일 값을 입력해 주세요.' });
      return;
    }

    try {
      const url = `${KASI_BASE}/getSolCalInfo?lunYear=${year}&lunMonth=${String(month).padStart(2, '0')}&lunDay=${String(day).padStart(2, '0')}&serviceKey=${encodeKasiKey(rawKey)}`;
      const items = await fetchKasiEndpoint(url);
      if (items.length === 0) {
        res.status(404).json({ error: '해당 음력 날짜가 존재하지 않습니다.' });
        return;
      }
      const targetFlag = isLeap ? '윤' : '평';
      const matched = items.find((it) => it.lunLeapmonth === targetFlag);
      if (!matched) {
        res.status(404).json({
          error: isLeap
            ? `${year}년 음력 ${month}월에는 윤달이 없습니다.`
            : '일치하는 음력 평달 정보를 찾지 못했습니다.',
        });
        return;
      }
      res.json({ item: matched, configured: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'KASI 음력 변환에 실패했습니다.';
      res.status(502).json({ error: message });
    }
  });

  // Gemini API Route: 정통 명리학 1:1 심층 풀이 & 12단계 종합 감명서 (SSE 스트리밍)
  app.post('/api/gemini-reading', async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: '서버에 GEMINI_API_KEY가 설정되어 있지 않습니다. Settings > Secrets에서 API 키를 확인해 주세요.',
      });
      return;
    }

    const body = req.body as {
      sajuData?: unknown;
      focusTopic?: unknown;
      customQuestion?: unknown;
      tone?: unknown;
      mode?: unknown;
    };
    if (!body || typeof body.sajuData !== 'object' || body.sajuData === null) {
      res.status(400).json({ error: '사주 원국 데이터가 필요합니다.' });
      return;
    }

    const mode: 'topic' | 'full12' | 'concern' =
      body.mode === 'full12'
        ? 'full12'
        : body.mode === 'concern'
          ? 'concern'
          : 'topic';
    const tone: 'realistic' | 'coaching' =
      body.tone === 'coaching' ? 'coaching' : 'realistic';

    const focusTopic =
      typeof body.focusTopic === 'string' && body.focusTopic.trim().length > 0
        ? body.focusTopic.trim().slice(0, 80)
        : mode === 'full12'
          ? '12단계 종합 감명서'
          : '종합 심층 풀이';
    const customQuestion =
      typeof body.customQuestion === 'string' ? body.customQuestion.trim().slice(0, 600) : '';

    const topicOutlines: Record<string, string[]> = {
      '종합 심층 풀이': [
        '## 1. 원국 판독 확정 정보 및 누락·불확실 구분',
        '## 2. 일간·월령·격국 및 신강·신약 핵심 구조',
        '## 3. 오행 과다·결핍과 용신·희신·기신·구신 활용법',
        '## 4. 인생에서 반복되는 핵심 테마 4가지와 치명적 약점',
        '## 5. 현재 대운·세운의 분기점과 당장 실행할 현실 전략',
      ],
      '직업·이직·사업': [
        '## 1. 타고난 직업 적성 — 조직형 vs 독립·프리랜서·사업형 진단',
        '## 2. 원국 격국·십성·신살이 가리키는 평생의 업(業)과 추천 분야',
        '## 3. 사람 상대 vs 결과물 중심 업무 스타일 및 상사·조직 갈등 패턴',
        '## 4. 커리어 도약기와 침체기·위험 시기 (대운·세운 연도·나이 병기)',
        '## 5. 이직·독립·다중 파이프라인(부업·사업) 실전 전략',
      ],
      '재물·부동산 전략': [
        '## 1. 돈을 버는 구조적 메커니즘과 재물 그릇의 크기',
        '## 2. 돈이 새는 치명적 이유와 반드시 피해야 할 금전 패턴 (동업·투자·계약)',
        '## 3. 직장·부수입·콘텐츠·사업·투자·부동산 중 최적 수익 채널',
        '## 4. 재물의 최대치가 커지는 전성기와 손재 주의 구간 (연도·나이 병기)',
        '## 5. 현금 잠금·문서화·부동산 취득 적기 등 현실 축재 전략',
      ],
      '연애운·이성 심리': [
        '## 1. 사랑을 시작하는 방식과 강하게 끌리는 이성 유형',
        '## 2. 연애에서 반복되는 실패 패턴과 심리 구조 (집착·자존심·권태·단절)',
        '## 3. 진짜 잘 맞는 사람 vs 절대 피해야 할 사람의 명확한 기준',
        '## 4. 연애운이 강하게 열리는 시기와 관계가 틀어지기 쉬운 위험 시기',
        '## 5. 단기 소모를 끊고 안정적인 관계로 이끌기 위한 현실 조언',
      ],
      '결혼·배우자·자녀운': [
        '## 1. 조혼 vs 만혼 진단 — 결혼 적령기와 배우자궁(일지) 구조 분석',
        '## 2. 결혼·동거가 성사되기 가장 유력한 대운·세운 연도 및 나이',
        '## 3. 배우자의 성향·생활력·배우자복과 결혼 후 반복될 갈등 포인트',
        '## 4. 이혼·별거 위험 시기와 이 사주에 가장 잘 맞는 결혼 형태 제안',
        '## 5. 자녀운(관성·식상·시주 기준)과 양육 스트레스 관리 전략',
      ],
      '건강·체질 관리': [
        '## 1. 오행 과다·결핍 및 합충으로 본 4대 취약 신체 계통',
        '## 2. 스트레스가 몸으로 발현되는 패턴 (소화·수면·염증·순환·신경계)',
        '## 3. 건강이 꺾이거나 사고·수술수가 발현되기 쉬운 단기(세운)·중장기(대운) 주의 시기',
        '## 4. 건강 악화 전조 증상과 정기 검진 집중 항목',
        '## 5. 이 명조의 수명과 컨디션을 지키는 필수 생존 습관 4가지',
      ],
      '인간관계·가족·귀인': [
        '## 1. 부모·형제와의 인연, 정서적 거리감 및 가족으로 인해 짊어지는 짐',
        '## 2. 사회 속 모습 vs 사적 내면 (외로움·고립·자존심·인정욕구 구조)',
        '## 3. 인간관계에서 반복되는 갈등·손절 패턴과 사람을 잘못 믿어 손해 보는 지점',
        '## 4. 평생 옆에 남는 귀인의 유형·띠(천을귀인 등)와 피해야 할 인맥',
        '## 5. 나를 지키면서 실속 있는 인연을 남기는 관계 운영 원칙',
      ],
      '대운·세운·향후 3년 전략': [
        '## 1. 현재 통과 중인 대운의 전체 색깔과 원국과의 핵심 상호작용',
        '## 2. 지난 흐름 복기 및 올해(당해연도) 세운·주요 월운 실제 발현 사건',
        '## 3. 내년(+1년) · 내후년(+2년) 세운별 기회와 위험 함정 (연도·나이 병기)',
        '## 4. 향후 대운 교체기 및 앞으로 가장 중요한 3개의 변곡점',
        '## 5. 연도별 핵심 의사결정(재물·직업·관계·건강) 액션 로드맵',
      ],
      '1:1 고민 맞춤 상담': [
        '## 1. 고민에 대한 명리학적 핵심 결론 (확신도 포함)',
        '## 2. 사주 원국(일간·격국·용희기구·합충·신살)으로 본 구조적 원인',
        '## 3. 현재 대운·세운·월운 상호작용으로 본 타이밍과 위험 구간 진단',
        '## 4. 지금 당장 실행할 현실적 대응 전략 3가지',
        '## 5. 반드시 피해야 할 선택과 손실을 막는 기준선',
      ],
    };

    const full12Outline = [
      '## 1. 만세력 판독 요약 (마크다운 확정 정보 요약표 + 누락·불확실 정보 구분)',
      '## 2. 원국 핵심 구조 (일간·월지·신강신약, 오행 과다/결핍, 격국·용희기구, 반복 테마 4가지, 감정·자존감·약점)',
      '## 3. 평생 총운 (어린 시절·10대·20대·30대·40대·50대·60대 이후 대운 연계 생애 궤적)',
      '## 4. 금전운 (돈 버는 구조, 새는 이유 3가지, 전성기·부동산·현실 축재 전략)',
      '## 5. 직업운 (조직 vs 독립, 평생의 업, 커리어 도약기와 침체기)',
      '## 6. 연애운 (사랑 방식·끌리는 유형, 반복 실패 패턴, 맞는/피해야 할 성향, 활성화 시기)',
      '## 7. 결혼운 (조혼 vs 만혼, 성사 유력 연도, 배우자 성향·결혼 형태·자녀운)',
      '## 8. 건강운 (오행 편중·결핍 4대 취약 계통, 단기·중장기 주의 시기, 생존 습관)',
      '## 9. 인간관계·가족운 (부모·형제 인연과 거리감, 갈등 구조, 귀인 유형·띠)',
      '## 10. 대운 상세 해석 (전 대운 순서별 핵심 키워드·돈·직업·관계·건강·주의 사건·레벨업)',
      '## 11. 세운 핵심 해석 (현재 대운 구간 핵심 연도별 원국·대운·세운 상호작용과 발현 사건)',
      '## 12. 현실 조언 및 총평 (당장 고쳐야 할 3가지, 핵심 강점 3가지, 분야별 생존 전략, 한 줄 정리, 3대 변곡점, 인생의 본질 총평)',
    ];

    const toneGuide =
      tone === 'realistic'
        ? [
            '- 어조(냉정·현실적 상담가 톤): 감성적 위로, 뜬구름 잡는 영적 수사, 아무에게나 적용되는 두루뭉술한 표현, 희망고문을 철저히 금지합니다.',
            '- 실제 유료 상담실에서 최상급 역술가가 의뢰인의 인생을 살리기 위해 직설적이고 냉정하게 짚어주듯, 듣기 좋은 말보다 사실과 위험 시기·치명적 함정을 우선 명확히 밝히세요.',
          ]
        : [
            '- 어조(부드러운 코칭 톤): 명리학적 근거와 위험·주의 시기는 냉정 톤과 동일하게 누락 없이 정확히 짚되, 따뜻하고 단정한 멘토링 어조로 의뢰인이 스스로 실행할 수 있는 현실적 해법과 균형 감각을 함께 안내하세요.',
          ];

    const corePrinciples = [
      '당신은 자평명리학(子平命理學), 격국·용신론, 조후론, 지장간·12운성·12신살·형충회합 해석에 정통한 최상급 명리 상담가입니다.',
      '[절대 준수 원칙]',
      '1. [절대 변경 금지: 확정 사주 원국·음양력 고정 팩트] 및 [계산된 사주 원국 정밀 JSON]에 기재된 양력/음력 날짜, 출생 시진, 사주 8글자(연주·월주·일주·시주), 십성, 지장간, 격국, 용희기구, 대운·세운·월운 간지를 단 한 글자도 바꾸거나 머릿속으로 재계산(자체 음양력 변환·만세력 암산 절대 금지)하지 말고 원문 그대로 인용하세요.',
      '2. dataQuality의 확정 정보와 누락·불확실 정보(예: 출생시간 미상 등)를 엄격히 구분하고, 핵심 소제목마다 (확신도: 높음/중간/낮음)을 표기하세요.',
      '3. 모든 명리 전문 용어(예: 관성, 재성, 식상, 비겁, 양인격, 군비쟁재, 식신생재, 통관, 도식, 공망, 진술충, 천충지충 등)가 처음 나올 때 반드시 "명리학 용어 설명 → 쉬운 말 해석(쉽게 말하면/현실적으로 말하면) → 실제 삶에서의 발현 방식(행동·사건·심리·관계)" 순서로 번역해 일반인도 단번에 이해하게 쓰세요.',
      '4. 대운·세운·월운은 단순히 "좋다/나쁘다"로 끝내지 말고, 반드시 연도와 세는나이를 함께 표기하며 실제로 어떤 사건·선택·결과로 발현되는지 구체적으로 설명하세요. 좋은 시기보다 위험 시기·함정 시기를 더 선명하게 경고하세요.',
      '5. 건강운은 의학적 진단처럼 단정하지 말고, 사주 오행 편중·결핍과 신살·충 구조상 반복되기 쉬운 취약 계통, 전조 패턴, 현실적 관리 습관 중심으로 서술하세요.',
      ...toneGuide,
    ];

    const selectedOutline =
      mode === 'full12'
        ? full12Outline
        : mode === 'concern'
          ? topicOutlines['1:1 고민 맞춤 상담']
          : topicOutlines[focusTopic] || topicOutlines['종합 심층 풀이'];

    const lengthInstruction =
      mode === 'full12'
        ? '단순 요약본으로 축약하지 말고 실제 유료 1:1 종합 사주 감명 보고서처럼 1~12단계 전 항목을 빠짐없이 깊이 있고 풍부하게(최소 6,000~9,000자 이상, 각 단계별 3~6문단 및 핵심 불릿 포함) 정교하게 작성하세요. 1단계에는 마크다운 표(| 구분 | 판독 내용 | 비고 및 근거 |)를 포함하세요.'
        : '요약 위주로 얕게 끝내지 말고 각 소제목마다 명리 근거와 실제 삶의 발현 사례를 3~4문단 이상으로 충실히 풀어 2,200~3,200자 내외로 밀도 높게 작성하세요.';

    const systemInstruction = [
      ...corePrinciples,
      '',
      '[출력 구성 및 분량 지시]',
      lengthInstruction,
      '반드시 아래 소제목(## 마크다운 헤딩) 구조를 정확히 따라 순서대로 작성하세요:',
      ...selectedOutline,
    ].join('\n');

    const sd = body.sajuData as {
      basic?: {
        name?: string;
        gender?: string;
        canonicalGanji?: string;
        sijin?: string;
        solarBirth?: string;
        trueSolarBirth?: string;
        correctionApplied?: string;
        lunarInfo?: string;
      };
      daewoon?: { currentDaewoon?: string | null };
      currentYearSewoon?: string | null;
    };
    const factLockLines = [
      '[절대 변경 금지: 확정 사주 원국·음양력 고정 팩트]',
      `- 성명/성별: ${sd.basic?.name || '의뢰인'} / ${sd.basic?.gender || ''}`,
      `- 확정 양력 출생: ${sd.basic?.solarBirth || ''} (보정 시각: ${sd.basic?.trueSolarBirth || ''}, ${sd.basic?.correctionApplied || ''})`,
      sd.basic?.lunarInfo ? `- 확정 음력(KASI): ${sd.basic.lunarInfo}` : '- 음력: KASI 미연동',
      `- 확정 출생 시진: ${sd.basic?.sijin || ''}`,
      `- 확정 사주 8글자(연·월·일·시): ${sd.basic?.canonicalGanji || ''}`,
      sd.daewoon?.currentDaewoon ? `- 현재 통과 대운: ${sd.daewoon.currentDaewoon}` : '',
      sd.currentYearSewoon ? `- 올해 세운: ${sd.currentYearSewoon}` : '',
    ].filter(Boolean);

    const userPrompt = [
      ...factLockLines,
      '',
      `[상담 모드]: ${mode === 'full12' ? '12단계 전체 종합 감명서' : mode === 'concern' ? '1:1 고민 맞춤 상담' : focusTopic}`,
      `[선택 어조]: ${tone === 'realistic' ? '냉정·현실적 상담가 톤' : '부드러운 코칭 톤'}`,
      customQuestion
        ? `[의뢰인 1:1 고민 질문]: ${customQuestion}\n(위 고민을 최우선 초점으로 삼아 원국 구조와 현재 대운·세운·월운 상호작용을 대조해 직설적이고 실행 가능한 결론을 내려 주세요.)`
        : mode === 'full12'
          ? '[요청]: 위 고정 팩트와 아래 정밀 사주 원국 JSON을 단 한 글자도 바꾸지 말고 그대로 인용하여, 1단계 만세력 판독 요약표부터 12단계 현실 조언 및 총평까지 전 생애 12단계 심층 감명 보고서를 생략 없이 완성해 주세요.'
          : `[요청]: 위 고정 팩트와 아래 사주 원국 JSON을 기반으로 '${focusTopic}' 영역을 명리학 근거 → 쉬운 말 풀이 → 실제 삶의 발현 사건과 연도·나이별 대응 전략까지 깊이 있게 분석해 주세요.`,
      '',
      '[계산된 사주 원국 정밀 JSON]',
      JSON.stringify(body.sajuData, null, 2),
    ].join('\n');

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    let clientClosed = false;
    req.on('close', () => {
      clientClosed = true;
    });

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const extractErrorText = (err: unknown): string => {
      if (err instanceof Error) return err.message;
      try {
        return JSON.stringify(err);
      } catch {
        return String(err);
      }
    };

    const isTransientBusyError = (raw: string): boolean => {
      const upper = raw.toUpperCase();
      return (
        upper.includes('503') ||
        upper.includes('UNAVAILABLE') ||
        upper.includes('SERVICE UNAVAILABLE') ||
        upper.includes('HIGH DEMAND') ||
        upper.includes('OVERLOADED') ||
        upper.includes('500') ||
        upper.includes('INTERNAL') ||
        upper.includes('ETIMEDOUT') ||
        upper.includes('ECONNRESET') ||
        upper.includes('FETCH FAILED')
      );
    };

    const formatFriendlyGeminiError = (raw: string): { message: string; retryable: boolean } => {
      const upper = raw.toUpperCase();
      if (upper.includes('API_KEY_INVALID') || upper.includes('403') || upper.includes('PERMISSION_DENIED')) {
        return {
          message: 'Gemini API 키가 유효하지 않거나 권한이 없습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.',
          retryable: false,
        };
      }
      if (upper.includes('429') || upper.includes('RESOURCE_EXHAUSTED')) {
        return {
          message: 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도하거나 Settings > Secrets에서 API 키 할당량을 확인해 주세요.',
          retryable: true,
        };
      }
      if (isTransientBusyError(raw)) {
        return {
          message: '현재 Gemini AI 서버에 일시적으로 요청이 몰려 기본·보조 모델 모두 응답이 지연되고 있습니다. 몇 초 뒤 아래 [다시 시도] 버튼을 눌러 주세요.',
          retryable: true,
        };
      }
      if (upper.includes('404') || upper.includes('NOT_FOUND')) {
        return {
          message: '요청한 AI 모델을 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.',
          retryable: false,
        };
      }
      return {
        message: 'AI 사주 풀이 생성 중 일시적인 통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        retryable: true,
      };
    };

    const modelPlan = [
      { model: 'gemini-4-hydrogen', label: 'Gemini 4 Flash', maxAttempts: 2, isFallback: false },
      { model: 'gemini-3.1-flash-lite', label: 'Gemini Flash-Lite (보조)', maxAttempts: 2, isFallback: true },
    ];

    const ai = createGeminiClient();
    let streamedAnyText = false;
    let lastErrorRaw = '';

    outer: for (let mIdx = 0; mIdx < modelPlan.length; mIdx++) {
      const entry = modelPlan[mIdx];

      if (entry.isFallback && !clientClosed) {
        res.write(
          `data: ${JSON.stringify({
            status: '주 모델 혼잡(503)이 지속되어 보조 Gemini 모델(Flash-Lite)로 자동 전환해 분석 중입니다...',
          })}\n\n`
        );
      }

      for (let attempt = 1; attempt <= entry.maxAttempts; attempt++) {
        if (clientClosed) break outer;
        try {
          const stream = await ai.models.generateContentStream({
            model: entry.model,
            contents: userPrompt,
            config: {
              systemInstruction,
            },
          });

          for await (const chunk of stream) {
            if (clientClosed) break outer;
            const text = chunk.text;
            if (text) {
              streamedAnyText = true;
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }

          if (!clientClosed) {
            res.write(
              `data: ${JSON.stringify({
                done: true,
                modelUsed: entry.label,
                fallbackUsed: entry.isFallback,
              })}\n\n`
            );
            res.end();
          }
          return;
        } catch (err) {
          lastErrorRaw = extractErrorText(err);
          const transient = isTransientBusyError(lastErrorRaw);

          // 이미 본문 스트리밍이 일부 전송된 뒤 끊겼다면 중복 출력을 막기 위해 중단
          if (streamedAnyText || !transient) {
            break outer;
          }

          if (attempt < entry.maxAttempts && !clientClosed) {
            const backoffMs = entry.isFallback ? 1500 : 1200 * attempt;
            res.write(
              `data: ${JSON.stringify({
                status: `${entry.label} 서버 일시 혼잡(503)으로 ${(backoffMs / 1000).toFixed(1)}초 후 자동 재시도합니다... (${attempt}/${entry.maxAttempts})`,
              })}\n\n`
            );
            await sleep(backoffMs);
          }
        }
      }
    }

    if (!clientClosed) {
      const formatted = formatFriendlyGeminiError(lastErrorRaw);
      res.write(
        `data: ${JSON.stringify({
          error: formatted.message,
          retryable: formatted.retryable,
        })}\n\n`
      );
      res.end();
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
