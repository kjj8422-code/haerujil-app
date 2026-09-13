// "5.1 ~ 5.31" 같은 금어기 문구를 보고 "오늘 기준으로 지금 금어기인지"를 계산한다.
//
// 안전 원칙: 애매하면 무조건 "확인 필요"로 표시한다. 실제로 금어기인데 앱이
// "지금 가능"이라고 잘못 알려주면 사용자가 진짜로 법을 어기게 될 수 있으므로,
// 자신 있게 계산할 수 있는 "깔끔한 날짜 범위"만 자동 판정하고 나머지는 전부
// 사람이 원문을 직접 읽도록 유도한다.
export type SeasonStatus =
  | { kind: "no-season" } // "-" — 금어기 없음, 금지체장만 있음
  | { kind: "year-round-ban" } // 사실상 연중 금지
  | { kind: "banned-now"; confident: boolean }
  | { kind: "open-now"; confident: boolean }
  | { kind: "unknown" }; // 문구가 복잡해서 자동 판정 불가 — 원문을 직접 확인해야 함

function isSimpleRange(text: string): boolean {
  // 괄호나 부가 설명이 하나도 없는, 순수한 "M.D ~ M.D" (또는 "익년" 포함) 형태인지 확인.
  return /^\d{1,2}\.\d{1,2}\s*~\s*(익년\s*)?\d{1,2}\.\d{1,2}$/.test(text.trim());
}

function parseLeadingRange(
  text: string,
): { startMonth: number; startDay: number; endMonth: number; endDay: number } | null {
  const m = text
    .trim()
    .match(/^(\d{1,2})\.(\d{1,2})\s*~\s*(익년\s*)?(\d{1,2})\.(\d{1,2})/);
  if (!m) return null;
  const [, sm, sd, , em, ed] = m;
  const startMonth = Number(sm);
  const startDay = Number(sd);
  const endMonth = Number(em);
  const endDay = Number(ed);
  if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) return null;
  return { startMonth, startDay, endMonth, endDay };
}

function isWithinRange(
  now: { month: number; day: number },
  range: { startMonth: number; startDay: number; endMonth: number; endDay: number },
): boolean {
  const toNum = (month: number, day: number) => month * 100 + day;
  const nowVal = toNum(now.month, now.day);
  const startVal = toNum(range.startMonth, range.startDay);
  const endVal = toNum(range.endMonth, range.endDay);

  if (startVal <= endVal) {
    // 같은 해 안에서 끝나는 일반적인 범위 (예: 5.1~5.31)
    return nowVal >= startVal && nowVal <= endVal;
  }
  // 연말을 넘어가는 범위 (예: 12.1~익년1.31)
  return nowVal >= startVal || nowVal <= endVal;
}

export function getSeasonStatus(banPeriod: string, now: Date = new Date()): SeasonStatus {
  const text = (banPeriod ?? "").trim();

  if (text === "-" || text === "") return { kind: "no-season" };
  if (text.includes("연중") && text.includes("금지")) return { kind: "year-round-ban" };

  const range = parseLeadingRange(text);
  if (!range) return { kind: "unknown" };

  const confident = isSimpleRange(text); // 뒤에 괄호/예외 설명이 없어야 "확실함"
  const nowMonthDay = { month: now.getMonth() + 1, day: now.getDate() };
  const banned = isWithinRange(nowMonthDay, range);

  return banned ? { kind: "banned-now", confident } : { kind: "open-now", confident };
}
