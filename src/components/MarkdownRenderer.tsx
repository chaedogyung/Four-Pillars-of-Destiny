import type { ReactNode } from 'react';

interface MarkdownRendererProps {
  content: string;
}

function renderInlineFormatting(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-hanji-subtle px-1 py-0.5 font-mono text-[0.88em] text-ink"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function parseTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = parseTableCells(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];
  let tableRows: string[][] = [];

  const flushUl = (keyPrefix: string) => {
    if (ulItems.length === 0) return;
    blocks.push(
      <ul
        key={`ul-${keyPrefix}`}
        className="my-3 space-y-1.5 pl-5 list-disc text-sm sm:text-[15px] leading-[1.78] text-ink/90"
      >
        {ulItems.map((item, i) => (
          <li key={i}>{renderInlineFormatting(item)}</li>
        ))}
      </ul>
    );
    ulItems = [];
  };

  const flushOl = (keyPrefix: string) => {
    if (olItems.length === 0) return;
    blocks.push(
      <ol
        key={`ol-${keyPrefix}`}
        className="my-3 space-y-1.5 pl-5 list-decimal text-sm sm:text-[15px] leading-[1.78] text-ink/90"
      >
        {olItems.map((item, i) => (
          <li key={i}>{renderInlineFormatting(item)}</li>
        ))}
      </ol>
    );
    olItems = [];
  };

  const flushTable = (keyPrefix: string) => {
    if (tableRows.length === 0) return;
    const [header, ...body] = tableRows;
    blocks.push(
      <div
        key={`tbl-${keyPrefix}`}
        className="my-4 overflow-x-auto rounded-lg border border-hanji-border bg-hanji-surface"
      >
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-hanji-border bg-hanji-subtle/60">
              {header.map((cell, i) => (
                <th
                  key={i}
                  className="px-3 py-2 font-serif font-bold text-ink whitespace-nowrap"
                >
                  {renderInlineFormatting(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hanji-border/70">
            {body.map((row, rIdx) => (
              <tr key={rIdx}>
                {header.map((_, cIdx) => (
                  <td
                    key={cIdx}
                    className={`px-3 py-2 align-top leading-relaxed ${
                      cIdx === 0 ? 'font-semibold text-ink whitespace-nowrap' : 'text-ink/90'
                    }`}
                  >
                    {renderInlineFormatting(row[cIdx] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  const flushAll = (keyPrefix: string) => {
    flushUl(keyPrefix);
    flushOl(keyPrefix);
    flushTable(keyPrefix);
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushAll(String(index));
      return;
    }

    // 마크다운 표 행
    if (line.startsWith('|') && line.includes('|', 1)) {
      flushUl(String(index));
      flushOl(String(index));
      if (!isTableSeparator(line)) {
        tableRows.push(parseTableCells(line));
      }
      return;
    } else if (tableRows.length > 0) {
      flushTable(String(index));
    }

    // 구분선
    if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
      flushAll(String(index));
      blocks.push(<hr key={`hr-${index}`} className="my-5 border-hanji-border" />);
      return;
    }

    // 헤딩
    if (line.startsWith('## ')) {
      flushAll(String(index));
      blocks.push(
        <h3
          key={`h2-${index}`}
          className="mt-7 first:mt-0 pb-2 border-b border-hanji-border font-serif text-base sm:text-lg font-bold text-ink"
        >
          {renderInlineFormatting(line.slice(3))}
        </h3>
      );
      return;
    }

    if (line.startsWith('### ')) {
      flushAll(String(index));
      blocks.push(
        <h4
          key={`h3-${index}`}
          className="mt-4 font-serif text-sm sm:text-base font-bold text-bronze-dark"
        >
          {renderInlineFormatting(line.slice(4))}
        </h4>
      );
      return;
    }

    if (line.startsWith('# ')) {
      flushAll(String(index));
      blocks.push(
        <h2
          key={`h1-${index}`}
          className="mt-6 first:mt-0 font-serif text-lg sm:text-xl font-bold text-ink"
        >
          {renderInlineFormatting(line.slice(2))}
        </h2>
      );
      return;
    }

    // 인용문 (두꺼운 좌측 보더 없이 에디토리얼 헤어라인 박스)
    if (line.startsWith('> ')) {
      flushAll(String(index));
      blocks.push(
        <blockquote
          key={`bq-${index}`}
          className="my-3 rounded-lg border border-hanji-border bg-hanji-subtle/50 px-4 py-3 font-serif text-sm sm:text-[15px] leading-relaxed text-ink"
        >
          {renderInlineFormatting(line.slice(2))}
        </blockquote>
      );
      return;
    }

    // 순서 없는 목록
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      flushOl(String(index));
      ulItems.push(line.slice(2).trim());
      return;
    }

    // 순서 있는 목록 (예: 1. ...)
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushUl(String(index));
      olItems.push(olMatch[1].trim());
      return;
    }

    flushAll(String(index));
    blocks.push(
      <p key={`p-${index}`} className="my-2.5 text-sm sm:text-[15px] leading-[1.8] text-ink/90">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  flushAll('end');

  return <div className="max-w-prose">{blocks}</div>;
}
