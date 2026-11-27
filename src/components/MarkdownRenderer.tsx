import type { ReactNode } from 'react';

interface MarkdownRendererProps {
  content: string;
}

function renderInlineBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${keyPrefix}`} className="my-3 space-y-1.5 pl-5 list-disc text-sm sm:text-[15px] leading-relaxed text-ink/90">
        {listItems.map((item, i) => (
          <li key={i}>{renderInlineBold(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(String(index));
      return;
    }

    if (line.startsWith('## ')) {
      flushList(String(index));
      blocks.push(
        <h3
          key={`h2-${index}`}
          className="mt-6 first:mt-0 pb-2 border-b border-hanji-border font-serif text-base sm:text-lg font-bold text-ink"
        >
          {line.slice(3)}
        </h3>
      );
      return;
    }

    if (line.startsWith('### ')) {
      flushList(String(index));
      blocks.push(
        <h4
          key={`h3-${index}`}
          className="mt-4 font-serif text-sm sm:text-base font-bold text-bronze-dark"
        >
          {line.slice(4)}
        </h4>
      );
      return;
    }

    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      listItems.push(line.slice(2).trim());
      return;
    }

    flushList(String(index));
    blocks.push(
      <p key={`p-${index}`} className="my-2.5 text-sm sm:text-[15px] leading-[1.8] text-ink/90">
        {renderInlineBold(line)}
      </p>
    );
  });

  flushList('end');

  return <div className="max-w-prose">{blocks}</div>;
}
