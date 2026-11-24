import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from './RichTextEditor';

interface CardEditorField {
  label: string;
  hint?: string;
  ariaLabel: string;
  value: string;
  onChange: (html: string) => void;
}

interface CardEditorFieldsProps {
  front: CardEditorField;
  back: CardEditorField & { placeholder: string };
  height: string;
  autoFocusFront?: boolean;
}

export function CardEditorFields({ front, back, height, autoFocusFront }: CardEditorFieldsProps) {
  const fields = [
    {
      ...front,
      side: '앞면',
      badgeVariant: 'secondary' as const,
      placeholder: '단어, 질문 또는 핵심 키워드를 입력하세요...',
      autoFocus: autoFocusFront,
    },
    { ...back, side: '뒷면', badgeVariant: 'warning' as const, autoFocus: false },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map(({ side, label, hint, badgeVariant, ...editorProps }) => (
        <div key={side} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              {label}
              {hint && <span className="text-muted-foreground font-normal">{hint}</span>}
            </span>
            <Badge variant={badgeVariant} className="text-[10px] font-medium py-0">
              {side}
            </Badge>
          </div>
          <RichTextEditor {...editorProps} height={height} />
        </div>
      ))}
    </div>
  );
}
