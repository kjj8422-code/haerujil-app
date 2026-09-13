import { useMemo } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import type { NoEntryZone } from "../hooks/useNoEntryZones";
import {
  INSET_ANCHOR_FRAC,
  INSET_LABEL,
  INSET_POS,
  LAND_PATH,
  REGIONS,
  RING_PATH,
  ROAD_PATH,
  TYPE_COLOR,
  CENTER,
  computeHarborPositions,
  pointAtFraction,
  offsetOutward,
} from "../utils/jejuMapGeometry";

const VIEW_W = 860;
const VIEW_H = 560;

type Props = {
  /** 항상 전체 목록을 넘긴다 — 위치 계산이 검색 결과 수에 따라 흔들리지 않도록,
   * 위치는 항상 전체 69곳 기준으로 고정하고 visibleIds로 표시 여부만 바꾼다. */
  zones: NoEntryZone[];
  visibleIds: Set<string> | null; // null이면 전부 표시
  selectedId: string | null;
  onSelect: (zone: NoEntryZone) => void;
};

// jeju-harbor-map 웹사이트의 손그림 제주도 지도를 React Native SVG로 그대로 옮긴
// 버전. 실제 GPS 좌표를 쓰지 않는 "개략도"라서 구글맵 API 키 없이도 바로 보인다.
export default function JejuSchematicMap({ zones, visibleIds, selectedId, onSelect }: Props) {
  const positions = useMemo(() => computeHarborPositions(zones), [zones]);
  const regionEntries = useMemo(() => Object.entries(REGIONS), []);
  const visibleZones = visibleIds ? zones.filter((z) => visibleIds.has(z.id)) : zones;

  return (
    <View style={{ width: "100%", aspectRatio: VIEW_W / VIEW_H }}>
      <Svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%">
        <Defs>
          <RadialGradient id="seaGrad" cx="50%" cy="48%" r="65%">
            <Stop offset="0%" stopColor="#123a52" />
            <Stop offset="100%" stopColor="#081c2b" />
          </RadialGradient>
        </Defs>

        <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="url(#seaGrad)" />

        {/* 나침반 */}
        <G transform="translate(60,58)">
          <Circle r={26} fill="none" stroke="#3a6a80" strokeWidth={1} />
          {[0, 90, 180, 270].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <Line
                key={a}
                x1={0}
                y1={0}
                x2={Math.sin(rad) * 26}
                y2={-Math.cos(rad) * 26}
                stroke="#3a6a80"
                strokeWidth={1}
              />
            );
          })}
          <SvgText x={0} y={-32} textAnchor="middle" fill="#b7cddc" fontSize={11}>
            N
          </SvgText>
          <Polygon points="0,-20 6,0 0,20 -6,0" fill="#b7cddc" opacity={0.8} />
        </G>

        {/* 2027.4.22 입수금지 예정 구역을 상징하는 점선 링 */}
        <Path d={RING_PATH} fill="none" stroke="#e2483d" strokeWidth={1.6} strokeDasharray="5,5" opacity={0.55} />

        {/* 섬 육지 */}
        <Path d={LAND_PATH} fill="#ece4cd" stroke="#7d6f4c" strokeWidth={1.5} />

        {/* 해안 일주도로(개략선) */}
        <Path d={ROAD_PATH} fill="none" stroke="#b7a878" strokeWidth={1} strokeDasharray="1,4" opacity={0.6} />

        {/* 한라산 */}
        <G transform={`translate(${CENTER[0]},${CENTER[1] - 6})`}>
          <Polygon points="-9,6 0,-10 9,6" fill="#cdbf9c" stroke="#7d6f4c" strokeWidth={1} />
          <SvgText x={0} y={20} textAnchor="middle" fontSize={9.5} fill="#7d6f4c">
            한라산
          </SvgText>
        </G>

        {/* 우도/가파도 인셋으로 이어지는 점선 */}
        {(["udo", "gapa"] as const).map((key) => {
          const anchor = pointAtFraction(INSET_ANCHOR_FRAC[key]);
          const target = INSET_POS[key];
          return (
            <Line
              key={key}
              x1={anchor[0]}
              y1={anchor[1]}
              x2={target[0]}
              y2={target[1]}
              stroke="#5c7891"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          );
        })}

        {/* 부속 섬(우도/가파도/추자도) 인셋 박스 */}
        {Object.entries(INSET_POS).map(([key, [x, y]]) => (
          <G key={key}>
            <Circle cx={x} cy={y} r={20} fill="#0f3348" stroke="#1c3f57" strokeWidth={1} />
            <SvgText x={x} y={y + 34} textAnchor="middle" fontSize={10} fill="#85a6bc">
              {INSET_LABEL[key]}
            </SvgText>
          </G>
        ))}

        {/* 읍·면 이름 라벨 */}
        {regionEntries.map(([key, region]) => {
          const [s, e] = region.range;
          const mid = pointAtFraction((s + e) / 2);
          const [lx, ly] = offsetOutward([mid], 30)[0];
          return (
            <SvgText key={key} x={lx} y={ly} textAnchor="middle" fontSize={9} fill="#5c7891">
              {region.label.replace(/\(.+\)/, "")}
            </SvgText>
          );
        })}

        {/* 항구 마커 — 국가어항(빨강, 큰 원) / 지방어항(금색, 네모) / 어촌정주어항(청록, 작은 원) */}
        {visibleZones.map((z) => {
          const posInfo = positions.get(z.id);
          if (!posInfo) return null;
          const [x, y] = posInfo.pos;
          const isSelected = z.id === selectedId;
          const color = TYPE_COLOR[z.type] ?? "#888";

          return (
            <G key={z.id} onPress={() => onSelect(z)}>
              {/* 손가락으로 정확히 찍기 쉽도록 실제 점보다 훨씬 넓은 투명 터치 영역 */}
              <Circle cx={x} cy={y} r={16} fill="transparent" />
              {isSelected && <Circle cx={x} cy={y} r={11} fill="none" stroke="#fff" strokeWidth={2} />}
              {z.type === "national" ? (
                <Circle cx={x} cy={y} r={6.5} fill={color} stroke="#0b2a3d" strokeWidth={1.5} />
              ) : z.type === "local" ? (
                <Rect x={x - 5} y={y - 5} width={10} height={10} rx={2} fill={color} stroke="#0b2a3d" strokeWidth={1.3} />
              ) : (
                <Circle cx={x} cy={y} r={3.4} fill={color} stroke="#0b2a3d" strokeWidth={1} />
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
