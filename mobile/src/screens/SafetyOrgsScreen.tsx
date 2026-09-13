import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafetyOrgs } from "../hooks/useSafetyOrgs";

export default function SafetyOrgsScreen() {
  const { orgs, loading, error } = useSafetyOrgs();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) => o.name.toLowerCase().includes(q) || o.certs.toLowerCase().includes(q),
    );
  }, [orgs, query]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛟 안전관리요원 인정단체</Text>
        {!loading && !error && <Text style={styles.subtitle}>총 {orgs.length}곳</Text>}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          야간 수중레저활동(스킨스쿠버 등) 시 <Text style={{ fontWeight: "700" }}>
            RESCUE급 이상 자격의 안전관리요원 배치가 법적으로 필요
          </Text>합니다. 아래는 그 자격을 인정하는 단체와, 인정되는 최소 등급입니다
          (해양수산부 고시 기준). 자격증 등급명이 단체마다 달라 헷갈리기 쉬우니, 이름으로
          검색해서 확인하세요.
        </Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="단체명 또는 자격증 이름으로 검색 (예: PADI, 레스큐)"
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
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orgName}>{item.name}</Text>
                <Text style={styles.orgNo}>{item.recognitionNo}</Text>
              </View>
              <Text style={styles.certs}>{item.certs}</Text>
            </View>
          )}
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
    backgroundColor: "rgba(10,122,61,0.08)",
    borderWidth: 1,
    borderColor: "#0a7a3d",
  },
  disclaimerText: { fontSize: 11.5, color: "#154d33", lineHeight: 16 },
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orgName: { fontSize: 15, fontWeight: "700", flex: 1 },
  orgNo: { fontSize: 11, color: "#999" },
  certs: { fontSize: 12.5, color: "#555", marginTop: 6, lineHeight: 18 },
});
