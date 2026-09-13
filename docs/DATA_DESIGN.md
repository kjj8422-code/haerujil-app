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
├─ name: string            // "성산포항"
├─ type: string            // "국가어항" | "지방어항" | "어촌정주어항" | "소규모포구"
├─ region: string          // "제주특별자치도" — 시/도 단위, 필터링용
├─ address: string
├─ lat: number             // 위도
├─ lng: number             // 경도
├─ coastGuardContact: string | null   // 관할 해양경찰 연락처 (사람이 직접 채움)
├─ noEntryZone: boolean    // 입수 금지구역 여부 (사람이 직접 확인 후 채움 — 법령 해석 필요)
├─ source: string          // "data.go.kr 해양수산부_어항정보"
├─ sourceUpdatedAt: timestamp  // 공공데이터 원본 기준일
└─ syncedAt: timestamp     // 우리 쪽 마지막 동기화 시각
```

`jeju-harbor-map`의 `const DATA = [...]` 배열 46개 항목이 이 구조의 "제주 지역만 있는
축소판"입니다. 전국 확장은 이 컬렉션에 수천 개 문서가 쌓이는 것뿐, 구조는 동일합니다.

### 2. `rules` (금어기·금지체장) — 당분간은 사람이 직접 입력 (전국 공통 + 지역 특례)

```
rules/{speciesId}
├─ species: string         // "전복"
├─ banPeriod: string       // 금어기
├─ minSize: string         // 금지체장
├─ regionException: array  // [{region:"제주", note:"..."}]  — jeju-harbor-map의 "제주만 다른 기준" 그대로 이식
├─ source: string
└─ sourceUrl: string
```

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
