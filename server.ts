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

interface KasiApiResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: unknown } };
  };
}

async function fetchKasiEndpoint(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`KASI 서버 응답 오류 (HTTP ${res.status})`);
  }

  let json: KasiApiResponse;
  try {
    json = JSON.parse(text) as KasiApiResponse;
  } catch {
    if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
      throw new Error('등록되지 않은 KASI 인증키입니다. 공공데이터포털 인증키를 다시 확인해 주세요.');
    }
    if (text.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR')) {
      throw new Error('KASI 일일 호출 한도를 초과했습니다.');
    }
    throw new Error('KASI API 응답을 해석하지 못했습니다. 인증키 또는 날짜 범위를 확인해 주세요.');
  }

  const header = json?.response?.header;
  if (header && header.resultCode && header.resultCode !== '00') {
    throw new Error(`KASI API 오류 (${header.resultCode}): ${header.resultMsg || '요청 실패'}`);
  }

  const rawItem = json?.response?.body?.items?.item;
  if (!rawItem) return [];
  const items = Array.isArray(rawItem) ? rawItem : [rawItem];
  return items as Record<string, string>[];
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // KASI API Proxy 1: 양력 -> 음력 및 일진 조회
  app.get('/api/kasi/lunar-from-solar', async (req, res) => {
    const rawKey = req.header('X-Kasi-Service-Key')?.trim() || '';
    if (!rawKey || rawKey.length > 300) {
      res.status(400).json({ error: '유효한 KASI 인증키가 필요합니다.' });
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
      const url = `${KASI_BASE}/getLunCalInfo?solYear=${year}&solMonth=${String(month).padStart(2, '0')}&solDay=${String(day).padStart(2, '0')}&_type=json&serviceKey=${encodeKasiKey(rawKey)}`;
      const items = await fetchKasiEndpoint(url);
      res.json({ item: items[0] ?? null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'KASI 음력 조회에 실패했습니다.';
      res.status(502).json({ error: message });
    }
  });

  // KASI API Proxy 2: 음력 -> 양력 변환
  app.get('/api/kasi/solar-from-lunar', async (req, res) => {
    const rawKey = req.header('X-Kasi-Service-Key')?.trim() || '';
    if (!rawKey || rawKey.length > 300) {
      res.status(400).json({ error: '유효한 KASI 인증키가 필요합니다.' });
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
      const url = `${KASI_BASE}/getSolCalInfo?lunYear=${year}&lunMonth=${String(month).padStart(2, '0')}&lunDay=${String(day).padStart(2, '0')}&_type=json&serviceKey=${encodeKasiKey(rawKey)}`;
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
      res.json({ item: matched });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'KASI 음력 변환에 실패했습니다.';
      res.status(502).json({ error: message });
    }
  });

  // Gemini API Route: 정통 명리학 심층 1:1 맞춤 풀이 (SSE 스트리밍)
  app.post('/api/gemini-reading', async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: '서버에 GEMINI_API_KEY가 설정되어 있지 않습니다. Settings > Secrets에서 API 키를 확인해 주세요.',
      });
      return;
    }

    const body = req.body as { sajuData?: unknown; focusTopic?: unknown; customQuestion?: unknown };
    if (!body || typeof body.sajuData !== 'object' || body.sajuData === null) {
      res.status(400).json({ error: '사주 원국 데이터가 필요합니다.' });
      return;
    }

    const focusTopic =
      typeof body.focusTopic === 'string' && body.focusTopic.trim().length > 0
        ? body.focusTopic.trim().slice(0, 80)
        : '종합 심층 풀이';
    const customQuestion =
      typeof body.customQuestion === 'string' ? body.customQuestion.trim().slice(0, 300) : '';

    const systemInstruction = [
      '당신은 자평명리학(子平命理學)과 격국·용신론, 조후론에 정통한 30년 경력의 정통 명리학자입니다.',
      '제공된 사주 원국 JSON 데이터만을 정확히 근거로 삼아(임의로 글자나 간지를 바꾸지 말고) 품격 있고 구체적인 1:1 맞춤 사주 풀이를 한국어로 작성하세요.',
      '미신적 공포 조장이나 과장된 단정은 피하고, 실제 삶과 의사결정에 도움이 되는 통찰력 있고 따뜻한 어조를 유지하세요.',
      '출력은 아래 5개 소제목(## 마크다운 헤딩)으로 구조화하여 1,400~1,800자 내외로 충실히 작성하세요:',
      '## 1. 원국 총평과 일간의 품격',
      '## 2. 오행 균형, 신강·신약 및 용신 활용법',
      '## 3. 십성 구조로 본 직업·재물과 성취 경로',
      '## 4. 대운·세운의 흐름과 현재 시기의 전략',
      '## 5. 맞춤형 조언 및 핵심 질문 답변',
    ].join('\n');

    const userPrompt = [
      `[상담 주제]: ${focusTopic}`,
      customQuestion ? `[의뢰인 추가 질문]: ${customQuestion}` : '',
      '',
      '[계산된 사주 원국 JSON]',
      JSON.stringify(body.sajuData, null, 2),
      '',
      '위 원국 데이터의 천간·지지, 십성, 지장간, 12운성, 합충, 신살, 공망, 대운·세운을 유기적으로 연결하여 깊이 있는 1:1 맞춤 감명을 작성해 주세요.',
    ]
      .filter(Boolean)
      .join('\n');

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    try {
      const ai = createGeminiClient();
      const stream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Gemini 풀이 생성 중 오류가 발생했습니다.';
      let friendly = rawMessage;
      if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('403') || rawMessage.includes('PERMISSION_DENIED')) {
        friendly = 'Gemini API 키가 유효하지 않거나 권한이 없습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.';
      } else if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
        friendly = 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도하거나 Settings > Secrets에서 API 키 할당량을 확인해 주세요.';
      }
      res.write(`data: ${JSON.stringify({ error: friendly })}\n\n`);
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
