import React, { useDeferredValue, useMemo, useState } from 'react';
import { Search, Layers, Folder, ArrowUpRight, X } from 'lucide-react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Modal } from './Modal';
import { Input } from '@/components/ui/input';
import { richTextToText } from '../../utils/search';

interface GlobalSearchProps {
  onClose: () => void;
  onNavigateDeck: (id: string) => void;
  onNavigateFolder: (id: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onClose,
  onNavigateDeck,
  onNavigateFolder,
}) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const decks = useFlashcardStore((state) => state.decks);
  const folders = useFlashcardStore((state) => state.folders);
  const cards = useFlashcardStore((state) => state.cards);
  const results = useMemo(() => {
    const q = deferredQuery.trim().toLocaleLowerCase('ko-KR');
    const cardMatches = new Set<string>();
    if (q)
      cards.forEach((card) => {
        if (
          richTextToText(`${card.termRichText} ${card.definitionRichText}`)
            .toLocaleLowerCase('ko-KR')
            .includes(q)
        )
          cardMatches.add(card.deckId);
      });
    const matchingDecks = decks
      .filter(
        (deck) =>
          !q ||
          `${deck.title} ${deck.description || ''}`.toLocaleLowerCase('ko-KR').includes(q) ||
          cardMatches.has(deck.id)
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const matchingFolders = q
      ? folders.filter((folder) =>
          `${folder.title} ${folder.description || ''}`.toLocaleLowerCase('ko-KR').includes(q)
        )
      : [];
    return { decks: matchingDecks, folders: matchingFolders, cardMatches };
  }, [deferredQuery, decks, folders, cards]);
  const navigate = (action: () => void) => {
    onClose();
    action();
  };
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="학습 자료 검색"
      icon={<Search className="h-5 w-5 text-primary" />}
      maxWidth="xl"
    >
      <div className="relative">
        <Input
          autoFocus
          aria-label="덱, 폴더, 카드 내용 검색"
          placeholder="덱, 폴더, 카드 내용 검색…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="h-12 pr-10"
        />
        {query && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setQuery('')}
            aria-label="검색어 지우기"
            className="absolute right-2 top-2 rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div
        className="mt-5 max-h-[min(52dvh,420px)] overflow-y-auto"
        aria-busy={query !== deferredQuery}
      >
        <p role="status" className="mb-2 text-xs text-muted-foreground">
          {deferredQuery.trim()
            ? `덱 ${results.decks.length}개 · 폴더 ${results.folders.length}개 검색됨`
            : '최근 수정한 덱'}
        </p>
        {!results.decks.length && !results.folders.length && (
          <div className="py-9 text-center">
            <Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              {query.trim() ? '검색 결과가 없어요' : '아직 학습 덱이 없어요'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {query.trim()
                ? '다른 단어나 짧은 검색어로 찾아보세요.'
                : '덱을 만들면 이곳에서 빠르게 찾을 수 있어요.'}
            </p>
          </div>
        )}
        {results.decks.slice(0, 8).map((deck) => (
          <button
            key={deck.id}
            type="button"
            tabIndex={-1}
            onClick={() => navigate(() => onNavigateDeck(deck.id))}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-secondary focus-visible:bg-secondary"
          >
            <span className="rounded-lg bg-secondary p-2 text-primary">
              <Layers className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{deck.title}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {results.cardMatches.has(deck.id)
                  ? '카드 내용에 검색어가 있어요'
                  : folders.find((folder) => folder.id === deck.folderId)?.title || '미분류 덱'}
              </span>
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" />
          </button>
        ))}
        {results.folders.length > 0 && (
          <p className="mb-2 mt-4 text-xs text-muted-foreground">폴더</p>
        )}
        {results.folders.slice(0, 5).map((folder) => (
          <button
            key={folder.id}
            type="button"
            tabIndex={-1}
            onClick={() => navigate(() => onNavigateFolder(folder.id))}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-secondary"
          >
            <span className="rounded-lg bg-[#f5eddb] p-2 text-[#947031]">
              <Folder className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{folder.title}</span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/50" />
          </button>
        ))}
        {(results.decks.length > 8 || results.folders.length > 5) && (
          <p className="mt-3 px-3 text-xs text-muted-foreground">
            검색어를 더 입력하면 결과를 좁힐 수 있어요.
          </p>
        )}
      </div>
      <div className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
        Tab으로 이동 · Enter로 열기 · Esc로 닫기
      </div>
    </Modal>
  );
};
