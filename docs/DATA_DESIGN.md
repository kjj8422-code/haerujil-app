# 데이터베이스 설계 (Firestore) — 1단계 초안

이 문서는 "1단계: 데이터·DB 기반" 작업의 산출물입니다. Firebase 프로젝트를 만들고 나면
아래 컬렉션 구조 그대로 Firestore에 반영합니다.

## 왜 Firestore인가 (비유)

Firestore는 "폴더 안에 폴더가 있고, 그 안에 문서가 있는" 구조예요.
- **컬렉션(collection)** = 서랍
- **문서(document)** = 서랍 안의 종이 한 장(항구 하나, 게시글 하나 등)
- **필드(field)** = 그 종이에 적힌 항목들(이름, 위도, 경도 ...)

## 컬렉션 구조

### 1. ~~`harbors` (항·포구 정보)~~ — 2026-09-13 기능 자체를 제거함

한때 공공데이터 API로 국가어항 113곳을 자동 수집해 `HarborListScreen`/`HarborMapScreen`
으로 보여줬으나, "항구 안내"는 이 앱의 목적(법 위반 방지)과 무관하다는 판단으로 화면과
동기화 파이프라인을 전부 삭제했다(자세한 이유는 `CLAUDE.md`의 "제거한 기능" 참고).
Firestore의 `harbors` 컬렉션 문서 자체는 지우지 않았지만 앱이 더 이상 읽지 않는다 —
정리하려면 Firebase 콘솔에서 컬렉션을 수동 삭제하면 된다.

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
├─ sortOrder: number        // DATA 배열 안 원래 순서
├─ lat: number | null       // 카카오 로컬 API로 주소를 지오코딩해서 채움 (실패하면 null)
├─ lng: number | null
├─ coastGuardOffice: string | null
├─ coastGuardPhone: string | null
├─ effectiveDate: string    // "2027-04-22"
├─ status: string           // "시행 예정"
├─ source: string           // "jeju-harbor-map DATA + COAST_GUARD"
└─ syncedAt: timestamp
```

### 2-2. `law_changes` (최근 법령 변경 이력) — 자동 동기화

```
law_changes/{changeId}
├─ effective: string       // "2027-04-22"
├─ status: string          // "시행중" | "시행 예정"
├─ scope: string           // "금어기·금지체장" 등
├─ title: string
├─ before: string | null
├─ after: string | null
├─ note: string | null
├─ source: string | null
├─ sourceUrl: string | null
├─ species: string[]       // 표에 🆕 뱃지를 붙일 품종(있는 경우)
└─ syncedAt: timestamp
```

### 2-3. `safety_orgs` (야간 해루질 안전관리요원 인정단체, 50곳) — 자동 동기화

```
safety_orgs/{recognitionNo}
├─ recognitionNo: string   // "2017-1"
├─ name: string
├─ certs: string           // 인정되는 자격증 등급 설명
└─ syncedAt: timestamp
```

**"실시간 업데이트" 구조 (2026-09-13 구축, 2026-09-13 RULES/DATA에 이어 LAW_CHANGES/ORGS로 확장)**:
이 네 컬렉션(rules, jeju_no_entry_zones, law_changes, safety_orgs)은 새 공공데이터를 새로 조사하는
대신, 이미 사람이 검증해둔 `jeju-harbor-map` 저장소의 `index.html`(RULES/DATA/COAST_GUARD
배열)을 원본 그대로 가져와 파싱한다. 방법:

- `pipeline/sync-legal-data.mjs`가 `https://raw.githubusercontent.com/kjj8422-code/
  jeju-harbor-map/main/index.html`을 그대로 fetch → 텍스트에서 `const RULES = [...]` 같은
  블록을 잘라내 JS 값으로 변환 → Firestore에 반영.
- `.github/workflows/sync-legal-data.yml`이 매일 자동 실행.
- 즉, **`jeju-harbor-map`에서 법이 바뀌어 값을 고치고 git push하면, 다음날 이 앱에도
  자동으로 반영된다** — 앱 스토어 재배포가 필요 없다.
- 한계: 지금은 **제주 데이터만** 있음(입수금지구역 69곳은 애초에 제주 한정 규정). 다른
  지역의 유사 규정이 생기면 그때 같은 방식으로 추가.
- `jeju_no_entry_zones`는 주소만 있고 좌표가 없어서, 카카오 로컬 API(주소 검색)로
  지오코딩해 lat/lng을 채운다 — `KAKAO_REST_KEY` 시크릿 필요 (2026-09-13 추가).

## 지도 렌더링 (2026-09-13, 카카오맵으로 교체)

처음엔 `react-native-maps`(구글맵)로 시도했으나, **Expo Go에서는 안드로이드 구글맵
타일이 API 키 없이는 안 보이고, 그 키는 Expo Go가 아닌 커스텀 개발 빌드(EAS Build)
에서만 적용된다는 한계**에 부딪혔다. 대신 `react-native-webview` 안에서 **카카오맵
JavaScript SDK**를 그대로 돌리는 방식으로 교체했다 — Expo Go에서 별도 빌드 없이 바로
된다. `mobile/src/components/KakaoMapView.tsx`가 이 로직을 담당하고, `RestrictedZonesScreen`
(제주 69곳 + 전국 스킨 해루질 금지구역)에서 재사용한다.

**카카오 개발자 콘솔 설정 (한 번만 하면 됨)**:
1. developers.kakao.com에서 앱 생성 → "플랫폼 키"에서 JavaScript 키, REST API 키 확인
2. JavaScript 키 상세 설정의 "JavaScript SDK 도메인"에 `http://localhost` 등록
   (`KakaoMapView`가 WebView `baseUrl`을 이 값으로 고정해서 로드하기 때문 — 실제
   웹사이트가 아니라 앱 내부에서만 쓰는 값이라 이 문자열 그대로 등록하면 됨)
3. 왼쪽 메뉴 "카카오맵"에서 사용 설정을 ON으로 켜기 (무료 쿼터 자동 제공)
4. JavaScript 키는 `mobile/src/kakaoConfig.ts`에, REST API 키는 GitHub Secret
   `KAKAO_REST_KEY`에 저장 (지오코딩용, 파이프라인 전용이라 앱에는 안 들어감)

제주 스타일 손그림 SVG 개략도(`jejuMapGeometry.ts`/`JejuSchematicMap.tsx`)는 실제
카카오맵으로 대체되면서 삭제했다 — 위경도만 있으면 실제 지도가 훨씬 정확하고
사용자가 원한 "네이버맵·구글맵 같은" 경험에 더 가깝기 때문.

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

## 3. `leisure_restricted_zones` (전국 수상레저활동 금지구역) — 수동 1회 적재 (2026-09-13)

```
leisure_restricted_zones/{zoneId}
├─ regionOffice: string     // "제주청" 등 — 지방해양경찰청
├─ localOffice: string      // "제주서" 등 — 관할 해양경찰서
├─ placeType: string        // "해수욕장" | "기타지역"
├─ placeName: string        // 여러 해변이 콤마로 묶여 있을 수 있음(원본 표 형식 그대로)
├─ banPeriod: string        // "해수욕장 개장기간" | "연중" 등
├─ areaDescription: string  // 금지구역 세부 범위 설명(좌표 나열 포함, 길 수 있음)
├─ bannedDevices: string    // "모든 수상레저기구" | "동력수상레저기구" 등
├─ lat, lng: number | null  // areaDescription의 첫 DMS 좌표를 디코드(파싱 실패 시 null)
├─ isJeju: boolean          // regionOffice === "제주청"
├─ source: string
└─ syncedAt: timestamp
```

**출처와 갱신 방법**: `jeju-harbor-map`의 RULES/DATA와 달리, 이 데이터는 사용자가
해양경찰청에서 직접 받은 엑셀("수상레저활동 금지구역 지정현황", 2025.08.20 기준,
전국 213개소)을 `pipeline/data/leisure_zones.json`으로 한 번 정리해 커밋해둔 것이다.
재발행되는 라이브 URL이 없어서 매일 자동 동기화는 안 되고, `seed-leisure-zones.mjs`를
**수동으로**(`.github/workflows/seed-leisure-zones.yml`, workflow_dispatch) 실행해야
반영된다. 새 엑셀이 나오면: 같은 방식으로 파싱해 JSON을 다시 만들고 → 커밋 → 워크플로
수동 실행.

**jeju-harbor-map "69곳 입수금지구역"과의 차이**: 이건 완전히 다른 법(수상레저안전법,
해양경찰청 고시)에 근거한 **지금 당장 적용 중인** 규정이다. jeju-harbor-map 쪽은
어촌·어항법 개정에 따라 **2027.4.22부터** 시행 예정인 별개 규정. 두 데이터를 혼동하지
않도록 앱에서도 `jeju_no_entry_zones`(⏳)와 `leisure_restricted_zones`(🚫)를 한
화면(`RestrictedZonesScreen`, 탭 "🚫 금지구역")에서 이모지와 색으로 구분해 같이 보여준다.

**"동력기구 전용" 금지 구역은 화면에서 제외 (2026-09-13)**: 213개소 중 `bannedDevices`가
순수하게 "동력○○기구"만 언급하는 구역(제트스키·모터보트 등)은 `RestrictedZonesScreen`에
표시하지 않는다 — 이 앱의 목적은 레저기구 허가 문제가 아니라 **맨몸 스킨 해루질(스노클링·
워킹 포함)이 걸릴 수 있는 구역**을 보여주는 것이라, 동력기구만 금지된 곳은 관련이 없기
때문. 반대로 "모든 수상레저기구" 금지나 "무동력 수상레저기구"(비동력, 사람이 직접 하는
활동을 정확히 겨냥) 금지는 스킨 해루질에도 적용될 수 있어 포함한다. 문구가 비어 있거나
애매한 경우도 과소평가보다 안전하게 "포함"으로 처리한다 — 필터 로직은
`RestrictedZonesScreen.tsx`의 `isSkinDivingRelevant()` 참고. 이 필터링으로 213개소 중
약 46개소만 화면에 남는다(제외된 곳은 화면 상단에 개수로 안내).

**미수집: 내수면(강·호수·저수지·댐) 금지구역** — 사용자가 준 엑셀 중
"(내수면)수상레저활동 금지구역 지정현황(2024년 기준)" 51개소 시트는 아직 파싱해서
넣지 않았다(해수면 213개소만 반영됨). 컬럼 구조가 다르고(지방청/관할서 구분 없음,
좌표 없음) 기준 시점도 2024년으로 해수면 자료(2025.08.20)보다 오래됐다. 해루질은
대부분 바닷가·갯벌에서 하는 활동이라 우선순위를 낮게 뒀지만, 강·하구에서도 하는
사용자가 있다면 추가로 반영할 가치가 있다.

**미수집: "허가필요수역(허가구역)"은 제주만의 제도가 아니라 전국 공통** —
2026-09-13에 웹 검색으로 확인: 수상레저안전법상 "금지구역"과 별개로 "허가필요수역
(허가구역)"도 있는데, 이건 제주해양경찰서뿐 아니라 부산·여수·통영·군산·태안·울진·
동해 등 **전국 각 해양경찰서가 관할구역별로 각자 고시**한다(예: 울진해경 "해양레저
활동 허가필요수역 고시" 개정 사례). 제주 한림항이 레저금지 목록에 없는 이유도 이
허가구역 제도 때문(허가받으면 이용 가능한 수역이라 "금지"가 아님).
다만 law.go.kr·data.go.kr·boat.kcg.go.kr이 전부 이 실행 환경의 네트워크 방화벽에
막혀 있어서(WebFetch 시 `EGRESS_BLOCKED`) 검색 스니펫으로 "전국 공통 제도"라는
사실만 확인했을 뿐, 지역별 허가구역 목록 원문은 이 세션에서 가져올 수 없었다.
공공데이터포털에도 "금지구역" 공간정보(`해양경찰청_수상레저금지구역_해수면`)만
있고 "허가구역"을 묶어 놓은 통합 데이터셋은 검색으로 못 찾음 — 해양경찰서별 고시가
따로따로 흩어져 있는 것으로 보인다. 그래서 앱에는 아직 실제 허가구역 좌표를 못
넣었고, 대신 `RestrictedZonesScreen`에 "이 목록에 없다고 안전한 게 아니다" 경고
문구만 넣어뒀다. 실제 데이터를 넣으려면 사용자가 boat.kcg.go.kr(수상레저종합정보
시스템)이나 관할 해양경찰서에서 직접 받아와야 할 가능성이 높다.
