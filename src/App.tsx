import { useCallback, useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { BirthInputPanel } from './components/BirthInputPanel';
import { FourPillarsSection } from './components/FourPillarsSection';
import { ElementsAndRelationsSection } from './components/ElementsAndRelationsSection';
import { LuckCyclesSection } from './components/LuckCyclesSection';
import { ComprehensiveReportSection } from './components/ComprehensiveReportSection';
import { DEFAULT_PLACE } from './lib/sajuData';
import { calculateSaju } from './lib/sajuEngine';
import {
  fetchKasiLunarFromSolar,
  fetchKasiSolarFromLunar,
} from './lib/externalApis';
import type {
  BirthPlace,
  KasiCalendarInfo,
  SajuFormInput,
  SajuResult,
  ThemeMode,
} from './types/saju';

const THEME_STORAGE_KEY = 'cheongmyeong_theme';

const INITIAL_FORM: SajuFormInput = {
  name: '홍길동',
  gender: 'M',
  calendarType: 'solar',
  birthDate: '1992-08-15',
  birthTime: '14:30',
  unknownTime: false,
  trueSolar: true,
  includeEoT: true,
  yajasi: false,
};

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore storage restriction
  }
  return 'light';
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [form, setForm] = useState<SajuFormInput>(INITIAL_FORM);
  const [place, setPlace] = useState<BirthPlace>(DEFAULT_PLACE);
  const [result, setResult] = useState<SajuResult>(() =>
    calculateSaju({
      name: INITIAL_FORM.name,
      gender: INITIAL_FORM.gender,
      calendarType: INITIAL_FORM.calendarType,
      originalInputDate: INITIAL_FORM.birthDate,
      solarDateStr: INITIAL_FORM.birthDate,
      timeStr: INITIAL_FORM.birthTime,
      unknownTime: INITIAL_FORM.unknownTime,
      trueSolar: INITIAL_FORM.trueSolar,
      includeEoT: INITIAL_FORM.includeEoT,
      yajasi: INITIAL_FORM.yajasi,
      place: DEFAULT_PLACE,
      kasiInfo: null,
    })
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'info' | 'error'; text: string } | null>(
    null
  );

  const aiSectionRef = useRef<HTMLElement | null>(null);

  // html.dark 클래스 동기화 및 테마 설정 저장
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage restriction
    }
  }, [theme]);

  const handleAnalyze = useCallback(
    async (targetForm: SajuFormInput, targetPlace: BirthPlace) => {
      setIsSubmitting(true);
      setStatusMsg(null);

      try {
        const [iy, im, id] = targetForm.birthDate.split('-').map(Number);
        if (!iy || !im || !id) {
          throw new Error('올바른 생년월일을 입력해 주세요.');
        }

        let solarDateStr = targetForm.birthDate;
        let kasiInfo: KasiCalendarInfo | null = null;

        if (targetForm.calendarType === 'lunar' || targetForm.calendarType === 'lunar_leap') {
          kasiInfo = await fetchKasiSolarFromLunar(
            iy,
            im,
            id,
            targetForm.calendarType === 'lunar_leap'
          );
          solarDateStr = `${kasiInfo.solYear}-${String(kasiInfo.solMonth).padStart(2, '0')}-${String(kasiInfo.solDay).padStart(2, '0')}`;
          setStatusMsg({
            type: 'info',
            text: `KASI 음양력 변환 완료: 음력 ${targetForm.birthDate}(${
              targetForm.calendarType === 'lunar_leap' ? '윤달' : '평달'
            }) → 양력 ${solarDateStr}`,
          });
        } else {
          try {
            kasiInfo = await fetchKasiLunarFromSolar(iy, im, id);
          } catch {
            kasiInfo = null;
          }
        }

        const calculated = calculateSaju({
          name: targetForm.name,
          gender: targetForm.gender,
          calendarType: targetForm.calendarType,
          originalInputDate: targetForm.birthDate,
          solarDateStr,
          timeStr: targetForm.birthTime,
          unknownTime: targetForm.unknownTime,
          trueSolar: targetForm.trueSolar,
          includeEoT: targetForm.includeEoT,
          yajasi: targetForm.yajasi,
          place: targetPlace,
          kasiInfo,
        });
        setResult(calculated);
      } catch (err) {
        setStatusMsg({
          type: 'error',
          text: err instanceof Error ? err.message : '사주 계산 중 오류가 발생했습니다.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  // 초기 로드 시 서버에 설정된 KASI 음양력 정보를 자동으로 조회해 반영
  useEffect(() => {
    void handleAnalyze(INITIAL_FORM, DEFAULT_PLACE);
  }, [handleAnalyze]);

  const handleJumpToAi = () => {
    aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div id="top" className="min-h-screen flex flex-col">
      <TopBar onJumpToAi={handleJumpToAi} />

      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* 에디토리얼 도입부 + 워크스페이스 테마 전환 바 */}
        <div className="mb-6 pb-5 border-b border-hanji-border flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-bronze-dark">
              자평명리학(子平命理學) · 천문 태양황경 정통 만세력
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Jean Meeus 태양 황경 절기 계산, Open-Meteo 출생지 경도 진태양시 보정 및 한국천문연구원(KASI) 음양력 검증을 지원합니다.
            </p>
          </div>

          <div
            role="group"
            aria-label="화면 테마 선택"
            className="inline-flex items-center gap-1 rounded-lg bg-hanji-subtle p-1 shrink-0"
          >
            <button
              type="button"
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                theme === 'light'
                  ? 'bg-hanji-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Sun className="h-3.5 w-3.5 text-bronze" aria-hidden="true" />
              한지 라이트
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                theme === 'dark'
                  ? 'bg-hanji-surface text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Moon className="h-3.5 w-3.5 text-bronze" aria-hidden="true" />
              다크 만세력
            </button>
          </div>
        </div>

        {/* 데스크톱 2컬럼 / 모바일 1컬럼 반응형 워크스페이스 */}
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-20">
            <BirthInputPanel
              form={form}
              place={place}
              isSubmitting={isSubmitting}
              statusMsg={statusMsg}
              onChangeForm={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              onChangePlace={setPlace}
              onSubmit={() => void handleAnalyze(form, place)}
            />
          </div>

          <div className="lg:col-span-8 space-y-6">
            <FourPillarsSection data={result} />
            <ElementsAndRelationsSection data={result} />
            <LuckCyclesSection data={result} />
            <ComprehensiveReportSection data={result} aiSectionRef={aiSectionRef} />
          </div>
        </div>
      </main>

      <footer className="mt-14 border-t border-hanji-border bg-hanji-surface/70">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-ink-muted sm:px-6 lg:px-8">
          <span className="font-serif font-semibold text-ink">淸明 · 정통 사주팔자 만세력</span>
          <span>
            Jean Meeus 태양황경 · Open-Meteo Geocoding · 한국천문연구원(KASI) 음양력 API 연동
          </span>
        </div>
      </footer>
    </div>
  );
}
