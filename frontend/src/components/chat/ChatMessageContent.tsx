import { Fragment, type ReactNode } from 'react';

interface ChatMessageContentProps {
  content: string;
  className?: string;
}

export function ChatMessageContent({ content, className = '' }: ChatMessageContentProps) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className={`whitespace-pre-line text-sm leading-relaxed ${className}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (/^#{1,6}\s+/.test(trimmed)) {
          return (
            <div key={i} className="font-bold text-slate-900 mt-2 first:mt-0">
              {renderInline(line.replace(/^#{1,6}\s+/, ''))}
            </div>
          );
        }

        let text = line;
        if (/^[*\u2022\u00B7-]\s+/.test(trimmed)) {
          text = line.replace(/^[*\u2022\u00B7-]\s+/, '• ');
        }

        return (
          <Fragment key={i}>
            {i > 0 ? '\n' : null}
            {renderInline(text)}
          </Fragment>
        );
      })}
    </div>
  );
}

function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    const inner = token.startsWith('**') ? token.slice(2, -2) : token.slice(1, -1);
    nodes.push(
      <strong key={nodes.length} className="font-bold text-slate-900">
        {renderInline(inner)}
      </strong>,
    );
    last = regex.lastIndex;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return <>{nodes}</>;
}