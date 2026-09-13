import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./src/firebase";
import RulesScreen from "./src/screens/RulesScreen";
import RestrictedZonesScreen from "./src/screens/RestrictedZonesScreen";
import SafetyOrgsScreen from "./src/screens/SafetyOrgsScreen";

const TABS = [
  { key: "rules", label: "🐟 금어기", Screen: RulesScreen },
  { key: "restricted", label: "🚫 금지구역", Screen: RestrictedZonesScreen },
  { key: "safety", label: "🛟 안전요원", Screen: SafetyOrgsScreen },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Root() {
  // 법 위반 방지가 이 앱의 핵심 목적이라, "금어기" 화면을 기본 시작 탭으로 둔다.
  const [tab, setTab] = useState<TabKey>("rules");
  // 안드로이드 제스처바/버튼 네비게이션 영역만큼 하단 탭이 가려지지 않도록,
  // 실제 기기의 안전 영역(inset) 값을 읽어서 탭바 아래쪽에 그만큼 더해준다.
  const insets = useSafeAreaInsets();

  // harbors/rules/zones 목록·지도 자체는 로그인 없이도 보이지만(firestore.rules 참고),
  // 조과자랑 게시판·미니게임 랭킹 등 다음 단계 기능을 위해 화면 뒤에서 미리 익명 로그인을
  // 해둔다. 실패해도 지금 화면들에는 영향이 없다.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) => {
          console.warn("익명 로그인 실패(조회 화면에는 영향 없음):", err.message);
        });
      }
    });
    return unsubscribe;
  }, []);

  const ActiveScreen = TABS.find((t) => t.key === tab)?.Screen ?? RulesScreen;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={{ flex: 1 }}>
        <ActiveScreen />
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 6 }]}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  tabBtn: { flex: 1, paddingVertical: 6, alignItems: "center" },
  tabBtnActive: { borderTopWidth: 2, borderTopColor: "#0a7a3d", marginTop: -9 },
  tabLabel: { fontSize: 13, color: "#888" },
  tabLabelActive: { color: "#0a7a3d", fontWeight: "700" },
});
