import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Renders text clamped to `lines`, with a "Show more / Show less" toggle that
 * only appears when the text is actually long enough to be truncated. Keeps
 * long shift-report notes readable without blowing out a table row by default.
 */
export function ExpandableText({
  text,
  lines = 2,
  className = '',
}: {
  text: string;
  lines?: number;
  className?: string;
}): React.ReactElement {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measured while clamped: an overflow means there's hidden text.
    setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [text, lines]);

  const clampStyle: React.CSSProperties = expanded
    ? {}
    : {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: lines,
        overflow: 'hidden',
      };

  return (
    <div className={className}>
      <p ref={ref} style={clampStyle} className="whitespace-pre-wrap break-words">
        {text}
      </p>
      {(truncated || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-0.5 text-xs font-medium text-accent hover:underline cursor-pointer"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
