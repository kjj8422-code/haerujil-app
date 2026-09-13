import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useLawChanges } from "../hooks/useLawChanges";
import { stripHtml } from "../utils/stripHtml";

// 금어기 화면 맨 위에 붙는 "최근 법령 변경 이력" 접이식 박스. jeju-harbor-map의
// 같은 섹션을 그대로 옮긴 것이라 항목이 3개뿐이지만, 법이 바뀔 때마다 자동으로 늘어난다.
export default function LawChangesSection() {
  const { changes, loading, error } = useLawChanges();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  // 데이터가 진짜 없는 것과 "권한 거부 등으로 못 불러온 것"을 구분해서 보여준다 —
  // 조용히 사라지면 Firestore 규칙이 안 맞아도 눈치채기 어렵다.
  if (error) {
    return (
      <View style={[styles.container, { borderColor: "#e2483d" }]}>
        <Text style={[styles.headerText, { color: "#e2483d" }]}>
          ⚠️ 법령 변경 이력을 불러오지 못했습니다: {error}
        </Text>
      </View>
    );
  }

  if (changes.length === 0) return null;

  return (
    <View style={styles.container}>
      <Pressable style={styles.headerRow} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.headerText}>🆕 최근 법령 변경 이력 ({changes.length}건)</Text>
        <Text style={styles.toggle}>{open ? "접기 ▲" : "펼치기 ▼"}</Text>
      </Pressable>

      {open &&
        changes.map((c) => (
          <View key={c.id} style={styles.item}>
            <View style={styles.metaRow}>
              <Text style={[styles.statusBadge, c.status === "시행중" ? styles.now : styles.soon]}>
                {c.status}
              </Text>
              <Text style={styles.date}>
                {c.effective.replace(/-/g, ".")} {c.status === "시행중" ? "부터 적용중" : "부터"}
              </Text>
              <Text style={styles.scope}>· {c.scope}</Text>
            </View>
            <Text style={styles.title}>{c.title}</Text>
            {c.before && <Text style={styles.before}>이전: {c.before}</Text>}
            {c.after && <Text style={styles.after}>변경 후: {c.after}</Text>}
            {c.note && <Text style={styles.note}>{stripHtml(c.note)}</Text>}
            {c.source && (
              <Text
                style={styles.source}
                onPress={() => c.sourceUrl && Linking.openURL(c.sourceUrl)}
              >
                근거: {c.source}
                {c.sourceUrl ? " (탭하면 원문)" : ""}
              </Text>
            )}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#0a7a3d",
    borderRadius: 8,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(10,122,61,0.08)",
  },
  headerText: { fontSize: 13, fontWeight: "700", color: "#0a7a3d" },
  toggle: { fontSize: 12, color: "#0a7a3d" },
  item: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#e6f6ec" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  statusBadge: {
    fontSize: 10.5,
    color: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  now: { backgroundColor: "#0a7a3d" },
  soon: { backgroundColor: "#d9a441" },
  date: { fontSize: 11, color: "#666" },
  scope: { fontSize: 11, color: "#999" },
  title: { fontSize: 13.5, fontWeight: "700", marginTop: 4 },
  before: { fontSize: 12, color: "#999", marginTop: 4, textDecorationLine: "line-through" },
  after: { fontSize: 12, color: "#222", marginTop: 2, fontWeight: "600" },
  note: { fontSize: 11.5, color: "#666", marginTop: 4, lineHeight: 16 },
  source: { fontSize: 10.5, color: "#0a5fc4", marginTop: 4 },
});
