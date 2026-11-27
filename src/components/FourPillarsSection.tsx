import { useState } from 'react';
import { BRANCHES, ELEMENTS, ELEMENT_STYLES } from '../lib/sajuData';
import type { PillarVisibility, SajuResult } from '../types/saju';

interface FourPillarsSectionProps {
  data: SajuResult;
}

const DEFAULT_VISIBILITY: PillarVisibility = {
  tenGods: true,
  sinsal: true,
  stage12: true,
  relations: true,
};

export function FourPillarsSection({ data }: FourPillarsSectionProps) {
  const [visibility, setVisibility] = useState<PillarVisibility>(DEFAULT_VISIBILITY);

  const dayP = data.pillars[1];
  const yearP = data.pillars[3];
  const birthYear = Number(data.input.solarDateStr.slice(0, 4));
  const koreanAge = new Date().getFullYear() - birthYear + 1;
  const genderTxt = data.input.gender === 'M' ? '건명(남)' : '곤명(여)';
  const st = data.solarTimeDetail;

  const dayGongmangText = data.gongmang.map((b) => BRANCHES[b].hanja).join('');
  const yearGongmangText = data.yearGongmang.map((b) => BRANCHES[b].hanja).join('');
  const cheoneulText = data.cheoneulBranches.map((b) => BRANCHES[b].hanja).join('');

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

  const toggleVisibility = (key: keyof PillarVisibility) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section
      id="pillars"
      className="scroll-mt-20 rounded-xl border border-hanji-border bg-hanji-surface p-5 sm:p-7"
    >
      {/* 에디토리얼 섹션 헤더 */}
      <div className="pb-5 border-b border-hanji-border">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-ink-muted">
          <span>01. 사주 원국 (四柱原局)</span>
          <span aria-hidden="true">·</span>
          <span>{genderTxt}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">세는나이 {koreanAge}세</span>
          {yearP.branchObj && (
            <>
              <span aria-hidden="true">·</span>
              <span>{yearP.branchObj.animal}띠</span>
            </>
          )}
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

        {data.kasiInfo ? (
          <div>
            <dt className="text-ink-muted">한국천문연구원(KASI) 음양력 정보 기준</dt>
            <dd className="mt-0.5 font-mono tabular-nums text-ink">
              음력 {data.kasiInfo.lunYear}-{data.kasiInfo.lunMonth}-{data.kasiInfo.lunDay} (
              {data.kasiInfo.lunLeapmonth}달)
              {kasiIljin && (
                <span
                  className={`ml-1.5 font-sans font-semibold ${
                    kasiVerified ? 'text-wood-fg' : 'text-ink-muted'
                  }`}
                >
                  {kasiVerified ? '· 천문연 일진 검증 완료' : `· 기준일 ${data.kasiInfo.lunIljin}`}
                </span>
              )}
            </dd>
          </div>
        ) : (
          <div>
            <dt className="text-ink-muted">역법 산출 기준</dt>
            <dd className="mt-0.5 font-medium text-ink">
              Jean Meeus 태양황경 · KASI 음양력 연동
            </dd>
          </div>
        )}
      </dl>

      {/* 원국 표시 항목 체크박스 토글 */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-ink-muted">원국표 표시 항목</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink">
          {(
            [
              { key: 'tenGods', label: '십성' },
              { key: 'sinsal', label: '신살' },
              { key: 'stage12', label: '12운성' },
              { key: 'relations', label: '형충회합' },
            ] as Array<{ key: keyof PillarVisibility; label: string }>
          ).map((item) => (
            <label
              key={item.key}
              className="inline-flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap"
            >
              <input
                type="checkbox"
                checked={visibility[item.key]}
                onChange={() => toggleVisibility(item.key)}
                className="h-3.5 w-3.5 rounded accent-bronze cursor-pointer"
              />
              <span className="font-medium">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 심화 사주 4기둥 테이블 (시주 · 일주 · 월주 · 연주) */}
      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3.5 text-center">
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
                    {p.label}{' '}
                    <span className="hidden sm:inline font-serif font-normal">
                      ({p.hanjaLabel})
                    </span>
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
          const stemTags = p.stemRelTags || [];

          return (
            <div
              key={p.key}
              className={`flex flex-col rounded-xl border px-2 py-3 sm:px-3.5 sm:py-4 transition-colors ${
                isDay
                  ? 'border-bronze bg-hanji-highlight'
                  : 'border-hanji-border bg-hanji-input/90'
              }`}
            >
              {/* 기둥 명칭 + 간지 한글 */}
              <div className="text-xs font-semibold text-ink-muted">
                <span className={isDay ? 'text-bronze-dark' : 'text-ink'}>{p.label}</span>
                <span className="block text-[11px] font-normal text-ink-muted">
                  ({p.stemObj.kor}
                  {p.branchObj.kor})
                </span>
              </div>

              {/* 천간 합·충 행 */}
              {visibility.relations && (
                <div className="mt-2 min-h-[18px] border-y border-hanji-border/60 py-0.5 text-[11px] font-semibold">
                  {stemTags.length > 0 ? (
                    <span className="inline-flex flex-wrap justify-center gap-1">
                      {stemTags.map((t, i) => (
                        <span
                          key={i}
                          className={t.type === 'good' ? 'text-wood-fg' : 'text-fire-fg'}
                        >
                          {t.label}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-ink-muted/50">-</span>
                  )}
                </div>
              )}

              {/* 천간 십성 */}
              {visibility.tenGods && (
                <div className="mt-2 text-xs font-semibold text-ink">
                  {isDay ? (
                    <span className="text-bronze-dark">일간(나)</span>
                  ) : (
                    p.stemTenGod
                  )}
                </div>
              )}

              {/* 천간 한자 */}
              <div className={`mt-1.5 rounded-lg border px-1.5 py-2.5 sm:py-3.5 ${stemStyle.box}`}>
                <div className="font-serif text-3xl sm:text-4xl font-bold leading-none">
                  {p.stemObj.hanja}
                </div>
                <div className="mt-1 text-[10px] sm:text-xs font-semibold opacity-90">
                  {p.stemObj.kor} · {ELEMENTS[p.stemObj.el].kor}({p.stemObj.pol ? '양' : '음'})
                </div>
              </div>

              {/* 지지 한자 */}
              <div className={`mt-1.5 rounded-lg border px-1.5 py-2.5 sm:py-3.5 ${branchStyle.box}`}>
                <div className="font-serif text-3xl sm:text-4xl font-bold leading-none">
                  {p.branchObj.hanja}
                </div>
                <div className="mt-1 text-[10px] sm:text-xs font-semibold opacity-90">
                  {p.branchObj.kor} · {ELEMENTS[p.branchObj.el].kor}
                </div>
              </div>

              {/* 지지 십성 */}
              {visibility.tenGods && (
                <div className="mt-2 text-xs font-semibold text-ink">{p.branchTenGod}</div>
              )}

              {/* 지장간 + 지장간 십성 */}
              <div className="mt-2.5 border-t border-hanji-border/70 pt-2.5 text-[11px] sm:text-xs">
                <div className="space-y-0.5">
                  {(p.hiddenStems || []).map((h, i) => (
                    <div
                      key={`${p.key}-h-${i}`}
                      className="flex items-center justify-center gap-1 leading-snug"
                      title={`${h.role}: ${h.stem.kor}(${h.stem.hanja}) · ${h.tenGod}`}
                    >
                      <span className="font-serif font-bold text-ink">{h.stem.hanja}</span>
                      {visibility.tenGods ? (
                        <span className="text-ink-muted">{h.tenGod}</span>
                      ) : (
                        <span className="text-ink-muted">{h.stem.kor}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 12운성 봉법 + (거법/자좌) */}
              {visibility.stage12 && (
                <div className="mt-2.5 border-t border-hanji-border/70 pt-2 text-[11px] sm:text-xs leading-tight">
                  <div className="font-semibold text-ink">{p.stage12}</div>
                  <div className="mt-0.5 text-[10px] sm:text-[11px] text-ink-muted">
                    ({p.selfStage12})
                  </div>
                </div>
              )}

              {/* 납음오행 */}
              {p.napeum && (
                <div
                  className="mt-2 border-t border-hanji-border/70 pt-2 text-[11px] sm:text-xs font-medium text-ink-muted"
                  title={`납음오행: ${p.napeum.kor}(${p.napeum.hanja})`}
                >
                  {p.napeum.kor}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 기둥별 지지 형충회합 매트릭스 */}
      {visibility.relations && data.branchMatrixRows.length > 0 && (
        <div className="mt-3 rounded-lg border border-hanji-border bg-hanji/60 px-2 py-2.5 sm:px-3.5">
          <div className="mb-1.5 text-[11px] font-semibold text-ink-muted">
            지지 형충회합 관계도 (시 · 일 · 월 · 연)
          </div>
          <div className="divide-y divide-hanji-border/50">
            {data.branchMatrixRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-4 gap-2 py-1 text-center text-[11px] sm:text-xs font-semibold"
              >
                {(['hour', 'day', 'month', 'year'] as const).map((k) => {
                  const val = row.cells[k];
                  return (
                    <span
                      key={k}
                      className={
                        !val
                          ? 'text-ink-muted/30'
                          : row.type === 'good'
                            ? 'text-wood-fg'
                            : row.type === 'warn'
                              ? 'text-fire-fg'
                              : 'text-bronze-dark'
                      }
                    >
                      {val || '·'}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 오행 · 연/일 공망 · 천을귀인 · 월령 한 줄 요약 바 */}
      <div className="mt-4 space-y-1.5 border-y border-hanji-border py-3 text-center text-xs sm:text-sm">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono tabular-nums">
          {ELEMENTS.map((el) => (
            <span key={el.idx} className="inline-flex items-center gap-0.5">
              <span className={`font-serif font-bold ${ELEMENT_STYLES[el.idx].text}`}>
                {el.hanja}
              </span>
              <span className="font-semibold text-ink">{data.elCount[el.idx]}</span>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-ink-muted">
          <span>
            空亡: <strong className="font-serif text-ink">[년]{yearGongmangText}</strong>{' '}
            <strong className="font-serif text-ink">[일]{dayGongmangText}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            天乙貴人: <strong className="font-serif text-ink">{cheoneulText}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            월령(사령):{' '}
            <strong className="font-serif text-bronze-dark">
              {data.wolryeong.stem.hanja}({data.wolryeong.stem.kor})
            </strong>{' '}
            <span className="font-mono text-[11px] tabular-nums">
              (절입 +{data.wolryeong.elapsedDays}일)
            </span>
          </span>
        </div>
      </div>

      {/* 기둥별 12신살 및 길신·특수신살 표 */}
      {visibility.sinsal && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-ink-muted">
            기둥별 공망 · 12신살(년·일 기준) · 주요 길신·신살
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-3.5 text-center">
            {data.pillars.map((p) => {
              if (p.empty) {
                return (
                  <div
                    key={`sinsal-${p.key}`}
                    className="rounded-lg border border-dashed border-hanji-border/70 py-3 text-[11px] text-ink-muted"
                  >
                    -
                  </div>
                );
              }
              const gmList = p.gongmangLabels || [];
              const s12 = p.sinsal12 || [];
              const specials = p.specialStars || [];

              return (
                <div
                  key={`sinsal-${p.key}`}
                  className="rounded-lg border border-hanji-border/80 bg-hanji/50 px-1.5 py-2.5 sm:px-2.5 space-y-2 text-[11px] sm:text-xs"
                >
                  {/* 공망 */}
                  <div className="min-h-[16px]">
                    {gmList.length > 0 ? (
                      gmList.map((g, i) => (
                        <div key={i} className="font-semibold text-seal">
                          {g}
                        </div>
                      ))
                    ) : (
                      <span className="text-ink-muted/40">-</span>
                    )}
                  </div>

                  {/* 12신살 */}
                  <div className="border-t border-hanji-border/60 pt-1.5 space-y-0.5 text-ink">
                    {s12.map((name, i) => (
                      <div key={i} className="font-medium leading-snug">
                        {name}
                      </div>
                    ))}
                  </div>

                  {/* 길신 / 특수신살 */}
                  <div className="border-t border-hanji-border/60 pt-1.5 space-y-0.5">
                    {specials.length > 0 ? (
                      specials.map((stItem, i) => (
                        <div
                          key={i}
                          className={`font-semibold leading-snug ${
                            stItem.tone === 'good'
                              ? 'text-wood-fg'
                              : stItem.tone === 'warn'
                                ? 'text-fire-fg'
                                : 'text-bronze-dark'
                          }`}
                        >
                          {stItem.name}
                        </div>
                      ))
                    ) : (
                      <span className="text-ink-muted/40">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
