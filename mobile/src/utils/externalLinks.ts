// 항구·구역 이름으로 실시간 CCTV·물때(조석)·파고 정보를 찾아주는 링크 생성기.
//
// 전국 어항·구역마다 정확한 CCTV 채널 URL이나 바다타임(badatime.com) 상세 페이지의
// 내부 지역 코드를 다 알 방법이 없다 — 어항마다 CCTV 제공처가 지자체·수협·어촌계 등
// 제각각이고, 바다타임도 지역명이 아니라 내부 번호로 페이지가 나뉘어 있어 전국
// 데이터를 하나하나 매핑해둔 공개 자료가 없다. 그래서 이름으로 검색한 결과 페이지로
// 연결하는 방식을 쓴다 — 네이버 검색은 알려진 해안 지명이면 물때·파고·날씨 위젯을
// 검색결과 화면에 바로 보여줘서, 대부분 한 번의 검색으로 원하는 정보에 닿는다.
function naverSearchUrl(query: string): string {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
}

export function buildCctvSearchUrl(placeName: string): string {
  return naverSearchUrl(`${placeName} CCTV 실시간`);
}

export function buildTideSearchUrl(placeName: string): string {
  return naverSearchUrl(`${placeName} 물때 파고`);
}
