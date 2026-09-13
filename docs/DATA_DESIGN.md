# 데이터베이스 설계 (Firestore) — 1단계 초안

이 문서는 "1단계: 데이터·DB 기반" 작업의 산출물입니다. Firebase 프로젝트를 만들고 나면
아래 컬렉션 구조 그대로 Firestore에 반영합니다.

## 왜 Firestore인가 (비유)

Firestore는 "폴더 안에 폴더가 있고, 그 안에 문서가 있는" 구조예요.
- **컬렉션(collection)** = 서랍
- **문서(document)** = 서랍 안의 종이 한 장(항구 하나, 게시글 하나 등)
- **필드(field)** = 그 종이에 적힌 항목들(이름, 위도, 경도 ...)

## 컬렉션 구조

### 1. `harbors` (항·포구 정보) — 공공데이터 API가 자동으로 채움

```
harbors/{harborId}
├─ name: string            // "다미포항"
├─ type: string            // "미분류" — 이 API엔 국가/지방/정주 분류가 없음 (아래 "알게 된 것" 참고)
├─ region: string          // "부산광역시" — 어항주소 앞부분에서 추출, 필터링용
├─ address: string         // "부산광역시 사하구 다대로605번길 67"
├─ lat: number             // 위도 (API의 "위도", 문자열 → 숫자 변환)
├─ lng: number             // 경도 (API의 "경도", 문자열 → 숫자 변환)
├─ fishingHouseholds: number | null   // 어업가구 (API "어업가구")
├─ totalPopulation: number | null     // 전체인구 (API "전체인구")
├─ source: string          // "data.go.kr 해양수산부_어항정보(3083027)"
└─ syncedAt: timestamp     // 우리 쪽 마지막 동기화 시각
```

`jeju-harbor-map`의 `const DATA = [...]` 배열 46개 항목이 이 구조의 "제주 지역만 있는
축소판"입니다. 전국 확장은 이 컬렉션에 수천 개 문서가 쌓이는 것뿐, 구조는 동일합니다.

**실제 API 호출로 알게 된 것 (2026-09-13, data.go.kr 어항정보 API 실제 응답 확인)**
- Base URL: `https://api.odcloud.kr/api`
- 엔드포인트: `/3083027/v1/uddi:1951cefd-22ba-4573-b64c-e0f8a1af0a23_201909101333`
- 인증: 쿼리 파라미터 `serviceKey`
- 페이지네이션: `page`, `perPage` (응답의 `totalCount`로 전체 페이지 계산)
- 원본 필드(한글): `어항명, 어항주소, 위도, 경도, 어촌계명, 어업가구, 배후어업인구,
  전체가구, 전체인구, 인근어항명, 인근어항과의거리, 인근어항항종, 연도`
- **이 어항 자체의 "국가어항/지방어항" 분류는 이 API에 없음** — `인근어항항종`은 "이웃
  어항"의 분류일 뿐, 이 항목이 자기 자신의 분류는 아니다. 분류가 필요해지면(2단계 이후)
  한국어촌어항공단(fipa.or.kr) 목록과 이름 매칭으로 보강 예정. 지금은 `type: "미분류"`로 채움.
- **실제 동기화 결과 총 113건** — 전국 어항 전체(지방어항·어촌정주어항·소규모포구 포함
  수천 곳)가 아니라, **"국가어항"(전국 약 115개소, 2021년 기준)만 담긴 데이터셋으로
  추정됨** (2026-09-13 확인). 근거: 미리보기 샘플에 다대포항·천성항·대변항 등 잘 알려진
  국가어항만 등장, 개수(113)도 국가어항 전체 개수(115)와 거의 일치. **다음 확장 과제**:
  지방어항·어촌정주어항을 포함하려면 별도 공공데이터셋을 찾아 파이프라인에 추가해야 함
  (fipa.or.kr의 지방어항/정주어항 목록이 후보 — 다만 이쪽은 오픈API가 없을 수 있어
  스크래핑 또는 수동 보강이 필요할 수 있음). 지금 113곳은 "핵심 대형 항구 위주 1차
  MVP"로 취급한다.

### 2. `rules` (금어기·금지체장) — jeju-harbor-map에서 자동 동기화 (사람이 직접 입력 안 함)

```
rules/{species}
├─ species: string         // "전복류"
├─ banPeriod: string       // 금어기 (예: "9.1~10.31 (제주는 10.1~12.31)")
├─ minSize: string         // 금지체장 (예: "7cm (제주 10cm)")
├─ category: string        // "fish" | "cephalopod" | "crustacean" | "shellfish" | "seaweed" | "other"
├─ jejuSpecific: boolean   // 제주만 다른 기준이 있는 품종인지
├─ note: string | null     // 유예 조건 등 부연설명 (HTML 태그 포함될 수 있음)
├─ lastChanged: string | null  // 최근 법령 변경일 (있는 경우)
├─ source: string          // "jeju-harbor-map RULES"
└─ syncedAt: timestamp
```

### 2-1. `jeju_no_entry_zones` (제주 입수금지구역, 2027.4.22 시행 예정) — 역시 자동 동기화

```
jeju_no_entry_zones/{harborName}
├─ name: string             // "신양항"
├─ address: string
├─ type: string             // "national" | "local" | "village"
├─ typeLabel: string        // "국가어항" | "지방어항" | "어촌정주어항"
├─ regionCode: string       // "chuja" 등 — COAST_GUARD 매칭용 지역 코드
├─ coastGuardOffice: string | null
├─ coastGuardPhone: string | null
├─ effectiveDate: string    // "2027-04-22"
├─ status: string           // "시행 예정"
├─ source: string           // "jeju-harbor-map DATA + COAST_GUARD"
└─ syncedAt: timestamp
```

**"실시간 업데이트" 구조 (2026-09-13 구축)**: 이 두 컬렉션은 새 공공데이터를 새로 조사하는
대신, 이미 사람이 검증해둔 `jeju-harbor-map` 저장소의 `index.html`(RULES/DATA/COAST_GUARD
배열)을 원본 그대로 가져와 파싱한다. 방법:

- `pipeline/sync-legal-data.mjs`가 `https://raw.githubusercontent.com/kjj8422-code/
  jeju-harbor-map/main/index.html`을 그대로 fetch → 텍스트에서 `const RULES = [...]` 같은
  블록을 잘라내 JS 값으로 변환 → Firestore에 반영.
- `.github/workflows/sync-legal-data.yml`이 매일 자동 실행 (harbors 동기화 직후).
- 즉, **`jeju-harbor-map`에서 법이 바뀌어 값을 고치고 git push하면, 다음날 이 앱에도
  자동으로 반영된다** — 앱 스토어 재배포가 필요 없다.
- 한계: 지금은 **제주 데이터만** 있음(입수금지구역 69곳은 애초에 제주 한정 규정). 다른
  지역의 유사 규정이 생기면 그때 같은 방식으로 추가.

### 3. `board_posts` (조과자랑 게시판) — 구글 폼 대신 앱 내 정식 기능으로

```
board_posts/{postId}
├─ userId: string          // Firebase Auth 익명 로그인 uid
├─ nickname: string
├─ harborId: string        // harbors 컬렉션 참조
├─ content: string
├─ photoUrl: string | null
├─ createdAt: timestamp
└─ reported: number        // 신고 누적 카운트 (모더레이션용)
```

### 4. `game_scores` (미니게임 전국 랭킹) — 지금의 localStorage를 대체

```
game_scores/{userId}
├─ nickname: string
├─ bestScore: number
├─ region: string | null   // 지역별 랭킹도 낼 수 있게
└─ updatedAt: timestamp
```

localStorage는 "내 폰에만 적힌 메모"였다면, 이 컬렉션은 "모두가 보는 칠판"입니다 —
누가 점수를 올리면 전국 사용자가 그 순위를 같이 봅니다.

### 5. `users` (Firebase Auth 확장 정보, 필요시)

```
users/{userId}
├─ nickname: string
├─ createdAt: timestamp
└─ isAnonymous: boolean
```

## 다음 실행 단계 (사람이 직접 해야 하는 것)

1. [ ] https://console.firebase.google.com 에서 새 프로젝트 생성 (예: `haerujil-app`)
2. [ ] Firestore Database 만들기 (프로덕션 모드, 지역은 `asia-northeast3`(서울) 권장)
3. [ ] Authentication에서 "익명" 로그인 방식 켜기
4. [ ] 프로젝트 설정 > 일반 > "웹 앱 추가"로 나오는 설정 값(`firebaseConfig`)을 Claude에게 전달
   (API 키가 포함되지만, Firebase 웹 API 키는 공개되어도 되는 값입니다 — 실제 보안은
   Firestore 보안 규칙으로 처리합니다. 이후 단계에서 규칙도 함께 작성합니다.)
5. [ ] data.go.kr에서 "해양수산부_어항정보" 활용신청 → 승인 후 인증키 확보 → Claude에게 전달

## 참고: jeju-harbor-map과의 관계

제주 데이터는 이미 사람이 검증한 고품질 데이터이므로, 전국 데이터를 자동 수집한 뒤에도
제주 지역 46곳은 `jeju-harbor-map`의 기존 값(관할 해경 연락처, 금지구역 여부 등)을
우선 적용하고 공공데이터로 덮어쓰지 않는다. (2단계 파이프라인 설계 시 반영)
