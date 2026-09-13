// 전국 수상레저활동 금지구역 데이터 적재 스크립트
//
// 출처: 해양경찰청 "수상레저활동 금지구역 지정현황"(2025.08.20 기준) — 사용자가 직접
// 다운로드해서 전달해준 공식 엑셀 자료를 pipeline/data/leisure_zones.json으로 미리
// 정리해뒀다(레포에 커밋된 이 JSON이 원본 데이터). 이 자료는 jeju-harbor-map의
// "69곳 입수금지구역"(어촌·어항법, 2027년 시행 예정)과는 다른 별도 법(수상레저안전법)
// 기준의 "지금 당장 적용 중인" 금지구역이다.
//
// jeju-harbor-map처럼 매일 자동으로 다시 받아올 수 있는 라이브 URL이 아니라, 사람이
// 새 엑셀을 받아서 이 JSON을 다시 만들어야 갱신되는 구조다(아래 "갱신 방법" 참고).
// 그래서 이 스크립트는 스케줄이 아니라 수동 실행(workflow_dispatch)으로만 돌린다.
//
// 필요 환경변수: FIREBASE_SERVICE_ACCOUNT

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import admin from "firebase-admin";

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
if (!FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ 환경변수 FIREBASE_SERVICE_ACCOUNT가 설정되지 않았습니다.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();

function makeId(record, index) {
  const key = `${record.regionOffice}|${record.localOffice}|${record.placeName}|${index}`;
  return createHash("sha1").update(key).digest("hex").slice(0, 20);
}

async function main() {
  const records = JSON.parse(readFileSync(new URL("./data/leisure_zones.json", import.meta.url)));
  console.log(`🏖️ 전국 수상레저활동 금지구역 ${records.length}건 적재 시작`);

  const batch = db.batch();
  records.forEach((r, index) => {
    const ref = db.collection("leisure_restricted_zones").doc(makeId(r, index));
    batch.set(
      ref,
      {
        regionOffice: r.regionOffice,
        localOffice: r.localOffice,
        placeType: r.placeType,
        placeName: r.placeName,
        banPeriod: r.banPeriod,
        areaDescription: r.areaDescription,
        bannedDevices: r.bannedDevices,
        lat: r.lat,
        lng: r.lng,
        isJeju: r.regionOffice === "제주청",
        source: "해양경찰청 수상레저활동 금지구역 지정현황 (2025.08.20 기준)",
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
  await batch.commit();

  const geocoded = records.filter((r) => r.lat !== null).length;
  console.log(`✅ leisure_restricted_zones 컬렉션 ${records.length}건 저장 완료 (좌표 확보 ${geocoded}건)`);
}

main().catch((err) => {
  console.error("❌ 적재 실패:", err);
  process.exit(1);
});
