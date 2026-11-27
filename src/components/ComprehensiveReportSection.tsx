import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Code2,
  Send,
  MessageSquareText,
  Printer,
  Download,
  FileText,
  Square,
} from 'lucide-react';
import { BRANCHES, DAY_MASTER_PROFILES, ELEMENTS } from '../lib/sajuData';
import { buildSajuPromptPayload } from '../lib/sajuEngine';
import type { AiTone, SajuResult } from '../types/saju';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ComprehensiveReportSectionProps {
  data: SajuResult;
  aiSectionRef: RefObject<HTMLElement | null>;
}

type ReportTab =
  | 'personality'
  | 'career'
  | 'wealth'
  | 'relation'
  | 'health'
  | 'family'
  | 'remedy';

const REPORT_TABS: Array<{ id: ReportTab; label: string }> = [
  { id: 'personality', label: '기질·격국' },
  { id: 'career', label: '직업·적성' },
  { id: 'wealth', label: '재물·축재' },
  { id: 'relation', label: '연애·결혼' },
  { id: 'health', label: '건강·체질' },
  { id: 'family', label: '인간관계·가족' },
  { id: 'remedy', label: '오행 개운법' },
];

const AI_TOPICS = [
  {
    id: '종합 심층 풀이',
    label: '종합 심층 풀이',
    summary: '일간·월령·격국·용희기구·핵심 테마',
  },
  {
    id: '직업·이직·사업',
    label: '직업·이직·사업',
    summary: '조직 vs 독립 적성·이직 및 사업 타이밍',
  },
  {
    id: '재물·부동산 전략',
    label: '재물·부동산 전략',
    summary: '돈 버는 구조·손재 원인·현실 축재 전략',
  },
  {
    id: '연애운·이성 심리',
    label: '연애운·이성 심리',
    summary: '끌리는 유형·반복 패턴·관계 활성화 시기',
  },
  {
    id: '결혼·배우자·자녀운',
    label: '결혼·배우자·자녀운',
    summary: '조혼/만혼·배우자궁·유력 연도·자녀운',
  },
  {
    id: '건강·체질 관리',
    label: '건강·체질 관리',
    summary: '4대 취약 계통·주의 시기·생존 습관',
  },
  {
    id: '인간관계·가족·귀인',
    label: '인간관계·가족·귀인',
    summary: '부모·형제 거리감·갈등 구조·천을귀인',
  },
  {
    id: '대운·세운·향후 3년 전략',
    label: '대운·세운·향후 3년 전략',
    summary: '현재 대운·올해 월운·3년 연도별 로드맵',
  },
] as const;

type AiTopicId = (typeof AI_TOPICS)[number]['id'];

const SAMPLE_CONCERNS = [
  '올해 이직과 현재 직장 유지, 혹은 독립·부업 중 어떤 선택이 더 유리할까요?',
  '내 사주에서 돈이 새는 가장 큰 원인과 앞으로 부동산·자산 매수 적기는 언제인가요?',
  '결혼이나 진지한 인연이 열리는 핵심 연도와 절대 피해야 할 이성 성향은 무엇인가요?',
  '지금 대운과 향후 3년 사이 가장 조심해야 할 건강·계약·인간관계 함정은 무엇인가요?',
];

const CAREER_GUIDE: Record<'비겁' | '식상' | '재성' | '관성' | '인성', string> = {
  비겁: '독립적인 전문직, 프리랜서, 1인 창업, 기술·영업·현장 리더십처럼 자신의 이름을 걸고 주도권을 쥐는 구조에서 역량이 크게 발휘됩니다.',
  식상: '콘텐츠·미디어, IT·개발, 디자인, 마케팅, 강의·컨설팅, 연구개발 등 개인의 창의적 출력물과 전문 기술로 부가가치를 만드는 직군이 잘 맞습니다.',
  재성: '금융, 회계, 무역, 부동산, 유통, 경영·실무 관리 등 결과와 현금흐름이 숫자로 직결되는 실용적 분야에서 성과를 내기 유리합니다.',
  관성: '공직, 대기업, 법조·행정, 품질·보안 관리, 전문 조직 컨설팅 등 명확한 체계와 직위·신뢰가 쌓이는 환경이 안정적입니다.',
  인성: '연구·학계, 교육, 의료·바이오, 심리·상담, 기획·전략, 자격 기반 전문직 등 축적된 지식과 분석력을 활용하는 영역에서 깊이를 발휘합니다.',
};

interface ConcernAnswer {
  id: string;
  question: string;
  tone: AiTone;
  answer: string;
  isStreaming: boolean;
  statusText: string | null;
  fallbackUsed: boolean;
  error: string | null;
}

interface HealthRiskItem {
  title: string;
  basis: string;
  detail: string;
}

interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onStatus?: (status: string) => void;
  onDone?: (meta: { modelUsed?: string; fallbackUsed?: boolean }) => void;
}

async function streamGeminiReading(
  body: {
    sajuData: unknown;
    focusTopic: string;
    customQuestion?: string;
    tone: AiTone;
    mode: 'topic' | 'full12' | 'concern';
  },
  signal: AbortSignal,
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await fetch('/api/gemini-reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || `AI 풀이 요청 실패 (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('스트림 응답을 읽을 수 없습니다.');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith('data:')) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      const parsed = JSON.parse(jsonStr) as {
        status?: string;
        text?: string;
        done?: boolean;
        modelUsed?: string;
        fallbackUsed?: boolean;
        error?: string;
      };
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      if (parsed.status) {
        callbacks.onStatus?.(parsed.status);
      }
      if (parsed.text) {
        callbacks.onChunk(parsed.text);
      }
      if (parsed.done) {
        callbacks.onDone?.({
          modelUsed: parsed.modelUsed,
          fallbackUsed: parsed.fallbackUsed,
        });
      }
    }
  }
}

export function ComprehensiveReportSection({
  data,
  aiSectionRef,
}: ComprehensiveReportSectionProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('personality');

  // AI 상담 어조 (냉정·현실적 상담 기본 + 부드러운 코칭 토글)
  const [aiTone, setAiTone] = useState<AiTone>('realistic');

  // 12단계 전체 종합 감명서 상태 (톤별 캐싱)
  const [full12Cache, setFull12Cache] = useState<Partial<Record<AiTone, string>>>({});
  const [full12FallbackMap, setFull12FallbackMap] = useState<Partial<Record<AiTone, boolean>>>({});
  const [isFull12Streaming, setIsFull12Streaming] = useState(false);
  const [full12Status, setFull12Status] = useState<string | null>(null);
  const [full12Error, setFull12Error] = useState<string | null>(null);
  const [full12Open, setFull12Open] = useState(false);

  // 주제별 AI 심층 풀이 상태 (`${topicId}::${tone}` 캐싱)
  const [activeAiTopic, setActiveAiTopic] = useState<AiTopicId>('종합 심층 풀이');
  const [topicCache, setTopicCache] = useState<Record<string, string>>({});
  const [topicFallbackMap, setTopicFallbackMap] = useState<Record<string, boolean>>({});
  const [streamingTopicKey, setStreamingTopicKey] = useState<string | null>(null);
  const [topicStatus, setTopicStatus] = useState<string | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1:1 사용자 고민 자동 분석 상태
  const [customQuestion, setCustomQuestion] = useState('');
  const [concernHistory, setConcernHistory] = useState<ConcernAnswer[]>([]);

  const full12AbortRef = useRef<AbortController | null>(null);
  const topicAbortRef = useRef<AbortController | null>(null);
  const concernAbortRef = useRef<AbortController | null>(null);

  const hourP = data.pillars[0];
  const dayP = data.pillars[1];
  const monthP = data.pillars[2];
  const yearP = data.pillars[3];
  const profile = DAY_MASTER_PROFILES[dayP.stem ?? 0];

  const topGroup = useMemo(() => {
    const sorted = Object.entries(data.tenGodGroups).sort((a, b) => b[1] - a[1]);
    return (sorted[0]?.[0] ?? '비겁') as keyof typeof CAREER_GUIDE;
  }, [data.tenGodGroups]);

  const missingEls = ELEMENTS.filter((e) => data.elCount[e.idx] === 0);
  const excessEls = ELEMENTS.filter((e) => data.elCount[e.idx] >= 3);
  const payloadJson = useMemo(() => buildSajuPromptPayload(data), [data]);

  // 배우자궁(일지) 관여 형충회합 추출
  const dayBranchRelations = useMemo(
    () => data.relations.filter((r) => r.title.includes('일지')),
    [data.relations]
  );

  // 오행 편중·결핍 및 신살 기반 건강 취약 계통 동적 산출
  const healthRisks = useMemo<HealthRiskItem[]>(() => {
    const items: HealthRiskItem[] = [];
    const [wood, fire, earth, metal, water] = data.elCount;

    if (wood >= 3 && earth >= 2) {
      items.push({
        title: '소화기·위장 및 근골격 긴장 (목극토 구조)',
        basis: `목(木) ${wood} · 토(土) ${earth}`,
        detail:
          '강한 목 기운이 토(위장·비장)를 압박하는 구도여서 스트레스가 쌓이면 역류성 식도염, 위염, 소화불량이나 어깨·허리 근육 뭉침으로 나타나기 쉽습니다.',
      });
    } else if (wood >= 3 || wood === 0) {
      items.push({
        title: '간·담 피로 및 신경·근육 계통',
        basis: wood === 0 ? '목(木) 결핍' : `목(木) 과다 (${wood})`,
        detail:
          wood === 0
            ? '목 기운이 부족해 근력 저하, 안구 피로, 회복 탄력성 저하가 누적되기 쉬우므로 꾸준한 스트레칭과 아침 활동이 중요합니다.'
            : '목 기운이 과왕해 과로 시 간 피로, 두통, 신경 예민, 근육 긴장으로 이어지기 쉬워 충분한 휴식 루틴이 필요합니다.',
      });
    }

    if (water === 0) {
      items.push({
        title: '수면·자율신경 및 신장·방광·수분 대사 (무수 체질)',
        basis: '수(水) 0 (결핍)',
        detail:
          '열기를 식혀 주는 수 기운이 표면에 드러나지 않아 불면·얕은 수면, 만성 탈수, 신장·비뇨기·허리 하부 피로, 체내 염증성 반응이 누적되기 쉽습니다.',
      });
    } else if (water >= 3) {
      items.push({
        title: '냉증·부종 및 순환 저하 (수 과다)',
        basis: `수(水) 과다 (${water})`,
        detail:
          '체내 냉습이 쌓이기 쉬워 수족냉증, 하체 부종, 관절 시림, 대사 저하 관리가 핵심입니다.',
      });
    }

    if (metal === 0) {
      items.push({
        title: '호흡기·기관지·피부 및 대장 계통 (무금 체질)',
        basis: '금(金) 0 (결핍)',
        detail:
          '금 기운이 부족해 환절기 비염·기관지 예민, 피부 건조·트러블, 장 기능 변동에 취약할 수 있어 실내 습도와 호흡기 관리가 필요합니다.',
      });
    } else if (metal >= 3) {
      items.push({
        title: '호흡기 건조·치아·골격 긴장 (금 과다)',
        basis: `금(金) 과다 (${metal})`,
        detail:
          '금 기운이 강해 과긴장 시 턱·치아·관절 부담이나 호흡기 건조 증상이 동반되기 쉽습니다.',
      });
    }

    if (fire === 0) {
      items.push({
        title: '혈액순환·심혈관 활력 저하 (무화 체질)',
        basis: '화(火) 0 (결핍)',
        detail:
          '체온과 대사를 끌어올리는 화 기운이 부족해 만성 피로, 저혈압·냉증, 의욕 저하에 유의하며 유산소 운동과 햇볕 노출을 늘려야 합니다.',
      });
    } else if (fire >= 3 || (fire >= 1 && earth >= 3 && water === 0)) {
      items.push({
        title: '심혈관·혈압·염증 및 열감 관리 (화토 조열)',
        basis: `화(火) ${fire} · 토(土) ${earth} · 수(水) ${water}`,
        detail:
          '조열한 기운이 몰리면 혈압 상승, 구내염·피부 염증, 과열 스트레스 반응이 잦아지므로 수분 섭취와 과음·야식 절제가 필수입니다.',
      });
    }

    const sharpStars = data.sinsal.filter((s) =>
      ['백호대살', '양인살', '괴강살', '현침살'].includes(s.name)
    );
    if (sharpStars.length > 0) {
      items.push({
        title: '돌발 외상·수술·과로 번아웃 주의',
        basis: sharpStars.map((s) => s.name).join(' · '),
        detail:
          '예리하고 폭발적인 기운의 신살이 작용하므로 컨디션이 떨어지는 시기나 충(沖)·형(刑)이 겹치는 해에는 무리한 운동, 야간 운전, 과로로 인한 돌발 사고와 시술·수술 변수를 특히 조심해야 합니다.',
      });
    }

    if (items.length === 0) {
      items.push({
        title: '전반적 오행 균형 체질 — 과로·생활 리듬 관리 중심',
        basis: '오행 편중·결핍 적음',
        detail:
          '특정 오행의 극단적 쏠림은 적으나, 기신(忌神) 오행이 강하게 들어오는 대운·세운에는 수면 부족과 스트레스 누적 관리가 중요합니다.',
      });
    }

    return items.slice(0, 4);
  }, [data.elCount, data.sinsal]);

  // 명식이 변경되면 캐시와 진행 중 스트림 초기화
  useEffect(() => {
    full12AbortRef.current?.abort();
    topicAbortRef.current?.abort();
    concernAbortRef.current?.abort();
    setFull12Cache({});
    setFull12FallbackMap({});
    setIsFull12Streaming(false);
    setFull12Status(null);
    setFull12Error(null);
    setTopicCache({});
    setTopicFallbackMap({});
    setStreamingTopicKey(null);
    setTopicStatus(null);
    setTopicError(null);
    setConcernHistory([]);
  }, [data]);

  useEffect(() => {
    return () => {
      full12AbortRef.current?.abort();
      topicAbortRef.current?.abort();
      concernAbortRef.current?.abort();
    };
  }, []);

  const runFull12Report = async (forceRefresh = false) => {
    setFull12Open(true);
    setFull12Error(null);
    setFull12Status(null);

    if (!forceRefresh && full12Cache[aiTone] && !isFull12Streaming) {
      return;
    }

    full12AbortRef.current?.abort();
    const controller = new AbortController();
    full12AbortRef.current = controller;

    const targetTone = aiTone;
    setIsFull12Streaming(true);
    setFull12Cache((prev) => ({ ...prev, [targetTone]: '' }));
    setFull12FallbackMap((prev) => ({ ...prev, [targetTone]: false }));

    try {
      await streamGeminiReading(
        {
          sajuData: payloadJson,
          focusTopic: '12단계 종합 감명서',
          tone: targetTone,
          mode: 'full12',
        },
        controller.signal,
        {
          onStatus: (status) => setFull12Status(status),
          onChunk: (chunk) => {
            setFull12Status(null);
            setFull12Cache((prev) => ({
              ...prev,
              [targetTone]: (prev[targetTone] || '') + chunk,
            }));
          },
          onDone: (meta) => {
            if (meta.fallbackUsed) {
              setFull12FallbackMap((prev) => ({ ...prev, [targetTone]: true }));
            }
          },
        }
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setFull12Error(
        err instanceof Error ? err.message : '12단계 종합 감명서를 생성하지 못했습니다.'
      );
    } finally {
      if (full12AbortRef.current === controller) {
        setIsFull12Streaming(false);
        setFull12Status(null);
      }
    }
  };

  const stopFull12Report = () => {
    full12AbortRef.current?.abort();
    setIsFull12Streaming(false);
    setFull12Status(null);
  };

  const runTopicAnalysis = async (
    topicId: AiTopicId,
    forceRefresh = false,
    toneOverride?: AiTone
  ) => {
    const targetTone = toneOverride ?? aiTone;
    const cacheKey = `${topicId}::${targetTone}`;
    setActiveAiTopic(topicId);
    setTopicError(null);
    setTopicStatus(null);

    if (!forceRefresh && topicCache[cacheKey] && streamingTopicKey !== cacheKey) {
      return;
    }

    topicAbortRef.current?.abort();
    const controller = new AbortController();
    topicAbortRef.current = controller;

    setStreamingTopicKey(cacheKey);
    setTopicCache((prev) => ({ ...prev, [cacheKey]: '' }));
    setTopicFallbackMap((prev) => ({ ...prev, [cacheKey]: false }));

    try {
      await streamGeminiReading(
        {
          sajuData: payloadJson,
          focusTopic: topicId,
          tone: targetTone,
          mode: 'topic',
        },
        controller.signal,
        {
          onStatus: (status) => setTopicStatus(status),
          onChunk: (chunk) => {
            setTopicStatus(null);
            setTopicCache((prev) => ({
              ...prev,
              [cacheKey]: (prev[cacheKey] || '') + chunk,
            }));
          },
          onDone: (meta) => {
            if (meta.fallbackUsed) {
              setTopicFallbackMap((prev) => ({ ...prev, [cacheKey]: true }));
            }
          },
        }
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setTopicError(
        err instanceof Error ? err.message : 'AI 맞춤 사주 풀이를 생성하지 못했습니다.'
      );
    } finally {
      if (topicAbortRef.current === controller) {
        setStreamingTopicKey(null);
        setTopicStatus(null);
      }
    }
  };

  const runConcernAnalysis = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;

    concernAbortRef.current?.abort();
    const controller = new AbortController();
    concernAbortRef.current = controller;

    const targetTone = aiTone;
    const entryId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomQuestion('');
    setConcernHistory((prev) => [
      {
        id: entryId,
        question: trimmed,
        tone: targetTone,
        answer: '',
        isStreaming: true,
        statusText: null,
        fallbackUsed: false,
        error: null,
      },
      ...prev,
    ]);

    try {
      await streamGeminiReading(
        {
          sajuData: payloadJson,
          focusTopic: '1:1 고민 맞춤 상담',
          customQuestion: trimmed,
          tone: targetTone,
          mode: 'concern',
        },
        controller.signal,
        {
          onStatus: (status) => {
            setConcernHistory((prev) =>
              prev.map((item) =>
                item.id === entryId ? { ...item, statusText: status } : item
              )
            );
          },
          onChunk: (chunk) => {
            setConcernHistory((prev) =>
              prev.map((item) =>
                item.id === entryId
                  ? { ...item, statusText: null, answer: item.answer + chunk }
                  : item
              )
            );
          },
          onDone: (meta) => {
            if (meta.fallbackUsed) {
              setConcernHistory((prev) =>
                prev.map((item) =>
                  item.id === entryId ? { ...item, fallbackUsed: true } : item
                )
              );
            }
          },
        }
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg =
        err instanceof Error ? err.message : '고민 분석 중 오류가 발생했습니다.';
      setConcernHistory((prev) =>
        prev.map((item) =>
          item.id === entryId
            ? { ...item, error: msg, statusText: null, isStreaming: false }
            : item
        )
      );
    } finally {
      setConcernHistory((prev) =>
        prev.map((item) =>
          item.id === entryId ? { ...item, statusText: null, isStreaming: false } : item
        )
      );
    }
  };

  const handleConcernSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runConcernAnalysis(customQuestion);
  };

  const handleCopyText = async (key: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard API unavailable in restricted iframe
    }
  };

  const handleDownloadMarkdown = (filenamePrefix: string, content: string) => {
    if (!content) return;
    const header = [
      `# ${data.input.name} 사주팔자 정밀 감명서`,
      `- 출생: ${data.input.solarDateStr} ${data.input.unknownTime ? '(시간 미상)' : data.input.timeStr} · ${payloadJson.basic.sijin} (${data.input.gender === 'M' ? '남성' : '여성'})`,
      payloadJson.basic.lunarInfo ? `- 음력(KASI): ${payloadJson.basic.lunarInfo}` : '',
      `- 확정 사주 8글자: ${payloadJson.basic.canonicalGanji}`,
      `- 격국: ${data.geokguk.name}(${data.geokguk.hanja}) · 강약: ${data.strengthLabel}`,
      `- 상담 어조: ${aiTone === 'realistic' ? '냉정·현실적 상담' : '부드러운 코칭'}`,
      '',
      '---',
      '',
    ]
      .filter((line, idx) => idx >= 5 || line !== '')
      .join('\n');
    const blob = new Blob([header + content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.input.name}_${filenamePrefix}_${data.input.solarDateStr}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const monthTG = monthP.branchTenGod || '';
  const dayBranchTG = dayP.branchTenGod || '';
  const activeTopicCacheKey = `${activeAiTopic}::${aiTone}`;
  const activeTopicText = topicCache[activeTopicCacheKey] || '';
  const isTopicStreaming = streamingTopicKey === activeTopicCacheKey;
  const full12Text = full12Cache[aiTone] || '';
  const isConcernStreaming = concernHistory.some((c) => c.isStreaming);

  const spouseStarLabel = data.input.gender === 'M' ? '재성(정재·편재)' : '관성(정관·편관)';
  const spouseStarCount =
    data.input.gender === 'M' ? data.tenGodGroups.재성 : data.tenGodGroups.관성;
  const cheoneulAnimals = data.cheoneulBranches
    .map((b) => `${BRANCHES[b].kor}(${BRANCHES[b].hanja}·${BRANCHES[b].animal}띠)`)
    .join(', ');

  return (
    <div id="report" className="scroll-mt-20 space-y-6">
      {/* 7탭 정통 명리 종합 해석 리포트 */}
      <section className="rounded-xl border border-hanji-border bg-hanji-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-hanji-border">
          <div>
            <p className="text-xs font-medium text-ink-muted">
              05. 정통 명리 종합 해석 리포트
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold text-ink">
              원국 구조별 7대 영역 핵심 감명
            </h2>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="no-print inline-flex items-center gap-1.5 rounded-lg border border-hanji-border bg-hanji px-3 py-1.5 text-xs font-semibold text-ink hover:border-bronze transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-bronze-dark" aria-hidden="true" />
            인쇄 / PDF 저장
          </button>
        </div>

        {/* 7탭 네비게이션 */}
        <div
          role="tablist"
          aria-label="종합 해석 항목"
          className="no-print mt-5 flex flex-wrap gap-1.5 border-b border-hanji-border pb-3"
        >
          {REPORT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === t.id
                  ? 'bg-ink text-hanji-surface'
                  : 'bg-hanji text-ink-muted hover:text-ink hover:bg-hanji-subtle'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 탭 패널 본문 */}
        <div className="mt-5 max-w-prose space-y-5 text-sm sm:text-[15px] leading-[1.8] text-ink/90">
          {activeTab === 'personality' && (
            <>
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  1. 일간(본원) 타고난 기질 — {profile.title}
                </h3>
                <p className="mt-1 text-xs font-serif text-bronze-dark">
                  물상: {profile.metaphor}
                </p>
                <p className="mt-2">{profile.core}</p>
                <p className="mt-2 text-ink-muted">
                  <strong className="text-ink">명리 조언:</strong> {profile.advice}
                </p>
              </div>

              <div className="pt-4 border-t border-hanji-border/70">
                <h3 className="font-serif text-base font-bold text-ink">
                  2. 격국({data.geokguk.name} · {data.geokguk.hanja}) 및 월지 사회적 성향
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  판별 근거: {data.geokguk.basis} · 월지 {monthP.branchObj?.kor}
                  {monthP.branchObj?.hanja}({monthTG}) · {data.strengthLabel}
                </p>
                <p className="mt-2">{data.geokguk.summary}</p>
                <p className="mt-2">
                  사회생활의 중심 무대인 월지에 <strong>{monthTG}</strong>이 자리하여{' '}
                  {monthTG.includes('관')
                    ? '책임감, 원칙, 조직 내 신뢰와 명예를 중시하는 반듯한 모습으로 드러납니다.'
                    : monthTG.includes('재')
                      ? '현실 감각, 결과 중심의 효율성과 실속 있는 자산 관리 능력으로 발현됩니다.'
                      : monthTG.includes('식') || monthTG.includes('상')
                        ? '창의적 표현, 기획력, 자유로운 전문성 발휘로 존재감을 키웁니다.'
                        : monthTG.includes('인')
                          ? '깊은 학습력, 기획·연구, 체계적 사고와 안정 추구로 힘을 발휘합니다.'
                          : '강한 독립심, 주체성, 남에게 쉽게 굽히지 않는 추진력으로 나타납니다.'}
                </p>
              </div>

              {data.structureDiagnostics.length > 0 && (
                <div className="pt-4 border-t border-hanji-border/70">
                  <h3 className="font-serif text-base font-bold text-ink">
                    3. 원국 핵심 구조 패턴 요약
                  </h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {data.structureDiagnostics.slice(0, 4).map((diag) => (
                      <li key={diag.id}>
                        <strong
                          className={
                            diag.tone === 'warn'
                              ? 'text-fire-fg'
                              : diag.tone === 'good'
                                ? 'text-wood-fg'
                                : 'text-ink'
                          }
                        >
                          {diag.title}
                          {diag.hanja ? `(${diag.hanja})` : ''}:
                        </strong>{' '}
                        <span className="text-ink-muted">{diag.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {activeTab === 'career' && (
            <>
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  1. 핵심 십성 적성 — {topGroup} 중심형
                </h3>
                <p className="mt-2">{CAREER_GUIDE[topGroup]}</p>
              </div>

              <div className="pt-4 border-t border-hanji-border/70">
                <h3 className="font-serif text-base font-bold text-ink">
                  2. 조직형 vs 독립·전문직·사업형 구조 판별
                </h3>
                <p className="mt-2">
                  원국 내 관성(조직·직위)은{' '}
                  <strong className="font-mono tabular-nums">{data.tenGodGroups.관성}개</strong>,
                  비겁(독립·주체성)은{' '}
                  <strong className="font-mono tabular-nums">{data.tenGodGroups.비겁}개</strong>,
                  식상(기술·콘텐츠)은{' '}
                  <strong className="font-mono tabular-nums">{data.tenGodGroups.식상}개</strong>
                  입니다.{' '}
                  {data.tenGodGroups.관성 === 0
                    ? '표면 무관(無官) 구조로 수직적 위계나 경직된 조직 통제에서 피로감이 큽니다. 조직 내에서도 재량권이 큰 프로젝트형·전문직 포지션이 맞으며, 장기적으로는 개인 브랜드·프리랜서·독립 사업 파이프라인을 구축할수록 잠재력이 열립니다.'
                    : data.tenGodGroups.관성 >= 2 && data.tenGodGroups.인성 >= 1
                      ? '관인상생(官印相生) 기반이 살아 있어 대기업·공공기관·체계적 전문 조직에서 승진과 직위로 신뢰를 쌓는 경로가 매우 안정적입니다.'
                      : data.tenGodGroups.비겁 >= 3
                        ? '비겁의 독립성이 강해 누군가의 지시를 단순 수행하는 일보다 본인의 기술·실적·결정권이 직접 반영되는 전문직·영업·개인 사업에서 성과가 커집니다.'
                        : '조직의 자원과 시스템을 발판으로 전문성을 축적한 뒤, 경력 중반 이후 주도적 포지션으로 확장하는 하이브리드 전략이 적합합니다.'}
                </p>
              </div>
            </>
          )}

          {activeTab === 'wealth' && (
            <>
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  1. 돈을 버는 구조와 재물 그릇
                </h3>
                <p className="mt-2">
                  원국 내 재성은{' '}
                  <strong className="font-mono tabular-nums">{data.tenGodGroups.재성}개</strong>,
                  식상은{' '}
                  <strong className="font-mono tabular-nums">{data.tenGodGroups.식상}개</strong>이며{' '}
                  <strong>{data.strengthLabel}</strong> 구조입니다.{' '}
                  {data.tenGodGroups.식상 >= 1 && data.tenGodGroups.재성 >= 1
                    ? '식신·상관이 재성을 생하는 식상생재(食傷生財) 흐름이 형성되어 있어, 단순 저축보다 전문 기술·콘텐츠·실행력을 수익으로 연결할 때 재물 그릇이 커집니다.'
                    : data.tenGodGroups.재성 >= 2
                      ? '재성의 비중이 뚜렷해 현실적 수익 감각과 자산 관리 의지가 강합니다. 신강하면 확장 투자가 유리하고, 신약하면 안정적 현금흐름과 전문 자격 확보가 우선입니다.'
                      : '원국 표면의 재성이 두드러지지 않으므로 투기적 일확천금보다 전문 경력·자격·고정 소득 기반을 단단히 다지고 운에서 재성이 올 때 실물 자산으로 전환하는 전략이 맞습니다.'}
                </p>
              </div>

              <div className="pt-4 border-t border-hanji-border/70">
                <h3 className="font-serif text-base font-bold text-ink">
                  2. 돈이 새는 리스크와 현실 축재 전략
                </h3>
                <p className="mt-2">
                  {data.tenGodGroups.비겁 >= 3 && data.tenGodGroups.재성 >= 1
                    ? '비겁이 재성을 나누어 갖는 군비쟁재(群比爭財) 리스크가 있으므로 지인 동업, 보증, 충동적 투자, 체면성 지출을 철저히 차단해야 합니다. 현금은 유동 계좌에 두기보다 부동산·적립식 장기 자산·분리 계좌로 잠가 두는 전략이 효과적입니다.'
                    : data.relations.some((r) => r.category === '지지충' || r.category === '형')
                      ? '원국 내 충·형 작용으로 예상치 못한 지출이나 계약 변동이 생길 수 있습니다. 큰 금전 거래와 투자 결정은 반드시 서류·계약 조건을 이중 점검하고 비상 현금 비중을 유지하세요.'
                      : '급격한 손재 위험은 비교적 적으나, 기신(忌神) 오행이 강해지는 세운에는 무리한 레버리지를 피하고 본업 현금흐름과 안전 자산 비중을 지키는 것이 핵심입니다.'}
                </p>
              </div>
            </>
          )}

          {activeTab === 'relation' && (
            <>
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  1. 일지(배우자궁 · {dayP.branchObj?.kor}
                  {dayP.branchObj?.hanja} / {dayBranchTG})와 배우자성 구조
                </h3>
                <p className="mt-2">
                  배우자궁에 <strong>{dayBranchTG}</strong>이 자리하여 가까운 인연에서는{' '}
                  {dayBranchTG.includes('비') || dayBranchTG.includes('겁')
                    ? '친구처럼 대등하고 솔직한 파트너십을 선호하지만, 자존심 대립이 생기면 관계가 급격히 경직될 수 있습니다.'
                    : dayBranchTG.includes('식') || dayBranchTG.includes('상')
                      ? '표현력이 풍부하고 상대를 살뜰히 챙기는 편이나, 기대가 어긋날 때 말로 상처를 주거나 과한 헌신으로 지치지 않도록 경계해야 합니다.'
                      : dayBranchTG.includes('재')
                        ? '현실 감각과 생활력을 갖춘 파트너를 선호하며, 함께 안정적인 생활 기반을 꾸릴 때 관계 만족도가 높아집니다.'
                        : dayBranchTG.includes('관')
                          ? '신뢰와 예의를 중시하고 든든하게 의지할 수 있는 반듯한 인연을 지향합니다.'
                          : '정서적 교감과 깊은 이해심을 중시하며 편안한 안식처 같은 관계를 원합니다.'}
                </p>
                <p className="mt-2 text-ink-muted">
                  {data.input.gender === 'M' ? '남명' : '여명'} 기준 배우자성인{' '}
                  <strong className="text-ink">{spouseStarLabel}</strong>은 원국에{' '}
                  <strong className="font-mono tabular-nums text-ink">{spouseStarCount}개</strong>
                  입니다.{' '}
                  {spouseStarCount === 0
                    ? '배우자성이 표면에 드러나지 않아 인연의 문이 자연스럽게 열리기까지 시간이 걸리거나 만혼 경향이 나타나기 쉬우며, 대운·세운에서 배우자성이 들어올 때 성사력이 커집니다.'
                    : spouseStarCount >= 3
                      ? '배우자성이 강하고 혼잡해 이성 인연의 기회는 많으나, 선택 기준이 흔들리거나 감정 소모가 반복되지 않도록 명확한 기준을 세우는 것이 중요합니다.'
                      : '배우자성의 균형이 잡혀 있어 서로의 생활 리듬과 가치관이 맞는 인연을 만나면 안정적인 결실로 이어지기 유리합니다.'}
                </p>
              </div>

              <div className="pt-4 border-t border-hanji-border/70">
                <h3 className="font-serif text-base font-bold text-ink">
                  2. 배우자궁 합·충 동요 및 결혼 안정 포인트
                </h3>
                <p className="mt-2">
                  {dayBranchRelations.length > 0 ? (
                    <>
                      일지(배우자궁)가 원국 내에서{' '}
                      <strong>
                        {dayBranchRelations.map((r) => `${r.category}(${r.title})`).join(', ')}
                      </strong>{' '}
                      작용을 받고 있습니다. 충·형·해·원진이 걸린 경우 조혼보다는 서로의 독립 공간과
                      경제 원칙이 정리된 성숙한 시기의 결혼(만혼)이나 주말부부·개인 공간 존중형
                      결혼 형태가 관계의 피로도를 크게 줄여 줍니다.
                    </>
                  ) : (
                    '일지(배우자궁)가 원국 내에서 큰 충·형 없이 안정적으로 자리 잡고 있습니다. 대운이나 세운에서 일지를 충하는 해에만 감정적 결정을 미루고 대화를 유지하면 안정적인 가정을 꾸리기 좋습니다.'
                  )}
                </p>
              </div>
            </>
          )}

          {activeTab === 'health' && (
            <>
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  1. 오행 편중·결핍 및 신살 기준 취약 신체 계통
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  과다 오행:{' '}
                  {excessEls.length > 0
                    ? excessEls.map((e) => `${e.kor}(${e.hanja})`).join(' · ')
                    : '없음'}{' '}
                  · 결핍 오행:{' '}
                  {missingEls.length > 0
                    ? missingEls.map((e) => `${e.kor}(${e.hanja})`).join(' · ')
                    : '없음'}
                </p>

                <div className="mt-3 divide-y divide-hanji-border/70">
                  {healthRisks.map((risk, idx) => (
                    <div key={idx} className="py-3 first:pt-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong className="font-serif text-ink">{risk.title}</strong>
                        <span className="font-mono text-xs text-bronze-dark">{risk.basis}</span>
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">{risk.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-hanji-border/70">
                <p className="text-xs leading-relaxed text-ink-muted">
                  안내: 명리학적 건강 해석은 의학적 진단이나 처방이 아니며, 오행의 과다·결핍과
                  신살 구조상 반복되기 쉬운 체질적 취약점과 생활 관리 포인트를 점검하기 위한 참고
                  지표입니다. 실제 증상이 있다면 반드시 전문 의료기관 검진을 우선하세요.
                </p>
              </div>
            </>
          )}

          {activeTab === 'family' && (
            <>
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  1. 사주 궁위별 가족·대인 관계 구조
                </h3>
                <ul className="mt-2 space-y-2 text-sm">
                  <li>
                    <strong className="text-ink">
                      년주(조상·어린 시절 · {yearP.stemObj?.hanja}
                      {yearP.branchObj?.hanja}):
                    </strong>{' '}
                    천간 {yearP.stemTenGod}, 지지 {yearP.branchTenGod} — 집안의 기본 분위기와
                    초년기 가치관 형성의 토대입니다.
                  </li>
                  <li>
                    <strong className="text-ink">
                      월주(부모·형제·사회 환경 · {monthP.stemObj?.hanja}
                      {monthP.branchObj?.hanja}):
                    </strong>{' '}
                    천간 {monthP.stemTenGod}, 지지 {monthP.branchTenGod} — 가족과의 정서적 거리감
                    및 사회 초년 인간관계의 패턴을 보여줍니다.
                  </li>
                  <li>
                    <strong className="text-ink">
                      시주(자녀·부하·말년 ·{' '}
                      {hourP.empty
                        ? '시간 미상'
                        : `${hourP.stemObj?.hanja}${hourP.branchObj?.hanja}`}
                      ):
                    </strong>{' '}
                    {hourP.empty
                      ? '출생 시각을 입력하면 자녀운과 말년 대인 관계 흐름이 정밀하게 산출됩니다.'
                      : `천간 ${hourP.stemTenGod}, 지지 ${hourP.branchTenGod} — 자녀·후배와의 유대 및 중년 이후 인맥 결실을 나타냅니다.`}
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-hanji-border/70">
                <h3 className="font-serif text-base font-bold text-ink">
                  2. 천을귀인(天乙貴人) 인연과 공망 거리감 원칙
                </h3>
                <p className="mt-2">
                  일간 기준 천을귀인 지지는 <strong>{cheoneulAnimals}</strong>입니다. 인생의
                  분기점에서 해당 띠 또는 해당 지지 기운이 강한 인연, 그리고 용신·희신 오행의
                  성향을 가진 조력자가 실질적인 귀인으로 작용할 가능성이 높습니다.
                </p>
                <p className="mt-2 text-ink-muted">
                  원국 공망은{' '}
                  <strong className="text-ink">
                    [년]{data.yearGongmang.map((b) => BRANCHES[b].hanja).join('')} · [일]
                    {data.gongmang.map((b) => BRANCHES[b].hanja).join('')}
                  </strong>
                  입니다. 공망에 해당하는 궁위나 시기에는 과도한 기대와 감정적 밀착보다 명확한
                  선과 담백한 거리감을 유지할 때 인간관계 피로와 배신 리스크를 크게 줄일 수
                  있습니다.
                </p>
              </div>
            </>
          )}

          {activeTab === 'remedy' && (
            <>
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  1. 용신·희신(보완) 및 기신·구신(절제) 개운 전략
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  선정 기준: {data.yongshinProfile.method} — {data.yongshinProfile.rationale}
                </p>

                <div className="mt-3 divide-y divide-hanji-border/70">
                  {[
                    ...data.yongshinProfile.yongshin.map((item) => ({
                      role: '용신(최우선 보완)',
                      tone: 'good' as const,
                      item,
                    })),
                    ...data.yongshinProfile.heeshin.map((item) => ({
                      role: '희신(보조 보완)',
                      tone: 'good' as const,
                      item,
                    })),
                    ...data.yongshinProfile.gishin.map((item) => ({
                      role: '기신(과다 경계)',
                      tone: 'warn' as const,
                      item,
                    })),
                  ].map(({ role, tone, item }, idx) => {
                    const el = ELEMENTS[item.el];
                    return (
                      <div key={`${role}-${item.el}-${idx}`} className="py-3 first:pt-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                          <span
                            className={`text-xs font-bold ${
                              tone === 'good' ? 'text-wood-fg' : 'text-fire-fg'
                            }`}
                          >
                            [{role}]
                          </span>
                          <strong className="font-serif text-ink">
                            {el.kor}({el.hanja}) · {item.tenGodGroup}
                          </strong>
                          <span className="text-xs text-ink-muted">
                            색상 {el.color} · 방위 {el.dir} · 숫자 {el.num}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink-muted">
                          {item.reason} / 습관: {el.habit} · 장기: {el.organ}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-hanji-border/70">
                <h3 className="font-serif text-base font-bold text-ink">
                  2. 원국 결핍 오행 점검
                </h3>
                <p className="mt-2">
                  {missingEls.length > 0 ? (
                    <>
                      원국에{' '}
                      <strong>
                        {missingEls.map((e) => `${e.kor}(${e.hanja})`).join(', ')}
                      </strong>{' '}
                      오행이 표면에 드러나지 않았습니다. 결핍 오행이 곧바로 용신은 아니므로
                      기신·구신 여부를 확인한 뒤, 생활 리듬 차원에서 해당 오행의 습관(
                      {missingEls.map((e) => e.habit).join(' / ')})을 균형 있게 조절하세요.
                    </>
                  ) : (
                    '목·화·토·금·수 다섯 오행이 원국에 모두 고루 갖추어진 오행구족(五行具足) 형태입니다. 용신·희신 오행을 중심으로 일상의 선택을 정렬하면 안정감이 극대화됩니다.'
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 06. Gemini AI 정통 명리 1:1 심층 감명 & 12단계 종합 감명서 */}
      <section
        ref={aiSectionRef}
        id="ai-reading"
        className="scroll-mt-20 rounded-xl border border-bronze/50 bg-hanji-surface p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-hanji-border">
          <div>
            <p className="text-xs font-medium text-bronze-dark">
              06. Gemini AI 정통 명리 1:1 심층 감명
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold text-ink">
              사주 원국 기반 1:1 맞춤 풀이 · 12단계 종합 감명서
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              격국·용희기구·실시간 대운/세운/월운 합충 JSON을 기반으로 12단계 전체 감명서, 8대 주제별 상세 풀이, 1:1 고민 상담을 제공합니다.
            </p>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2.5">
            {/* 상담 어조 전환 토글 */}
            <div
              role="group"
              aria-label="AI 상담 어조 선택"
              className="inline-flex rounded-lg border border-hanji-border bg-hanji p-0.5 text-xs"
            >
              <button
                type="button"
                onClick={() => setAiTone('realistic')}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  aiTone === 'realistic'
                    ? 'bg-ink text-hanji-surface'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                냉정·현실적 상담
              </button>
              <button
                type="button"
                onClick={() => setAiTone('coaching')}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  aiTone === 'coaching'
                    ? 'bg-ink text-hanji-surface'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                부드러운 코칭
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowJsonPreview((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink cursor-pointer whitespace-nowrap shrink-0"
            >
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              {showJsonPreview ? '원국 JSON 닫기' : '원국 JSON 보기'}
            </button>
          </div>
        </div>

        {showJsonPreview && (
          <pre className="no-print mt-4 max-h-64 overflow-auto rounded-lg border border-hanji-border bg-hanji p-3.5 font-mono text-[11px] leading-relaxed text-ink">
            {JSON.stringify(payloadJson, null, 2)}
          </pre>
        )}

        {/* A) 12단계 전체 종합 감명서 (실제 유료 감명 리포트 구조) */}
        <div className="mt-5 rounded-xl border border-bronze/40 bg-hanji-highlight/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-bronze-dark shrink-0" aria-hidden="true" />
                <h3 className="font-serif text-base font-bold text-ink">
                  12단계 전체 종합 감명서 (평생 총운 · 전 대운/세운 · 현실 생존 전략)
                </h3>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                1단계 만세력 확정표부터 2~9단계 원국·평생·금전·직업·연애·결혼·건강·인간관계, 10~11단계 대운/세운 상세, 12단계 총평까지 한 번에 생성합니다.
              </p>
            </div>

            <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
              {isFull12Streaming ? (
                <button
                  type="button"
                  onClick={stopFull12Report}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-fire-bd bg-fire-bg px-3.5 py-2 text-xs font-semibold text-fire-fg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  생성 중지
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void runFull12Report(Boolean(full12Text))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs sm:text-sm font-semibold text-hanji-surface transition-colors hover:bg-bronze-dark whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {full12Text ? '12단계 감명서 다시 생성' : '12단계 종합 감명서 생성'}
                </button>
              )}

              {full12Text && !isFull12Streaming && (
                <button
                  type="button"
                  onClick={() => setFull12Open((v) => !v)}
                  className="rounded-lg border border-hanji-border bg-hanji-surface px-3 py-2 text-xs font-semibold text-ink hover:border-bronze whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {full12Open ? '감명서 접기' : '감명서 펼치기'}
                </button>
              )}
            </div>
          </div>

          {full12Error && (
            <div
              role="alert"
              className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-fire-bd bg-fire-bg px-4 py-3 text-xs sm:text-sm text-fire-fg"
            >
              <span>{full12Error}</span>
              <button
                type="button"
                onClick={() => void runFull12Report(true)}
                className="no-print inline-flex items-center gap-1.5 rounded-md border border-fire-bd bg-hanji-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-bronze whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                다시 시도
              </button>
            </div>
          )}

          {full12Open && (full12Text || isFull12Streaming) && (
            <div className="mt-4 rounded-xl border border-hanji-border bg-hanji-surface p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-hanji-border/80">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <strong className="font-serif text-sm text-ink">
                    {data.input.name}님 12단계 종합 감명서
                  </strong>
                  <span aria-hidden="true">·</span>
                  <span>
                    {aiTone === 'realistic' ? '냉정·현실적 상담 톤' : '부드러운 코칭 톤'}
                  </span>
                  {full12FallbackMap[aiTone] && !isFull12Streaming && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-bronze-dark font-medium">보조 모델 자동 전환 완료</span>
                    </>
                  )}
                  {isFull12Streaming && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-bronze-dark font-semibold">
                        <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                        {full12Status ||
                          `심층 감명서 작성 중... (${full12Text.length.toLocaleString()}자)`}
                      </span>
                    </>
                  )}
                </div>

                {!isFull12Streaming && full12Text && (
                  <div className="no-print flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => void handleCopyText(`full12-${aiTone}`, full12Text)}
                      className="inline-flex items-center gap-1 text-ink-muted hover:text-ink cursor-pointer whitespace-nowrap"
                    >
                      {copiedKey === `full12-${aiTone}` ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-wood-fg" aria-hidden="true" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          전체 복사
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadMarkdown('12단계_종합감명서', full12Text)}
                      className="inline-flex items-center gap-1 text-ink-muted hover:text-ink cursor-pointer whitespace-nowrap"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      .md 저장
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1 text-ink-muted hover:text-ink cursor-pointer whitespace-nowrap"
                    >
                      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                      인쇄 / PDF
                    </button>
                  </div>
                )}
              </div>

              {full12Text ? (
                <MarkdownRenderer content={full12Text} />
              ) : (
                <div className="flex items-center gap-2.5 py-6 text-sm text-ink-muted">
                  <RefreshCw className="h-4 w-4 animate-spin text-bronze shrink-0" aria-hidden="true" />
                  <span>
                    {full12Status ||
                      `${data.input.name}님의 원국·격국·용희기구·전 대운·세운·월운 상호작용을 정밀 대조해 12단계 종합 감명서를 작성하고 있습니다...`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* B) 클릭 즉시 상세 AI 풀이를 보여주는 8대 전문 영역 */}
        <div className="mt-6">
          <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-semibold text-ink-muted">
              8대 주제별 AI 상세 풀이 (항목 클릭 시 즉시 심층 분석)
            </span>
            {activeTopicText && !isTopicStreaming && (
              <button
                type="button"
                onClick={() => void runTopicAnalysis(activeAiTopic, true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                현재 어조로 다시 분석
              </button>
            )}
          </div>

          <div className="no-print grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {AI_TOPICS.map((topic) => {
              const cacheKey = `${topic.id}::${aiTone}`;
              const isSelected = activeAiTopic === topic.id;
              const isLoaded = Boolean(topicCache[cacheKey]);
              const isLoadingThis = streamingTopicKey === cacheKey;

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => void runTopicAnalysis(topic.id, false)}
                  className={`flex flex-col items-start rounded-lg border px-3.5 py-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-bronze bg-hanji-highlight text-ink'
                      : 'border-hanji-border bg-hanji/60 text-ink-muted hover:border-bronze/60 hover:text-ink'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-ink whitespace-nowrap">
                      {topic.label}
                    </span>
                    {isLoadingThis ? (
                      <RefreshCw
                        className="h-3.5 w-3.5 shrink-0 animate-spin text-bronze"
                        aria-hidden="true"
                      />
                    ) : isLoaded ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-wood-fg" aria-hidden="true" />
                    ) : null}
                  </div>
                  <span className="mt-1 text-[11px] leading-snug text-ink-muted">
                    {topic.summary}
                  </span>
                </button>
              );
            })}
          </div>

          {topicError && (
            <div
              role="alert"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-fire-bd bg-fire-bg px-4 py-3 text-xs sm:text-sm text-fire-fg"
            >
              <span>{topicError}</span>
              <button
                type="button"
                onClick={() => void runTopicAnalysis(activeAiTopic, true)}
                className="no-print inline-flex items-center gap-1.5 rounded-md border border-fire-bd bg-hanji-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-bronze whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                다시 시도
              </button>
            </div>
          )}

          {/* 주제별 AI 풀이 결과 영역 */}
          <div className="mt-4 rounded-xl border border-hanji-border bg-hanji/40 p-4 sm:p-6">
            {activeTopicText || isTopicStreaming ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-hanji-border/70">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <strong className="font-serif text-sm text-ink">{activeAiTopic}</strong>
                    <span aria-hidden="true">·</span>
                    <span>
                      {data.input.name}님 원국 ·{' '}
                      {aiTone === 'realistic' ? '냉정·현실적 상담' : '부드러운 코칭'}
                      {topicFallbackMap[activeTopicCacheKey] && !isTopicStreaming
                        ? ' · 보조 모델 자동 전환 완료'
                        : ''}
                      {isTopicStreaming
                        ? ` · ${topicStatus || 'AI 심층 풀이 작성 중...'}`
                        : ''}
                    </span>
                  </div>

                  {!isTopicStreaming && activeTopicText && (
                    <div className="no-print flex items-center gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopyText(activeTopicCacheKey, activeTopicText)
                        }
                        className="inline-flex items-center gap-1 text-ink-muted hover:text-ink cursor-pointer"
                      >
                        {copiedKey === activeTopicCacheKey ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-wood-fg" aria-hidden="true" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            복사
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadMarkdown(activeAiTopic.replace(/·/g, '_'), activeTopicText)
                        }
                        className="inline-flex items-center gap-1 text-ink-muted hover:text-ink cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        .md 저장
                      </button>
                    </div>
                  )}
                </div>

                {activeTopicText ? (
                  <MarkdownRenderer content={activeTopicText} />
                ) : (
                  <div className="flex items-center gap-2.5 py-6 text-sm text-ink-muted">
                    <RefreshCw className="h-4 w-4 animate-spin text-bronze shrink-0" aria-hidden="true" />
                    <span>
                      {topicStatus || (
                        <>
                          {data.input.name}님의 사주 원국과 대운·세운을 바탕으로{' '}
                          <strong className="text-ink">{activeAiTopic}</strong> 내용을 분석하고
                          있습니다...
                        </>
                      )}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center py-2">
                <div>
                  <p className="font-serif text-sm font-bold text-ink">
                    {activeAiTopic} 상세 풀이를 확인해 보세요
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    위 8개 전문 영역 중 원하는 항목을 클릭하면 {data.input.name}님의 정밀 원국
                    JSON과 실시간 운세 상호작용을 기반으로{' '}
                    {aiTone === 'realistic' ? '냉정·현실적' : '부드러운 코칭'} 어조의 심층 풀이가
                    생성됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void runTopicAnalysis(activeAiTopic, false)}
                  className="no-print inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs sm:text-sm font-semibold text-hanji-surface transition-colors hover:bg-bronze-dark whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {activeAiTopic} 분석 시작
                </button>
              </div>
            )}
          </div>
        </div>

        {/* C) 1:1 맞춤 고민 질문 입력 및 자동 AI 분석 */}
        <div className="mt-7 pt-6 border-t border-hanji-border">
          <div className="mb-3">
            <h3 className="flex items-center gap-2 font-serif text-base font-bold text-ink">
              <MessageSquareText className="h-4 w-4 text-bronze" aria-hidden="true" />
              1:1 맞춤 고민 상담
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              현재 고민 중인 진로·이직·부동산·재물·결혼·건강 질문을 입력하면 원국과 현재
              대운·세운·월운을 대조해 즉시 결론과 대응 전략을 제시합니다.
            </p>
          </div>

          <form onSubmit={handleConcernSubmit} className="no-print space-y-3">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                maxLength={500}
                placeholder="궁금한 고민을 입력하고 Enter를 누르세요 (예: 올해 이직과 창업 중 어떤 방향이 유리할까요?)"
                className="min-w-0 flex-1 rounded-lg border border-hanji-border bg-hanji-input px-3.5 py-2.5 text-sm text-ink focus:border-bronze"
              />
              <button
                type="submit"
                disabled={isConcernStreaming || !customQuestion.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-hanji-surface transition-colors hover:bg-bronze-dark disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isConcernStreaming ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    고민 분석 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    AI 고민 분석
                  </>
                )}
              </button>
            </div>

            {/* 빠른 예시 고민 질문 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
              <span className="font-semibold text-ink-muted">예시 질문:</span>
              {SAMPLE_CONCERNS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isConcernStreaming}
                  onClick={() => void runConcernAnalysis(sample)}
                  className="text-left underline decoration-hanji-border underline-offset-4 transition-colors hover:text-ink hover:decoration-bronze disabled:opacity-50 cursor-pointer"
                >
                  “{sample}”
                </button>
              ))}
            </div>
          </form>

          {/* 1:1 고민 분석 답변 히스토리 */}
          {concernHistory.length > 0 && (
            <div className="mt-5 space-y-4">
              {concernHistory.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-hanji-border bg-hanji/50 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-hanji-border/70">
                    <div className="text-sm font-semibold text-ink">
                      <span className="mr-1.5 font-serif text-bronze-dark">Q.</span>
                      {item.question}
                      <span className="ml-2 text-[11px] font-normal text-ink-muted">
                        ({item.tone === 'realistic' ? '냉정·현실적 상담' : '부드러운 코칭'}
                        {item.fallbackUsed && !item.isStreaming ? ' · 보조 모델 전환' : ''})
                      </span>
                    </div>

                    {!item.isStreaming && item.answer && (
                      <button
                        type="button"
                        onClick={() => void handleCopyText(item.id, item.answer)}
                        className="no-print inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer shrink-0"
                      >
                        {copiedKey === item.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-wood-fg" aria-hidden="true" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            복사
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {item.error ? (
                    <div
                      role="alert"
                      className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-fire-bd bg-fire-bg px-3.5 py-2.5 text-xs text-fire-fg"
                    >
                      <span>{item.error}</span>
                      <button
                        type="button"
                        disabled={isConcernStreaming}
                        onClick={() => void runConcernAnalysis(item.question)}
                        className="no-print inline-flex items-center gap-1 rounded-md border border-fire-bd bg-hanji-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-bronze whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className="h-3 w-3" aria-hidden="true" />
                        다시 시도
                      </button>
                    </div>
                  ) : item.answer ? (
                    <div className="mt-3">
                      <MarkdownRenderer content={item.answer} />
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-ink-muted">
                      <RefreshCw className="h-4 w-4 animate-spin text-bronze shrink-0" aria-hidden="true" />
                      <span>
                        {item.statusText ||
                          `${data.input.name}님의 원국과 대운·세운·월운을 대조하여 고민에 대한 맞춤 풀이를 작성하고 있습니다...`}
                      </span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
