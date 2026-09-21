import React, { useState } from 'react';
import { ViewMode, Folder, Deck } from '../../types';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import {
  Layers,
  Folder as FolderIcon,
  Home,
  Plus,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  X,
  FileText,
  Sparkles,
  Cloud,
  Check,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentView: ViewMode;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNavigateHome: () => void;
  onNavigateAllFolders: () => void;
  onNavigateAllDecks: () => void;
  onNavigateFolder: (folderId: string) => void;
  onNavigateDeck: (deckId: string) => void;
  onCreateDeck: () => void;
  onCreateFolder: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  isCollapsed,
  isMobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onNavigateHome,
  onNavigateAllFolders,
  onNavigateAllDecks,
  onNavigateFolder,
  onNavigateDeck,
  onCreateDeck,
  onCreateFolder,
}) => {
  const { folders, decks, cards, syncStatus } = useFlashcardStore();

  // 폴더별 아코디언 펼침/접힘 상태 관리 (기본적으로 모두 펼침)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    folders.forEach((f) => {
      init[f.id] = true;
    });
    return init;
  });

  const toggleFolderAccordion = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // 미분류 덱 목록
  const unassignedDecks = decks.filter((d) => !d.folderId);

  // 활성 여부 체크 헬퍼
  const isHomeActive = currentView.type === 'dashboard';
  const isAllFoldersActive = currentView.type === 'all-folders';
  const isAllDecksActive = currentView.type === 'all-decks';
  const isCurrentFolder = (folderId: string) =>
    currentView.type === 'folder' && currentView.folderId === folderId;
  const isCurrentDeck = (deckId: string) =>
    (currentView.type === 'deck' && currentView.deckId === deckId) ||
    (currentView.type === 'edit-deck' && currentView.deckId === deckId);

  // 동기화 상태 텍스트 및 아이콘
  const renderSyncBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <span className="flex items-center gap-1 text-[11px] text-primary">
            <RefreshCw className="w-3 h-3 animate-spin" />
            {!isCollapsed && <span>동기화 중...</span>}
          </span>
        );
      case 'offline':
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-500">
            <CloudOff className="w-3 h-3" />
            {!isCollapsed && <span>오프라인</span>}
          </span>
        );
      case 'synced':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Check className="w-3 h-3 text-emerald-500" />
            {!isCollapsed && <span>클라우드 동기화됨</span>}
          </span>
        );
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-card text-card-foreground select-none">
      {/* 1. 상단 로고 및 접기 버튼 */}
      <div>
        <div
          className={cn(
            'h-14 sm:h-16 flex items-center border-b border-border/80 px-3',
            isCollapsed ? 'justify-center' : 'justify-between px-4'
          )}
        >
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => {
                onNavigateHome();
                onCloseMobile();
              }}
              className="flex items-center gap-2.5 font-bold text-foreground tracking-tight hover:opacity-85 transition-opacity cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-base font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                FlashCards
              </span>
            </button>
          )}

          {isCollapsed && (
            <button
              type="button"
              onClick={() => {
                onNavigateHome();
                onCloseMobile();
              }}
              className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
              title="홈으로 이동"
            >
              <Layers className="w-4 h-4" />
            </button>
          )}

          {/* 데스크탑 접기/펼치기 토글 버튼 */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer',
              isCollapsed && 'mt-2'
            )}
            title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {isCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* 모바일 닫기 버튼 */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. 퀵 생성 액션 버튼 */}
        <div className="p-3 border-b border-border/60">
          {!isCollapsed ? (
            <div className="space-y-1.5">
              <Button
                variant="default"
                size="sm"
                className="w-full justify-start gap-2 shadow-xs font-medium"
                onClick={() => {
                  onCreateDeck();
                  onCloseMobile();
                }}
              >
                <Plus className="w-4 h-4" />
                <span>새 덱 만들기</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onCreateFolder();
                  onCloseMobile();
                }}
              >
                <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
                <span>새 폴더 추가</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onCreateDeck();
                  onCloseMobile();
                }}
                className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs hover:bg-primary/90 transition-colors"
                title="새 덱 만들기"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateFolder();
                  onCloseMobile();
                }}
                className="w-9 h-9 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground flex items-center justify-center hover:bg-muted transition-colors"
                title="새 폴더 추가"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 3. 기본 메인 네비게이션 메뉴 */}
        <div className="p-2 space-y-0.5 border-b border-border/60">
          <button
            type="button"
            onClick={() => {
              onNavigateHome();
              onCloseMobile();
            }}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer',
              isHomeActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              isCollapsed && 'justify-center px-0'
            )}
            title="대시보드"
          >
            <Home className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>대시보드</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigateAllFolders();
              onCloseMobile();
            }}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer',
              isAllFoldersActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              isCollapsed && 'justify-center px-0'
            )}
            title="모든 폴더"
          >
            <div className="flex items-center gap-2.5">
              <FolderIcon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>모든 폴더</span>}
            </div>
            {!isCollapsed && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                {folders.length}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onNavigateAllDecks();
              onCloseMobile();
            }}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer',
              isAllDecksActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              isCollapsed && 'justify-center px-0'
            )}
            title="모든 덱"
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>모든 덱</span>}
            </div>
            {!isCollapsed && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                {decks.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* 4. 학습 보관함 (폴더 & 덱 계층 구조 스크롤 영역) */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {!isCollapsed && (
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                내 학습 보관함
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/70">
                총 {cards.length}장
              </span>
            </div>

            {/* 폴더 목록 트리 */}
            <div className="space-y-1">
              {folders.map((folder) => {
                const folderDecks = decks.filter((d) => d.folderId === folder.id);
                const isExpanded = expandedFolderIds[folder.id];
                const isSelected = isCurrentFolder(folder.id);

                return (
                  <div key={folder.id} className="space-y-0.5">
                    <div
                      onClick={() => {
                        onNavigateFolder(folder.id);
                        onCloseMobile();
                      }}
                      className={cn(
                        'group flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-secondary text-secondary-foreground font-semibold'
                          : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => toggleFolderAccordion(folder.id, e)}
                          className="p-0.5 hover:bg-muted-foreground/10 rounded transition-colors text-muted-foreground"
                          title={isExpanded ? '접기' : '펼치기'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        <FolderIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{folder.title}</span>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 h-4 font-mono text-muted-foreground border-border/60 shrink-0"
                      >
                        {folderDecks.length}
                      </Badge>
                    </div>

                    {/* 폴더 하위 덱 목록 아코디언 */}
                    {isExpanded && (
                      <div className="pl-6 space-y-0.5 border-l border-border/40 ml-3.5 my-0.5">
                        {folderDecks.length === 0 ? (
                          <div className="px-2 py-1 text-[11px] text-muted-foreground/70 italic">
                            덱이 없습니다
                          </div>
                        ) : (
                          folderDecks.map((deck) => {
                            const isDeckActive = isCurrentDeck(deck.id);
                            const deckCardsCount = cards.filter((c) => c.deckId === deck.id).length;

                            return (
                              <div
                                key={deck.id}
                                onClick={() => {
                                  onNavigateDeck(deck.id);
                                  onCloseMobile();
                                }}
                                className={cn(
                                  'flex items-center justify-between px-2 py-1 rounded-md text-xs cursor-pointer transition-colors',
                                  isDeckActive
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileText className="w-3 h-3 shrink-0 opacity-70" />
                                  <span className="truncate">{deck.title}</span>
                                </div>
                                <span className="text-[10px] font-mono opacity-70 shrink-0">
                                  {deckCardsCount}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 미분류 덱 목록 */}
              {unassignedDecks.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    미분류 덱
                  </div>
                  <div className="space-y-0.5">
                    {unassignedDecks.map((deck) => {
                      const isDeckActive = isCurrentDeck(deck.id);
                      const deckCardsCount = cards.filter((c) => c.deckId === deck.id).length;

                      return (
                        <div
                          key={deck.id}
                          onClick={() => {
                            onNavigateDeck(deck.id);
                            onCloseMobile();
                          }}
                          className={cn(
                            'flex items-center justify-between px-2 py-1 rounded-md text-xs cursor-pointer transition-colors',
                            isDeckActive
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="w-3 h-3 shrink-0 opacity-70" />
                            <span className="truncate">{deck.title}</span>
                          </div>
                          <span className="text-[10px] font-mono opacity-70 shrink-0">
                            {deckCardsCount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="w-8 h-px bg-border" />
            {folders.slice(0, 5).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onNavigateFolder(f.id);
                  onCloseMobile();
                }}
                className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                  isCurrentFolder(f.id) && 'bg-primary/10 text-primary'
                )}
                title={f.title}
              >
                <FolderIcon className="w-4 h-4" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. 하단 시스템 상태 및 뱃지 */}
      <div className="p-3 border-t border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {renderSyncBadge()}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. 데스크탑 고정 사이드바 */}
      <aside
        className={cn(
          'hidden lg:block shrink-0 border-r border-border/80 sticky top-0 h-screen transition-all duration-300 z-30',
          isCollapsed ? 'w-16' : 'w-64 xl:w-72'
        )}
      >
        {sidebarContent}
      </aside>

      {/* 2. 모바일/태블릿 드로어 (Slide-over Sheet) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* 어두운 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />

          {/* 슬라이드인 사이드바 패널 */}
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs shadow-2xl bg-card border-r border-border animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
