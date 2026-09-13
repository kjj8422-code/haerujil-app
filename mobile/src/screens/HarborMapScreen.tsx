import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useHarbors } from "../hooks/useHarbors";

// 대한민국 전체가 한눈에 보이는 초기 카메라 위치 (대략 국토 중심 + 전체가 보일 정도의 확대 수준)
const INITIAL_REGION = {
  latitude: 36.2,
  longitude: 127.8,
  latitudeDelta: 5.5,
  longitudeDelta: 5.5,
};

export default function HarborMapScreen() {
  const { harbors, loading, error } = useHarbors();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 위도/경도가 없는 항구는 지도에 찍을 수 없으니 걸러낸다.
  const pinnable = useMemo(
    () => harbors.filter((h) => h.lat !== null && h.lng !== null),
    [harbors],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ 전국 항·포구 지도</Text>
        {!loading && !error && (
          <Text style={styles.subtitle}>{pinnable.length.toLocaleString("ko-KR")}곳 표시 중</Text>
        )}
      </View>

      {!loading && !error && (
        <MapView
          style={styles.map}
          // Android는 구글맵, iOS는 애플맵을 그대로 쓴다 (react-native-maps 기본 동작).
          provider={PROVIDER_GOOGLE}
          initialRegion={INITIAL_REGION}
        >
          {pinnable.map((harbor) => (
            <Marker
              key={harbor.id}
              coordinate={{ latitude: harbor.lat as number, longitude: harbor.lng as number }}
              pinColor={selectedId === harbor.id ? "#0a7a3d" : "#e2483d"}
              onPress={() => setSelectedId(harbor.id)}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{harbor.name}</Text>
                  <Text style={styles.calloutAddress}>{harbor.address}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {loading && (
        <View style={styles.centerBox}>
          <Text style={styles.meta}>지도 데이터 불러오는 중...</Text>
        </View>
      )}

      {error && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>❌ 지도 데이터를 불러오지 못했습니다</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  map: { flex: 1 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  meta: { fontSize: 13, color: "#888" },
  errorText: { color: "#c0392b", fontSize: 14, fontWeight: "600" },
  callout: { maxWidth: 220, padding: 4 },
  calloutTitle: { fontSize: 14, fontWeight: "700" },
  calloutAddress: { fontSize: 12, color: "#555", marginTop: 2 },
});
