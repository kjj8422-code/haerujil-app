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

export default function NoEntryZoneScreen() {
  const { zones, loading, error } = useNoEntryZones();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter(
      (z) => z.name.toLowerCase().includes(q) || z.address.toLowerCase().includes(q),
    );
  }, [zones, query]);

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
          이하). 최종 적용 대상은 시행 전까지 확정될 수 있으니 제주특별자치도청
          (064-710-2114)에서 재확인하세요. 다른 지역은 아직 유사 규정이 확인되지 않았습니다.
        </Text>
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

      {!loading && !error && (
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
