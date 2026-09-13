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
import LawChangesSection from "../components/LawChangesSection";
import { CATEGORY_LABEL, type Rule, useRules } from "../hooks/useRules";
import { getSeasonStatus, type SeasonStatus } from "../utils/seasonStatus";
import { stripHtml } from "../utils/stripHtml";

// 상태별로 "지금 당장 신경 써야 하는 순서"를 매긴다 — 위험한 것부터 위에 뜨게.
function priority(status: SeasonStatus): number {
  switch (status.kind) {
    case "year-round-ban":
      return 0;
    case "banned-now":
      return status.confident ? 1 : 2;
    case "unknown":
      return 3;
    case "open-now":
      return status.confident ? 5 : 4;
    case "no-season":
      return 6;
  }
}

function StatusBadge({ status }: { status: SeasonStatus }) {
  switch (status.kind) {
    case "year-round-ban":
      return <Text style={[styles.statusBadge, styles.statusDanger]}>🔴 상시 포획금지</Text>;
    case "banned-now":
      return (
        <Text style={[styles.statusBadge, styles.statusDanger]}>
          🔴 지금 금어기{!status.confident && " (예외조건 확인)"}
        </Text>
      );
    case "open-now":
      return (
        <Text style={[styles.statusBadge, styles.statusSafe]}>
          🟢 지금 포획 가능{!status.confident && " (예외조건 확인)"}
        </Text>
      );
    case "unknown":
      return <Text style={[styles.statusBadge, styles.statusWarn]}>❓ 원문 직접확인</Text>;
    case "no-season":
      return <Text style={[styles.statusBadge, styles.statusNeutral]}>📏 체장만 규정</Text>;
  }
}

function RuleCard({ rule, status }: { rule: Rule; status: SeasonStatus }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.speciesName}>{rule.species}</Text>
        {rule.jejuSpecific && <Text style={styles.jejuBadge}>제주 별도기준</Text>}
      </View>

      <StatusBadge status={status} />

      <View style={styles.row}>
        <Text style={styles.label}>🚫 금어기</Text>
        <Text style={styles.value}>{rule.banPeriod}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>📏 금지체장</Text>
        <Text style={styles.value}>{rule.minSize}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>🏷️ 분류</Text>
        <Text style={styles.value}>{CATEGORY_LABEL[rule.category] ?? rule.category}</Text>
      </View>

      {rule.note && <Text style={styles.note}>{stripHtml(rule.note)}</Text>}
      {rule.lastChanged && (
        <Text style={styles.changed}>최근 법령 변경: {rule.lastChanged}</Text>
      )}
    </View>
  );
}

const STATUS_FILTERS = [
  { key: "all", label: "전체", tint: "#f0f0f0", tintText: "#555" },
  { key: "danger", label: "🔴 지금 위험", tint: "#fbe4e2", tintText: "#a8291f" },
  { key: "unknown", label: "❓ 확인필요", tint: "#fff3d9", tintText: "#8a5a00" },
  { key: "safe", label: "🟢 지금 가능", tint: "#e6f6ec", tintText: "#0a7a3d" },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

function matchesStatusFilter(status: SeasonStatus, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "danger") return status.kind === "year-round-ban" || status.kind === "banned-now";
  if (filter === "unknown") return status.kind === "unknown";
  if (filter === "safe") return status.kind === "open-now" || status.kind === "no-season";
  return true;
}

export default function RulesScreen() {
  const { rules, loading, error } = useRules();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // 오늘 날짜 기준 상태를 한 번만 계산해서 재사용한다 (검색/필터가 바뀔 때마다 다시
  // 계산할 필요 없음 — rules 배열 자체가 안 바뀌는 한 그대로 쓴다).
  const withStatus = useMemo(
    () => rules.map((r) => ({ rule: r, status: getSeasonStatus(r.banPeriod) })),
    [rules],
  );

  const dangerCount = useMemo(
    () => withStatus.filter((x) => x.status.kind === "year-round-ban" || x.status.kind === "banned-now").length,
    [withStatus],
  );

  const filtered = useMemo(() => {
    let list = withStatus;
    if (statusFilter !== "all") list = list.filter((x) => matchesStatusFilter(x.status, statusFilter));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((x) => x.rule.species.toLowerCase().includes(q));
    return [...list].sort((a, b) => priority(a.status) - priority(b.status));
  }, [withStatus, query, statusFilter]);

  const today = new Date();
  const todayLabel = `${today.getMonth() + 1}.${today.getDate()}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🐟 금어기·금지체장</Text>
        {!loading && !error && (
          <Text style={styles.subtitle}>
            총 {rules.length}종 · 오늘({todayLabel}) 기준 위험 {dangerCount}종
          </Text>
        )}
      </View>

      <LawChangesSection />

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚠️ 배지의 "지금 금어기/가능"은 <Text style={{ fontWeight: "700" }}>전국 기본 기준</Text>으로
          자동 계산한 것이며, 지역·어법별 예외가 있는 어종은 "(예외조건 확인)"이 붙습니다.
          실제 단속 기준은 반드시{" "}
          <Text style={{ fontWeight: "700" }}>국가법령정보센터(law.go.kr)</Text> 원문으로 재확인하세요.
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

      <View style={styles.statusChipRow}>
        {STATUS_FILTERS.map((item) => {
          const active = statusFilter === item.key;
          return (
            <Pressable
              key={item.key}
              style={[
                styles.statusChip,
                { backgroundColor: active ? item.tintText : item.tint },
              ]}
              onPress={() => setStatusFilter(item.key)}
            >
              <Text
                style={[styles.statusChipLabel, { color: active ? "#fff" : item.tintText }]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
          keyExtractor={(item) => item.rule.id}
          renderItem={({ item }) => <RuleCard rule={item.rule} status={item.status} />}
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
  statusChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
  },
  statusChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  statusChipLabel: { fontSize: 12.5, fontWeight: "700" },
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
  jejuBadge: {
    fontSize: 11,
    color: "#0a7a3d",
    backgroundColor: "#e6f6ec",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  statusBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    fontSize: 12.5,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  statusDanger: { backgroundColor: "#e2483d", color: "#fff" },
  statusSafe: { backgroundColor: "#e6f6ec", color: "#0a7a3d" },
  statusWarn: { backgroundColor: "#fff3d9", color: "#8a5a00" },
  statusNeutral: { backgroundColor: "#eee", color: "#555" },
  row: { flexDirection: "row", marginTop: 6, gap: 6, flexWrap: "wrap" },
  label: { fontSize: 12.5, color: "#888", width: 72 },
  value: { fontSize: 13, color: "#222", flex: 1, flexWrap: "wrap" },
  note: { fontSize: 12, color: "#666", marginTop: 6, lineHeight: 17 },
  changed: { fontSize: 11, color: "#0a7a3d", marginTop: 4 },
});
