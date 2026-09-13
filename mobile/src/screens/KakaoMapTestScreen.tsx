import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import KakaoMapView, { type MapMarker } from "../components/KakaoMapView";

// 카카오맵 연동이 실제로 되는지만 확인하는 임시 테스트 화면.
// 확인되면 이 화면은 지우고 실제 항구 데이터로 교체한다.
const TEST_MARKERS: MapMarker[] = [
  { id: "seoul", lat: 37.5665, lng: 126.978, title: "서울", color: "#e2483d" },
  { id: "busan", lat: 35.1796, lng: 129.0756, title: "부산", color: "#d9a441" },
  { id: "jeju", lat: 33.4996, lng: 126.5312, title: "제주", color: "#6fb8b0" },
];

export default function KakaoMapTestScreen() {
  const [pressed, setPressed] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 카카오맵 연동 테스트</Text>
        <Text style={styles.subtitle}>
          {pressed ? `마지막으로 누른 마커: ${pressed}` : "지도가 뜨고, 점을 눌러보세요"}
        </Text>
      </View>
      <KakaoMapView markers={TEST_MARKERS} onMarkerPress={setPressed} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#666", marginTop: 4 },
});
