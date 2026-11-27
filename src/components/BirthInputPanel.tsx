import { useState, type FormEvent } from 'react';
import { MapPin, Search } from 'lucide-react';
import { PRESET_PLACES } from '../lib/sajuData';
import { getTimezoneOffsetHours } from '../lib/sajuEngine';
import { searchBirthPlaceAPI } from '../lib/externalApis';
import type { BirthPlace, CalendarType, Gender, SajuFormInput } from '../types/saju';

interface BirthInputPanelProps {
  form: SajuFormInput;
  place: BirthPlace;
  isSubmitting: boolean;
  statusMsg: { type: 'info' | 'error'; text: string } | null;
  onChangeForm: (patch: Partial<SajuFormInput>) => void;
  onChangePlace: (place: BirthPlace) => void;
  onSubmit: () => void;
}

export function BirthInputPanel({
  form,
  place,
  isSubmitting,
  statusMsg,
  onChangeForm,
  onChangePlace,
  onSubmit,
}: BirthInputPanelProps) {
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<BirthPlace[]>([]);
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const [y, m, d] = (form.birthDate || '1992-08-15').split('-').map(Number);
  const tzOffset = getTimezoneOffsetHours(
    place.timezone,
    y || 1992,
    m || 8,
    d || 15,
    12
  );
  const lonCorrMin = (place.longitude - tzOffset * 15) * 4;

  const handlePlaceSearch = async () => {
    const q = placeQuery.trim();
    if (!q) return;
    setIsSearchingPlace(true);
    setPlaceError(null);
    try {
      const results = await searchBirthPlaceAPI(q);
      setPlaceResults(results);
      if (results.length === 0) {
        setPlaceError('검색 결과가 없습니다. 영문 도시명(예: Busan, Tokyo)으로도 검색해 보세요.');
      }
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : '도시 검색에 실패했습니다.');
    } finally {
      setIsSearchingPlace(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <aside className="rounded-xl border border-hanji-border bg-hanji-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3 pb-4 border-b border-hanji-border">
        <h2 className="font-serif text-lg font-bold text-ink">명식 정보 입력</h2>
        <span className="text-xs text-ink-muted">진태양시 · 절기 정밀산출</span>
      </div>

      <form onSubmit={handleFormSubmit} className="mt-5 space-y-5">
        {/* 기본 신상 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div>
            <label htmlFor="saju-name" className="block text-xs font-semibold text-ink-muted mb-1.5">
              이름 (선택)
            </label>
            <input
              id="saju-name"
              type="text"
              value={form.name}
              onChange={(e) => onChangeForm({ name: e.target.value })}
              placeholder="예: 홍길동"
              className="w-full rounded-lg border border-hanji-border bg-hanji-input px-3 py-2 text-sm text-ink transition-colors focus:border-bronze"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-ink-muted mb-1.5">성별</span>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-hanji-subtle p-1">
              {([
                { val: 'M', label: '남성 · 乾' },
                { val: 'F', label: '여성 · 坤' },
              ] as Array<{ val: Gender; label: string }>).map((g) => (
                <button
                  key={g.val}
                  type="button"
                  onClick={() => onChangeForm({ gender: g.val })}
                  className={`rounded-md py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    form.gender === g.val
                      ? 'bg-hanji-surface text-ink shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 역법 및 생년월일시 */}
        <div className="space-y-3.5 pt-4 border-t border-hanji-border/70">
          <div>
            <label htmlFor="saju-cal" className="block text-xs font-semibold text-ink-muted mb-1.5">
              역법 선택 · KASI 음양력 기준
            </label>
            <select
              id="saju-cal"
              value={form.calendarType}
              onChange={(e) => onChangeForm({ calendarType: e.target.value as CalendarType })}
              className="w-full rounded-lg border border-hanji-border bg-hanji-input px-3 py-2 text-sm text-ink focus:border-bronze"
            >
              <option value="solar">양력 (陽曆)</option>
              <option value="lunar">음력 · 평달 (陰曆)</option>
              <option value="lunar_leap">음력 · 윤달 (閏月)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div>
              <label htmlFor="saju-date" className="block text-xs font-semibold text-ink-muted mb-1.5">
                생년월일
              </label>
              <input
                id="saju-date"
                type="date"
                required
                value={form.birthDate}
                onChange={(e) => onChangeForm({ birthDate: e.target.value })}
                className="w-full rounded-lg border border-hanji-border bg-hanji-input px-3 py-2 font-mono text-sm tabular-nums text-ink focus:border-bronze"
              />
            </div>

            <div>
              <label htmlFor="saju-time" className="block text-xs font-semibold text-ink-muted mb-1.5">
                출생 시각
              </label>
              <input
                id="saju-time"
                type="time"
                disabled={form.unknownTime}
                value={form.birthTime}
                onChange={(e) => onChangeForm({ birthTime: e.target.value })}
                className="w-full rounded-lg border border-hanji-border bg-hanji-input px-3 py-2 font-mono text-sm tabular-nums text-ink disabled:bg-hanji-subtle disabled:text-ink-muted/60 focus:border-bronze"
              />
            </div>
          </div>
        </div>

        {/* 출생 도시 검색 (Open-Meteo Geocoding API) */}
        <div className="space-y-2.5 pt-4 border-t border-hanji-border/70">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="place-query" className="text-xs font-semibold text-ink-muted">
              출생 도시 (Open-Meteo 경도 조회)
            </label>
            <span className="font-mono text-[11px] tabular-nums text-bronze">
              {Math.abs(place.longitude).toFixed(2)}°{place.longitude >= 0 ? 'E' : 'W'}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              id="place-query"
              type="text"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handlePlaceSearch();
                }
              }}
              placeholder="도시명 검색 (예: 부산, 제주, 도쿄)"
              className="min-w-0 flex-1 rounded-lg border border-hanji-border bg-hanji-input px-3 py-2 text-sm text-ink focus:border-bronze"
            />
            <button
              type="button"
              onClick={() => void handlePlaceSearch()}
              disabled={isSearchingPlace}
              className="inline-flex items-center gap-1.5 rounded-lg border border-hanji-border bg-hanji px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-hanji-subtle whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              {isSearchingPlace ? '검색 중' : '검색'}
            </button>
          </div>

          {/* 빠른 도시 선택 */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-muted">
            {PRESET_PLACES.map((p) => {
              const isSelected = p.name === place.name && p.timezone === place.timezone;
              return (
                <button
                  key={`${p.name}-${p.timezone}`}
                  type="button"
                  onClick={() => {
                    onChangePlace(p);
                    setPlaceResults([]);
                    setPlaceError(null);
                  }}
                  className={`cursor-pointer transition-colors hover:text-ink ${
                    isSelected ? 'font-bold text-bronze underline underline-offset-4' : ''
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          {placeError && <p className="text-xs text-fire-fg">{placeError}</p>}

          {placeResults.length > 0 && (
            <div className="divide-y divide-hanji-border rounded-lg border border-hanji-border bg-hanji-input">
              {placeResults.map((item, idx) => (
                <button
                  key={`${item.name}-${item.latitude}-${idx}`}
                  type="button"
                  onClick={() => {
                    onChangePlace(item);
                    setPlaceResults([]);
                    setPlaceQuery(item.name);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-hanji cursor-pointer"
                >
                  <span className="truncate text-ink">
                    <strong>{item.name}</strong>
                    {item.admin1 ? ` · ${item.admin1}` : ''} ({item.country})
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-muted">
                    {item.longitude.toFixed(2)}° · {item.timezone}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted pt-1">
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              <MapPin className="h-3.5 w-3.5 text-bronze" aria-hidden="true" />
              {place.name}
              {place.admin1 ? `, ${place.admin1}` : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {place.timezone} (UTC{tzOffset >= 0 ? '+' : ''}
              {tzOffset})
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-bronze-dark">
              경도 {lonCorrMin >= 0 ? '+' : ''}
              {lonCorrMin.toFixed(1)}분
            </span>
          </div>
        </div>

        {/* 정밀 보정 옵션 */}
        <div className="space-y-2.5 pt-4 border-t border-hanji-border/70 text-xs text-ink">
          <p className="font-semibold text-ink-muted">천문·명리 계산 옵션</p>
          <label className="flex items-center gap-2.5 cursor-pointer py-0.5">
            <input
              type="checkbox"
              checked={form.unknownTime}
              onChange={(e) => onChangeForm({ unknownTime: e.target.checked })}
              className="h-4 w-4 accent-bronze rounded"
            />
            <span>출생 시간 모름 (삼주만 분석)</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer py-0.5">
            <input
              type="checkbox"
              checked={form.trueSolar}
              disabled={form.unknownTime}
              onChange={(e) => onChangeForm({ trueSolar: e.target.checked })}
              className="h-4 w-4 accent-bronze rounded"
            />
            <span className={form.unknownTime ? 'text-ink-muted' : ''}>
              출생지 경도 진태양시 보정
            </span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer py-0.5">
            <input
              type="checkbox"
              checked={form.includeEoT}
              disabled={form.unknownTime || !form.trueSolar}
              onChange={(e) => onChangeForm({ includeEoT: e.target.checked })}
              className="h-4 w-4 accent-bronze rounded"
            />
            <span className={form.unknownTime || !form.trueSolar ? 'text-ink-muted' : ''}>
              균시차(태양 타원 궤도 보정) 포함
            </span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer py-0.5">
            <input
              type="checkbox"
              checked={form.yajasi}
              disabled={form.unknownTime}
              onChange={(e) => onChangeForm({ yajasi: e.target.checked })}
              className="h-4 w-4 accent-bronze rounded"
            />
            <span className={form.unknownTime ? 'text-ink-muted' : ''}>
              야자시 적용 (23시~자정 당일 일주 유지)
            </span>
          </label>
        </div>

        <p className="pt-3 border-t border-hanji-border/70 text-[11px] leading-relaxed text-ink-muted">
          음양력 변환 및 일진 검증은 한국천문연구원(KASI) 음양력 정보와 Jean Meeus 태양황경 알고리즘을 기준으로 자동 계산됩니다.
        </p>

        {statusMsg && (
          <div
            role="status"
            className={`rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
              statusMsg.type === 'error'
                ? 'bg-fire-bg text-fire-fg border border-fire-bd'
                : 'bg-water-bg text-water-fg border border-water-bd'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-hanji-surface transition-colors hover:bg-bronze-dark disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? '천문 계산 및 API 조회 중...' : '사주팔자 분석하기'}
        </button>
      </form>
    </aside>
  );
}
