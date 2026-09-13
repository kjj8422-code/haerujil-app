import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import InAppWebViewModal from "../components/InAppWebViewModal";
import KakaoMapView, { type MapMarker } from "../components/KakaoMapView";
import PlaceInfoButtons from "../components/PlaceInfoButtons";
import { type Harbor, useHarbors } from "../hooks/useHarbors";
import { usePlaceInfoModal } from "../hooks/usePlaceInfoModal";

export default function HarborMapScreen() {
  const { harbors, loading, error } = useHarbors();
  const [selected, setSelected] = useState<Harbor | null>(null);
  const { modalProps, open } = usePlaceInfoModal();

  const markers: MapMarker[] = useMemo(
    () =>
      harbors
        .filter((h) => h.lat !== null && h.lng !== null)
        .map((h) => ({
          id: h.id,
          lat: h.lat as number,
          lng: h.lng as number,
          title: h.name,
          color: "#0a7a3d",
        })),
    [harbors],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ 전국 항·포구 지도</Text>
        {!loading && !error && (
          <Text style={styles.subtitle}>{markers.length.toLocaleString("ko-KR")}곳 표시 중</Text>
        )}
      </View>

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator />
          <Text style={styles.meta}>지도 데이터 불러오는 중...</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>❌ 지도 데이터를 불러오지 못했습니다</Text>
        </View>
      )}

      {!loading && !error && (
        <View style={{ flex: 1 }}>
          <KakaoMapView
            markers={markers}
            center={{ lat: 36.2, lng: 127.8 }}
            level={13}
            onMarkerPress={(id) => setSelected(harbors.find((h) => h.id === id) ?? null)}
          />
          {selected && (
            <View style={styles.detailCard}>
              <Text style={styles.detailName}>{selected.name}</Text>
              <Text style={styles.detailAddress}>{selected.address}</Text>
              {selected.fishingHouseholds !== null && (
                <Text style={styles.detailMeta}>어업가구 {selected.fishingHouseholds}가구</Text>
              )}
              <PlaceInfoButtons placeName={selected.name} onOpen={open} />
            </View>
          )}
        </View>
      )}

      <InAppWebViewModal {...modalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  meta: { fontSize: 13, color: "#888" },
  errorText: { color: "#c0392b", fontSize: 14, fontWeight: "600" },
  detailCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  detailName: { fontSize: 15, fontWeight: "700" },
  detailAddress: { fontSize: 12.5, color: "#555", marginTop: 3 },
  detailMeta: { fontSize: 11.5, color: "#888", marginTop: 3 },
});
