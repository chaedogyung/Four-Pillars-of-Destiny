import { useEffect, useMemo, useState } from 'react';
import { ELEMENTS, ELEMENT_STYLES } from '../lib/sajuData';
import { buildSewoonsForRange } from '../lib/sajuEngine';
import type { SajuResult } from '../types/saju';

interface LuckCyclesSectionProps {
  data: SajuResult;
}

export function LuckCyclesSection({ data }: LuckCyclesSectionProps) {
  const birthYear = Number(data.input.solarDateStr.slice(0, 4));
  const currentAge = new Date().getFullYear() - birthYear + 1;
  const dayStem = data.pillars[1].stem ?? 0;

  const defaultDwIdx = useMemo(() => {
    const found = data.daewoons.findIndex(
      (dw) => currentAge >= dw.age && currentAge <= dw.endAge
    );
    return found >= 0 ? found : 0;
  }, [data.daewoons, currentAge]);

  const [selectedDwIdx, setSelectedDwIdx] = useState<number>(defaultDwIdx);
  const [sewoonMode, setSewoonMode] = useState<'recent' | 'decade'>('recent');
  const [selectedSwYear, setSelectedSwYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    setSelectedDwIdx(defaultDwIdx);
    setSewoonMode('recent');
    setSelectedSwYear(new Date().getFullYear());
  }, [data, defaultDwIdx]);

  const activeDw = data.daewoons[selectedDwIdx] ?? data.daewoons[0];

  const displayedSewoons = useMemo(() => {
    if (sewoonMode === 'decade' && activeDw) {
      return buildSewoonsForRange(activeDw.year, 10, birthYear, dayStem);
    }
    return data.sewoons;
  }, [sewoonMode, activeDw, birthYear, dayStem, data.sewoons]);

  const activeSw =
    displayedSewoons.find((sw) => sw.year === selectedSwYear) ??
    displayedSewoons.find((sw) => sw.isCurrent) ??
    displayedSewoons[0];

  const dwGood =
    activeDw &&
    (data.yongshinEls.includes(activeDw.stem.el) ||
      data.yongshinEls.includes(activeDw.branch.el));

  const swGood =
    activeSw &&
    (data.yongshinEls.includes(activeSw.stem.el) ||
      data.yongshinEls.includes(activeSw.branch.el));

  return (
    <section
      id="cycles"
      className="scroll-mt-20 rounded-xl border border-hanji-border bg-hanji-surface p-5 sm:p-7"
    >
      {/* 대운 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-hanji-border">
        <div>
          <p className="text-xs font-medium text-ink-muted">
            04. 대운(大運) · 세운(歲運) 흐름
          </p>
          <h2 className="mt-1 font-serif text-xl font-bold text-ink">
            10년 대운표 및 연도별 세운
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-muted tabular-nums">
          <strong className="text-ink">
            {data.daewoonMeta.isForward ? '순행(順行)' : '역행(逆行)'}
          </strong>
          <span aria-hidden="true">·</span>
          <span>대운수 {data.daewoonMeta.daewoonNum}</span>
          <span aria-hidden="true">·</span>
          <span>절입일 간격 {data.daewoonMeta.daysToTerm}일</span>
        </div>
      </div>

      {/* 대운 가로 스트립 */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-ink-muted">
            대운 (클릭하여 10년 운기 확인)
          </span>
          <span className="font-mono text-xs tabular-nums text-ink-muted">
            현재 {currentAge}세
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {data.daewoons.map((dw) => {
            const isSelected = dw.index === selectedDwIdx;
            const isNow = currentAge >= dw.age && currentAge <= dw.endAge;
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
                className={`flex flex-col items-center rounded-lg border px-2 py-2.5 text-center transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-bronze bg-[#fffcf4]'
                    : 'border-hanji-border bg-white/80 hover:border-bronze/60'
                }`}
              >
                <span className="font-mono text-[11px] font-semibold tabular-nums text-ink-muted">
                  {dw.age}세~
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
                <span className="mt-1 text-[11px] text-ink-muted">{dw.branchTG}</span>
                <span className="mt-0.5 font-mono text-[10px] tabular-nums text-ink-muted/80">
                  {isNow ? '현재 대운' : `${dw.year}년`}
                </span>
              </button>
            );
          })}
        </div>

        {activeDw && (
          <div className="mt-3.5 rounded-lg bg-hanji px-4 py-3 text-xs sm:text-sm leading-relaxed text-ink">
            <strong className="font-serif">
              {activeDw.age}~{activeDw.endAge}세 대운 ({activeDw.stem.kor}
              {activeDw.branch.kor} · {activeDw.stem.hanja}
              {activeDw.branch.hanja}, {activeDw.year}~{activeDw.year + 9}년)
            </strong>
            <span className="mx-2 text-ink-muted">|</span>
            <span>
              천간 <strong>{activeDw.stemTG}</strong>({ELEMENTS[activeDw.stem.el].kor}) · 지지{' '}
              <strong>{activeDw.branchTG}</strong>({ELEMENTS[activeDw.branch.el].kor}) · 12운성{' '}
              <strong>{activeDw.stage12}</strong>.{' '}
              {dwGood
                ? '용신·희신 오행이 함께 유입되어 확장과 성과가 열리기 좋은 10년 주기입니다.'
                : '외부 확장보다 전문 역량 축적과 리스크 관리에 집중할수록 안정적인 결실을 거두는 시기입니다.'}
            </span>
          </div>
        )}
      </div>

      {/* 세운 스트립 */}
      <div className="mt-7 pt-6 border-t border-hanji-border">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="text-xs font-semibold text-ink-muted">
            세운 (연도별 흐름 — 클릭 시 상세 풀이)
          </span>
          <div className="flex items-center gap-1 rounded-lg bg-hanji-subtle p-1">
            <button
              type="button"
              onClick={() => {
                setSewoonMode('recent');
                setSelectedSwYear(new Date().getFullYear());
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

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-5 lg:grid-cols-10">
          {displayedSewoons.map((sw) => {
            const isSelected = activeSw && sw.year === activeSw.year;
            return (
              <button
                key={sw.year}
                type="button"
                onClick={() => setSelectedSwYear(sw.year)}
                className={`flex flex-col items-center rounded-lg border px-1.5 py-2 text-center transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-bronze bg-[#fffcf4]'
                    : 'border-hanji-border bg-white/80 hover:border-bronze/60'
                }`}
              >
                <span className="font-mono text-[11px] font-semibold tabular-nums text-ink">
                  {sw.year}
                </span>
                <span className="mt-0.5 text-[10px] text-ink-muted">{sw.stemTG}</span>
                <span
                  className={`mt-1 w-full rounded py-0.5 font-serif text-base font-bold border ${
                    ELEMENT_STYLES[sw.stem.el].box
                  }`}
                >
                  {sw.stem.hanja}
                </span>
                <span
                  className={`mt-1 w-full rounded py-0.5 font-serif text-base font-bold border ${
                    ELEMENT_STYLES[sw.branch.el].box
                  }`}
                >
                  {sw.branch.hanja}
                </span>
                <span className="mt-1 text-[10px] text-ink-muted">{sw.branchTG}</span>
                <span className="font-mono text-[10px] tabular-nums text-ink-muted/80">
                  {sw.isCurrent ? '올해' : `${sw.age}세`}
                </span>
              </button>
            );
          })}
        </div>

        {activeSw && (
          <div className="mt-3.5 rounded-lg bg-hanji px-4 py-3 text-xs sm:text-sm leading-relaxed text-ink">
            <strong className="font-serif">
              {activeSw.year}년 {activeSw.stem.kor}
              {activeSw.branch.kor}년 ({activeSw.stem.hanja}
              {activeSw.branch.hanja} · {activeSw.age}세)
            </strong>
            <span className="mx-2 text-ink-muted">|</span>
            <span>
              천간 <strong>{activeSw.stemTG}</strong>, 지지 <strong>{activeSw.branchTG}</strong>,
              12운성 <strong>{activeSw.stage12}</strong>의 기운이 작용합니다.{' '}
              {swGood
                ? '원국에 필요한 용신·희신 오행이 함께 들어와 새로운 기회와 긍정적 전환을 모색하기 좋습니다.'
                : '무리한 변화보다 내실을 다지고 기존 기반과 관계를 세밀히 점검할 때 성과가 단단해집니다.'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
