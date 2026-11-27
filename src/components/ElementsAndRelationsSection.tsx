import { useState } from 'react';
import { ELEMENTS, ELEMENT_STYLES } from '../lib/sajuData';
import type { SajuResult } from '../types/saju';

interface ElementsAndRelationsSectionProps {
  data: SajuResult;
}

export function ElementsAndRelationsSection({ data }: ElementsAndRelationsSectionProps) {
  const [chartMode, setChartMode] = useState<'weight' | 'count'>('weight');

  const dayP = data.pillars[1];
  const totalCount = data.elCount.reduce((a, b) => a + b, 0) || 1;
  const totalWeight = data.elWeight.reduce((a, b) => a + b, 0) || 1;

  const yp = data.yongshinProfile;
  const yongPrimaryEls = yp.yongshin.map((x) => x.el);
  const heeEls = yp.heeshin.map((x) => x.el);
  const giEls = yp.gishin.map((x) => x.el);

  const renderRoleElements = (
    items: Array<{ el: number; tenGodGroup: string; reason: string }>
  ) =>
    items.map((item, idx) => (
      <div key={`${item.el}-${idx}`} className="mt-1 first:mt-0">
        <span className={`font-serif font-bold ${ELEMENT_STYLES[item.el].text}`}>
          {ELEMENTS[item.el].kor}({ELEMENTS[item.el].hanja})
        </span>
        <span className="ml-1.5 text-[11px] text-ink-muted">{item.tenGodGroup}</span>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{item.reason}</p>
      </div>
    ));

  return (
    <div id="elements" className="scroll-mt-20 space-y-6">
      {/* 02. 오행 분포 · 신강신약 · 격국 · 용희기구 */}
      <section className="rounded-xl border border-hanji-border bg-hanji-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-hanji-border">
          <div>
            <p className="text-xs font-medium text-ink-muted">
              02. 오행 균형 · 격국(格局) · 용희기구(用喜忌仇)
            </p>
            <h2 className="mt-1 font-serif text-xl font-bold text-ink">
              오행 분포, 신강·신약 및 용신 4분류 진단
            </h2>
          </div>

          <div className="no-print flex items-center gap-1 rounded-lg bg-hanji-subtle p-1">
            <button
              type="button"
              onClick={() => setChartMode('weight')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartMode === 'weight'
                  ? 'bg-hanji-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              월지 가중치
            </button>
            <button
              type="button"
              onClick={() => setChartMode('count')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chartMode === 'count'
                  ? 'bg-hanji-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              글자 개수
            </button>
          </div>
        </div>

        {/* 상단: 오행 분포 차트 + 신강/신약 스펙트럼 */}
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-3.5">
            {ELEMENTS.map((el) => {
              const cnt = data.elCount[el.idx];
              const weight = data.elWeight[el.idx];
              const pctCount = Math.round((cnt / totalCount) * 100);
              const pctWeight = Math.round((weight / totalWeight) * 100);
              const activePct = chartMode === 'weight' ? pctWeight : pctCount;
              const style = ELEMENT_STYLES[el.idx];

              const roleTag = yongPrimaryEls.includes(el.idx)
                ? { text: '용신', cls: 'text-wood-fg' }
                : heeEls.includes(el.idx)
                  ? { text: '희신', cls: 'text-bronze-dark' }
                  : giEls.includes(el.idx)
                    ? { text: '기신', cls: 'text-fire-fg' }
                    : null;

              return (
                <div
                  key={el.idx}
                  className="grid grid-cols-[94px_1fr_92px] items-center gap-3 text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`font-serif font-bold ${style.text}`}>{el.hanja}</span>
                    <span className="font-semibold text-ink">{el.kor}</span>
                    {roleTag && (
                      <span className={`text-[11px] font-semibold ${roleTag.cls}`}>
                        {roleTag.text}
                      </span>
                    )}
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-hanji-subtle">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
                      style={{ width: `${Math.max(activePct, cnt > 0 ? 4 : 0)}%` }}
                    />
                  </div>

                  <div className="text-right font-mono text-xs tabular-nums text-ink-muted">
                    <strong className="text-ink">
                      {chartMode === 'weight' ? `${pctWeight}%` : `${cnt}자`}
                    </strong>{' '}
                    <span>({chartMode === 'weight' ? `${cnt}자` : `${pctCount}%`})</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between border-t border-hanji-border pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-ink-muted">일간 신강·신약</span>
                <span className="font-serif text-lg font-bold text-ink">
                  {data.strengthLabel}
                </span>
              </div>

              <div className="mt-3">
                <div className="relative h-2.5 rounded-full bg-hanji-subtle overflow-hidden">
                  <div
                    className="h-full rounded-full bg-bronze transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(4, data.strengthRatio))}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums text-ink-muted">
                  <span>신약 0%</span>
                  <span className="font-semibold text-ink">
                    자아·인성 세력 {data.strengthRatio}%
                  </span>
                  <span>신강 100%</span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                일간{' '}
                <strong className="text-ink">
                  {dayP.stemObj?.kor}
                  {dayP.stemObj?.hanja}({ELEMENTS[dayP.stemObj?.el ?? 0].kor})
                </strong>{' '}
                기준{' '}
                <strong className="text-ink">
                  {data.geokguk.name}({data.geokguk.hanja})
                </strong>{' '}
                구조이며, <strong>{yp.method}</strong> 원리로 용신을 판별했습니다.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-hanji-border/70 pt-3 text-xs text-ink-muted">
              {Object.entries(data.tenGodGroups).map(([grp, count]) => (
                <span key={grp} className="tabular-nums">
                  {grp} <strong className="text-ink">{count}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 중단: 격국 및 용신·희신·기신·구신 4분류 */}
        <div className="mt-7 pt-6 border-t border-hanji-border space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="font-serif text-base font-bold text-ink">
                격국(格局) — {data.geokguk.name} ({data.geokguk.hanja})
              </h3>
              <p className="mt-0.5 text-xs text-ink-muted">
                {data.geokguk.category} · {data.geokguk.basis}
              </p>
            </div>
            <span className="text-xs font-semibold text-bronze-dark">
              용신 선정 기준: {yp.method}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink/90">{data.geokguk.summary}</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-hanji-border/70 pt-4">
            <div className="rounded-lg border border-hanji-border bg-hanji/50 p-3.5">
              <div className="text-xs font-bold text-wood-fg">용신(用神) · 핵심 수호신</div>
              <div className="mt-2">{renderRoleElements(yp.yongshin)}</div>
            </div>
            <div className="rounded-lg border border-hanji-border bg-hanji/50 p-3.5">
              <div className="text-xs font-bold text-bronze-dark">희신(喜神) · 보조 길신</div>
              <div className="mt-2">{renderRoleElements(yp.heeshin)}</div>
            </div>
            <div className="rounded-lg border border-hanji-border bg-hanji/50 p-3.5">
              <div className="text-xs font-bold text-fire-fg">기신(忌神) · 최우선 경계 오행</div>
              <div className="mt-2">{renderRoleElements(yp.gishin)}</div>
            </div>
            <div className="rounded-lg border border-hanji-border bg-hanji/50 p-3.5">
              <div className="text-xs font-bold text-ink-muted">구신(仇神) · 기신을 돕는 오행</div>
              <div className="mt-2">{renderRoleElements(yp.gushin)}</div>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ink-muted">{yp.rationale}</p>
        </div>

        {/* 하단: 원국 핵심 구조 패턴 자동 진단 */}
        {data.structureDiagnostics.length > 0 && (
          <div className="mt-6 pt-5 border-t border-hanji-border">
            <h3 className="text-xs font-semibold text-ink-muted pb-2.5">
              원국 핵심 구조 패턴 자동 진단
            </h3>
            <ul className="divide-y divide-hanji-border/60">
              {data.structureDiagnostics.map((diag) => (
                <li key={diag.id} className="py-3 first:pt-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-sm font-bold text-ink">{diag.title}</span>
                      {diag.hanja && (
                        <span className="font-serif text-xs text-ink-muted">({diag.hanja})</span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        diag.tone === 'good'
                          ? 'text-wood-fg'
                          : diag.tone === 'warn'
                            ? 'text-fire-fg'
                            : 'text-ink-muted'
                      }`}
                    >
                      {diag.tone === 'good' ? '강점 구조' : diag.tone === 'warn' ? '주의 패턴' : '기질 특성'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{diag.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 03. 형충회합 및 주요 신살 */}
      <section className="rounded-xl border border-hanji-border bg-hanji-surface p-5 sm:p-7">
        <div className="pb-4 border-b border-hanji-border">
          <p className="text-xs font-medium text-ink-muted">
            03. 형충회합(刑沖會合) · 원진(怨嗔) · 신살(神殺)
          </p>
          <h2 className="mt-1 font-serif text-xl font-bold text-ink">
            원국 내 합·충·원진 작용과 주요 신살
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold text-ink-muted pb-2.5 border-b border-hanji-border/70">
              천간 합·충 · 지지 육합·삼합·방합·육충·형·파·해·원진
            </h3>
            <ul className="divide-y divide-hanji-border/60">
              {data.relations.map((rel, idx) => (
                <li key={`${rel.title}-${idx}`} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-ink-muted">{rel.category}</span>
                      <span className="font-serif text-sm font-bold text-ink">{rel.title}</span>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        rel.type === 'good'
                          ? 'text-wood-fg'
                          : rel.type === 'warn'
                            ? 'text-fire-fg'
                            : 'text-ink-muted'
                      }`}
                    >
                      {rel.type === 'good' ? '조화·결집' : rel.type === 'warn' ? '변동·충돌' : '긴장·안정'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{rel.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-ink-muted pb-2.5 border-b border-hanji-border/70">
              천을·천월덕·복성귀인 · 도화·역마·화개 · 양인·백호·현침
            </h3>
            <ul className="divide-y divide-hanji-border/60">
              {data.sinsal.map((item, idx) => (
                <li key={`${item.name}-${idx}`} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-sm font-bold text-ink">{item.name}</span>
                      <span className="font-serif text-xs text-ink-muted">({item.hanja})</span>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        item.type === 'good'
                          ? 'text-wood-fg'
                          : item.type === 'warn'
                            ? 'text-fire-fg'
                            : 'text-bronze-dark'
                      }`}
                    >
                      {item.type === 'good' ? '길신' : item.type === 'warn' ? '강성 신살' : '기질 특성'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
