import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
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
  const [pageError, setPageError] = useState<string | null>(null);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "marker" && onMarkerPress) onMarkerPress(data.id);
      if (data.type === "error") setPageError(data.message);
    } catch {
      // 예전 방식(마커 id를 그냥 문자열로 보내는) 호환용 — 지금은 항상 JSON을 보내므로 거의 안 탄다.
      if (onMarkerPress) onMarkerPress(event.nativeEvent.data);
    }
  }

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "http://localhost" }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onError={(e) => setWebViewError(e.nativeEvent.description ?? "알 수 없는 오류")}
        onHttpError={(e) =>
          setWebViewError(`HTTP ${e.nativeEvent.statusCode}: ${e.nativeEvent.description ?? ""}`)
        }
      />
      {(pageError || webViewError) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            ⚠️ 지도 오류: {pageError ?? webViewError}
          </Text>
        </View>
      )}
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
  <script>
    // 페이지 안 어디서든 에러가 나면(SDK 로딩 실패 포함) RN 쪽으로 그 내용을 보내서
    // 화면에 바로 보이게 한다 — WebView 안 콘솔 로그는 밖에서 안 보이기 때문.
    window.onerror = function (message) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: String(message) }));
      }
    };
  </script>
  <script
    src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"
    onerror="window.onerror('카카오맵 SDK 스크립트 로딩 실패(appkey 또는 네트워크 확인)')"
  ></script>
  <script>
    try {
      if (typeof kakao === 'undefined') {
        window.onerror('kakao 객체 없음 — SDK 스크립트가 실행되지 않음');
      } else {
        kakao.maps.load(function () {
          try {
            var map = new kakao.maps.Map(document.getElementById('map'), {
              center: new kakao.maps.LatLng(${centerLat}, ${centerLng}),
              level: ${level},
            });

            var markers = ${markersJson};
            markers.forEach(function (m) {
              var pos = new kakao.maps.LatLng(m.lat, m.lng);
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
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: m.id }));
                }
              });
            });
          } catch (err) {
            window.onerror('지도 생성 중 오류: ' + err.message);
          }
        });
      }
    } catch (err) {
      window.onerror('초기화 중 오류: ' + err.message);
    }
  </script>
</body>
</html>
  `;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e6f0f5" },
  webview: { flex: 1, backgroundColor: "transparent" },
  errorBox: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 8,
    backgroundColor: "rgba(226,72,61,0.95)",
    borderRadius: 8,
    padding: 10,
  },
  errorText: { color: "#fff", fontSize: 12, lineHeight: 16 },
});
