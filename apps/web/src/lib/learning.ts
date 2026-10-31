const accents = [
  { background: '#EEECFF', color: '#6155E8' },
  { background: '#E6F5EF', color: '#21856F' },
  { background: '#FFF0E7', color: '#BA7549' },
  { background: '#E9F0FF', color: '#4E79C9' },
];
export const deckAccent = (title: string) =>
  accents[Array.from(title).reduce((sum, c) => sum + c.charCodeAt(0), 0) % accents.length];
export const travelSample = [
  ['Where is the nearest station?', '가장 가까운 역이 어디인가요?'],
  ['Could I see the menu, please?', '메뉴를 볼 수 있을까요?'],
  ['I would like to check in.', '체크인하고 싶어요.'],
  ['How much is this?', '이것은 얼마인가요?'],
  ['Can I pay by card?', '카드로 결제할 수 있나요?'],
  ['Thank you for your help.', '도와주셔서 감사합니다.'],
].map(([front, back]) => ({
  termRichText: `<p>${front}</p>`,
  definitionRichText: `<p>${back}</p>`,
}));
