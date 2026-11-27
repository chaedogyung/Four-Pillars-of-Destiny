import { BRANCHES, ELEMENTS, ELEMENT_STYLES } from '../lib/sajuData';
import type { SajuResult } from '../types/saju';

interface FourPillarsSectionProps {
  data: SajuResult;
}

export function FourPillarsSection({ data }: FourPillarsSectionProps) {
  const dayP = data.pillars[1];
  const yearP = data.pillars[3];
  const genderTxt = data.input.gender === 'M' ? '건명(남)' : '곤명(여)';
  const st = data.solarTimeDetail;

  const gongmangText = data.gongmang
    .map((b) => `${BRANCHES[b].kor}(${BRANCHES[b].hanja})`)
    .join(' · ');

  const kasiIljin = data.kasiInfo?.lunIljin?.slice(0, 2) || '';
  const calcIljin =
    dayP.stemObj && dayP.branchObj ? `${dayP.stemObj.kor}${dayP.branchObj.kor}` : '';
  const kasiVerified = Boolean(kasiIljin && kasiIljin === calcIljin);

  const corrSummary = data.input.unknownTime
    ? '출생 시간 미상 (삼주 분석)'
    : data.input.trueSolar
      ? `${data.adjustedTimeStr} (경도 ${st.lonCorrMin >= 0 ? '+' : ''}${st.lonCorrMin.toFixed(1)}분${
          data.input.includeEoT
            ? `, 균시차 ${st.eotCorrMin >= 0 ? '+' : ''}${st.eotCorrMin.toFixed(1)}분`
            : ''
        })`
      : `${data.adjustedTimeStr} (보정 미적용)`;

  return (
    <section id="pillars" className="scroll-mt-20 rounded-xl border border-hanji-border bg-hanji-surface p-5 sm:p-7">
      {/* 에디토리얼 섹션 헤더 */}
      <div className="pb-5 border-b border-hanji-border">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-ink-muted">
          <span>01. 사주 원국 (四柱原局)</span>
          <span aria-hidden="true">·</span>
          <span>{genderTxt}</span>
          {yearP.branchObj && (
            <>
              <span aria-hidden="true">·</span>
              <span>{yearP.branchObj.animal}띠</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>공망 {gongmangText}</span>
        </div>

        <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          {data.input.name}님의 명식
          {dayP.stemObj && dayP.branchObj && (
            <span className="ml-2.5 font-serif font-semibold text-bronze">
              {dayP.stemObj.kor}
              {dayP.branchObj.kor}일주 ({dayP.stemObj.hanja}
              {dayP.branchObj.hanja})
            </span>
          )}
        </h1>
      </div>

      {/* 천문·역법 메타데이터 그리드 */}
      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-b border-hanji-border pb-5 text-xs sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <dt className="text-ink-muted">양력 생년월일시</dt>
          <dd className="mt-0.5 font-mono font-medium tabular-nums text-ink">
            {data.input.solarDateStr}{' '}
            {data.input.unknownTime ? '(시간 모름)' : data.input.timeStr}
            {data.input.yajasi && !data.input.unknownTime ? ' · 야자시' : ''}
          </dd>
        </div>

        <div>
          <dt className="text-ink-muted">진태양시 기준</dt>
          <dd className="mt-0.5 font-mono font-medium tabular-nums text-ink">
            {corrSummary}
          </dd>
        </div>

        <div>
          <dt className="text-ink-muted">출생지 · 시간대</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {data.place.name}{' '}
            <span className="font-mono tabular-nums text-ink-muted">
              ({Math.abs(data.place.longitude).toFixed(2)}°
              {data.place.longitude >= 0 ? 'E' : 'W'}, UTC
              {st.utcOffsetHours >= 0 ? '+' : ''}
              {st.utcOffsetHours})
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-ink-muted">출생 절기 · 입춘</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {data.currentTermInfo.name}{' '}
            <span className="font-mono tabular-nums text-ink-muted">
              · 입춘 {data.currentTermInfo.ipchunDateStr}
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-ink-muted">절입 경계</dt>
          <dd className="mt-0.5 font-mono tabular-nums text-ink">
            {data.currentTermInfo.prevTermDateStr} ~ {data.currentTermInfo.nextTermName}{' '}
            {data.currentTermInfo.nextTermDateStr.slice(5)}
          </dd>
        </div>

        {data.kasiInfo && (
          <div>
            <dt className="text-ink-muted">KASI 천문연 음력 검증</dt>
            <dd className="mt-0.5 font-mono tabular-nums text-ink">
              음력 {data.kasiInfo.lunYear}-{data.kasiInfo.lunMonth}-{data.kasiInfo.lunDay} (
              {data.kasiInfo.lunLeapmonth}달)
              {kasiIljin && (
                <span
                  className={`ml-1.5 font-sans font-semibold ${
                    kasiVerified ? 'text-wood-fg' : 'text-ink-muted'
                  }`}
                >
                  {kasiVerified ? '· 일진 일치' : `· 기준일 ${data.kasiInfo.lunIljin}`}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {/* 사주 4기둥 테이블 (시주 · 일주 · 월주 · 연주) */}
      <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-4 text-center">
        {data.pillars.map((p) => {
          const isDay = p.key === 'day';
          if (p.empty || !p.stemObj || !p.branchObj) {
            return (
              <div
                key={p.key}
                className="flex flex-col justify-between rounded-xl border border-dashed border-hanji-border bg-hanji/50 px-2 py-4 sm:px-3.5 sm:py-5"
              >
                <div>
                  <div className="text-xs font-semibold text-ink-muted">
                    {p.label} <span className="hidden sm:inline font-serif">({p.hanjaLabel})</span>
                  </div>
                  <div className="mt-2 text-xs text-ink-muted">—</div>
                </div>
                <div className="my-4 space-y-2.5">
                  <div className="rounded-lg border border-dashed border-hanji-border bg-hanji-surface/70 py-4 text-ink-muted/60">
                    <div className="font-serif text-2xl sm:text-3xl font-bold">?</div>
                    <div className="mt-1 text-[11px]">시간 미상</div>
                  </div>
                  <div className="rounded-lg border border-dashed border-hanji-border bg-hanji-surface/70 py-4 text-ink-muted/60">
                    <div className="font-serif text-2xl sm:text-3xl font-bold">?</div>
                    <div className="mt-1 text-[11px]">삼주 분석</div>
                  </div>
                </div>
                <div className="border-t border-hanji-border/70 pt-3 text-[11px] leading-snug text-ink-muted">
                  출생 시각 입력 시<br className="hidden sm:inline" /> 시주가 표시됩니다
                </div>
              </div>
            );
          }

          const stemStyle = ELEMENT_STYLES[p.stemObj.el];
          const branchStyle = ELEMENT_STYLES[p.branchObj.el];
          const isGongmang = p.branch !== null && data.gongmang.includes(p.branch) && !isDay;

          return (
            <div
              key={p.key}
              className={`flex flex-col rounded-xl border px-2 py-3.5 sm:px-4 sm:py-5 transition-colors ${
                isDay
                  ? 'border-bronze bg-[#fffdf8]'
                  : 'border-hanji-border bg-white/80'
              }`}
            >
              {/* 기둥 명칭 */}
              <div className="text-xs font-semibold text-ink-muted">
                <span className={isDay ? 'text-bronze-dark' : ''}>{p.label}</span>{' '}
                <span className="hidden sm:inline font-serif font-normal">({p.hanjaLabel})</span>
              </div>

              {/* 천간 십성 */}
              <div className="mt-2 text-xs font-semibold text-ink">
                {isDay ? (
                  <span className="text-bronze-dark">일간 · 본원</span>
                ) : (
                  p.stemTenGod
                )}
              </div>

              {/* 천간 글자 */}
              <div
                className={`mt-2 rounded-lg border px-1.5 py-3 sm:py-4 ${stemStyle.box}`}
              >
                <div className="font-serif text-3xl sm:text-4xl font-bold leading-none">
                  {p.stemObj.hanja}
                </div>
                <div className="mt-1.5 text-[11px] sm:text-xs font-semibold opacity-90">
                  {p.stemObj.kor} · {ELEMENTS[p.stemObj.el].kor}({p.stemObj.pol ? '양' : '음'})
                </div>
              </div>

              {/* 지지 글자 */}
              <div
                className={`mt-2 rounded-lg border px-1.5 py-3 sm:py-4 ${branchStyle.box}`}
              >
                <div className="font-serif text-3xl sm:text-4xl font-bold leading-none">
                  {p.branchObj.hanja}
                </div>
                <div className="mt-1.5 text-[11px] sm:text-xs font-semibold opacity-90">
                  {p.branchObj.kor} · {ELEMENTS[p.branchObj.el].kor}
                </div>
              </div>

              {/* 지지 십성 (본기 기준) */}
              <div className="mt-2 text-xs font-semibold text-ink">{p.branchTenGod}</div>

              {/* 지장간 · 12운성 · 공망 */}
              <div className="mt-3 space-y-1.5 border-t border-hanji-border/70 pt-3 text-[11px] sm:text-xs text-ink-muted">
                <div>
                  <span className="block text-[10px] text-ink-muted/80">지장간</span>
                  <div className="mt-0.5 flex flex-wrap justify-center gap-x-1.5 font-serif font-semibold text-ink">
                    {(p.hiddenStems || []).map((h, i) => (
                      <span key={`${p.key}-h-${i}`} title={`${h.role}: ${h.stem.kor}(${h.stem.hanja})`}>
                        {h.stem.hanja}
                        <span className="font-sans text-[10px] font-normal text-ink-muted">
                          {h.stem.kor}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-1.5 pt-0.5">
                  <span>12운성</span>
                  <strong className="font-semibold text-ink">{p.stage12}</strong>
                  {isGongmang && (
                    <span className="font-semibold text-seal">· 공망</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
