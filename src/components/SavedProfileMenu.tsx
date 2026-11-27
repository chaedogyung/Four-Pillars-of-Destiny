import { useEffect, useMemo, useRef, useState } from 'react';
import { BookMarked, ChevronDown, Search, Trash2, X } from 'lucide-react';
import type { CalendarType, SavedSajuProfile } from '../types/saju';

interface SavedProfileMenuProps {
  profiles: SavedSajuProfile[];
  activeProfileId: string | null;
  isAnalyzing: boolean;
  onSelectProfile: (profile: SavedSajuProfile) => void;
  onDeleteProfile: (id: string) => void;
}

function formatCalendarLabel(type: CalendarType): string {
  if (type === 'lunar') return '음력';
  if (type === 'lunar_leap') return '윤달';
  return '양력';
}

export function SavedProfileMenu({
  profiles,
  activeProfileId,
  isAnalyzing,
  onSelectProfile,
  onDeleteProfile,
}: SavedProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((item) => {
      const haystack = [
        item.form.name || '무명',
        item.form.birthDate,
        item.place.name,
        item.summary.dayPillarLabel,
        item.summary.ganjiLine,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [profiles, searchQuery]);

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) setSearchQuery('');
      return next;
    });
  };

  const handleChoose = (profile: SavedSajuProfile) => {
    setIsOpen(false);
    setSearchQuery('');
    onSelectProfile(profile);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="saved-profiles-panel"
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          isOpen
            ? 'border-bronze bg-hanji-subtle text-ink'
            : 'border-hanji-border bg-hanji-surface text-ink hover:bg-hanji-subtle'
        }`}
      >
        <BookMarked className="h-3.5 w-3.5 text-bronze shrink-0" aria-hidden="true" />
        <span>명식 목록</span>
        {profiles.length > 0 && (
          <span className="font-mono tabular-nums text-bronze-dark">({profiles.length})</span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 text-ink-muted transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id="saved-profiles-panel"
          role="dialog"
          aria-label="저장된 명식 목록"
          className="absolute right-0 top-full z-40 mt-2 w-[min(calc(100vw-1.5rem),24rem)] rounded-xl border border-hanji-border bg-hanji-surface shadow-lg"
        >
          {/* 패널 헤더 */}
          <div className="flex items-center justify-between gap-3 border-b border-hanji-border px-4 py-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <h3 className="font-serif text-sm font-bold text-ink whitespace-nowrap">
                저장된 명식
              </h3>
              <span className="text-xs text-ink-muted tabular-nums whitespace-nowrap">
                총 {profiles.length}건
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearchQuery('');
              }}
              aria-label="명식 목록 닫기"
              className="rounded-md p-1 text-ink-muted transition-colors hover:bg-hanji-subtle hover:text-ink cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* 검색 필터 (4건 이상일 때 노출) */}
          {profiles.length >= 4 && (
            <div className="border-b border-hanji-border px-3.5 py-2.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름, 생년월일, 일주, 도시 검색"
                  aria-label="저장된 명식 검색"
                  className="w-full rounded-lg border border-hanji-border bg-hanji-input py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-ink-muted/70 focus:border-bronze"
                />
              </div>
            </div>
          )}

          {/* 목록 본문 */}
          {profiles.length === 0 ? (
            <div className="px-4 py-7 text-center">
              <p className="text-sm font-medium text-ink">아직 저장된 명식이 없습니다.</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                명식 정보를 입력하고 <strong className="font-semibold text-ink">사주팔자 분석하기</strong>를 누르면 이곳에 자동으로 저장됩니다.
              </p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-ink-muted">
              검색 조건과 일치하는 명식이 없습니다.
            </div>
          ) : (
            <ul className="max-h-[min(65vh,25rem)] overflow-y-auto divide-y divide-hanji-border">
              {filteredProfiles.map((profile) => {
                const isActive = profile.id === activeProfileId;
                const displayName = profile.form.name.trim() || '무명';
                const genderLabel = profile.form.gender === 'M' ? '남' : '여';
                const timeText = profile.form.unknownTime
                  ? '시 모름'
                  : profile.summary.sijinName
                    ? `${profile.form.birthTime} (${profile.summary.sijinName})`
                    : profile.form.birthTime;

                return (
                  <li
                    key={profile.id}
                    className={`flex items-stretch transition-colors ${
                      isActive
                        ? 'bg-hanji-highlight'
                        : 'hover:bg-hanji-subtle/60'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => handleChoose(profile)}
                      className="min-w-0 flex-1 px-4 py-3 text-left cursor-pointer disabled:opacity-60"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="truncate font-serif text-sm font-bold text-ink">
                            {displayName}
                          </span>
                          <span className="text-xs text-ink-muted shrink-0">
                            {genderLabel}
                          </span>
                        </div>
                        {isActive && (
                          <span className="text-[11px] font-semibold text-bronze-dark whitespace-nowrap shrink-0">
                            현재 조회중
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-xs text-ink">
                        <span className="font-semibold text-bronze-dark">
                          {profile.summary.dayPillarLabel}
                        </span>
                        <span className="mx-1.5 text-ink-muted" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-serif text-ink-muted">
                          {profile.summary.ganjiLine}
                        </span>
                      </p>

                      <p className="mt-1 truncate font-mono text-[11px] tabular-nums text-ink-muted">
                        {formatCalendarLabel(profile.form.calendarType)} {profile.form.birthDate}{' '}
                        {timeText} · {profile.place.name}
                      </p>
                    </button>

                    <div className="flex items-center pr-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProfile(profile.id);
                        }}
                        aria-label={`${displayName} 명식 삭제`}
                        title="목록에서 삭제"
                        className="rounded-md p-2 text-ink-muted transition-colors hover:bg-fire-bg hover:text-fire-fg cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* 하단 안내 */}
          {profiles.length > 0 && (
            <div className="border-t border-hanji-border px-4 py-2.5 text-[11px] text-ink-muted">
              명식을 선택하면 입력값이 자동 채워지고 사주 분석이 바로 실행됩니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
