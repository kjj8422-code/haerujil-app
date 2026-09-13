import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CATEGORY_LABEL, type Rule, useRules } from "../hooks/useRules";
import { stripHtml } from "../utils/stripHtml";

const CATEGORIES = ["전체", ...Object.keys(CATEGORY_LABEL)];

function RuleCard({ rule }: { rule: Rule }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.speciesName}>{rule.species}</Text>
        <View style={styles.badgeRow}>
          {rule.jejuSpecific && <Text style={styles.jejuBadge}>제주 별도기준</Text>}
          <Text style={styles.categoryBadge}>{CATEGORY_LABEL[rule.category] ?? rule.category}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>🚫 금어기</Text>
        <Text style={styles.value}>{rule.banPeriod}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>📏 금지체장</Text>
        <Text style={styles.value}>{rule.minSize}</Text>
      </View>

      {rule.note && <Text style={styles.note}>{stripHtml(rule.note)}</Text>}
      {rule.lastChanged && (
        <Text style={styles.changed}>최근 법령 변경: {rule.lastChanged}</Text>
      )}
    </View>
  );
}

export default function RulesScreen() {
  const { rules, loading, error } = useRules();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");

  const filtered = useMemo(() => {
    let list = rules;
    if (category !== "전체") list = list.filter((r) => r.category === category);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => r.species.toLowerCase().includes(q));
    return list;
  }, [rules, query, category]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🐟 금어기·금지체장</Text>
        {!loading && !error && <Text style={styles.subtitle}>총 {rules.length}종</Text>}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚠️ 아래 기간·체장은 <Text style={{ fontWeight: "700" }}>전국 기본 기준</Text>이며,
          일부 어종은 지역·어법별 예외·유예가 있습니다. 실제 단속 기준은 반드시{" "}
          <Text style={{ fontWeight: "700" }}>국가법령정보센터(law.go.kr)</Text> 원문으로 재확인하세요.
          이 정보는 매일 자동 갱신됩니다.
        </Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="어종 이름으로 검색 (예: 전복, 소라, 참돔)"
        placeholderTextColor="#999"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, category === item && styles.chipActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.chipLabel, category === item && styles.chipLabelActive]}>
              {item === "전체" ? "전체" : CATEGORY_LABEL[item]}
            </Text>
          </Pressable>
        )}
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
          renderItem={({ item }) => <RuleCard rule={item} />}
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
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chipRow: { marginTop: 10, flexGrow: 0 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  chipActive: { backgroundColor: "#0a7a3d" },
  chipLabel: { fontSize: 13, color: "#555" },
  chipLabelActive: { color: "#fff", fontWeight: "700" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 24 },
  meta: { fontSize: 13, color: "#888" },
  errorText: { color: "#c0392b", fontSize: 15, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 },
  speciesName: { fontSize: 16, fontWeight: "700" },
  badgeRow: { flexDirection: "row", gap: 6 },
  categoryBadge: {
    fontSize: 11,
    color: "#555",
    backgroundColor: "#eee",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  jejuBadge: {
    fontSize: 11,
    color: "#0a7a3d",
    backgroundColor: "#e6f6ec",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: { flexDirection: "row", marginTop: 6, gap: 6, flexWrap: "wrap" },
  label: { fontSize: 12.5, color: "#888", width: 72 },
  value: { fontSize: 13, color: "#222", flex: 1, flexWrap: "wrap" },
  note: { fontSize: 12, color: "#666", marginTop: 6, lineHeight: 17 },
  changed: { fontSize: 11, color: "#0a7a3d", marginTop: 4 },
});
