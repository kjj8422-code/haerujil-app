import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { KAKAO_JS_KEY } from "../kakaoConfig";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  color: string; // 마커 색
  shape?: "circle" | "triangle" | "square"; // 색이 같아도 모양으로 한 번 더 구분 (기본: circle)
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
        // 지도 가장자리에서 통통 튀는 느낌(오버스크롤)과, 지도를 감싼 화면을
        // 실수로 함께 스크롤시키는 것을 막아서 확대·이동이 더 안정적으로 느껴지게 한다.
        bounces={false}
        overScrollMode="never"
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
    src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=clusterer&autoload=false"
    onerror="window.onerror('카카오맵 SDK 스크립트 로딩 실패(appkey 또는 네트워크 확인)')"
  ></script>
  <script>
    // 색깔+모양 조합별로 마커 이미지를 SVG로 만들어 캐시해둔다 — 색만으로는 구분이
    // 애매할 수 있어서, 카테고리가 다르면 모양 자체를 다르게 해서 아이콘만 보고도
    // 바로 구분되게 한다 (원=현재 시행중인 규정, 세모=시행 예정, 네모=기타).
    var markerImageCache = {};
    function shapeSvg(shape, color) {
      if (shape === 'triangle') {
        return '<polygon points="11,2 20,19 2,19" fill="' + color + '" stroke="#0b2a3d" stroke-width="2" stroke-linejoin="round"/>';
      }
      if (shape === 'square') {
        return '<rect x="3" y="3" width="16" height="16" rx="3" fill="' + color + '" stroke="#0b2a3d" stroke-width="2"/>';
      }
      return '<circle cx="11" cy="11" r="8" fill="' + color + '" stroke="#0b2a3d" stroke-width="2"/>';
    }
    function getMarkerImage(color, shape) {
      shape = shape || 'circle';
      var key = shape + '|' + color;
      if (markerImageCache[key]) return markerImageCache[key];
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">' + shapeSvg(shape, color) + '</svg>';
      var src = 'data:image/svg+xml;base64,' + btoa(svg);
      var image = new kakao.maps.MarkerImage(
        src,
        new kakao.maps.Size(22, 22),
        { offset: new kakao.maps.Point(11, 11) }
      );
      markerImageCache[key] = image;
      return image;
    }

    try {
      if (typeof kakao === 'undefined') {
        window.onerror('kakao 객체 없음 — SDK 스크립트가 실행되지 않음');
      } else {
        kakao.maps.load(function () {
          try {
            var map = new kakao.maps.Map(document.getElementById('map'), {
              center: new kakao.maps.LatLng(${centerLat}, ${centerLng}),
              level: ${level},
              draggable: true,
              zoomable: true,
            });

            // 손가락 두 개로 확대/축소하는 핀치 제스처는 화면(웹뷰) 자체 확대와
            // 지도 SDK 확대가 동시에 반응해서 "튀는" 느낌을 준다. 대신 +/- 버튼으로
            // 한 단계씩 또렷하게 확대/축소할 수 있게 해서 네이버·구글 지도처럼
            // 더 편하고 예측 가능하게 만든다. 핀치 줌 자체는 그대로 둔다(취향껏 사용).
            map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);

            var markerData = ${markersJson};
            var markers = markerData.map(function (m) {
              var marker = new kakao.maps.Marker({
                position: new kakao.maps.LatLng(m.lat, m.lng),
                image: getMarkerImage(m.color, m.shape),
              });
              kakao.maps.event.addListener(marker, 'click', function () {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: m.id }));
                }
              });
              return marker;
            });

            // 줌 아웃하면 가까운 마커들을 숫자 원(클러스터)으로 뭉쳐 보여주고,
            // 그 원을 누르거나 확대하면 다시 개별 마커로 풀린다.
            var clusterer = new kakao.maps.MarkerClusterer({
              map: map,
              markers: markers,
              averageCenter: true,
              minLevel: 7,
              disableClickZoom: false,
              styles: [{
                width: '38px', height: '38px', lineHeight: '38px',
                borderRadius: '19px', textAlign: 'center', fontWeight: 'bold',
                color: '#fff', background: 'rgba(10,122,61,0.85)',
                border: '2px solid #fff',
              }],
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
