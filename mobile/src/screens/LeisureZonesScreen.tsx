import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import KakaoMapView, { type MapMarker } from "../components/KakaoMapView";
import { type LeisureZone, useLeisureZones } from "../hooks/useLeisureZones";

// "모든 수상레저기구" 금지는 해루질(스노클·워킹 포함)에도 적용될 가능성이 높아 빨강,
// "동력수상레저기구"만 금지는 사람이 직접 하는 활동엔 해당 안 될 가능성이 높아 금색으로 구분.
function zoneColor(z: LeisureZone): string {
  return z.bannedDevices.includes("모든") ? "#e2483d" : "#d9a441";
}

function ZoneCard({ zone }: { zone: LeisureZone }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.placeName}>{zone.placeName}</Text>
        <Text style={styles.placeTypeBadge}>{zone.placeType}</Text>
      </View>
      <Text style={styles.office}>
        {zone.regionOffice} · {zone.localOffice}
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>⏰ 금지기간</Text>
        <Text style={styles.value}>{zone.banPeriod.replace(/\n/g, " ")}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>🚫 금지대상</Text>
        <Text
          style={[
            styles.deviceBadge,
            { backgroundColor: zoneColor(zone) === "#e2483d" ? "#fbe4e2" : "#faf1dc" },
            { color: zoneColor(zone) },
          ]}
        >
          {zone.bannedDevices || "미상"}
        </Text>
      </View>

      <Pressable onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.areaDesc} numberOfLines={expanded ? undefined : 3}>
          {zone.areaDescription.replace(/\n/g, " ")}
        </Text>
        <Text style={styles.expandHint}>{expanded ? "접기 ▲" : "구역 설명 더보기 ▼"}</Text>
      </Pressable>
    </View>
  );
}

export default function LeisureZonesScreen() {
  const { zones, loading, error } = useLeisureZones();
  const [query, setQuery] = useState("");
  const [jejuOnly, setJejuOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<LeisureZone | null>(null);

  const filtered = useMemo(() => {
    let list = zones;
    if (jejuOnly) list = list.filter((z) => z.isJeju);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((z) => z.placeName.toLowerCase().includes(q));
    return list;
  }, [zones, query, jejuOnly]);

  const markers: MapMarker[] = useMemo(
    () =>
      filtered
        .filter((z) => z.lat !== null && z.lng !== null)
        .map((z) => ({
          id: z.id,
          lat: z.lat as number,
          lng: z.lng as number,
          title: z.placeName,
          color: zoneColor(z),
        })),
    [filtered],
  );
  const geocodedCount = filtered.filter((z) => z.lat !== null).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏖️ 수상레저 금지구역</Text>
        {!loading && !error && <Text style={styles.subtitle}>전국 {zones.length}개 구역</Text>}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          해양경찰청 고시(수상레저안전법) 기준 <Text style={{ fontWeight: "700" }}>현재 적용 중인</Text> 금지구역입니다
          (2025.8.20 기준 자료 — jeju-harbor-map의 "2027년 시행 예정 69곳"과는 별개 규정).
          "동력수상레저기구"만 금지된 곳은 손으로 하는 해루질엔 해당 안 될 수 있지만,
          "모든 수상레저기구" 금지 구역은 <Text style={{ fontWeight: "700" }}>스노클·워킹도 포함될 수 있어</Text> 주의하세요.
          정확한 적용 여부는 관할 해양경찰서에 확인하세요.
        </Text>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
          onPress={() => setViewMode("list")}
        >
          <Text style={[styles.toggleLabel, viewMode === "list" && styles.toggleLabelActive]}>
            📋 목록으로 보기
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]}
          onPress={() => setViewMode("map")}
        >
          <Text style={[styles.toggleLabel, viewMode === "map" && styles.toggleLabelActive]}>
            🗺️ 지도로 보기
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, jejuOnly && styles.toggleBtnActive]}
          onPress={() => setJejuOnly((v) => !v)}
        >
          <Text style={[styles.toggleLabel, jejuOnly && styles.toggleLabelActive]}>🍊 제주만</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="구역·해수욕장 이름으로 검색"
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
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ZoneCard zone={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.meta}>검색 결과가 없습니다</Text>}
        />
      )}

      {!loading && !error && viewMode === "map" && (
        <ScrollView contentContainerStyle={styles.mapScrollContent}>
          <Text style={styles.mapHint}>
            좌표 확보 {geocodedCount}/{filtered.length}곳 표시 중 (좌표 없는 곳은 목록에서 확인)
          </Text>
          <View style={styles.mapCard}>
            <KakaoMapView
              markers={markers}
              center={jejuOnly ? { lat: 33.38, lng: 126.55 } : { lat: 36.2, lng: 127.8 }}
              level={jejuOnly ? 10 : 13}
              onMarkerPress={(id) => setSelected(zones.find((z) => z.id === id) ?? null)}
            />
          </View>
          {selected && <ZoneCard zone={selected} />}
        </ScrollView>
      )}
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
  toggleRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 10 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
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
  mapScrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 10 },
  mapHint: { fontSize: 11.5, color: "#999", textAlign: "center" },
  mapCard: { height: 380, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#0f3348" },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6 },
  placeName: { fontSize: 15, fontWeight: "700", flex: 1, flexWrap: "wrap" },
  placeTypeBadge: {
    fontSize: 11,
    color: "#555",
    backgroundColor: "#eee",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  office: { fontSize: 11.5, color: "#999", marginTop: 2 },
  row: { flexDirection: "row", marginTop: 6, gap: 6, alignItems: "flex-start", flexWrap: "wrap" },
  label: { fontSize: 12.5, color: "#888", width: 72 },
  value: { fontSize: 13, color: "#222", flex: 1, flexWrap: "wrap" },
  deviceBadge: { fontSize: 11.5, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" },
  areaDesc: { fontSize: 12, color: "#666", marginTop: 8, lineHeight: 17 },
  expandHint: { fontSize: 11, color: "#0a5fc4", marginTop: 4 },
});
