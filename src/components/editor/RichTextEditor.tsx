import React, { useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikeIcon,
  Highlighter as HighlightIcon,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  autoFocus?: boolean;
}

const normalizeHtml = (html?: string | null): string => {
  if (!html) return '';
  const trimmed = html.trim();
  if (trimmed === '<p></p>' || trimmed === '<p><br></p>' || trimmed === '<p></br></p>') {
    return '';
  }
  return trimmed;
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
  minHeight = '90px',
  className = '',
  autoFocus = false,
}) => {
  const lastEmittedValueRef = useRef<string>(value);
  const hasFocusedRef = useRef(false);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        code: false,
        codeBlock: false,
      }),
      Underline,
      Highlight.configure({
        multicolor: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    [placeholder]
  );

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const cleanHtml = editor.isEmpty ? '' : html;
      lastEmittedValueRef.current = cleanHtml;
      onChange(cleanHtml);
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none p-3 text-foreground text-sm leading-relaxed`,
        style: `min-height: ${minHeight};`,
      },
    },
  });

  useEffect(() => {
    if (autoFocus && editor && !editor.isDestroyed && !hasFocusedRef.current) {
      hasFocusedRef.current = true;
      const timer = setTimeout(() => {
        editor.commands.focus('end');
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    if (value === lastEmittedValueRef.current) {
      return;
    }

    if (editor.isFocused) {
      return;
    }

    const currentHtml = editor.getHTML();
    if (normalizeHtml(value) === normalizeHtml(currentHtml)) {
      return;
    }

    lastEmittedValueRef.current = value;
    editor.commands.setContent(value || '', false);
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    title,
    children,
  }: {
    onClick: () => void;
    isActive?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      tabIndex={-1}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      title={title}
      className={cn(
        'h-7 w-7 rounded-md p-0 flex items-center justify-center text-xs transition-colors cursor-pointer',
        isActive
          ? 'bg-muted text-foreground font-semibold border border-border shadow-2xs'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      className={cn(
        'border border-input rounded-xl bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-all shadow-2xs overflow-hidden flex flex-col',
        className
      )}
    >
      {/* 툴바 */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-muted/40 border-b border-border select-none overflow-x-auto gap-2">
        <div className="flex items-center gap-1 shrink-0">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="굵게 (Ctrl+B)"
          >
            <BoldIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="기울임 (Ctrl+I)"
          >
            <ItalicIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="밑줄 (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="취소선"
          >
            <StrikeIcon className="w-3.5 h-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            title="형광펜 강조"
          >
            <HighlightIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            isActive={false}
            title="실행 취소 (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            isActive={false}
            title="다시 실행 (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>
      </div>

      {/* 에디터 본문 영역 */}
      <div
        className="cursor-text flex-1"
        onClick={(e) => {
          if (e.target === e.currentTarget && editor && !editor.isFocused) {
            editor.commands.focus('end');
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
