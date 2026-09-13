import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { type Harbor, useHarbors } from "../hooks/useHarbors";

function HarborCard({ harbor }: { harbor: Harbor }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.harborName}>{harbor.name}</Text>
        <Text style={styles.regionBadge}>{harbor.region}</Text>
      </View>
      <Text style={styles.address}>{harbor.address}</Text>
      {harbor.fishingHouseholds !== null && (
        <Text style={styles.meta}>어업가구 {harbor.fishingHouseholds}가구</Text>
      )}
    </View>
  );
}

export default function HarborListScreen() {
  const { harbors, loading, error } = useHarbors();
  const [query, setQuery] = useState("");

  // 이름이나 지역, 주소 중 하나라도 검색어를 포함하면 결과에 남긴다.
  // (jeju-harbor-map의 지도 탭 검색창과 같은 방식 — 항구가 몇천 개라도
  // 메모리 안 배열 필터라 화면에서 타이핑할 때마다 즉시 반응한다.)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return harbors;
    return harbors.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.region.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q),
    );
  }, [harbors, query]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎣 전국 항·포구</Text>
        {!loading && !error && (
          <Text style={styles.subtitle}>
            총 {harbors.length.toLocaleString("ko-KR")}곳
            {query ? ` · 검색결과 ${filtered.length.toLocaleString("ko-KR")}곳` : ""}
          </Text>
        )}
      </View>

      <TextInput
        style={styles.search}
        placeholder="항구 이름, 지역, 주소로 검색 (예: 성산포, 부산, 완도)"
        placeholderTextColor="#999"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>전국 항구 데이터 불러오는 중...</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>❌ 데이터를 불러오지 못했습니다</Text>
          <Text style={styles.meta}>{error}</Text>
        </View>
      )}

      {!loading && !error && filtered.length === 0 && (
        <View style={styles.centerBox}>
          <Text style={styles.meta}>검색 결과가 없습니다</Text>
        </View>
      )}

      {!loading && !error && filtered.length > 0 && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HarborCard harbor={item} />}
          contentContainerStyle={styles.listContent}
          // 몇천 건이 될 수 있으니 초기 렌더 개수를 제한해 스크롤 시작이 버벅이지 않게 한다.
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={7}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#666", marginTop: 2 },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 24 },
  loadingText: { color: "#666", fontSize: 13 },
  errorText: { color: "#c0392b", fontSize: 15, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  harborName: { fontSize: 16, fontWeight: "700" },
  regionBadge: {
    fontSize: 11,
    color: "#0a7a3d",
    backgroundColor: "#e6f6ec",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  address: { fontSize: 13, color: "#555", marginTop: 4 },
  meta: { fontSize: 12, color: "#888", marginTop: 4 },
});
