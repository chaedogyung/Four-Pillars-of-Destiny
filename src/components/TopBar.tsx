interface TopBarProps {
  onJumpToAi: () => void;
}

export function TopBar({ onJumpToAi }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-hanji-border bg-hanji/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-[1320px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="font-serif text-lg font-bold tracking-wide text-ink whitespace-nowrap shrink-0"
        >
          淸明 만세력
        </a>

        <nav
          aria-label="주요 섹션 이동"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-muted"
        >
          <a
            href="#pillars"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-ink hover:underline underline-offset-4"
          >
            사주 원국
          </a>
          <a
            href="#elements"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-ink hover:underline underline-offset-4"
          >
            오행·합충
          </a>
          <a
            href="#cycles"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-ink hover:underline underline-offset-4"
          >
            대운·세운
          </a>
          <a
            href="#report"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-ink hover:underline underline-offset-4"
          >
            종합 해석
          </a>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onJumpToAi}
            className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-hanji-surface transition-colors hover:bg-bronze-dark whitespace-nowrap shrink-0 cursor-pointer"
          >
            AI 심층 풀이
          </button>
        </div>
      </div>
    </header>
  );
}
