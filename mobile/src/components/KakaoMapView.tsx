import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { KAKAO_JS_KEY } from "../kakaoConfig";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  color: string; // 마커 색 (핀 대신 색깔 원으로 표시)
};

type Props = {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  level?: number; // 카카오맵 확대 레벨 (숫자가 작을수록 확대됨, 3~14)
  onMarkerPress?: (id: string) => void;
};

// react-native-webview 안에서 카카오맵 JavaScript SDK를 그대로 돌린다. 네이티브
// 지도 모듈(react-native-maps)과 달리 Expo Go에서 바로 되고, 커스텀 빌드가 필요 없다.
export default function KakaoMapView({ markers, center, level = 10, onMarkerPress }: Props) {
  const html = useMemo(() => buildHtml(markers, center, level), [markers, center, level]);

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "http://localhost" }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          const id = event.nativeEvent.data;
          if (id && onMarkerPress) onMarkerPress(id);
        }}
      />
    </View>
  );
}

function buildHtml(
  markers: MapMarker[],
  center: { lat: number; lng: number } | undefined,
  level: number,
): string {
  const centerLat = center?.lat ?? 36.2;
  const centerLng = center?.lng ?? 127.8;
  const markersJson = JSON.stringify(markers);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"></script>
  <script>
    kakao.maps.load(function () {
      var map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(${centerLat}, ${centerLng}),
        level: ${level},
      });

      var markers = ${markersJson};
      markers.forEach(function (m) {
        var pos = new kakao.maps.LatLng(m.lat, m.lng);

        // 기본 빨간 핀 대신, 항구 종류별 색깔이 드러나는 동그란 커스텀 마커를 쓴다.
        var content = document.createElement('div');
        content.style.width = '16px';
        content.style.height = '16px';
        content.style.borderRadius = '50%';
        content.style.background = m.color;
        content.style.border = '2px solid #0b2a3d';
        content.style.boxShadow = '0 0 4px rgba(0,0,0,0.4)';
        content.style.cursor = 'pointer';

        var overlay = new kakao.maps.CustomOverlay({
          position: pos,
          content: content,
          yAnchor: 0.5,
        });
        overlay.setMap(map);

        content.addEventListener('click', function () {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(m.id);
          }
        });
      });
    });
  </script>
</body>
</html>
  `;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e6f0f5" },
  webview: { flex: 1, backgroundColor: "transparent" },
});
