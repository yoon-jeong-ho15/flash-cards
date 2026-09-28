import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikeIcon,
  Highlighter as HighlightIcon,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { compressImage } from '../../utils/imageCompressor';
import { uploadCardImage } from '../../services/storageService';
import { useFlashcardStore } from '../../store/useFlashcardStore';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  height?: string;
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
  height = '120px',
  minHeight,
  className = '',
  autoFocus = false,
}) => {
  const { user } = useFlashcardStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const lastEmittedValueRef = useRef<string>(value);
  const hasFocusedRef = useRef(false);
  const editorHeight = height || minHeight || '120px';

  const uploadAndInsertImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
      }

      const MAX_ORIGINAL_SIZE = 15 * 1024 * 1024;
      if (file.size > MAX_ORIGINAL_SIZE) {
        alert('원본 이미지 크기는 15MB 이하여야 합니다.');
        return;
      }

      try {
        setIsUploading(true);
        setUploadError(null);

        const compressedFile = await compressImage(file, {
          maxWidth: 1024,
          maxSizeMB: 1,
          quality: 0.8,
        });

        const downloadUrl = await uploadCardImage(compressedFile, user?.uid);

        const currentEditor = editorRef.current;
        if (currentEditor && !currentEditor.isDestroyed) {
          const success = currentEditor.commands.setImage({
            src: downloadUrl,
            alt: '본문 첨부 이미지',
          });
          if (!success) {
            currentEditor
              .chain()
              .focus()
              .setImage({ src: downloadUrl, alt: '본문 첨부 이미지' })
              .run();
          }
        }
      } catch (err: any) {
        console.error('에디터 이미지 업로드 실패:', err);
        setUploadError(err?.message || '이미지 처리 중 오류가 발생했습니다.');
      } finally {
        setIsUploading(false);
      }
    },
    [user?.uid]
  );

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
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class:
            'rounded-lg max-h-64 max-w-full object-contain my-2 border border-border shadow-2xs mx-auto block select-none',
          loading: 'lazy',
        },
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
        class: `prose prose-sm max-w-none focus:outline-none p-3 text-foreground text-sm leading-relaxed overflow-y-auto`,
        style: `min-height: 0; height: ${editorHeight}; max-height: ${editorHeight};`,
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files[0]
        ) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            uploadAndInsertImage(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                uploadAndInsertImage(file);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

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
      {/* 숨겨진 파일 인풋 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        disabled={isUploading}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && !isUploading) {
            uploadAndInsertImage(file);
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
      />

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

          <Separator orientation="vertical" className="h-4 mx-1" />

          {/* 본문 사진 업로드 버튼 */}
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            isActive={false}
            title="본문에 사진 삽입 (드래그 & 드롭, 붙여넣기도 가능)"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isUploading && (
            <span className="text-[11px] font-medium text-primary flex items-center gap-1 animate-pulse mr-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              최적화 업로드 중...
            </span>
          )}

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

      {/* 업로드 에러 메시지 */}
      {uploadError && (
        <div className="px-3 py-1 bg-destructive/10 text-destructive text-[11px] border-t border-destructive/20 flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-muted-foreground hover:text-foreground text-[10px] ml-2 cursor-pointer"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
};
