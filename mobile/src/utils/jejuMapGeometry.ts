// jeju-harbor-map(웹사이트)의 손그림 스타일 제주도 SVG 지도를 React Native로 그대로
// 옮겨온 것. 실제 위도/경도가 아니라, 해안선을 따라 "몇 번째 항구인지" 순서로 점을
// 찍는 방식(개략도)이라 GPS 좌표나 지도 API 키가 전혀 필요 없다.
//
// 원본은 브라우저의 SVGGeometryElement.getPointAtLength()를 썼는데, React Native엔
// 그 API가 없어서 베지에 곡선을 여러 점으로 잘게 나눠 직접 호(arc length) 테이블을
// 만드는 방식으로 대체했다(pointAtFraction 함수).

export type Point = [number, number];

// 섬 윤곽선을 이루는 22개의 기준점(시계방향). 실제 좌표가 아니라 손으로 잡은 도안 좌표.
export const ANCHORS: Point[] = [
  [300, 90], [365, 68], [430, 62], [495, 72], [555, 92], [605, 118],
  [675, 108], [712, 90], [698, 148], [665, 205], [628, 255], [588, 300],
  [538, 325], [478, 335], [418, 330], [392, 357], [347, 335], [298, 305],
  [248, 263], [212, 210], [224, 155], [262, 105],
];

export const CENTER: Point = [
  ANCHORS.reduce((s, p) => s + p[0], 0) / ANCHORS.length,
  ANCHORS.reduce((s, p) => s + p[1], 0) / ANCHORS.length,
];

function catmullRomSegments(pts: Point[]): { p0: Point; c1: Point; c2: Point; p1: Point }[] {
  const n = pts.length;
  const segments = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    segments.push({ p0: p1, c1, c2, p1: p2 });
  }
  return segments;
}

export function catmullRom2bezierPath(pts: Point[]): string {
  const segments = catmullRomSegments(pts);
  let d = `M ${segments[0].p0[0]},${segments[0].p0[1]} `;
  for (const seg of segments) {
    d += `C ${seg.c1[0]},${seg.c1[1]} ${seg.c2[0]},${seg.c2[1]} ${seg.p1[0]},${seg.p1[1]} `;
  }
  return d + "Z";
}

export function offsetOutward(pts: Point[], dist: number, center: Point = CENTER): Point[] {
  return pts.map(([x, y]) => {
    const dx = x - center[0];
    const dy = y - center[1];
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * dist, y + (dy / len) * dist] as Point;
  });
}

function cubicPoint(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const dd = t * t * t;
  return [
    a * p0[0] + b * c1[0] + c * c2[0] + dd * p1[0],
    a * p0[1] + b * c1[1] + c * c2[1] + dd * p1[1],
  ];
}

const SAMPLES_PER_SEGMENT = 24;

// 폐곡선을 촘촘한 점들로 미리 샘플링해서 "누적 길이 → 점" 테이블을 만든다.
// pointAtFraction()이 이 테이블을 보고 원하는 비율(0~1) 위치의 좌표를 찾아준다.
function buildArcLengthTable(pts: Point[]) {
  const segments = catmullRomSegments(pts);
  const samples: { point: Point; cumLen: number }[] = [];
  let cum = 0;
  let prev: Point = segments[0].p0;
  samples.push({ point: prev, cumLen: 0 });

  for (const seg of segments) {
    for (let s = 1; s <= SAMPLES_PER_SEGMENT; s++) {
      const t = s / SAMPLES_PER_SEGMENT;
      const pt = cubicPoint(seg.p0, seg.c1, seg.c2, seg.p1, t);
      cum += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
      samples.push({ point: pt, cumLen: cum });
      prev = pt;
    }
  }
  return { samples, totalLength: cum };
}

const arcTable = buildArcLengthTable(ANCHORS);

// f: 0~1 사이 비율(해안선을 시계방향으로 한 바퀴 돈 위치). 0.5면 정확히 절반 지점.
export function pointAtFraction(f: number): Point {
  const target = (((f % 1) + 1) % 1) * arcTable.totalLength;
  const { samples } = arcTable;
  // 이진 탐색으로 target 길이 바로 앞뒤의 샘플 두 개를 찾아 선형보간한다.
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].cumLen < target) lo = mid + 1;
    else hi = mid;
  }
  const b = samples[lo];
  const a = samples[Math.max(0, lo - 1)];
  const span = b.cumLen - a.cumLen || 1;
  const ratio = (target - a.cumLen) / span;
  return [a.point[0] + (b.point[0] - a.point[0]) * ratio, a.point[1] + (b.point[1] - a.point[1]) * ratio];
}

export const LAND_PATH = catmullRom2bezierPath(ANCHORS);
export const RING_PATH = catmullRom2bezierPath(offsetOutward(ANCHORS, 16));
export const ROAD_PATH = catmullRom2bezierPath(offsetOutward(ANCHORS, -34));

// 해안선을 시계방향으로 돌 때 각 읍·면이 차지하는 구간(비율). jeju-harbor-map과 동일.
export const REGIONS: Record<string, { label: string; range: [number, number] }> = {
  jeju: { label: "제주시(도심)", range: [0.0, 0.075] },
  jocheon: { label: "조천읍", range: [0.075, 0.14] },
  gujwa: { label: "구좌읍", range: [0.14, 0.25] },
  seongsan: { label: "성산읍", range: [0.25, 0.33] },
  pyoseon: { label: "표선면", range: [0.33, 0.4] },
  namwon: { label: "남원읍", range: [0.4, 0.48] },
  seogwipo: { label: "서귀포시(원도심)", range: [0.48, 0.56] },
  andeok: { label: "안덕면", range: [0.56, 0.62] },
  daejeong: { label: "대정읍", range: [0.62, 0.7] },
  hangyeong: { label: "한경면", range: [0.7, 0.77] },
  hallim: { label: "한림읍", range: [0.77, 0.84] },
  aewol: { label: "애월읍", range: [0.84, 0.93] },
};

// 본섬 해안선 위에 없는 부속 섬(우도/가파도/추자도)은 별도 인셋 박스 좌표에 고정 배치.
export const INSET_POS: Record<string, Point> = {
  udo: [770, 190],
  gapa: [335, 455],
  chuja: [105, 80],
};
export const INSET_ANCHOR_FRAC: Record<string, number> = { udo: 0.235, gapa: 0.655 };
export const INSET_LABEL: Record<string, string> = {
  udo: "우도면 (부속 도서)",
  gapa: "가파도 (대정읍 부속 도서)",
  chuja: "추자면 (본섬 북쪽 약 45km 부속 도서)",
};

export const TYPE_COLOR: Record<string, string> = {
  national: "#e2483d",
  local: "#d9a441",
  village: "#6fb8b0",
};

type ZoneLike = { id: string; regionCode: string; sortOrder: number };

// 각 항구가 지도 위 어디에 찍혀야 하는지 계산한다. 같은 지역(regionCode) 안에서는
// sortOrder(원본 목록 순서)로 나란히 배치해 실제 해안선을 따라가는 느낌을 살린다.
export function computeHarborPositions<T extends ZoneLike>(
  zones: T[],
): Map<string, { pos: Point; anchor: Point }> {
  const byRegion = new Map<string, T[]>();
  for (const z of zones) {
    if (!byRegion.has(z.regionCode)) byRegion.set(z.regionCode, []);
    byRegion.get(z.regionCode)!.push(z);
  }
  for (const list of byRegion.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);

  const result = new Map<string, { pos: Point; anchor: Point }>();
  for (const [regionCode, list] of byRegion) {
    const region = REGIONS[regionCode];
    if (region) {
      const [s, e] = region.range;
      list.forEach((z, idx) => {
        const f = s + ((idx + 0.5) / list.length) * (e - s);
        const onCoast = pointAtFraction(f);
        result.set(z.id, { pos: offsetOutward([onCoast], 11)[0], anchor: onCoast });
      });
    } else {
      const inset = INSET_POS[regionCode];
      if (inset) list.forEach((z) => result.set(z.id, { pos: inset, anchor: inset }));
    }
  }
  return result;
}
