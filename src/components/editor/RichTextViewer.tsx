import React, { useMemo } from 'react';
import { sanitizeHtml } from '../../utils/sanitize';
import { ImageWithSkeleton } from '../common/ImageWithSkeleton';

interface RichTextViewerProps {
  html: string;
  className?: string;
  textSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
}

const renderContentWithImageSkeleton = (html: string): React.ReactNode => {
  if (!html.includes('<img')) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const renderNode = (node: Node, key: string | number): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        if (tagName === 'img') {
          const src = el.getAttribute('src') || '';
          const alt = el.getAttribute('alt') || '첨부 이미지';
          return (
            <ImageWithSkeleton
              key={key}
              src={src}
              alt={alt}
              containerClassName="my-2 max-h-64 rounded-lg overflow-hidden border border-border bg-muted/40 p-0.5 cursor-pointer hover:opacity-90 transition-opacity mx-auto flex items-center justify-center"
              className="max-h-60 object-contain rounded-lg mx-auto shadow-2xs"
              onClick={(e) => {
                e.stopPropagation();
                if (src) window.open(src, '_blank');
              }}
              title="클릭하여 원본 이미지 보기"
            />
          );
        }

        // 이미지가 포함되지 않은 블록은 원본 innerHTML 그대로 렌더링
        if (!el.querySelector('img')) {
          return React.createElement(tagName, {
            key,
            className: el.className || undefined,
            dangerouslySetInnerHTML: { __html: el.innerHTML },
          });
        }

        // 이미지가 포함된 부모 태그는 자식들을 순회하여 img만 ImageWithSkeleton으로 치환
        const children = Array.from(el.childNodes).map((child, idx) =>
          renderNode(child, `${key}-${idx}`)
        );

        return React.createElement(
          tagName,
          { key, className: el.className || undefined },
          ...children
        );
      }
      return null;
    };

    return Array.from(doc.body.childNodes).map((node, idx) => renderNode(node, idx));
  } catch {
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }
};

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
    >
      {renderContentWithImageSkeleton(sanitized)}
    </div>
  );
};
