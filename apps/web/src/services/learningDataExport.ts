import type { AccountData } from '../store/types';

export function downloadLearningData(data: AccountData): void {
  const exportedAt = new Date().toISOString();
  const contents = JSON.stringify({
    format: 'flashcards',
    version: 1,
    exportedAt,
    folders: data.folders.map(({ userId, ...folder }) => folder),
    decks: data.decks.map(({ userId, ...deck }) => deck),
    cards: data.cards.map(({ userId, ...card }) => card),
  }, null, 2);
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `flashcards-${exportedAt.replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Allow the browser to start reading the download before releasing its URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
