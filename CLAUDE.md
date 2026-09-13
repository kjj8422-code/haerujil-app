# 이 프로젝트 전용 규칙 (haerujil-app)

`jeju-harbor-map`(https://github.com/kjj8422-code/jeju-harbor-map)의 후속 프로젝트로,
제주 한정이었던 서비스를 **전국 항·포구 대상 스마트폰 앱**으로 확장한다.

## 확정된 기술 스택 (2026-09-13 결정)

| 영역 | 선택 | 이유 |
|---|---|---|
| 앱 프론트엔드 | **React Native + Expo** | 빌드 환경(Xcode/Android Studio) 없이 QR코드로 바로 폰에서 테스트 가능. 코딩 초보자가 "진짜 앱"까지 갈 수 있는 현실적인 경로. |
| 백엔드/DB | **Firebase (Firestore + Auth + Cloud Messaging)** | 서버 직접 관리 불필요, 무료 티어로 시작 가능, 로그인·실시간 DB·푸시알림을 하나의 콘솔에서 처리. |
| 전국 항·포구 데이터 자동 수집 | **공공데이터포털(data.go.kr) API + GitHub Actions 스케줄러** | `jeju-harbor-map`의 `law-watch/` 자동 감시 방식을 그대로 재사용. 매일/매주 배치로 Firestore에 반영. |
| 광고 수익화 | **Google AdMob** (앱 버전 애드센스) | |
| 제휴 수익화 | **쿠팡파트너스** (기존 jeju-harbor-map 링크 재사용, `Linking.openURL`로 브라우저 이동) | |

## 데이터 출처

- 기본 데이터: [해양수산부_어항정보](https://www.data.go.kr/data/3083027/fileData.do) — 어항명, 주소, 위도/경도, 이용 가구·인구수
- 국가어항 공간정보: [해양수산부_공동활용체계_국가어항](https://www.data.go.kr/data/15149006/fileData.do)
- 교차 확인: [한국어촌어항공단(fipa.or.kr) 국가어항/지방어항 현황](https://www.fipa.or.kr/fipa/pgm/i-152/nat/front/list.do)
- 법령·금어기 등 "해석이 필요한 정보"는 자동 수집하지 않고 `jeju-harbor-map`처럼 사람이 직접 확인 후 반영한다 (안전 문제와 직결되므로).

## 왜 jeju-harbor-map과 저장소를 분리했나

`jeju-harbor-map`은 "빌드 과정 없는 순수 HTML" 구조를 의도적으로 유지하는 프로젝트라
(해당 저장소 CLAUDE.md 참고) React Native/Expo 같은 빌드 기반 구조를 억지로 합치지 않는다.
제주 웹사이트는 그대로 독립 서비스로 유지하고, 이 저장소가 전국 확장판이다.

## 항구·구역 카드의 "실시간 CCTV"·"물때·파고" 버튼 (2026-09-13)

`PlaceInfoButtons`(모든 항구/구역 카드에 공통) → 누르면 `InAppWebViewModal`로 앱을
나가지 않고 바로 보여준다. 항구별 CCTV 채널이나 바다타임(badatime.com) 상세 페이지의
내부 지역 코드를 전국 단위로 매핑해둔 공개 데이터가 없어서(제공처가 지자체·수협마다
제각각), 정확한 개별 링크 대신 `src/utils/externalLinks.ts`에서 **이름 기반 네이버
검색 링크**를 만들어 연결한다 — 알려진 해안 지명이면 검색 결과에 물때·날씨 위젯이
바로 뜨는 경우가 많아 실용적인 절충안이다. 나중에 항구별 정확한 CCTV/바다타임 링크를
확보하면 `Harbor`/zone 데이터에 필드를 추가해 우선 사용하고, 없을 때만 검색으로
폴백하는 식으로 업그레이드할 수 있다.

## 아직 결정 안 된 것

- 게시판(조과자랑 격) 실명/익명 정책, 신고·모더레이션 정책
- 프리미엄(유료) 기능 도입 여부 — 현재는 무료+광고·제휴 우선 (2026-09-13 기준)
