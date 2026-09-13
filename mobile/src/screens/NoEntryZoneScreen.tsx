import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import JejuSchematicMap from "../components/JejuSchematicMap";
import { type NoEntryZone, useNoEntryZones } from "../hooks/useNoEntryZones";

const TYPE_COLOR: Record<string, string> = {
  national: "#e2483d",
  local: "#d9a441",
  village: "#6fb8b0",
};

function ZoneCard({ zone }: { zone: NoEntryZone }) {
  const call = () => {
    if (zone.coastGuardPhone) Linking.openURL(`tel:${zone.coastGuardPhone}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.harborName}>{zone.name}</Text>
        <Text style={[styles.typeBadge, { color: TYPE_COLOR[zone.type] ?? "#888" }]}>
          {zone.typeLabel}
        </Text>
      </View>
      <Text style={styles.address}>{zone.address}</Text>

      <View style={styles.statusRow}>
        <Text style={styles.statusBadge}>🚫 {zone.status}</Text>
        <Text style={styles.effectiveDate}>{zone.effectiveDate}부터 입수 금지</Text>
      </View>

      {zone.coastGuardOffice && (
        <Pressable style={styles.callRow} onPress={call}>
          <Text style={styles.callText}>
            📞 {zone.coastGuardOffice} {zone.coastGuardPhone}
          </Text>
          <Text style={styles.callHint}>탭하면 바로 전화</Text>
        </Pressable>
      )}
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legendRow}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: TYPE_COLOR.national }]} />
        <Text style={styles.legendLabel}>국가어항</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSquare, { backgroundColor: TYPE_COLOR.local }]} />
        <Text style={styles.legendLabel}>지방어항</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDotSmall, { backgroundColor: TYPE_COLOR.village }]} />
        <Text style={styles.legendLabel}>어촌정주어항</Text>
      </View>
    </View>
  );
}

export default function NoEntryZoneScreen() {
  const { zones, loading, error } = useNoEntryZones();
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [selected, setSelected] = useState<NoEntryZone | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter(
      (z) => z.name.toLowerCase().includes(q) || z.address.toLowerCase().includes(q),
    );
  }, [zones, query]);

  const visibleIds = useMemo(
    () => (query.trim() ? new Set(filtered.map((z) => z.id)) : null),
    [filtered, query],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚫 입수금지구역 (제주)</Text>
        {!loading && !error && <Text style={styles.subtitle}>총 {zones.length}곳</Text>}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          제주 어촌·어항법 개정에 따라 <Text style={{ fontWeight: "700" }}>2027.4.22부터</Text>{" "}
          아래 항·포구 전체가 물놀이·다이빙·취사 금지구역이 됩니다(위반 시 과태료 50만원
          이하). 지금 지도·목록에 있는 곳은 "금지 예정 지역"이며, 그 <Text style={{ fontWeight: "700" }}>
            외의 항·포구는 별도 허가지역 목록이 없습니다
          </Text>{" "}
          — 최종 확정 전까지는 제주특별자치도청(064-710-2114)에서 재확인하세요.
        </Text>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]}
          onPress={() => setViewMode("map")}
        >
          <Text style={[styles.toggleLabel, viewMode === "map" && styles.toggleLabelActive]}>
            🗺️ 지도로 보기
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
          onPress={() => setViewMode("list")}
        >
          <Text style={[styles.toggleLabel, viewMode === "list" && styles.toggleLabelActive]}>
            📋 목록으로 보기
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="항구 이름·주소로 검색 (예: 도두항, 성산읍)"
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

      {!loading && !error && viewMode === "map" && (
        <ScrollView contentContainerStyle={styles.mapScrollContent}>
          <Legend />
          <View style={styles.mapCard}>
            <JejuSchematicMap
              zones={zones}
              visibleIds={visibleIds}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          </View>
          {selected ? (
            <ZoneCard zone={selected} />
          ) : (
            <Text style={styles.mapHint}>👆 지도 위 점을 눌러보면 상세 정보가 여기 나옵니다</Text>
          )}
        </ScrollView>
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
  toggleLabel: { fontSize: 13, color: "#555", fontWeight: "600" },
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
  mapCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#0f3348",
  },
  mapHint: { fontSize: 12.5, color: "#999", textAlign: "center", marginTop: 4 },
  legendRow: { flexDirection: "row", gap: 14, justifyContent: "center", marginBottom: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDotSmall: { width: 7, height: 7, borderRadius: 4 },
  legendSquare: { width: 9, height: 9, borderRadius: 2 },
  legendLabel: { fontSize: 11, color: "#666" },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  harborName: { fontSize: 16, fontWeight: "700" },
  typeBadge: { fontSize: 12, fontWeight: "700" },
  address: { fontSize: 13, color: "#555", marginTop: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
  statusBadge: {
    fontSize: 11,
    color: "#fff",
    backgroundColor: "#e2483d",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  effectiveDate: { fontSize: 12, color: "#888" },
  callRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  callText: { fontSize: 13, color: "#0a5fc4", fontWeight: "600" },
  callHint: { fontSize: 11, color: "#999", marginTop: 2 },
});
