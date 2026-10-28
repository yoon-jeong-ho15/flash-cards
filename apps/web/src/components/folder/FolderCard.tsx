import React, { memo } from 'react';
import { Folder } from '../../types';
import { Folder as FolderIcon, Layers, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface FolderCardProps {
  folder: Folder;
  decksCount: number;
  onClick: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = memo(({
  folder,
  decksCount,
  onClick,
}) => {
  return (
    <Card className="group overflow-hidden hover:border-primary/40 hover:shadow-md transition-all">
    <button type="button" tabIndex={-1} onClick={onClick} aria-label={`${folder.title} 폴더 열기`} className="flex h-full w-full flex-col justify-between p-5 text-left">
      <div className="flex items-start gap-3.5 mb-3">
        <div className="w-11 h-11 rounded-xl bg-[#f5eddb] text-[#947031] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
          <FolderIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground text-sm sm:text-base group-hover:text-primary transition-colors truncate">
            {folder.title}
          </h3>
          {folder.description ? (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
              {folder.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic mt-0.5">설명 없음</p>
          )}
        </div>
      </div>

      <div className="flex w-full items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Layers className="w-3.5 h-3.5 text-primary" />
          덱 {decksCount}개
        </span>
        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground group-hover:text-primary transition-colors font-medium">
          열기 <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
    </Card>
  );
});

FolderCard.displayName = 'FolderCard';
