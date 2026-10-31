import React, { useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { Search, Layers, Folder, ArrowUpRight, X } from 'lucide-react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Modal } from './Modal';
import { Input } from '@/components/ui/input';
import { richTextToText } from '../../utils/search';
import { deckAccent } from '@/lib/learning';
import { cn } from '@/lib/utils';

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
  const deferred = useDeferredValue(query);
  const [selected, setSelected] = useState(0);
  const id = useId();
  const decks = useFlashcardStore((state) => state.decks);
  const folders = useFlashcardStore((state) => state.folders);
  const cards = useFlashcardStore((state) => state.cards);
  const results = useMemo(() => {
    const q = deferred.trim().toLocaleLowerCase('ko-KR');
    const snippets = new Map<string, string>();
    if (q)
      cards.forEach((card) => {
        const text = richTextToText(`${card.termRichText} ${card.definitionRichText}`);
        if (!snippets.has(card.deckId) && text.toLocaleLowerCase('ko-KR').includes(q))
          snippets.set(card.deckId, text);
      });
    const matchingDecks = decks
      .filter(
        (deck) =>
          !q ||
          `${deck.title} ${deck.description || ''}`.toLocaleLowerCase('ko-KR').includes(q) ||
          snippets.has(deck.id)
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const matchingFolders = q
      ? folders.filter((folder) =>
          `${folder.title} ${folder.description || ''}`.toLocaleLowerCase('ko-KR').includes(q)
        )
      : [];
    return {
      total: matchingDecks.length + matchingFolders.length,
      items: [
        ...matchingDecks.slice(0, 10).map((deck) => ({
          id: deck.id,
          type: 'deck' as const,
          title: deck.title,
          description:
            snippets.get(deck.id)?.slice(0, 120) ||
            `${folders.find((folder) => folder.id === deck.folderId)?.title || '미분류'} · 학습 세트`,
        })),
        ...matchingFolders.slice(0, 5).map((folder) => ({
          id: folder.id,
          type: 'folder' as const,
          title: folder.title,
          description: folder.description || '내 폴더',
        })),
      ],
    };
  }, [deferred, decks, folders, cards]);
  useEffect(() => setSelected(0), [deferred]);
  const active = Math.min(selected, Math.max(0, results.items.length - 1));
  useEffect(() => {
    document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, id]);
  const open = (index: number) => {
    const item = results.items[index];
    if (!item) return;
    onClose();
    if (item.type === 'deck') onNavigateDeck(item.id);
    else onNavigateFolder(item.id);
  };
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="배우고 있는 것들을 찾아보세요"
      icon={<Search className="h-5 w-5 text-primary" />}
      maxWidth="xl"
    >
      <div className="relative">
        <Input
          autoFocus
          role="combobox"
          aria-label="세트, 폴더, 카드 내용 검색"
          aria-autocomplete="list"
          aria-controls={`${id}-results`}
          aria-expanded={true}
          aria-activedescendant={results.items.length ? `${id}-${active}` : undefined}
          placeholder="세트 이름부터 카드 속 한 단어까지"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setSelected((index) =>
                Math.max(
                  0,
                  Math.min(results.items.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))
                )
              );
            } else if (event.key === 'Enter') {
              event.preventDefault();
              open(active);
            }
          }}
          leftIcon={<Search className="h-4 w-4" />}
          className="h-12 pr-11"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="검색어 지우기"
            className="absolute right-2 top-2 rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p role="status" className="mb-3 mt-5 text-xs text-muted-foreground">
        {deferred.trim() ? `검색 결과 ${results.total}개` : '최근 수정한 학습 세트'}
      </p>
      {!results.items.length && (
        <div className="py-9 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold">
            {query.trim() ? '검색 결과가 없어요' : '아직 학습 자료가 없어요'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {query.trim()
              ? '다른 단어나 더 짧은 검색어로 찾아보세요.'
              : '세트를 만들면 이곳에서 빠르게 찾을 수 있어요.'}
          </p>
        </div>
      )}
      <div
        id={`${id}-results`}
        role="listbox"
        aria-label="학습 자료 검색 결과"
        aria-busy={query !== deferred}
        className="max-h-[min(52dvh,440px)] space-y-1 overflow-y-auto"
      >
        {results.items.map((item, index) => {
          const accent =
            item.type === 'folder'
              ? { background: '#fff0e7', color: '#ba7549' }
              : deckAccent(item.title);
          return (
            <button
              key={`${item.type}:${item.id}`}
              id={`${id}-${index}`}
              type="button"
              role="option"
              aria-selected={active === index}
              onMouseMove={() => setSelected(index)}
              onFocus={() => setSelected(index)}
              onClick={() => open(index)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors',
                active === index ? 'bg-secondary/70' : 'hover:bg-muted/50'
              )}
            >
              <span
                style={{
                  backgroundColor: accent.background,
                  color: accent.color,
                }}
                className="rounded-xl p-2.5"
              >
                {item.type === 'folder' ? (
                  <Folder className="h-5 w-5" />
                ) : (
                  <Layers className="h-5 w-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{item.title}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>
      {results.total > results.items.length && (
        <p className="mt-3 text-xs text-muted-foreground">
          검색어를 더 입력하면 결과를 좁힐 수 있어요.
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
        <span>↑ ↓ 선택 · Enter 열기 · Esc 닫기</span>
        <span>폴더와 카드 본문도 검색해요</span>
      </div>
    </Modal>
  );
};
