// 법적 준수 정보(금어기·금지체장, 제주 입수금지구역) 동기화 스크립트
//
// jeju-harbor-map(https://github.com/kjj8422-code/jeju-harbor-map) 저장소의 index.html에
// 이미 사람이 직접 검증해둔 법령 데이터(RULES, DATA, COAST_GUARD)가 있다. 그 데이터를
// 새로 베껴 적는 대신, index.html 원본을 그대로 읽어와 파싱해서 Firestore에 반영한다.
//
// 이렇게 하면 jeju-harbor-map 쪽에서 법이 바뀌어 값을 고치고 git push하면, 이 스크립트가
// 다음에 실행될 때(자동 스케줄 또는 수동 실행) 앱 쪽 데이터도 자동으로 최신화된다 —
// 앱 스토어 재배포 없이 "실시간 업데이트"가 이뤄지는 구조.
//
// 필요 환경변수: FIREBASE_SERVICE_ACCOUNT (GitHub Actions Secrets로 주입)

import admin from "firebase-admin";

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
const JEJU_SITE_RAW_URL =
  "https://raw.githubusercontent.com/kjj8422-code/jeju-harbor-map/main/index.html";

if (!FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ 환경변수 FIREBASE_SERVICE_ACCOUNT가 설정되지 않았습니다.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)),
});
const db = admin.firestore();

// index.html 텍스트에서 "const 이름 = <시작괄호> ... \n  <끝괄호>;" 형태의 블록을 찾아
// 실제 JS 값으로 변환한다. jeju-harbor-map의 코드 스타일이 항상 배열/객체를 닫을 때
// 들여쓰기 2칸 + 닫는 괄호 + 세미콜론으로 끝나기 때문에 이 패턴으로 안전하게 잘라낼 수 있다.
function extractConst(html, name, openChar, closeChar) {
  const startMarker = `const ${name} = ${openChar}`;
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`index.html에서 "${startMarker}"를 찾지 못했습니다.`);
  const literalStart = startIdx + startMarker.length - openChar.length; // openChar 포함 위치

  const endMarker = `\n  ${closeChar};`;
  const endIdx = html.indexOf(endMarker, startIdx);
  if (endIdx === -1) throw new Error(`"${name}" 블록의 끝(${endMarker.trim()})을 찾지 못했습니다.`);
  const literalEnd = endIdx + endMarker.lastIndexOf(closeChar) + closeChar.length; // closeChar까지 포함

  const literal = html.slice(literalStart, literalEnd);
  // eslint-disable-next-line no-new-func -- 우리 저장소 자체 코드를 파싱하는 용도(신뢰된 입력)
  return new Function(`return (${literal});`)();
}

function slugId(text) {
  // Firestore 문서 ID로 안전하게 쓰기 위해 "/"만 제거(한글·괄호는 허용됨).
  return String(text).replace(/\//g, "_").trim();
}

async function main() {
  console.log("🔄 jeju-harbor-map에서 법령 데이터 원본 가져오는 중...");
  const res = await fetch(JEJU_SITE_RAW_URL);
  if (!res.ok) throw new Error(`index.html 가져오기 실패: HTTP ${res.status}`);
  const html = await res.text();

  const RULES = extractConst(html, "RULES", "[", "]");
  const DATA = extractConst(html, "DATA", "[", "]");
  const COAST_GUARD = extractConst(html, "COAST_GUARD", "{", "}");
  console.log(`  RULES ${RULES.length}건, DATA ${DATA.length}건, COAST_GUARD ${Object.keys(COAST_GUARD).length}개 지역 확인`);

  // ---------- 1. 금어기·금지체장 (rules 컬렉션) ----------
  const rulesBatch = db.batch();
  for (const r of RULES) {
    const ref = db.collection("rules").doc(slugId(r.n));
    rulesBatch.set(
      ref,
      {
        species: r.n,
        banPeriod: r.season ?? "-",
        minSize: r.size ?? "-",
        category: r.cat ?? "other",
        jejuSpecific: !!r.jeju,
        note: r.note ?? null,
        lastChanged: r.changed ?? null,
        source: "jeju-harbor-map RULES",
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await rulesBatch.commit();
  console.log(`✅ rules 컬렉션 ${RULES.length}건 저장 완료`);

  // ---------- 2. 제주 입수금지구역 (jeju_no_entry_zones 컬렉션) ----------
  // DATA에 있는 69곳 전부가 2027.4.22부터 입수 금지구역이 되는 대상이다 (jeju-harbor-map
  // "여기부터가 입수 금지구역입니다" 섹션 참고). 관할 해양경찰 연락처는 지역코드(r)로 매칭한다.
  const TYPE_LABEL = { national: "국가어항", local: "지방어항", village: "어촌정주어항" };
  const zonesBatch = db.batch();
  for (const harbor of DATA) {
    const guard = COAST_GUARD[harbor.r] ?? null;
    const ref = db.collection("jeju_no_entry_zones").doc(slugId(harbor.n));
    zonesBatch.set(
      ref,
      {
        name: harbor.n,
        address: harbor.a,
        type: harbor.t,
        typeLabel: TYPE_LABEL[harbor.t] ?? harbor.t,
        regionCode: harbor.r,
        coastGuardOffice: guard?.office ?? null,
        coastGuardPhone: guard?.phone ?? null,
        effectiveDate: "2027-04-22",
        status: "시행 예정",
        source: "jeju-harbor-map DATA + COAST_GUARD",
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await zonesBatch.commit();
  console.log(`✅ jeju_no_entry_zones 컬렉션 ${DATA.length}건 저장 완료`);

  console.log("🎉 법령 데이터 동기화 완료");
}

main().catch((err) => {
  console.error("❌ 법령 데이터 동기화 실패:", err);
  process.exit(1);
});
