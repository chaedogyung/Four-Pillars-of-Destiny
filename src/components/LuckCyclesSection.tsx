import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { ELEMENTS, ELEMENT_STYLES } from '../lib/sajuData';
import { buildSewoonsForRange, buildWolwoonsForYear } from '../lib/sajuEngine';
import type { CycleDirection, SajuResult, SinsalScope, TransitAssessment } from '../types/saju';

interface LuckCyclesSectionProps {
  data: SajuResult;
  sinsalScope: SinsalScope;
}

function TransitDetailPanel({
  title,
  meta,
  assessment,
}: {
  title: string;
  meta: string;
  assessment: TransitAssessment;
}) {
  const verdictCls =
    assessment.tone === 'good'
      ? 'text-wood-fg'
      : assessment.tone === 'warn'
        ? 'text-fire-fg'
        : 'text-bronze-dark';

  return (
    <div className="mt-3 rounded-lg border border-hanji-border/70 bg-hanji px-4 py-3.5 text-xs sm:text-sm leading-relaxed text-ink space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <strong className="font-serif text-ink">{title}</strong>
          <span className="mx-2 text-ink-muted">|</span>
          <span className="text-xs text-ink-muted">{meta}</span>
        </div>
        <span className={`text-xs font-bold whitespace-nowrap ${verdictCls}`}>
          판정: {assessment.verdict}
        </span>
      </div>

      <p className="text-xs sm:text-sm text-ink/90">{assessment.summary}</p>

      {assessment.interactions.length > 0 && (
        <div className="pt-2 border-t border-hanji-border/60">
          <div className="text-[11px] font-semibold text-ink-muted mb-1.5">
            원국·운기 실시간 상호작용 (합·충·형·해·원진·귀인)
          </div>
          <ul className="space-y-1">
            {assessment.interactions.map((it, idx) => (
              <li
                key={`${it.label}-${it.target}-${idx}`}
                className="flex flex-wrap items-baseline gap-x-2 text-xs leading-relaxed"
              >
                <span
                  className={`font-semibold whitespace-nowrap ${
                    it.tone === 'good'
                      ? 'text-wood-fg'
                      : it.tone === 'warn'
                        ? 'text-fire-fg'
                        : 'text-bronze-dark'
                  }`}
                >
                  [{it.category}] {it.label}
                </span>
                <span className="text-ink-muted">
                  ({it.target}) — {it.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function LuckCyclesSection({ data, sinsalScope }: LuckCyclesSectionProps) {
  const birthYear = Number(data.input.solarDateStr.slice(0, 4));
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentAge = currentYear - birthYear + 1;
  const dayStem = data.pillars[1].stem ?? 0;
  const dayBranch = data.pillars[1].branch ?? 0;
  const monthBranch = data.pillars[2].branch ?? 0;
  const yearBranch = data.pillars[3].branch ?? 0;

  const defaultDwIdx = useMemo(() => {
    const found = data.daewoons.findIndex(
      (dw) => currentAge >= dw.age && currentAge <= dw.endAge
    );
    return found >= 0 ? found : 0;
  }, [data.daewoons, currentAge]);

  const [direction, setDirection] = useState<CycleDirection>('ltr');
  const [selectedDwIdx, setSelectedDwIdx] = useState<number>(defaultDwIdx);
  const [sewoonMode, setSewoonMode] = useState<'recent' | 'decade'>('recent');
  const [selectedSwYear, setSelectedSwYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  useEffect(() => {
    setSelectedDwIdx(defaultDwIdx);
    setSewoonMode('recent');
    setSelectedSwYear(currentYear);
    setSelectedMonth(currentMonth);
  }, [data, defaultDwIdx, currentYear, currentMonth]);

  const activeDw = data.daewoons[selectedDwIdx] ?? data.daewoons[0];

  const rawSewoons = useMemo(() => {
    if (sewoonMode === 'decade' && activeDw) {
      return buildSewoonsForRange(
        activeDw.year,
        10,
        birthYear,
        dayStem,
        yearBranch,
        dayBranch,
        monthBranch,
        data.pillars,
        data.yongshinProfile,
        data.cheoneulBranches,
        data.yearGongmang,
        data.gongmang,
        data.daewoons
      );
    }
    return data.sewoons;
  }, [
    sewoonMode,
    activeDw,
    birthYear,
    dayStem,
    yearBranch,
    dayBranch,
    monthBranch,
    data.pillars,
    data.yongshinProfile,
    data.cheoneulBranches,
    data.yearGongmang,
    data.gongmang,
    data.daewoons,
    data.sewoons,
  ]);

  const activeSw =
    rawSewoons.find((sw) => sw.year === selectedSwYear) ??
    rawSewoons.find((sw) => sw.isCurrent) ??
    rawSewoons[0];

  const targetMonthYear = activeSw?.year ?? currentYear;
  const targetMonthAge = targetMonthYear - birthYear + 1;
  const targetYearDaewoon = useMemo(
    () =>
      data.daewoons.find(
        (dw) => targetMonthAge >= dw.age && targetMonthAge <= dw.endAge
      ) ?? activeDw,
    [data.daewoons, targetMonthAge, activeDw]
  );

  const rawWolwoons = useMemo(
    () =>
      buildWolwoonsForYear(
        targetMonthYear,
        dayStem,
        yearBranch,
        dayBranch,
        monthBranch,
        data.pillars,
        data.yongshinProfile,
        data.cheoneulBranches,
        data.yearGongmang,
        data.gongmang,
        targetYearDaewoon
      ),
    [
      targetMonthYear,
      dayStem,
      yearBranch,
      dayBranch,
      monthBranch,
      data.pillars,
      data.yongshinProfile,
      data.cheoneulBranches,
      data.yearGongmang,
      data.gongmang,
      targetYearDaewoon,
    ]
  );

  const activeMw =
    rawWolwoons.find((mw) => mw.month === selectedMonth) ?? rawWolwoons[0];

  const displayedDaewoons = useMemo(
    () => (direction === 'rtl' ? [...data.daewoons].reverse() : data.daewoons),
    [data.daewoons, direction]
  );
  const displayedSewoons = useMemo(
    () => (direction === 'rtl' ? [...rawSewoons].reverse() : rawSewoons),
    [rawSewoons, direction]
  );
  const displayedWolwoons = useMemo(
    () => (direction === 'rtl' ? [...rawWolwoons].reverse() : rawWolwoons),
    [rawWolwoons, direction]
  );

  const pickSinsal = (all: string[], yd: string[]) =>
    sinsalScope === 'ym_day' ? all : yd;

  return (
    <section
      id="cycles"
      className="scroll-mt-20 rounded-xl border border-hanji-border bg-hanji-surface p-5 sm:p-7"
    >
      {/* 대운·세운·월운 통합 헤더 + 배열 방향 토글 */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-hanji-border">
        <div>
          <p className="text-xs font-medium text-ink-muted">
            04. 대운(大運) · 세운(歲運) · 월운(月運)
          </p>
          <h2 className="mt-1 font-serif text-xl font-bold text-ink">
            10년 대운표 · 연도별 세운 · 1~12월 월운 동적 역학
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-muted tabular-nums">
            <strong className="text-ink">
              {data.daewoonMeta.isForward ? '순행(順行)' : '역행(逆行)'}
            </strong>
            <span aria-hidden="true">·</span>
            <span>대운수 {data.daewoonMeta.daewoonNum}</span>
            <span aria-hidden="true">·</span>
            <span>절입일 간격 {data.daewoonMeta.daysToTerm}일</span>
            <span aria-hidden="true">·</span>
            <span>현재 {currentAge}세</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDirection((prev) => (prev === 'ltr' ? 'rtl' : 'ltr'))}
          className="no-print inline-flex items-center gap-1.5 rounded-lg border border-hanji-border bg-hanji px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-hanji-subtle whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-bronze" aria-hidden="true" />
          {direction === 'ltr' ? '배열: 좌 → 우 (현대)' : '배열: 우 → 좌 (전통)'}
        </button>
      </div>

      {/* 1. 대운 스트립 */}
      <div className="mt-5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink-muted">
            대운 (전통나이 기준 · 클릭하여 원국과의 합충·귀인·용희 판정 확인)
          </span>
          <span className="font-mono text-[11px] text-ink-muted">
            {direction === 'ltr' ? '오른쪽으로 진행 →' : '← 왼쪽으로 진행'}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayedDaewoons.map((dw) => {
            const isSelected = dw.index === selectedDwIdx;
            const isNow = currentAge >= dw.age && currentAge <= dw.endAge;
            const s12 = pickSinsal(dw.sinsal12, dw.sinsal12YearDay);
            const hasMajorWarn = dw.assessment.interactions.some(
              (x) => x.category === '천충지충' || x.category === '지지충'
            );
            const hasGwiin = dw.assessment.interactions.some((x) => x.category === '귀인');

            return (
              <button
                key={dw.index}
                type="button"
                onClick={() => {
                  setSelectedDwIdx(dw.index);
                  if (sewoonMode === 'decade') {
                    setSelectedSwYear(dw.year);
                  }
                }}
                className={`flex min-w-[76px] flex-1 flex-col items-center rounded-lg border px-1.5 py-2 text-center transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'border-2 border-bronze bg-hanji-highlight'
                    : 'border-hanji-border bg-hanji-input/90 hover:border-bronze/60'
                }`}
              >
                <span className="font-mono text-xs font-bold tabular-nums text-ink">
                  {dw.age}
                </span>
                <span className="mt-0.5 text-[11px] text-ink-muted">{dw.stemTG}</span>
                <span
                  className={`mt-1 w-full rounded py-1 font-serif text-lg font-bold border ${
                    ELEMENT_STYLES[dw.stem.el].box
                  }`}
                >
                  {dw.stem.hanja}
                </span>
                <span
                  className={`mt-1 w-full rounded py-1 font-serif text-lg font-bold border ${
                    ELEMENT_STYLES[dw.branch.el].box
                  }`}
                >
                  {dw.branch.hanja}
                </span>
                <span className="mt-1 text-[11px] font-medium text-ink">{dw.branchTG}</span>
                <span className="text-[10px] font-semibold text-bronze-dark">{dw.stage12}</span>
                <div className="mt-1 border-t border-hanji-border/60 pt-1 w-full space-y-0.5 text-[10px] text-ink-muted leading-tight">
                  {s12.map((s, idx) => (
                    <div key={idx}>{s}</div>
                  ))}
                </div>
                <span
                  className={`mt-1 font-mono text-[10px] font-semibold tabular-nums ${
                    hasMajorWarn
                      ? 'text-fire-fg'
                      : hasGwiin
                        ? 'text-wood-fg'
                        : 'text-ink-muted/80'
                  }`}
                >
                  {isNow ? '현재' : hasGwiin ? `${dw.year}·귀인` : hasMajorWarn ? `${dw.year}·충` : dw.year}
                </span>
              </button>
            );
          })}
        </div>

        {activeDw && (
          <TransitDetailPanel
            title={`${activeDw.age}~${activeDw.endAge}세 대운 (${activeDw.stem.kor}${activeDw.branch.kor} · ${activeDw.stem.hanja}${activeDw.branch.hanja}, ${activeDw.year}~${activeDw.year + 9}년)`}
            meta={`천간 ${activeDw.stemTG}(${ELEMENTS[activeDw.stem.el].kor}) · 지지 ${activeDw.branchTG}(${ELEMENTS[activeDw.branch.el].kor}) · 12운성 ${activeDw.stage12}`}
            assessment={activeDw.assessment}
          />
        )}
      </div>

      {/* 2. 세운(년운) 스트립 */}
      <div className="mt-7 pt-6 border-t border-hanji-border">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-ink-muted">
            세운 (년운 · 연도 클릭 시 원국·대운 교차 역학 및 하단 월운 연동)
          </span>
          <div className="no-print flex items-center gap-1 rounded-lg bg-hanji-subtle p-1">
            <button
              type="button"
              onClick={() => {
                setSewoonMode('recent');
                setSelectedSwYear(currentYear);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sewoonMode === 'recent'
                  ? 'bg-hanji-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              최근 10년
            </button>
            <button
              type="button"
              onClick={() => {
                setSewoonMode('decade');
                if (activeDw) setSelectedSwYear(activeDw.year);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sewoonMode === 'decade'
                  ? 'bg-hanji-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              선택 대운 10년
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayedSewoons.map((sw) => {
            const isSelected = activeSw && sw.year === activeSw.year;
            const s12 = pickSinsal(sw.sinsal12, sw.sinsal12YearDay);
            return (
              <button
                key={sw.year}
                type="button"
                onClick={() => setSelectedSwYear(sw.year)}
                className={`flex min-w-[72px] flex-1 flex-col items-center rounded-lg border px-1.5 py-2 text-center transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'border-2 border-bronze bg-hanji-highlight'
                    : 'border-hanji-border bg-hanji-input/90 hover:border-bronze/60'
                }`}
              >
                <span className="font-mono text-xs font-bold tabular-nums text-ink">
                  {sw.year}
                </span>
                <span className="mt-0.5 text-[11px] text-ink-muted">{sw.stemTG}</span>
                <span
                  className={`mt-1 w-full rounded py-1 font-serif text-lg font-bold border ${
                    ELEMENT_STYLES[sw.stem.el].box
                  }`}
                >
                  {sw.stem.hanja}
                </span>
                <span
                  className={`mt-1 w-full rounded py-1 font-serif text-lg font-bold border ${
                    ELEMENT_STYLES[sw.branch.el].box
                  }`}
                >
                  {sw.branch.hanja}
                </span>
                <span className="mt-1 text-[11px] font-medium text-ink">{sw.branchTG}</span>
                <span className="text-[10px] font-semibold text-bronze-dark">{sw.stage12}</span>
                <div className="mt-1 border-t border-hanji-border/60 pt-1 w-full space-y-0.5 text-[10px] text-ink-muted leading-tight">
                  {s12.map((s, idx) => (
                    <div key={idx}>{s}</div>
                  ))}
                </div>
                <span className="mt-1 font-mono text-[10px] tabular-nums text-ink-muted/80">
                  {sw.isCurrent ? '올해' : `${sw.age}세`}
                </span>
              </button>
            );
          })}
        </div>

        {activeSw && (
          <TransitDetailPanel
            title={`${activeSw.year}년 ${activeSw.stem.kor}${activeSw.branch.kor}년 (${activeSw.stem.hanja}${activeSw.branch.hanja} · ${activeSw.age}세)`}
            meta={`천간 ${activeSw.stemTG} · 지지 ${activeSw.branchTG} · 12운성 ${activeSw.stage12}`}
            assessment={activeSw.assessment}
          />
        )}
      </div>

      {/* 3. 선택 연도 월운 (양력 1월~12월) */}
      <div className="mt-7 pt-6 border-t border-hanji-border">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-base font-bold text-ink">
            {targetMonthYear}년 ({targetMonthAge}세) 월운{' '}
            <span className="font-sans text-xs font-normal text-ink-muted">
              (양력 1월~12월 · 절기 월건 기준)
            </span>
          </h3>
          <span className="text-[11px] text-ink-muted">
            양력 1월은 전년 축월(丑), 2월 입춘부터 당해 인월(寅) 기준
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayedWolwoons.map((mw) => {
            const isSelected = activeMw && mw.month === activeMw.month;
            return (
              <button
                key={`${mw.year}-${mw.month}`}
                type="button"
                onClick={() => setSelectedMonth(mw.month)}
                className={`flex min-w-[66px] flex-1 flex-col items-center rounded-lg border px-1.5 py-2 text-center transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'border-2 border-bronze bg-hanji-highlight'
                    : 'border-hanji-border bg-hanji-input/90 hover:border-bronze/60'
                }`}
              >
                <span className="font-mono text-xs font-bold tabular-nums text-ink">
                  {mw.month}월
                </span>
                <span className="mt-0.5 text-[11px] text-ink-muted">{mw.stemTG}</span>
                <span
                  className={`mt-1 w-full rounded py-1 font-serif text-base font-bold border ${
                    ELEMENT_STYLES[mw.stem.el].box
                  }`}
                >
                  {mw.stem.hanja}
                </span>
                <span
                  className={`mt-1 w-full rounded py-1 font-serif text-base font-bold border ${
                    ELEMENT_STYLES[mw.branch.el].box
                  }`}
                >
                  {mw.branch.hanja}
                </span>
                <span className="mt-1 text-[11px] font-medium text-ink">{mw.branchTG}</span>
                <span className="text-[10px] font-semibold text-bronze-dark">{mw.stage12}</span>
                <div className="mt-1 border-t border-hanji-border/60 pt-1 w-full space-y-0.5 text-[10px] text-ink-muted leading-tight">
                  {mw.sinsal12.map((s, idx) => (
                    <div key={idx}>{s}</div>
                  ))}
                </div>
                {mw.isCurrentMonth && (
                  <span className="mt-1 text-[10px] font-semibold text-bronze">이번 달</span>
                )}
              </button>
            );
          })}
        </div>

        {activeMw && (
          <TransitDetailPanel
            title={`${activeMw.year}년 ${activeMw.month}월 (${activeMw.stem.kor}${activeMw.branch.kor}월 · ${activeMw.stem.hanja}${activeMw.branch.hanja})`}
            meta={`천간 ${activeMw.stemTG}(${ELEMENTS[activeMw.stem.el].kor}) · 지지 ${activeMw.branchTG}(${ELEMENTS[activeMw.branch.el].kor}) · 12운성 ${activeMw.stage12}`}
            assessment={activeMw.assessment}
          />
        )}
      </div>
    </section>
  );
}
