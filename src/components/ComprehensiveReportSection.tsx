import { useEffect, useMemo, useState, type RefObject } from 'react';
import { Copy, Check, RefreshCw, Sparkles, Code2 } from 'lucide-react';
import { DAY_MASTER_PROFILES, ELEMENTS } from '../lib/sajuData';
import { buildSajuPromptPayload } from '../lib/sajuEngine';
import type { SajuResult } from '../types/saju';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ComprehensiveReportSectionProps {
  data: SajuResult;
  aiSectionRef: RefObject<HTMLElement | null>;
}

type ReportTab = 'personality' | 'career' | 'relation' | 'remedy';

const FOCUS_TOPICS = [
  '종합 심층 풀이',
  '직업·이직·사업운',
  '재물·자산 전략',
  '인연·연애·결혼운',
  '올해 및 향후 3년 전략',
] as const;

const CAREER_GUIDE: Record<'비겁' | '식상' | '재성' | '관성' | '인성', string> = {
  비겁: '독립적인 전문직, 프리랜서, 창업, 스포츠·영업·리더십이 필요한 분야에서 주체적인 역량이 돋보입니다.',
  식상: '콘텐츠 제작, IT·개발, 디자인, 마케팅, 교육, 연구개발 등 아이디어와 전문 기술로 부가가치를 만드는 직군이 잘 맞습니다.',
  재성: '금융, 회계, 무역, 부동산, 경영관리, 유통·사업 등 실질적 성과와 현금흐름을 창출하는 분야에서 재물운이 열립니다.',
  관성: '공직, 대기업, 법조·행정, 관리직, 컨설팅 등 체계적인 조직과 시스템 속에서 신뢰와 직위를 쌓는 경로가 안정적입니다.',
  인성: '학계, 연구원, 교육, 의료, 심리·상담, 기획·전략 등 지식과 자격을 활용하는 전문직에서 깊은 성취를 이룹니다.',
};

export function ComprehensiveReportSection({
  data,
  aiSectionRef,
}: ComprehensiveReportSectionProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('personality');

  // Gemini AI 1:1 심층 풀이 상태
  const [focusTopic, setFocusTopic] = useState<string>(FOCUS_TOPICS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [aiText, setAiText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const dayP = data.pillars[1];
  const monthP = data.pillars[2];
  const profile = DAY_MASTER_PROFILES[dayP.stem ?? 0];

  const topGroup = useMemo(() => {
    const sorted = Object.entries(data.tenGodGroups).sort((a, b) => b[1] - a[1]);
    return (sorted[0]?.[0] ?? '비겁') as keyof typeof CAREER_GUIDE;
  }, [data.tenGodGroups]);

  const missingEls = ELEMENTS.filter((e) => data.elCount[e.idx] === 0);
  const remedyTargets = data.yongshinEls.map((i) => ELEMENTS[i]);
  const payloadJson = useMemo(() => buildSajuPromptPayload(data), [data]);

  // 명식이 변경되면 이전 AI 풀이 초기화
  useEffect(() => {
    setAiText('');
    setAiError(null);
  }, [data]);

  const handleGenerateAiReading = async () => {
    setIsStreaming(true);
    setAiError(null);
    setAiText('');

    try {
      const response = await fetch('/api/gemini-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sajuData: payloadJson,
          focusTopic,
          customQuestion: customQuestion.trim() || undefined,
        }),
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
            text?: string;
            done?: boolean;
            error?: string;
          };
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text) {
            setAiText((prev) => prev + parsed.text);
          }
        }
      }
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'AI 맞춤 사주 풀이를 생성하지 못했습니다.'
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopyAi = async () => {
    if (!aiText) return;
    try {
      await navigator.clipboard.writeText(aiText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable in restricted iframe
    }
  };

  const monthTG = monthP.branchTenGod || '';
  const dayBranchTG = dayP.branchTenGod || '';

  return (
    <div id="report" className="scroll-mt-20 space-y-6">
      {/* 4탭 정통 명리 종합 해석 리포트 */}
      <section className="rounded-xl border border-hanji-border bg-hanji-surface p-5 sm:p-7">
        <div className="pb-4 border-b border-hanji-border">
          <p className="text-xs font-medium text-ink-muted">
            05. 정통 명리 종합 해석 리포트
          </p>
          <h2 className="mt-1 font-serif text-xl font-bold text-ink">
            원국 구조별 핵심 감명
          </h2>
        </div>

        {/* 탭 네비게이션 */}
        <div
          role="tablist"
          aria-label="종합 해석 항목"
          className="mt-5 flex flex-wrap gap-1.5 border-b border-hanji-border pb-3"
        >
          {(
            [
              { id: 'personality', label: '기질·성격' },
              { id: 'career', label: '직업·재물' },
              { id: 'relation', label: '인간관계·연애' },
              { id: 'remedy', label: '오행 개운법' },
            ] as Array<{ id: ReportTab; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                <p className="mt-1 text-xs font-serif text-bronze">
                  물상: {profile.metaphor}
                </p>
                <p className="mt-2">{profile.core}</p>
                <p className="mt-2 text-ink-muted">
                  <strong className="text-ink">명리 조언:</strong> {profile.advice}
                </p>
              </div>

              <div className="pt-4 border-t border-hanji-border/70">
                <h3 className="font-serif text-base font-bold text-ink">
                  2. 월지({monthP.branchObj?.kor}
                  {monthP.branchObj?.hanja} · {monthTG}) 사회적 성향
                </h3>
                <p className="mt-2">
                  사주의 계절이자 중심 환경인 월지에 <strong>{monthTG}</strong>이 자리하여
                  사회생활에서{' '}
                  {monthTG.includes('관')
                    ? '책임감, 원칙, 조직 내 신뢰와 명예를 중시하는 반듯한 모습'
                    : monthTG.includes('재')
                      ? '현실 감각, 결과 중심의 효율성과 실속 있는 자산 관리 능력'
                      : monthTG.includes('식') || monthTG.includes('상')
                        ? '창의적 표현, 기획력, 자유로운 전문성 발휘'
                        : monthTG.includes('인')
                          ? '깊은 학습력, 기획·연구, 체계적 사고와 안정 추구'
                          : '독립적인 주체성과 흔들리지 않는 추진력'}
                  으로 발현됩니다.
                </p>
              </div>
            </>
          )}

          {activeTab === 'career' && (
            <>
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  1. 핵심 십성 구조 — {topGroup} 중심형
                </h3>
                <p className="mt-2">{CAREER_GUIDE[topGroup]}</p>
              </div>

              <div className="pt-4 border-t border-hanji-border/70">
                <h3 className="font-serif text-base font-bold text-ink">
                  2. 재물운 및 자산 운용 전략
                </h3>
                <p className="mt-2">
                  원국 내 재성이{' '}
                  <strong className="font-mono tabular-nums">{data.tenGodGroups.재성}개</strong>
                  이며 <strong>{data.strengthLabel}</strong> 구조에 해당합니다.{' '}
                  {data.strengthRatio >= 55
                    ? '일간 기운이 충분해 주도적인 사업·확장 역량이 뒷받침됩니다. 식상(전문 기술·콘텐츠)을 통해 재물로 연결하는 구조가 가장 안정적입니다.'
                    : '무리한 단기 투자나 레버리지보다 전문 자격·지식(인성)과 안정적 현금흐름을 먼저 다진 뒤 단계적으로 자산을 키우는 전략이 유리합니다.'}
                </p>
              </div>
            </>
          )}

          {activeTab === 'relation' && (
            <>
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  1. 일지(배우자궁 · {dayP.branchObj?.kor}
                  {dayP.branchObj?.hanja} / {dayBranchTG}) 관계 성향
                </h3>
                <p className="mt-2">
                  가까운 인연과 배우자 관계에서는{' '}
                  {dayBranchTG.includes('비') || dayBranchTG.includes('겁')
                    ? '친구처럼 대등하고 솔직한 파트너십을 선호합니다. 서로의 독립성을 존중하고 자존심 대립을 줄이는 배려가 관계를 단단하게 합니다.'
                    : dayBranchTG.includes('식') || dayBranchTG.includes('상')
                      ? '다정하고 표현력이 풍부하며 상대에게 아낌없이 베푸는 따뜻한 스타일입니다. 감정을 솔직히 나누되 과한 헌신으로 지치지 않도록 균형을 챙기세요.'
                      : dayBranchTG.includes('재')
                        ? '현실적이고 책임감 있게 상대를 챙기며 안정적인 생활 기반을 함께 꾸리는 것을 중시합니다.'
                        : dayBranchTG.includes('관')
                          ? '신뢰와 예의를 중시하고 든든하게 의지할 수 있는 반듯한 인연을 선호합니다.'
                          : '정서적 교감과 깊은 이해심을 중시하며 편안한 안식처 같은 관계를 지향합니다.'}
                </p>
              </div>

              <div className="pt-4 border-t border-hanji-border/70">
                <h3 className="font-serif text-base font-bold text-ink">
                  2. 대인관계 조화 포인트
                </h3>
                <p className="mt-2">
                  원국의 공망은{' '}
                  <strong>
                    {data.gongmang
                      .map((b) => `${b === 0 ? '자(子)' : ['자(子)','축(丑)','인(寅)','묘(卯)','진(辰)','사(巳)','오(午)','미(未)','신(申)','유(酉)','술(戌)','해(亥)'][b]}`)
                      .join(' · ')}
                  </strong>
                  입니다. 공망에 해당하는 시기나 관계에서는 과도한 기대보다 담백하고 유연한 거리감을 유지할 때 오히려 뜻밖의 귀인 인연이 열립니다.
                </p>
              </div>
            </>
          )}

          {activeTab === 'remedy' && (
            <>
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  1. 용신·희신 오행 보완 개운법
                </h3>
                <div className="mt-3 divide-y divide-hanji-border/70">
                  {remedyTargets.map((el) => (
                    <div key={el.idx} className="py-3 first:pt-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <strong className="font-serif text-ink">
                          {el.kor}({el.hanja}) 기운 보충
                        </strong>
                        <span className="text-xs text-ink-muted">
                          색상 {el.color} · 방위 {el.dir} · 숫자 {el.num}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        생활 습관: {el.habit} / 건강 관리 포인트: {el.organ}
                      </p>
                    </div>
                  ))}
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
                      오행이 표면에 드러나지 않았습니다. 해당 오행의 생활 습관({missingEls.map((e) => e.habit).join(' / ')})을 일상에 자연스럽게 보태면 기운의 순환이 한결 원활해집니다.
                    </>
                  ) : (
                    '목·화·토·금·수 다섯 오행이 원국에 모두 고루 갖추어진 오행구족(五行具足) 형태입니다. 용신 오행을 중심으로 강약을 조절하면 안정감이 극대화됩니다.'
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Gemini API 심층 1:1 맞춤 사주 풀이 */}
      <section
        ref={aiSectionRef}
        id="ai-reading"
        className="scroll-mt-20 rounded-xl border border-bronze/50 bg-hanji-surface p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-hanji-border">
          <div>
            <p className="text-xs font-medium text-bronze-dark">
              06. Gemini AI 심층 감명
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold text-ink">
              사주 원국 JSON 기반 1:1 맞춤 사주 풀이
            </h2>
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

        {showJsonPreview && (
          <pre className="mt-4 max-h-64 overflow-auto rounded-lg border border-hanji-border bg-hanji p-3.5 font-mono text-[11px] leading-relaxed text-ink">
            {JSON.stringify(payloadJson, null, 2)}
          </pre>
        )}

        {/* 상담 주제 선택 & 추가 질문 */}
        <div className="mt-5 space-y-4">
          <div>
            <span className="block text-xs font-semibold text-ink-muted mb-2">
              집중 상담 주제
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FOCUS_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setFocusTopic(topic)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    focusTopic === topic
                      ? 'border-ink bg-ink text-hanji-surface'
                      : 'border-hanji-border bg-hanji text-ink-muted hover:text-ink'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              maxLength={300}
              placeholder="궁금한 고민을 입력해 보세요 (선택 · 예: 올해 이직과 창업 중 어떤 방향이 유리할까요?)"
              className="min-w-0 flex-1 rounded-lg border border-hanji-border bg-hanji-input px-3.5 py-2.5 text-sm text-ink focus:border-bronze"
            />
            <button
              type="button"
              onClick={() => void handleGenerateAiReading()}
              disabled={isStreaming}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-hanji-surface transition-colors hover:bg-bronze-dark disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isStreaming ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  심층 풀이 작성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  1:1 맞춤 풀이 생성
                </>
              )}
            </button>
          </div>
        </div>

        {aiError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-fire-bd bg-fire-bg px-4 py-3 text-xs sm:text-sm text-fire-fg"
          >
            {aiError}
          </div>
        )}

        {/* 생성된 심층 리포트 출력 영역 */}
        {(aiText || isStreaming) && (
          <div className="mt-6 border-t border-hanji-border pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-ink-muted">
                {data.input.name}님 맞춤 감명 · {focusTopic}
                {isStreaming ? ' · 실시간 작성 중' : ''}
              </span>

              {!isStreaming && aiText && (
                <button
                  type="button"
                  onClick={() => void handleCopyAi()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-wood-fg" aria-hidden="true" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      풀이 복사
                    </>
                  )}
                </button>
              )}
            </div>

            <MarkdownRenderer content={aiText} />
          </div>
        )}
      </section>
    </div>
  );
}
