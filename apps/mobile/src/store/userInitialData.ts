import type { Folder, Deck, Card, UserProfile } from '@flashcards/types';

export const CURRENT_USER: UserProfile = {
  "uid": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
  "email": "yoonjeongho33@gmail.com",
  "displayName": "Jeong Ho Yoon",
  "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocKfQENxMDiJILxDo9k1utcDxPTBTS3IyCiYaA4-6FAhZNUzm243=s96-c"
};

export const USER_FOLDERS: Folder[] = [
  {
    "id": "folder-1789367296840-gguawm",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "행정학 1 : 총론",
    "description": "9급 행정학",
    "createdAt": 1789367296840
  },
  {
    "id": "folder-1789523323244-god45j",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "한국사",
    "createdAt": 1789523323244
  }
];

export const USER_DECKS: Deck[] = [
  {
    "id": "deck-1789367419053-sesqf0",
    "folderId": "folder-1789367296840-gguawm",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "1-1 규제",
    "createdAt": 1789367419053,
    "updatedAt": 1789472402457
  },
  {
    "id": "deck-1789473125711-3zw655",
    "folderId": "folder-1789367296840-gguawm",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "1-2 공공서비스",
    "createdAt": 1789473125711,
    "updatedAt": 1789474271824
  },
  {
    "id": "deck-1789475048855-alhfig",
    "folderId": "folder-1789367296840-gguawm",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "2-1 본질적 가치",
    "createdAt": 1789475048855,
    "updatedAt": 1789475988631
  },
  {
    "id": "deck-1789476174317-hsb637",
    "folderId": "folder-1789367296840-gguawm",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "2-2 수단적 가치",
    "createdAt": 1789476174317,
    "updatedAt": 1789477031192
  },
  {
    "id": "deck-1789477762132-252a7a",
    "folderId": "folder-1789367296840-gguawm",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "3-0 시장실패와 정부실패",
    "createdAt": 1789477762132,
    "updatedAt": 1789478324759
  },
  {
    "id": "deck-1789479263008-aengfs",
    "folderId": "folder-1789367296840-gguawm",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "3-1 1세대 행정학",
    "createdAt": 1789479263008,
    "updatedAt": 1789523168667
  },
  {
    "id": "deck-1789560552014-hdxm90",
    "folderId": "folder-1789367296840-gguawm",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "3-2 2세대 행정학",
    "createdAt": 1789560552014,
    "updatedAt": 1789562098896
  },
  {
    "id": "deck-1789562928304-x0q1kh",
    "folderId": "folder-1789367296840-gguawm",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "3-3 3세대 행정학",
    "createdAt": 1789562928304,
    "updatedAt": 1789565571108
  },
  {
    "id": "deck-1789788260969-dh3z6h",
    "folderId": "folder-1789523323244-god45j",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "title": "사진",
    "createdAt": 1789788260969,
    "updatedAt": 1790130688015
  }
];

export const USER_CARDS: Card[] = [
  {
    "id": "card-1789367419053-0-mpzzrv",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>수행 주체별 구분</p>",
    "definitionRichText": "<p>- 직접규제</p><p>- 자율규제</p><p>- 공동규제</p>",
    "learned": false
  },
  {
    "id": "card-1789367419053-1-nekleo",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>규제 영역별 구분</p>",
    "definitionRichText": "<p>- 경제규제</p><p>- 사회규제</p>",
    "learned": false
  },
  {
    "id": "card-1789367419053-2-fewio6",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>규제 대상별 구분</p>",
    "definitionRichText": "<p>- 수단규제</p><p>- 성과규제</p><p>- 관리규제</p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789367419053-3-r5wc22",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>규제 방식별 구분</p>",
    "definitionRichText": "<p>- 명령지시적 규제</p><p>- 시장유인적 규제</p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789367419053-4-2928c6",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>개입 범위별 구분</p>",
    "definitionRichText": "<p>- 포지티브 규제</p><p>- 네거티브 규제</p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789367419053-5-01cjtw",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>수단규제</p>",
    "definitionRichText": "<p>- 투입규제</p><p>- 사전적 규제</p><p>- 순응 정도 파악에 유리</p>",
    "learned": false
  },
  {
    "id": "card-1789368981459-6-aompir",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>성과규제</p>",
    "definitionRichText": "<p>- 산출규제</p><p>- 사후적 요구</p><p>- 수단 자유 선택</p><p>- 최적 수준 찾기 곤란</p>",
    "learned": false
  },
  {
    "id": "card-1789369547952-10-e4rhe2",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>포획현상</p>",
    "definitionRichText": "<p>- 지대추구</p><p>- 규제</p><p>- 정부관료가 특정집단 사익을 옹호</p>",
    "learned": false
  },
  {
    "id": "card-1789369547952-11-t80pmo",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>행정지도</p>",
    "definitionRichText": "<p>- 비권력적 사실행위</p><p>- 권고, 협조요청, 알선행위</p><p>- 응급적, 보완적</p><p>- 형식에 제한이 없음</p><p>- 법치주의 침해</p>",
    "learned": false
  },
  {
    "id": "card-1789369547952-12-7gvxjs",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>윌슨의 규제정치이론에</p>",
    "definitionRichText": "<p>- 대중정치</p><p>- 이익집단정치</p><p>- 고객정치</p><p>- 기업가적 정치</p>",
    "learned": false
  },
  {
    "id": "card-1789369547952-13-2o99bx",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>대중정치</p>",
    "definitionRichText": "<p>- 비용과 편익 모두 이질적인 불특정 다수</p><p>- 낙태규제, 음란물규제, 윤리규제, 차별규제, 차량 10부제</p>",
    "learned": false
  },
  {
    "id": "card-1789369547952-14-1vcity",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>이익집단정치</p>",
    "definitionRichText": "<p>- 비용과 편익 모두 소수의 동질 집단</p><p>- 첨예한 대립</p><p>- 의.약분업, 한.약규제, 작업안전규제</p>",
    "learned": false
  },
  {
    "id": "card-1789369547952-15-t6d2jg",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>고객정치</p>",
    "definitionRichText": "<p>- 비용은 다수에게</p><p>- 편익은 소수에게</p><p>- 미시적 절연</p><p>- 수입규제, 최저가격 규제</p>",
    "learned": false
  },
  {
    "id": "card-1789369547952-16-y5zvfb",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>기업가적 정치</p>",
    "definitionRichText": "<p>- 비용은 소수에게</p><p>- 편익을 다수에게</p><p>- 거시적 절연</p><p>- 환경오염규제, 자동차안전규제, 수입규제 완화</p>",
    "learned": false
  },
  {
    "id": "card-1789369547952-7-t9uv3b",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>관리규제</p>",
    "definitionRichText": "<p>- 과정규제</p><p>- 성과규제 적용 불가시 적합</p><p>- 자율성</p>",
    "learned": false
  },
  {
    "id": "card-1789369547952-8-3gjkgf",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>규제 피라미드</p>",
    "definitionRichText": "<p>- 규제 부담 누적</p><p>- 타르 베이비</p>",
    "learned": false
  },
  {
    "id": "card-1789369547952-9-fzxa80",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>규제의 역설</p>",
    "definitionRichText": "<p>- 비효율적 행동으로 유도</p><p>- 왜곡</p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789472402457-17-kiivvj",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>규제개혁 단계</p>",
    "definitionRichText": "<p>1. 규제 완화 (총량)</p><p>2. 규제품질관리 (질)</p><p>3. 규제관리 (체계)</p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789472402457-18-hh1wp5",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>규제합리화란?</p>",
    "definitionRichText": "<p>- 불필요한 행정규제 폐지</p><p>- 생명, 안전에 관한 규제는 유지</p>",
    "learned": false
  },
  {
    "id": "card-1789472402457-19-6pkigh",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>규제영향분석 도입 시기</p>",
    "definitionRichText": "<p>1998 김대중 정부</p>",
    "learned": false
  },
  {
    "id": "card-1789472402457-20-d11ata",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>규제영향분석 이란?</p>",
    "definitionRichText": "<p>규제의 영향을 객관적으로 미리 예측, 분석하여 규제의 타당성을 판단</p>",
    "learned": false
  },
  {
    "id": "card-1789472402457-21-evo6y5",
    "deckId": "deck-1789367419053-sesqf0",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>규제합리화위원회</p>",
    "definitionRichText": "<p>- 총괄기구</p><p>- 대통령 소속</p><p>- 민간위원의 임기는 2년</p><p>- 재적 과반 출석, 재적 과반 찬성</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-0-fktssb",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>사바스의 공공서비스 유형</p>",
    "definitionRichText": "<p>- 시장재</p><p>- 공공재</p><p>- 요금재</p><p>- 공유재</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-1-egtgxt",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>시장재</p>",
    "definitionRichText": "<p>- 사적재</p><p>- 배재성</p><p>- 경합성</p><p>- 가치재의 존재 (교육, 의료)</p><p>- 음식점, 택시</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-10-90smmj",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>민간위탁의 유형</p>",
    "definitionRichText": "<p>- 계약</p><p>- 면허</p><p>- 보조금</p><p>- 바우처</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-2-44sry2",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>공공재</p>",
    "definitionRichText": "<p>- 집합재</p><p>- 비배제성</p><p>- 비경합성</p><p>- 무임승차에 따른 과소공급</p><p>- 치안, 국방</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-3-hxkqte",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>요금재</p>",
    "definitionRichText": "<p>- 배제성</p><p>- 비경합성</p><p>- 자연독점</p><p>- 일반행정 방식(정부공급), 책임경영방식(공기업), 민간기업</p><p>- 전기, 통신, 수도</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-4-5tg1ti",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>공유재</p>",
    "definitionRichText": "<p>- 비배제성</p><p>- 경합성</p><p>- 공동목초지, 자원</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-5-jv66je",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>공유지의 비극</p>",
    "definitionRichText": "<p>- 개인의 합리성과 집단의 합리성 충돌</p><p>- 부정적인 외부효과</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-6-ytr2c4",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>공유지의 비극 해결방안</p>",
    "definitionRichText": "<p>- 하딘 및 코우즈 : 시장중심, 사적 소유권 설정</p><p>- 피구 : 교정적 조세, 외부효과의 내부화</p><p>- 오스트롬 : 공동체 중심</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-7-n8arbu",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>민간위탁의 개념</p>",
    "definitionRichText": "<p>- 결정과 책임은 정부</p><p>- 생산과 집행은 민간</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-8-5kkvar",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>민간위탁 도입 배경</p>",
    "definitionRichText": "<p>- 공공부문 비효율</p><p>- 수익자부담 원칙으로 공평성 제고</p><p>- 직위분류제보다 계급제에서 많이 활용</p>",
    "learned": false
  },
  {
    "id": "card-1789473125711-9-xux3hi",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>민간위탁 사업의 적합 사무와 비적합 사무</p>",
    "definitionRichText": "<p>적합</p><p>- 단순사실행위</p><p>- 특수한 전문지식과 기술</p><p>- 능률성 요구</p><p>부적합</p><p>- 국민의 권리, 의무와 직접 관계</p><p>- 공신력 요구</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-11-8flc7g",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>계약</p>",
    "definitionRichText": "<p>- 좁은 의미의 민간위탁</p><p>- 경쟁입찰</p><p>- 소요비용 지불</p><p>- 단순 업무</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-12-ad4lhm",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>면허</p>",
    "definitionRichText": "<p>- 프랜차이즈</p><p>- 공공서비스 제공 권리 인정</p><p>- 비용 지불 없음</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-13-8wt3gq",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>보조금</p>",
    "definitionRichText": "<p>- 기술적으로 복잡한 경우</p><p>- 목표달성 방법을 정확히 알 수 없는 경우</p><p>- 재정, 현물 지급</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-14-kcxgki",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>바우처</p>",
    "definitionRichText": "<p>- 구매가 가능한 쿠폰이나 포인트</p><p>- 선택권 보장으로 효율성 제고</p><p>- 복지 분야에서 활용, 형평성 증진</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-15-efl3uc",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>자원봉사</p>",
    "definitionRichText": "<p>- 직접적인 보수는 없음</p><p>- 공익을 위해 봉사</p><p>- 레크리에이션, 복지사업</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-16-rfcj22",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>자조활동</p>",
    "definitionRichText": "<p>- 제공자와 수혜자가 같은 집단 소속</p><p>- 주민순찰, 보육사업</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-17-3vdf4p",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>자원봉사와 자조활동의 특징</p>",
    "definitionRichText": "<p>- 서비스 결정과 생산을 모두 민간에서</p><p>- 넓은 의미의 민간위탁</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-18-6y7m9z",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>민간투자 유치제도</p>",
    "definitionRichText": "<p>- 민간자본을 통해 자본을 조기에 공급</p><p>- 투자 효율, 탄력성</p><p>- 미래세대가 금전적 부담</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-19-3ljtzm",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>BTO</p>",
    "definitionRichText": "<p>- 시설 건설과 동시에 소유권이 정부로 이전</p><p>- 운영권 인정</p><p>- 위험부담</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-20-khctno",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>BTL</p>",
    "definitionRichText": "<p>- 시설 건설과 동시에 소유권이 정부로 이전</p><p>- 운영권 인정</p><p>- 운영권을 정부가 임차하고 임대료 지불</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-21-idmy9c",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>BOO</p>",
    "definitionRichText": "<p>- 시설 건설후에 소유권과 운영권 모두 민간에게</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-22-q4wqdz",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>사바스의 공공서비스 제공방식 유형 구분</p>",
    "definitionRichText": "<p>- 공공 배열, 공공 생산 : 정부서비스</p><p>- 공공 배열, 민간 생산 : 민간위탁(계약), 프랜차이즈, 보조금, </p><p>- 민간 배열, 공공 생산 : 정부응찰</p><p>- 민간 배열, 민간 생산 : 시장, 바우처, 자원봉사, 자조활동</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-23-l0fpkl",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>살라몬의 행정수단 구분 (직접성)</p>",
    "definitionRichText": "<p>- 낮은 직접성 : 보조금, 바우처, 정부출자기업(공사, 공단)</p><p>- 중간 직접성 : 계약, 조세지출, 사회적 규제</p><p>- 높은 직접성 : 공기업, 정부 소비, 경제적 규제</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-24-5f1aq9",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>살라몬의 행정수단 구분 (강제성)</p>",
    "definitionRichText": "<p>- 낮은 강제성 : 조세지출</p><p>- 중간 강제성 : 바우처, 보조금, 계약</p><p>- 높은 강제성 : 경제적 규제, 사회적 규제</p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-25-x2q2nv",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>베덩의 정책수단 구분</p>",
    "definitionRichText": "<p>- 규제적 도구 : 강제적 권력, 법적 의무 부과</p><p>- 경제적 도구 : 보상적 권력, 재화나 서비스 제공</p><p>- 정보적 도구 : 규벅적 권력, 논증과 정보 전달 </p>",
    "learned": false
  },
  {
    "id": "card-1789474271824-26-h0kkz5",
    "deckId": "deck-1789473125711-3zw655",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>민원</p>",
    "definitionRichText": "<p>- 전달적 행정</p><p>- 교호작용</p><p>- 복합 민원 : 여러 관계 기관</p><p>- 보류, 접수 거부 불가 원칙</p>",
    "learned": false
  },
  {
    "id": "card-1789475048855-0-sigas2",
    "deckId": "deck-1789475048855-alhfig",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>행정가치의 구분</p>",
    "definitionRichText": "<p>- 본질적 가치</p><p>- 수단적 가치</p><p>- 사회적 가치</p>",
    "learned": false
  },
  {
    "id": "card-1789475048855-1-6h28e0",
    "deckId": "deck-1789475048855-alhfig",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>사회적 가치</p>",
    "definitionRichText": "<p>- 사회구성원들의 보편적인 것들</p><p>- 권리, 자유, 기회, 재산</p><p>- 규범성과 경제적 효율성 동시에 추구</p><p>- 본질적 가치 및 수단적 가치의 또 다른 표현</p>",
    "learned": false
  },
  {
    "id": "card-1789475048855-2-c2eug8",
    "deckId": "deck-1789475048855-alhfig",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>공익 실체설</p>",
    "definitionRichText": "<p>- 공익은 사익을 초월</p><p>- 정부와 관료의 적극적 역할</p><p>- 집단주의, 경직성</p><p>- 플라톤, 아리스토텔레스, 루소</p>",
    "learned": false
  },
  {
    "id": "card-1789475048855-3-0ko9cu",
    "deckId": "deck-1789475048855-alhfig",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>공익 과정설</p>",
    "definitionRichText": "<p>- 사익을 더한것이 공익</p><p>- 다수 이익집단 간의 조정과 타협의 산물</p><p>- 다원주의</p><p>- 절차적 합리성</p><p>- 정부의 소극적인 역할</p><p>- 혁신 추구 제한, 집단 이기주의</p><p>- 홉스, 흄, 벤담, 슈버트</p>",
    "learned": false
  },
  {
    "id": "card-1789475048855-4-cdw88m",
    "deckId": "deck-1789475048855-alhfig",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>롤스의 정의론</p>",
    "definitionRichText": "<p>- 보편적 도덕원칙 존재</p><p>- 사회구성원들 간 합의(사회계약론적 전통)</p><p>- 무지의 베일, 원초적 상태</p><p>- 1원리 자유, 2원리 평등</p>",
    "learned": false
  },
  {
    "id": "card-1789475988631-5-hbwtn6",
    "deckId": "deck-1789475048855-alhfig",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>롤스의 평등관</p>",
    "definitionRichText": "<p>- 2-1 원리 : 기회의 균등 원리</p><p>- 2-2 원리 : 차등의 원리</p><p>- 약자에게 최대한의 혜택이 주어져야</p><p>- 최소극대화 원칙(Maximin)</p><p>- 정부 역할 강조</p>",
    "learned": false
  },
  {
    "id": "card-1789475988631-6-wro29h",
    "deckId": "deck-1789475048855-alhfig",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>수평적 형평</p>",
    "definitionRichText": "<p>- 같은 것은 같게</p><p>- 욕구이론</p><p>- 실적주의, 수익자부담원칙</p>",
    "learned": false
  },
  {
    "id": "card-1789475988631-7-7uwsqi",
    "deckId": "deck-1789475048855-alhfig",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>수직적 형평</p>",
    "definitionRichText": "<p>- 다른 것은 다르게</p><p>- 실적주의, 대표관료제, 누진세</p>",
    "learned": false
  },
  {
    "id": "card-1789475988631-8-pto7ym",
    "deckId": "deck-1789475048855-alhfig",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>자유</p>",
    "definitionRichText": "<p>- 소극적 자유 : 억압의 배제</p><p>- 적극적 자유 : 정부의 개입</p>",
    "learned": false
  },
  {
    "id": "card-1789475988631-9-gorrwm",
    "deckId": "deck-1789475048855-alhfig",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>평등</p>",
    "definitionRichText": "<p>- 형식적 평등 : 동등한 기회</p><p>- 결과적 평등 : 부당한 불평등 시정</p>",
    "learned": false
  },
  {
    "id": "card-1789476174317-0-t8bf3k",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>사이먼의 합리성 구분과 특징</p>",
    "definitionRichText": "<p>- 실직절 합리석 (객관적 합리성) : 최선의 대안 선택, 선택할 수 있는 지식과 능력 보유, 과정보다 결과에 관심</p><p>- 절차적 합리성 : 인간의 제한된 인지능력, 만족할 만한 대안 선택</p>",
    "learned": false
  },
  {
    "id": "card-1789476174317-1-x6nbq0",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>디징의 합리성 구분과 특징</p>",
    "definitionRichText": "<p>- 정치적 합리성 : 참여와 합의</p><p>- 기술적 합리성 : 목표 달성의 수단</p><p>- 경제적 합리성 : 경쟁 상태의 목표를 비교</p><p>- 법적 합리성 : 대안의 합법성</p><p>- 사회적 합리성 : 구성원 간의 조정과 조화, 가장 비합리적인 유형</p>",
    "learned": false
  },
  {
    "id": "card-1789477031192-10-w3c6de",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정보공개법 연혁</p>",
    "definitionRichText": "<p>- 1992년 기초자치단체에서 조례로 제정</p><p>- 1996년에 정보공개법 제정</p>",
    "learned": false
  },
  {
    "id": "card-1789477031192-11-ncv4c6",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정보공개법</p>",
    "definitionRichText": "<p>- 모든 국민, 일부 외국인에게 청구 권리</p><p>- 행안부장관 총괄</p><p>- 10일 이내 공개 여부 결정</p><p>- 제3자 3일 이내 비공개 요청</p>",
    "learned": false
  },
  {
    "id": "card-1789477031192-2-gknitw",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>맨하임의 합리성 구분</p>",
    "definitionRichText": "<p>- 실질적 합리성 : 옳고 그름에 대해 깊이 고민하고 통찰하는 능력</p><p>- 기능적 합리성 : 조직이 목표 달성을 위해 움직이도록 설계 되어있는지 여부</p>",
    "learned": false
  },
  {
    "id": "card-1789477031192-3-7nzkre",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>능률성</p>",
    "definitionRichText": "<p>- 투입 대비 산출</p><p>- 파레토 최적</p><p>- 형평성에 무관심</p><p>- 민주성과 대립되는 경향</p>",
    "learned": false
  },
  {
    "id": "card-1789477031192-4-t2lw1b",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>능률성의 구분</p>",
    "definitionRichText": "<p>- 사이먼 : 기계적 능률성. 성과 계량화, 정치행정이원론, 과학적 관리론</p><p>- 디목 : 사회적 능률성. 인간적 가치, 인간관계론, 기계적 효율성 비판</p>",
    "learned": false
  },
  {
    "id": "card-1789477031192-5-9ndzcv",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>효과성</p>",
    "definitionRichText": "<p>- 목표 달성도</p><p>- 투입 고려하지 않음</p>",
    "learned": false
  },
  {
    "id": "card-1789477031192-6-3rr3nq",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>민주성</p>",
    "definitionRichText": "<p>- 대내적 민주성 : 행정조직 내부 민주적 운영</p><p>- 대외적 민주성 : 국민의사의 존중,수렴</p>",
    "learned": false
  },
  {
    "id": "card-1789477031192-7-xlynnd",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>합법성</p>",
    "definitionRichText": "<p>- 소극적 합법성 : 국가권력 행사는 최소화</p><p>- 적극적 합법성 : 기본권을 정부가 적극적으로 보장</p>",
    "learned": false
  },
  {
    "id": "card-1789477031192-8-yg71a0",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>가외성</p>",
    "definitionRichText": "<p>- 여분과 중복</p><p>- 란다우</p><p>- 창의성, 안정성, 대응성</p><p>- 능률성과 상충</p><p>- 조직간 기능상 충돌</p>",
    "learned": false
  },
  {
    "id": "card-1789477031192-9-3ln0o3",
    "deckId": "deck-1789476174317-hsb637",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>가외성의 특징</p>",
    "definitionRichText": "<p>- 중첩성 : 수해복구</p><p>- 중복성 : 국가안보</p><p>- 동등잠재력 : 대통령권한대행제도</p>",
    "learned": false
  },
  {
    "id": "card-1789477762132-0-6k51u5",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>시장실패의 원인들</p>",
    "definitionRichText": "<p>- 공공재 : 무임승차, 집합적 소비</p><p>- 외부효과</p><p>- 자연독점 : 규모의 경제</p><p>- 불완전 경쟁 : 과점, 과소생산</p><p>- 정보의 비대칭성 : 역선택, 도덕적 해이</p>",
    "learned": false
  },
  {
    "id": "card-1789477762132-1-u4rzul",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>시장실패 원인들에 대한 대응법</p>",
    "definitionRichText": "<p>- 공공재의 존재 : 공급</p><p>- 외부효과 발생 : 유도(긍정적 외부효과), 규제(부정적 외부효과)</p><p>- 자연독점: 공급, 규제</p><p>- 불완전 경쟁 : 규제</p><p>- 정보의 비대칭성 : 유도, 규제</p>",
    "learned": false
  },
  {
    "id": "card-1789477762132-2-cp5w6c",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정부실패</p>",
    "definitionRichText": "<p>- 의도하지 않은 결과 때문</p><p>- 석유 파동</p>",
    "learned": false
  },
  {
    "id": "card-1789477762132-3-h9clsu",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정부실패의 원인들</p>",
    "definitionRichText": "<p>- 내부성(사적 목표)</p><p>- X-비효율성</p><p>- 파생적 외부효과</p><p>- 권력의 편재</p><p>- 비용과 편익의 괴리</p><p>- 지대추구 행위</p>",
    "learned": false
  },
  {
    "id": "card-1789477762132-4-hwawr3",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>내부성</p>",
    "definitionRichText": "<p>- 비공식적 목표</p><p>- 공익보다 관료의 이익을 반영</p><p>- 정부의 산출물은 측정이 곤란, 측정이 용이한 방식에 집중</p>",
    "learned": false
  },
  {
    "id": "card-1789477762132-5-8xc41d",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>X-비효율성</p>",
    "definitionRichText": "<p>- 정부의 독점적 지위</p><p>- 생산성 제고 의욕 저하</p><p>- 생산가능성 곡선에 미도달</p>",
    "learned": false
  },
  {
    "id": "card-1789477762132-6-h8hfbm",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>파생적 외부효과</p>",
    "definitionRichText": "<p>- 시장실패 해결 시도, 의도치 않은 부작용</p><p>- 단기적인 보상에 가치를 두어 발생</p>",
    "learned": false
  },
  {
    "id": "card-1789477762132-7-ms0oek",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>권력의 편재</p>",
    "definitionRichText": "<p>- 정부의 불공평한 권력 행위 행사</p><p>- 허가</p>",
    "learned": false
  },
  {
    "id": "card-1789478324759-10-oktth5",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정부실패의 원인들에 대한 대응</p>",
    "definitionRichText": "<p>- 사적 목표의 설정 : 민영화</p><p>- X-비효율성 : 민영화, 정부보조 삭감, 규제 완화</p><p>- 파생적 외부효과 : 정부보조 삭감, 규제 완화</p><p>- 권력의 편재 : 민영화, 규제 완화</p>",
    "learned": false
  },
  {
    "id": "card-1789478324759-11-intlsd",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정부규모 축소이론</p>",
    "definitionRichText": "<p>- 갤브레이스의 의존효과 : 홍보 미흡, 투자 부족</p><p>- 머스그레이브의 조세저항</p><p>- 다운스의 합리적 무지</p>",
    "learned": false
  },
  {
    "id": "card-1789478324759-12-b6uka9",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>파킨슨 법칙</p>",
    "definitionRichText": "<p>- 정부규모 팽창이론</p><p>- 업무와 무관하게 공무원수 증가(상승하는 피라미드의 법칙)</p><p>- 부하 배증의 법칙 : 동료보다 부하 직원</p><p>- 업무 배증의 법칙 : 파생적 업무가 발생</p>",
    "learned": false
  },
  {
    "id": "card-1789478324759-13-twjah7",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정부규모 팽창이론</p>",
    "definitionRichText": "<p>- 바그너 법칙 : 1인당 국민소득이 증가하면 공공부문의 크기도 증가</p><p>- 피콕과 와이즈맨의 전위효과 : 한번 공공지출이 늘어나면 위기상황 종료 후에도 유지</p><p>- 니스카넨의 예산극대화 가설 : 관료들은 자기부서의 예산극대화를 추구</p><p>- 보몰병 : 공공서비스는 노동집약적, 생산 효율성 저하.</p>",
    "learned": false
  },
  {
    "id": "card-1789478324759-8-upn4op",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>비용과 편익의 괴리</p>",
    "definitionRichText": "<p>- 비용부담자와 편익수혜자 분리</p>",
    "learned": false
  },
  {
    "id": "card-1789478324759-9-q1ma97",
    "deckId": "deck-1789477762132-252a7a",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>지대추구 행위</p>",
    "definitionRichText": "<p>- 지대 획득을 위한 기업의 로비행위</p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-0-jgrc3d",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>미국의 초기 정치철학</p>",
    "definitionRichText": "<p>- 재퍼슨 : 분권주의, 자유 극대화</p><p>- 해밀턴 : 중앙집권주의</p><p>- 매디슨 : 다원주의, 견제와 균형</p><p>- 잭슨 : 민주주의, 엽관제</p><p>- 재퍼슨-잭슨 철학이 지배</p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-1-95fst0",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>독일 행정학의 기원</p>",
    "definitionRichText": "<p>- 관방학</p><p>- 경찰학</p><p>- 행정법학</p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-10-z4uuf0",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>인간관계론</p>",
    "definitionRichText": "<p>- 비공식 집단 활성화, 심리적 보상</p><p>- 조직적 인본주의</p><p>- 사회적 능률</p><p>- 젖소사회학이라는 비판</p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-2-c0uf2m",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>프랑스 행정학의 기원</p>",
    "definitionRichText": "<p>- 경찰학</p><p>- 페이욜의 경영학적 행정연구</p><p>- 크로지에의 사회학적 행정연구</p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-3-v0l8gn",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정치행정이원론 등장배경</p>",
    "definitionRichText": "<p>- 엽관제에서 가필드 대통령 암살 사건</p><p>- 펜들턴법 제정 : 엽관제 폐지, 실적제 도입</p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-4-eqxnep",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정치행정이원론 학자</p>",
    "definitionRichText": "<p>- 우드로 윌슨 : '행정연구', 행정학의 아버지. 행정은 정치가 아니라 경영의 영역.</p><p>- 굿노 : 정치는 정책을 구현, 행정은 실천</p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-5-lt31ku",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정치행정이원론 특징</p>",
    "definitionRichText": "<p>- 공사행정일원론</p><p>- 과학적 관리론</p><p>- 능률성</p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-6-t8n4si",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>과학적 관리론</p>",
    "definitionRichText": "<p>- 테일러</p><p>- 과학적 분석을 통해 유일 최선의 방법 발견</p><p>- 인간은 경제적, 타산적 존재</p><p>- 직무분석, 분업</p><p>- 낮은 형식적 수준의 원리</p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-7-3dc3qa",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>행정관리학파</p>",
    "definitionRichText": "<p>- 원리주의</p><p>- 귤릭</p><p>- 능률적 운영을 위한 조직설계 원칙</p><p>- 부성화의 원칙 : 분업</p><p>- 명령통일의 원칙 : 단일한 상급자</p><p>- 통솔범위의 원칙 : 적절한 수의 하급자</p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-8-pftsdw",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>행정관리학파에서 말하는 POSDCoRB</p>",
    "definitionRichText": "<p>- Planning</p><p>- Organizing</p><p>- Staffing</p><p>- Directing</p><p>- Coordination</p><p>- Reporting</p><p>- Budgeting</p>",
    "learned": false
  },
  {
    "id": "card-1789479263008-9-86i3vm",
    "deckId": "deck-1789479263008-aengfs",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>인간관계론 등장 배경</p>",
    "definitionRichText": "<p>- 메이요</p><p>- 호손실험</p><p>- 기계적 조직관 비판</p><p>- 사회적 관계의 중요성</p>",
    "learned": false
  },
  {
    "id": "card-1789560552014-0-lza7ms",
    "deckId": "deck-1789560552014-hdxm90",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정치행정일원론 학자</p>",
    "definitionRichText": "<p>- 디목 : 정치와 행정은 상호보완적 관계</p><p>- 애플비 : 정치와 행정의 관계는 정합, 연속, 순환적</p>",
    "learned": false
  },
  {
    "id": "card-1789560552014-1-co5pam",
    "deckId": "deck-1789560552014-hdxm90",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정치행정일원론</p>",
    "definitionRichText": "<p>- 전문성보다 공공성</p><p>- 정책형성기능</p><p>- 행정국가</p>",
    "learned": false
  },
  {
    "id": "card-1789560552014-2-nyxf6u",
    "deckId": "deck-1789560552014-hdxm90",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>행태주의 연구 방법</p>",
    "definitionRichText": "<p>- 논리실증주의 : 사회현상도 자연현상</p><p>- 방법론적 개체주의 : 집단이 아닌 개인의 태도, 의견, 개성</p><p>- 인접학문</p>",
    "learned": false
  },
  {
    "id": "card-1789560967337-3-gkkysf",
    "deckId": "deck-1789560552014-hdxm90",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>행태주의 특징</p>",
    "definitionRichText": "<p>- 정치행정이원론에 가까운 입장</p><p>- 가치중립적</p><p>- 제한된 합리성</p><p>- 사회문제 해결에 무관심</p>",
    "learned": false
  },
  {
    "id": "card-1789560967337-4-lqv5vq",
    "deckId": "deck-1789560552014-hdxm90",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>신행정학의 배경</p>",
    "definitionRichText": "<p>- 1960년대 인종갈등, 빈부격차</p><p>- 존슨 '위대한 사회'</p><p>- 왈도 '미노부르크 회의'</p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789561449608-5-86h3kq",
    "deckId": "deck-1789560552014-hdxm90",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>신행정학의 특징</p>",
    "definitionRichText": "<p>- 적극적 정치행정일원론 : 규범적, 당위적 접근</p><p>- 가치지향적 : 적실성, 행동주의</p><p>- 조직구조 분권화</p><p>- 고객지향 행정</p><p>- 시민 참여</p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789561449608-6-tiw994",
    "deckId": "deck-1789560552014-hdxm90",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>신행정학의 행태주의 비판</p>",
    "definitionRichText": "<p>- 행태주의의 가치중립성 비판</p><p>- 과학적 실증주의 배제는 아님</p>",
    "learned": false
  },
  {
    "id": "card-1789561561383-1-1u43cx",
    "deckId": "deck-1789560552014-hdxm90",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정치행정일원론의 다른 이름</p>",
    "definitionRichText": "<p>- 통치기능설</p>",
    "learned": false
  },
  {
    "id": "card-1789562098896-2-87qtxb",
    "deckId": "deck-1789560552014-hdxm90",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정치행정일원론 대두 배경</p>",
    "definitionRichText": "<p>- 뉴딜정책</p><p>- 루즈벨트</p><p>- 케인즈</p>",
    "learned": false
  },
  {
    "id": "card-1789562098896-4-tubelp",
    "deckId": "deck-1789560552014-hdxm90",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>행태주의 대두 배경</p>",
    "definitionRichText": "<p>- 행정관리학파 비판 : 과학적 검증 없는 속담</p><p>- 철저한 인과관계 검증을 통해 과학적 일반법칙 정립</p>",
    "learned": false
  },
  {
    "id": "card-1789562928304-0-gbpizk",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>신공공관리론 배경</p>",
    "definitionRichText": "<p>- 하이예크 '노예로의 길'</p><p>- 오스본과 게블러 '정부 재창조론'</p><p>- 신고전학파 경제이론</p>",
    "learned": false
  },
  {
    "id": "card-1789562928304-1-ftn21l",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>신공공관리론 특징</p>",
    "definitionRichText": "<p>- 정부의 역할은 방향잡기 (노젓기 아님) : 정부는 촉진자, 중개자</p><p>- 서비스 직접 제공 대신 민간에 권한부여(민간위탁, 바우처 등)</p><p>- 관료 재량권 확대와 책임 강화</p><p>- 정치행정이원론</p>",
    "learned": false
  },
  {
    "id": "card-1789562928304-2-51lj1p",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>신공공관리론 한계</p>",
    "definitionRichText": "<p>- 능률성에 치중, 공공성 간과</p><p>- 공공부문은 계량적 성과 측정 곤란</p><p>- 부처간 경쟁 강조, 상호의존성 간과</p><p>- 국민을 수동적 소비자로 전락</p>",
    "learned": false
  },
  {
    "id": "card-1789562928304-3-qv1nmf",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>영국의 신공공관리론</p>",
    "definitionRichText": "<p>- 대처 '넥스트 스텝'</p><p>- 관료에게 관리적 관한만</p><p>- 민간에 이양, 기업화, 시장메커니즘 도입</p>",
    "learned": false
  },
  {
    "id": "card-1789562928304-4-m26j1y",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>미국의 신공공관리론</p>",
    "definitionRichText": "<p>- 클린턴 정부 (레이건 아님)</p><p>- '블랙스버그 선언', '정부재창조론'</p><p>- 재량부여 : 비효율의 문제는 절차와 규칙</p><p></p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789562928304-5-kezcvw",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>정부재창조론</p>",
    "definitionRichText": "<p>- 촉진적 정부</p><p>- 분권적 정부</p><p>- 고객 지향적 정부</p><p>- 예측과 예방, 적극적 행정</p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-10-oj0bhe",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>니스카넨의 예산극대화 모형</p>",
    "definitionRichText": "<p>- 관료는 효용을 극대화하려는 경제인 : 예산극대화 추구</p><p>- 관료는 총편익과 총비용이 일치하는 수준까지 과다공급</p><p>- 정치인은 사회후생의 극대화를 추구</p><p>- 정치인은 한계편익과 한계비용이 일치하는 수준에서 최적공급</p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-11-kv1en5",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>던리비의 관청형성 모형</p>",
    "definitionRichText": "<p>- 니스카넨 비판, 예산관련 행태는 달라짐</p><p>- 중,하위직 관료는 예산극대화 추구</p><p>- 고위직 관료는 관청예산(권력 증대)만 추구</p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-12-8fmyih",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>티부 모형</p>",
    "definitionRichText": "<p>- 발로 하는 투표</p><p>- 다른 지방정부로 이주하는 것은 지방정부에 대한 선호 표시</p><p>- 분권화된 체제에서 효율적인 자원배분 가능</p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-13-2208b7",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>애로우의 불가능성 정리</p>",
    "definitionRichText": "<p>- 비제한성, 이행성, 비독재성, 만장일치의 원칙, 무관한 대안에서의 독립의 원칙</p><p>- 위 조건을 모두 만족시키는 투표방식은 불가능</p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-14-gdzqo8",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>뷰캐넌과 털럭의 비용극소화 모형</p>",
    "definitionRichText": "<p>- 의사결정비용 : 다수의 합의를 이끌어내는 비용</p><p>- 외부비용 : 원치 않는 대안이 선택됐을때의 비용</p><p>- 의사결정비용과 외부비용 간의 균형을 맞춰 최적의 찬성자 비율을 설정</p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-15-097kbd",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>다운스의 중위투표자 정리</p>",
    "definitionRichText": "<p>- 중위투표자의 선호가 최종 결과를 결정</p><p>- 모든 정책이 중도적으로 수렴</p><p>- 자원배분의 효율성 보장 못함</p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-16-8t0ygg",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>구제도주의와 신제도주의</p>",
    "definitionRichText": "<p>- 공식적 구조에만 관심 vs 비공식적 구조(문화, 관습)도 포함</p><p>- 정태적 기술 vs 상호작용을 중시하는 동태적 접근</p><p></p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-6-5ngcuz",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>공공선택론 학자</p>",
    "definitionRichText": "<p>- 뷰캐넌</p><p>- 오스트롬</p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-7-dheatv",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>공공선택론 특징</p>",
    "definitionRichText": "<p>- 중첩적 관할권을 활용</p><p>- 시민들을 공공재의 소비자로 규정</p><p>- 행정의 대응성</p><p>- 정치적 문제를 경제학적으로 연구</p><p>- 방법론적 개체주의</p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-8-n0s1y6",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>공공선택론 한계</p>",
    "definitionRichText": "<p>- 합리적 개인이 현실적으로 부적합</p><p>- 기득권 유지를 위한 보수적인 접근</p><p>- 지나친 정부의 시장화</p>",
    "learned": false
  },
  {
    "id": "card-1789564319965-9-t8r5oj",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>공공선택론의 모형</p>",
    "definitionRichText": "<p>- 니스카넨 : 예산극대화 모형</p><p>- 던리비 : 관청형성 모형</p><p>- 티부 모형</p><p>- 애로우 : 불가능성 정리</p><p>- 뷰캐넌과 털럭 : 비용극소화 모형</p><p>- 다운스 : 중위투표자 정리</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-17-wihuj8",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>신제도주의의 행태주의 비판</p>",
    "definitionRichText": "<p>- 국가, 시대별 다양성 설명 불가</p><p>- 개인의 선호체계와 행위결과 간의 직선적 인과관계</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-18-7wn30i",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>신제도주의 특징</p>",
    "definitionRichText": "<p>- 제도는 독립변수면서 종속변수 : 개인들 간의 상호작용으로 제도 변화 가능</p><p>- 제도는 문화의 산물</p><p>- 집합주의적 접근</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-19-96ilih",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>신제도주의 분파</p>",
    "definitionRichText": "<p>- 역사적 신제도주의</p><p>- 사회학적 신제도주의</p><p>- 합리적 선택 신제도주의</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-20-rqaucl",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>역사적 신제도주의</p>",
    "definitionRichText": "<p>- 공식적 제도에 초점</p><p>- 제도는 개인에 중대한 영향 (선호 내생성)</p><p>- 경로의존성</p><p>- 단절균형점에 의해 새로운 제도가 생성될 수는 있음</p><p>- 방법론적 전체주의 (중범위 : 국가)</p><p>- 제도의 종단면적 측면 연구</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-21-hnk76c",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>역사적 신제도주의 한계</p>",
    "definitionRichText": "<p>- 제도결정론</p><p>- 제도의 변화 설명 불충분</p><p>- 귀납성, 과학적 엄밀성 부족</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-22-6rah19",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>사회학적 신제도주의</p>",
    "definitionRichText": "<p>- 비공식적 제도에 초점 (문화, 상징, 신념)</p><p>- 개인은 사회 제도에 종속, 배태됨 (선호 내생성)</p><p>- 동형화 : 사회적 정당성을 인정받는 구조를 닮아가는 과정</p><p>- 횡단면적 시각</p><p>- 방법론적 전체주의</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-23-e0jp8a",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>사회학적 신제도주의 한계</p>",
    "definitionRichText": "<p>- 지나친 제도결정론</p><p>- 제도의 변화 설명 불충분</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-24-8yk21b",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>합리선택적 신제도주의</p>",
    "definitionRichText": "<p>- 공식 제도에 초점</p><p>- 개인의 선호는 선험적, 제도와 무관</p><p>- 제도의 역할은 공유재의 비극과 같은 집단 행동의 딜레마를 해결하는 것</p><p>- 방법론적 개체주의</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-25-9v6jgn",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>합리선택적 신제도주의 한계</p>",
    "definitionRichText": "<p>- 연역적, 경험적 설명 부족</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-26-r6ztgq",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>주인-대리인 이론</p>",
    "definitionRichText": "<p>- 주인과 대리인 모두 이익추구 합리적 행위자</p><p>- 정보의 비대칭성 존재</p><p>- 역선택 : 계약 이전에 발생</p><p>- 도덕적 해이 : 계약 이후</p>",
    "learned": false
  },
  {
    "id": "card-1789565571108-27-25rcdd",
    "deckId": "deck-1789562928304-x0q1kh",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p>주인-대리인 이론에서 정보의 비대칭 해결 방안</p>",
    "definitionRichText": "<p>- 신호발송 : 자질 증명, 학위나 자격증</p><p>- 평판 : 과거 쌓아온 신뢰도</p><p>- 선별 : 복수의 계약, 시험이나 면접</p><p>- 다수대리인 : 동일업무에 복수의 대리인</p><p>- 공동정보체계 구축</p>",
    "learned": false
  },
  {
    "id": "card-1789788260969-0-mx0x65",
    "deckId": "deck-1789788260969-dh3z6h",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p></p><img class=\"rounded-lg max-h-64 max-w-full object-contain my-2 border border-border shadow-2xs mx-auto block select-none\" loading=\"lazy\" src=\"https://firebasestorage.googleapis.com/v0/b/yoon-apps.firebasestorage.app/o/cards%2FSM2WdaDr7ZZzmtdfX5644UtjJBE2%2F1789791124362_sv9igb3f.webp?alt=media&amp;token=9aea54d1-edd7-4a29-8e11-ec1dd9d39fb6\" alt=\"본문 첨부 이미지\">",
    "definitionRichText": "<p>- 참성단</p><p>- 고조선</p>",
    "learned": false
  },
  {
    "id": "card-1789788260969-1-47selc",
    "deckId": "deck-1789788260969-dh3z6h",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p></p><img class=\"rounded-lg max-h-64 max-w-full object-contain my-2 border border-border shadow-2xs mx-auto block select-none\" loading=\"lazy\" src=\"https://firebasestorage.googleapis.com/v0/b/yoon-apps.firebasestorage.app/o/cards%2FSM2WdaDr7ZZzmtdfX5644UtjJBE2%2F1789955046989_yjpu8hzp.webp?alt=media&amp;token=1942d56f-750b-4917-967b-d0305417b22c\" alt=\"본문 첨부 이미지\">",
    "definitionRichText": "<p>- 호우명그릇</p><p>- 광개토대왕</p><p>- 경주</p>",
    "learned": false
  },
  {
    "id": "card-1789955945500-2-w6ra4b",
    "deckId": "deck-1789788260969-dh3z6h",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<p></p><img class=\"rounded-lg max-h-64 max-w-full object-contain my-2 border border-border shadow-2xs mx-auto block select-none\" loading=\"lazy\" src=\"https://firebasestorage.googleapis.com/v0/b/yoon-apps.firebasestorage.app/o/cards%2FSM2WdaDr7ZZzmtdfX5644UtjJBE2%2F1789955932692_34ljpdjm.webp?alt=media&amp;token=0381ed79-d381-4e79-b760-98f21562f23e\" alt=\"본문 첨부 이미지\">",
    "definitionRichText": "<p>- 진묘수, 석수</p><p>- 무령왕</p>",
    "learned": false
  },
  {
    "id": "card-1790040680611-3-j6ku85",
    "deckId": "deck-1789788260969-dh3z6h",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<img class=\"rounded-lg max-h-64 max-w-full object-contain my-2 border border-border shadow-2xs mx-auto block select-none\" loading=\"lazy\" src=\"https://firebasestorage.googleapis.com/v0/b/yoon-apps.firebasestorage.app/o/cards%2FSM2WdaDr7ZZzmtdfX5644UtjJBE2%2F1790040581101_41mgbzkr.webp?alt=media&amp;token=32533034-24f9-414c-876c-a3eb4ce2be82\" alt=\"본문 첨부 이미지\">",
    "definitionRichText": "<p>금동연가7년명여래입상</p>",
    "learned": false
  },
  {
    "id": "card-1790040680611-4-aj1s3e",
    "deckId": "deck-1789788260969-dh3z6h",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<img class=\"rounded-lg max-h-64 max-w-full object-contain my-2 border border-border shadow-2xs mx-auto block select-none\" loading=\"lazy\" src=\"https://firebasestorage.googleapis.com/v0/b/yoon-apps.firebasestorage.app/o/cards%2FSM2WdaDr7ZZzmtdfX5644UtjJBE2%2F1790040673323_8t5e952p.webp?alt=media&amp;token=642f10b1-02fc-4a7c-978a-0fef51a9f8bc\" alt=\"본문 첨부 이미지\">",
    "definitionRichText": "<p>반가여래사유상</p>",
    "learned": false
  },
  {
    "id": "card-1790040680611-5-p6jors",
    "deckId": "deck-1789788260969-dh3z6h",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<img class=\"rounded-lg max-h-64 max-w-full object-contain my-2 border border-border shadow-2xs mx-auto block select-none\" loading=\"lazy\" src=\"https://firebasestorage.googleapis.com/v0/b/yoon-apps.firebasestorage.app/o/cards%2FSM2WdaDr7ZZzmtdfX5644UtjJBE2%2F1790041034966_spxdd10h.webp?alt=media&amp;token=71bb16e1-3a98-452a-bb51-256f50a0a91d\" alt=\"본문 첨부 이미지\">",
    "definitionRichText": "<p>- 금동대향로</p><p>- 백제</p><p>- 도교</p>",
    "learned": false
  },
  {
    "id": "card-1790041078152-6-ixn4fc",
    "deckId": "deck-1789788260969-dh3z6h",
    "userId": "SM2WdaDr7ZZzmtdfX5644UtjJBE2",
    "termRichText": "<img class=\"rounded-lg max-h-64 max-w-full object-contain my-2 border border-border shadow-2xs mx-auto block select-none\" loading=\"lazy\" src=\"https://firebasestorage.googleapis.com/v0/b/yoon-apps.firebasestorage.app/o/cards%2FSM2WdaDr7ZZzmtdfX5644UtjJBE2%2F1790130672694_g8zfr7ad.webp?alt=media&amp;token=8acba4fb-ae2d-4728-9f72-572d6eb27b4b\" alt=\"본문 첨부 이미지\">",
    "definitionRichText": "<p>- 관촉사 석조미륵보살입상</p><p>- 고려</p><p></p>",
    "learned": false
  }
];
