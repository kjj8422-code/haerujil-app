import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import InAppWebViewModal from "../components/InAppWebViewModal";
import KakaoMapView, { type MapMarker } from "../components/KakaoMapView";
import PlaceInfoButtons from "../components/PlaceInfoButtons";
import { type LeisureZone, useLeisureZones } from "../hooks/useLeisureZones";
import { type NoEntryZone, useNoEntryZones } from "../hooks/useNoEntryZones";
import { usePlaceInfoModal } from "../hooks/usePlaceInfoModal";

// 두 규정을 한 화면에서 같이 보여주되, 절대 섞여 보이지 않도록 이모지와
// 색을 분명히 다르게 쓴다. 세모/동그라미보다 귀엽고 한눈에 뜻도 더 잘 통한다.
//   ⏳ 청록/금색/빨강 = 제주 2027.4.22 "시행 예정"(어촌·어항법) — 아직 안 왔다
//   🚫 빨강         = 전국 "지금 시행 중"(수상레저안전법, 해양경찰청)
const JEJU2027_EMOJI = "⏳";
const LEISURE_NOW_EMOJI = "🚫";
const JEJU_TYPE_COLOR: Record<string, string> = { national: "#e2483d", local: "#d9a441", village: "#6fb8b0" };

// 이 앱의 목적은 "동력수상레저기구(제트스키·모터보트 등) 이용 허가" 문제가 아니라,
// 맨몸으로 하는 스킨 해루질(스노클링·워킹 포함)이 걸릴 수 있는 구역을 보여주는 것.
// 그래서 "동력○○만" 금지된 구역(모터 달린 기구만 문제 삼음)은 제외하고, 사람이
// 직접 하는 활동도 포함될 수 있는 구역만 남긴다 — 문구가 불분명하거나 비어 있으면
// 과소평가보다 안전하게 "관련 있음"으로 취급한다.
function isSkinDivingRelevant(bannedDevices: string): boolean {
  const text = bannedDevices.trim();
  if (!text) return true;
  const powerOnly = text.includes("동력") && !text.includes("모든") && !text.includes("무동력");
  return !powerOnly;
}

function leisureColor(z: LeisureZone): string {
  const text = z.bannedDevices.trim();
  // "무동력"(비동력) 금지는 사람이 직접 하는 활동을 정확히 겨냥한 표현이라 "모든"
  // 금지와 똑같이 위험(빨강)으로 본다. 문구가 없을 때도 안전하게 빨강으로 취급.
  if (!text) return "#e2483d";
  return text.includes("모든") || text.includes("무동력") ? "#e2483d" : "#d9a441";
}

type Category = "all" | "jeju2027" | "leisureNow";

type CardProps<Z> = { zone: Z; onOpen: (url: string, title: string) => void };

function Jeju2027Card({ zone, onOpen }: CardProps<NoEntryZone>) {
  const call = () => {
    if (zone.coastGuardPhone) Linking.openURL(`tel:${zone.coastGuardPhone}`);
  };
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.categoryTag}>{JEJU2027_EMOJI} 2027.4.22 시행 예정</Text>
        <Text style={[styles.typeBadge, { color: JEJU_TYPE_COLOR[zone.type] ?? "#888" }]}>{zone.typeLabel}</Text>
      </View>
      <Text style={styles.placeName}>{zone.name}</Text>
      <Text style={styles.subline}>{zone.address}</Text>
      {zone.coastGuardOffice && (
        <Pressable style={styles.callRow} onPress={call}>
          <Text style={styles.callText}>📞 {zone.coastGuardOffice} {zone.coastGuardPhone}</Text>
          <Text style={styles.callHint}>탭하면 바로 전화</Text>
        </Pressable>
      )}
      <PlaceInfoButtons placeName={zone.name} onOpen={onOpen} />
    </View>
  );
}

function LeisureNowCard({ zone, onOpen }: CardProps<LeisureZone>) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.categoryTag, { backgroundColor: "#fbe4e2", color: "#a8291f" }]}>
          {LEISURE_NOW_EMOJI} 지금 시행 중
        </Text>
        <Text style={styles.typeBadge2}>{zone.placeType}</Text>
      </View>
      <Text style={styles.placeName}>{zone.placeName}</Text>
      <Text style={styles.subline}>{zone.regionOffice} · {zone.localOffice}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>⏰ 기간</Text>
        <Text style={styles.value}>{zone.banPeriod.replace(/\n/g, " ")}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>🚫 대상</Text>
        <Text
          style={[
            styles.deviceBadge,
            { backgroundColor: leisureColor(zone) === "#e2483d" ? "#fbe4e2" : "#faf1dc", color: leisureColor(zone) },
          ]}
        >
          {zone.bannedDevices || "미상"}
        </Text>
      </View>
      <Pressable onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.areaDesc} numberOfLines={expanded ? undefined : 2}>
          {zone.areaDescription.replace(/\n/g, " ")}
        </Text>
        <Text style={styles.expandHint}>{expanded ? "접기 ▲" : "더보기 ▼"}</Text>
      </Pressable>
      <PlaceInfoButtons placeName={zone.placeName} onOpen={onOpen} />
    </View>
  );
}

type Row =
  | { kind: "jeju2027"; id: string; name: string; sortKey: string; zone: NoEntryZone }
  | { kind: "leisureNow"; id: string; name: string; sortKey: string; zone: LeisureZone };

export default function RestrictedZonesScreen() {
  const { zones: jejuZones, loading: jejuLoading, error: jejuError } = useNoEntryZones();
  const { zones: leisureZonesRaw, loading: leisureLoading, error: leisureError } = useLeisureZones();
  const loading = jejuLoading || leisureLoading;
  const error = jejuError ?? leisureError;

  // 동력기구 전용 금지 구역(모터보트·제트스키 등)은 맨몸 스킨 해루질과 무관하므로
  // 걸러낸다 — 이 화면은 "레저기구 허가 문제"가 아니라 "스킨 해루질 시 걸릴 수 있는
  // 구역"을 보여주는 게 목적.
  const leisureZones = useMemo(
    () => leisureZonesRaw.filter((z) => isSkinDivingRelevant(z.bannedDevices)),
    [leisureZonesRaw],
  );
  const excludedPowerOnlyCount = leisureZonesRaw.length - leisureZones.length;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [selected, setSelected] = useState<Row | null>(null);
  const { modalProps, open } = usePlaceInfoModal();

  const rows: Row[] = useMemo(() => {
    const a: Row[] = jejuZones.map((z) => ({ kind: "jeju2027", id: z.id, name: z.name, sortKey: z.name, zone: z }));
    const b: Row[] = leisureZones.map((z) => ({ kind: "leisureNow", id: z.id, name: z.placeName, sortKey: z.placeName, zone: z }));
    return [...a, ...b].sort((x, y) => x.sortKey.localeCompare(y.sortKey, "ko"));
  }, [jejuZones, leisureZones]);

  const filtered = useMemo(() => {
    let list = rows;
    if (category !== "all") list = list.filter((r) => r.kind === category);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
    return list;
  }, [rows, category, query]);

  const markers: MapMarker[] = useMemo(
    () =>
      filtered.flatMap((r): MapMarker[] => {
        if (r.kind === "jeju2027") {
          if (r.zone.lat === null || r.zone.lng === null) return [];
          return [{ id: r.id, lat: r.zone.lat, lng: r.zone.lng, title: r.name, color: JEJU_TYPE_COLOR[r.zone.type] ?? "#888", emoji: JEJU2027_EMOJI }];
        }
        if (r.zone.lat === null || r.zone.lng === null) return [];
        return [{ id: r.id, lat: r.zone.lat, lng: r.zone.lng, title: r.name, color: leisureColor(r.zone), emoji: LEISURE_NOW_EMOJI }];
      }),
    [filtered],
  );
  const geocodedCount = filtered.filter((r) => r.zone.lat !== null).length;

  const jejuCount = jejuZones.length;
  const leisureCount = leisureZones.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚫 스킨 해루질 금지구역</Text>
        {!loading && !error && (
          <Text style={styles.subtitle}>
            제주 예정 {jejuCount}곳 · 전국 현재 {leisureCount}곳
            {excludedPowerOnlyCount > 0 ? ` (동력기구 전용 금지 ${excludedPowerOnlyCount}곳 제외)` : ""}
          </Text>
        )}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          <Text style={{ fontWeight: "700" }}>{JEJU2027_EMOJI} 모래시계(청록/금/빨강)</Text> = 제주, 2027.4.22부터 시행 예정(어촌·어항법) · {" "}
          <Text style={{ fontWeight: "700" }}>{LEISURE_NOW_EMOJI} 금지 표시(빨강/금)</Text> = 전국, 지금 시행 중(수상레저안전법·해양경찰청).
          서로 다른 법이니 헷갈리지 마세요. 제트스키·모터보트 같은{" "}
          <Text style={{ fontWeight: "700" }}>동력기구 전용 금지 구역은 스킨 해루질과 무관해 목록에서 뺐습니다.</Text>
        </Text>
      </View>

      {/* "금지구역"과 별개로 "허가필요수역(허가구역)"도 수상레저안전법상 전국
          해양경찰서마다 관할구역별로 지정한다(제주 한림항이 대표적인 예) — 제주만의
          제도가 아니다. 다만 이 고시들은 해양경찰서별로 따로따로 공고되어 있어
          앱에 아직 전국 목록을 다 못 넣었으니, 이 목록에 없다고 자유롭게 이용
          가능하다고 오해하지 않도록 분명히 경고해 둔다. */}
      <View style={styles.warnBox}>
        <Text style={styles.warnText}>
          ⚠️ <Text style={{ fontWeight: "700" }}>이 목록에 없다고 안전한 건 아닙니다.</Text>{" "}
          "허가필요수역(허가구역)"은 제주만이 아니라 전국 각 해양경찰서가 관할구역별로
          따로 지정합니다(예: 한림항). 아직 앱에 전국 허가구역 데이터를 넣지 못했으니,
          활동 전 관할 해양경찰서에 꼭 확인하세요.
        </Text>
      </View>

      <View style={styles.chipRow}>
        {([
          { key: "all", label: "전체" },
          { key: "jeju2027", label: `${JEJU2027_EMOJI} 제주예정` },
          { key: "leisureNow", label: `${LEISURE_NOW_EMOJI} 전국현재` },
        ] as const).map((c) => (
          <Pressable
            key={c.key}
            style={[styles.chip, category === c.key && styles.chipActive]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[styles.chipLabel, category === c.key && styles.chipLabelActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]} onPress={() => setViewMode("map")}>
          <Text style={[styles.toggleLabel, viewMode === "map" && styles.toggleLabelActive]}>🗺️ 지도로 보기</Text>
        </Pressable>
        <Pressable style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]} onPress={() => setViewMode("list")}>
          <Text style={[styles.toggleLabel, viewMode === "list" && styles.toggleLabelActive]}>📋 목록으로 보기</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="이름으로 검색 (예: 도두항, 한림, 협재)"
        placeholderTextColor="#999"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator />
          <Text style={styles.meta}>불러오는 중...</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>❌ 데이터를 불러오지 못했습니다</Text>
          <Text style={styles.meta}>{error}</Text>
        </View>
      )}

      {!loading && !error && viewMode === "list" && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.kind}_${item.id}`}
          renderItem={({ item }) =>
            item.kind === "jeju2027" ? (
              <Jeju2027Card zone={item.zone} onOpen={open} />
            ) : (
              <LeisureNowCard zone={item.zone} onOpen={open} />
            )
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.meta}>검색 결과가 없습니다</Text>}
        />
      )}

      {!loading && !error && viewMode === "map" && (
        <View style={styles.mapArea}>
          <Text style={styles.mapHintFloating}>
            좌표 확보 {geocodedCount}/{filtered.length}곳 표시 중
          </Text>
          {/* 지도를 스크롤뷰 안에 넣지 않고 화면을 꽉 채우게 둔다 — 스크롤뷰가
              같이 있으면 손가락으로 확대(핀치)하거나 지도를 옮길 때 스크롤뷰가
              그 제스처를 가로채서 "지도가 안 움직이다가 화면 전체가 스크롤되는"
              불편한 느낌이 났다. 선택한 구역 정보는 지도 위에 카드로 띄운다. */}
          <KakaoMapView
            markers={markers}
            center={{ lat: 33.38, lng: 126.55 }}
            level={10}
            onMarkerPress={(id) => setSelected(rows.find((r) => r.id === id) ?? null)}
          />
          {selected && (
            <View style={styles.floatingCard}>
              {selected.kind === "jeju2027" ? (
                <Jeju2027Card zone={selected.zone} onOpen={open} />
              ) : (
                <LeisureNowCard zone={selected.zone} onOpen={open} />
              )}
            </View>
          )}
        </View>
      )}

      <InAppWebViewModal {...modalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  disclaimer: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(226,72,61,0.08)",
    borderWidth: 1,
    borderColor: "#e2483d",
  },
  disclaimerText: { fontSize: 11.5, color: "#7a2b24", lineHeight: 16 },
  warnBox: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(217,164,65,0.12)",
    borderWidth: 1,
    borderColor: "#d9a441",
  },
  warnText: { fontSize: 11.5, color: "#7a5a10", lineHeight: 16 },
  chipRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f0f0f0" },
  chipActive: { backgroundColor: "#0a7a3d" },
  chipLabel: { fontSize: 12.5, color: "#555", fontWeight: "600" },
  chipLabelActive: { color: "#fff" },
  toggleRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 8 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: "#f0f0f0" },
  toggleBtnActive: { backgroundColor: "#0a7a3d" },
  toggleLabel: { fontSize: 12.5, color: "#555", fontWeight: "600" },
  toggleLabelActive: { color: "#fff" },
  search: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 24 },
  meta: { fontSize: 13, color: "#888" },
  errorText: { color: "#c0392b", fontSize: 15, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 10 },
  mapArea: { flex: 1 },
  mapHintFloating: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    zIndex: 1,
    textAlign: "center",
    fontSize: 11,
    color: "#fff",
    backgroundColor: "rgba(15,51,72,0.8)",
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  floatingCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 12, backgroundColor: "#fafafa" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  categoryTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0a7a3d",
    backgroundColor: "#e6f6ec",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  typeBadge: { fontSize: 11.5, fontWeight: "700" },
  typeBadge2: { fontSize: 11, color: "#555", backgroundColor: "#eee", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" },
  placeName: { fontSize: 15, fontWeight: "700", marginTop: 6 },
  subline: { fontSize: 12, color: "#666", marginTop: 2 },
  row: { flexDirection: "row", marginTop: 6, gap: 6, alignItems: "flex-start", flexWrap: "wrap" },
  label: { fontSize: 12.5, color: "#888", width: 56 },
  value: { fontSize: 13, color: "#222", flex: 1, flexWrap: "wrap" },
  deviceBadge: { fontSize: 11.5, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" },
  areaDesc: { fontSize: 12, color: "#666", marginTop: 8, lineHeight: 17 },
  expandHint: { fontSize: 11, color: "#0a5fc4", marginTop: 4 },
  callRow: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#eee" },
  callText: { fontSize: 13, color: "#0a5fc4", fontWeight: "600" },
  callHint: { fontSize: 11, color: "#999", marginTop: 2 },
});
