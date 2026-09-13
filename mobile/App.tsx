import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./src/firebase";
import HarborListScreen from "./src/screens/HarborListScreen";
import HarborMapScreen from "./src/screens/HarborMapScreen";

type Tab = "list" | "map";

export default function App() {
  const [tab, setTab] = useState<Tab>("list");

  // harbors 목록·지도 자체는 로그인 없이도 보이지만(firestore.rules 참고), 조과자랑
  // 게시판·미니게임 랭킹 등 다음 단계 기능을 위해 화면 뒤에서 미리 익명 로그인을
  // 해둔다. 실패해도 지금 화면들에는 영향이 없다.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) => {
          console.warn("익명 로그인 실패(목록/지도 조회에는 영향 없음):", err.message);
        });
      }
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={{ flex: 1 }}>{tab === "list" ? <HarborListScreen /> : <HarborMapScreen />}</View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, tab === "list" && styles.tabBtnActive]}
          onPress={() => setTab("list")}
        >
          <Text style={[styles.tabLabel, tab === "list" && styles.tabLabelActive]}>📋 목록</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === "map" && styles.tabBtnActive]}
          onPress={() => setTab("map")}
        >
          <Text style={[styles.tabLabel, tab === "map" && styles.tabLabelActive]}>🗺️ 지도</Text>
        </Pressable>
      </View>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderTopWidth: 2, borderTopColor: "#0a7a3d", marginTop: -1 },
  tabLabel: { fontSize: 14, color: "#888" },
  tabLabelActive: { color: "#0a7a3d", fontWeight: "700" },
});
