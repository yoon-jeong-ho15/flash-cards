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
    <Card
      onClick={onClick}
      className="group p-5 hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
    >
      <div className="flex items-start gap-3.5 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 border border-primary/15">
          <FolderIcon className="w-5 h-5 fill-primary/20" />
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

      <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Layers className="w-3.5 h-3.5 text-primary" />
          덱 {decksCount}개
        </span>
        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground group-hover:text-primary transition-colors font-medium">
          열기 <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Card>
  );
});

FolderCard.displayName = 'FolderCard';
