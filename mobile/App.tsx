import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "./src/firebase";

// 1단계 확인용 화면: "폰 앱 → Firebase" 연결이 실제로 되는지만 확인한다.
// - 익명 로그인이 되는가?
// - harbors 컬렉션을 읽을 수 있는가? (지금은 비어있는 게 정상 — 2단계에서 채워짐)
// 화면 UI는 3단계(앱 뼈대)에서 지도·탭으로 교체될 예정이라 지금은 최소한으로만 만든다.
export default function App() {
  const [status, setStatus] = useState<"연결 확인 중..." | "성공" | "실패">(
    "연결 확인 중...",
  );
  const [detail, setDetail] = useState("");
  const [harborCount, setHarborCount] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          setStatus("실패");
          setDetail(`익명 로그인 실패: ${(err as Error).message}`);
        }
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, "harbors"));
        setHarborCount(snapshot.size);
        setStatus("성공");
        setDetail(`로그인 uid: ${user.uid.slice(0, 8)}...`);
      } catch (err) {
        setStatus("실패");
        setDetail(`Firestore 읽기 실패: ${(err as Error).message}`);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🎣 haerujil-app</Text>
      <Text style={styles.subtitle}>1단계: Firebase 연결 확인</Text>

      {status === "연결 확인 중..." ? (
        <ActivityIndicator style={styles.spacing} />
      ) : (
        <Text
          style={[
            styles.status,
            status === "성공" ? styles.success : styles.error,
          ]}
        >
          {status === "성공" ? "✅ Firebase 연결 성공" : "❌ 연결 실패"}
        </Text>
      )}

      {!!detail && <Text style={styles.detail}>{detail}</Text>}

      {harborCount !== null && (
        <Text style={styles.detail}>
          harbors 컬렉션 문서 수: {harborCount}개{" "}
          {harborCount === 0 && "(2단계에서 전국 데이터로 채워질 예정)"}
        </Text>
      )}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
  spacing: { marginVertical: 16 },
  status: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  success: { color: "#0a7a3d" },
  error: { color: "#c0392b" },
  detail: { fontSize: 12, color: "#888", marginTop: 4, textAlign: "center" },
});
