// 전국 항·포구 데이터 자동 수집 스크립트
//
// 하는 일: 공공데이터포털의 "해양수산부_어항정보" API를 끝까지 페이지를 넘겨가며 다 읽어온
// 뒤, Firestore의 harbors 컬렉션에 기록한다. GitHub Actions가 이 스크립트를 매일 한 번씩
// 실행해서, jeju-harbor-map의 "사람이 직접 46곳 입력"하던 작업을 전국 규모로 자동화한다.
//
// 실행에 필요한 환경변수 (GitHub Actions Secrets로 주입됨 — 절대 코드에 직접 적지 않는다):
//   ODCLOUD_SERVICE_KEY        data.go.kr에서 발급받은 "일반 인증키"
//   FIREBASE_SERVICE_ACCOUNT   Firebase 콘솔에서 발급받은 서비스 계정 JSON 전체(문자열)
//
// 로컬(내 컴퓨터)에서 테스트하려면:
//   cd pipeline && npm install
//   ODCLOUD_SERVICE_KEY="..." FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" node sync-harbors.mjs

import { createHash } from "node:crypto";
import admin from "firebase-admin";

const ODCLOUD_SERVICE_KEY = process.env.ODCLOUD_SERVICE_KEY;
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const PER_PAGE = 100; // 한 번에 몇 개씩 받아올지 (API 제공 최대치 확인 전이라 보수적으로 설정)
const API_BASE =
  "https://api.odcloud.kr/api/3083027/v1/uddi:1951cefd-22ba-4573-b64c-e0f8a1af0a23_201909101333";

function requireEnv(name, value) {
  if (!value) {
    console.error(`❌ 환경변수 ${name}가 설정되지 않았습니다.`);
    process.exit(1);
  }
  return value;
}

requireEnv("ODCLOUD_SERVICE_KEY", ODCLOUD_SERVICE_KEY);
requireEnv("FIREBASE_SERVICE_ACCOUNT", FIREBASE_SERVICE_ACCOUNT);

// ---------- 1. Firebase 초기화 ----------
const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ---------- 2. 공공데이터 API에서 전체 페이지 가져오기 ----------
async function fetchPage(page) {
  const url = new URL(API_BASE);
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(PER_PAGE));
  url.searchParams.set("serviceKey", ODCLOUD_SERVICE_KEY);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API 호출 실패 (page ${page}): HTTP ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchAllHarbors() {
  const first = await fetchPage(1);
  const totalCount = first.totalCount ?? first.data.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  console.log(`전체 ${totalCount}건, ${totalPages}페이지로 나누어 수집합니다.`);

  let rows = [...first.data];
  for (let page = 2; page <= totalPages; page++) {
    const result = await fetchPage(page);
    rows = rows.concat(result.data);
    // 공공데이터포털에 과도한 요청을 보내지 않도록 페이지 사이에 살짝 쉬어간다.
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return rows;
}

// ---------- 3. API 원본 필드 → Firestore harbors 스키마로 변환 ----------
function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// 주소 맨 앞 단어로 시/도(지역)를 뽑아낸다. 예: "부산광역시 사하구 ..." → "부산광역시"
function extractRegion(address) {
  if (!address) return "미상";
  const first = address.trim().split(/\s+/)[0];
  return first || "미상";
}

// API가 항구별 고유 ID를 안 주기 때문에, "이름+주소"를 해시해서 항상 같은 문서 ID가 나오게
// 만든다. 이렇게 해야 스크립트를 매일 다시 돌려도 같은 항구가 중복 생성되지 않고 갱신된다.
function makeHarborId(name, address) {
  return createHash("sha1").update(`${name}|${address}`).digest("hex").slice(0, 20);
}

function mapRow(row) {
  const name = row["어항명"]?.trim();
  const address = row["어항주소"]?.trim();
  if (!name || !address) return null; // 이름·주소가 없는 데이터는 건너뛴다 (품질 방어)

  return {
    id: makeHarborId(name, address),
    data: {
      name,
      address,
      region: extractRegion(address),
      type: "미분류", // 이 API엔 국가/지방/정주 분류가 없음 — DATA_DESIGN.md 참고
      lat: toNumberOrNull(row["위도"]),
      lng: toNumberOrNull(row["경도"]),
      fishingHouseholds: toNumberOrNull(row["어업가구"]),
      totalPopulation: toNumberOrNull(row["전체인구"]),
      source: "data.go.kr 해양수산부_어항정보(3083027)",
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  };
}

// ---------- 4. Firestore에 일괄 저장 (배치 500개 제한 준수) ----------
async function writeToFirestore(harbors) {
  const BATCH_SIZE = 450; // Firestore 배치 한도(500)보다 여유 있게
  let written = 0;

  for (let i = 0; i < harbors.length; i += BATCH_SIZE) {
    const chunk = harbors.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const harbor of chunk) {
      const ref = db.collection("harbors").doc(harbor.id);
      batch.set(ref, harbor.data, { merge: true });
    }
    await batch.commit();
    written += chunk.length;
    console.log(`  ...${written}/${harbors.length}건 저장 완료`);
  }
}

// ---------- 실행 ----------
async function main() {
  console.log("🚢 전국 어항 데이터 수집 시작");
  const rawRows = await fetchAllHarbors();

  const harbors = rawRows.map(mapRow).filter(Boolean);
  const skipped = rawRows.length - harbors.length;
  console.log(`변환 완료: ${harbors.length}건 (건너뜀 ${skipped}건)`);

  await writeToFirestore(harbors);
  console.log("✅ 전국 어항 데이터 동기화 완료");
}

main().catch((err) => {
  console.error("❌ 동기화 실패:", err);
  process.exit(1);
});
