import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./src/firebase";
import HarborListScreen from "./src/screens/HarborListScreen";

export default function App() {
  // harbors 목록 자체는 로그인 없이도 보이지만(firestore.rules 참고), 조과자랑
  // 게시판·미니게임 랭킹 등 다음 단계 기능을 위해 화면 뒤에서 미리 익명 로그인을
  // 해둔다. 실패해도 지금 화면(항구 목록)에는 영향이 없다.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) => {
          console.warn("익명 로그인 실패(항구 목록 조회에는 영향 없음):", err.message);
        });
      }
    });
    return unsubscribe;
  }, []);

  return (
    <>
      <HarborListScreen />
      <StatusBar style="auto" />
    </>
  );
}
