import React, { useMemo } from 'react';
import { sanitizeHtml } from '../../utils/sanitize';

interface RichTextViewerProps {
  html: string;
  className?: string;
  textSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
}

export const RichTextViewer: React.FC<RichTextViewerProps> = ({
  html,
  className = '',
  textSize = 'base',
}) => {
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);

  const sizeClass = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed',
    xl: 'text-xl leading-relaxed',
    '2xl': 'text-2xl leading-relaxed font-medium',
  }[textSize];

  if (!sanitized) {
    return <span className="text-slate-400 italic text-sm">(내용 없음)</span>;
  }

  return (
    <div
      className={`rich-content prose prose-slate max-w-none text-foreground break-words [word-break:break-word] ${sizeClass} ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
