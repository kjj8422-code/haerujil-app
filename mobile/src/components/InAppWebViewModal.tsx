import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  url: string | null;
  title: string;
  onClose: () => void;
};

// CCTV·물때 검색 결과처럼 앱 밖 웹사이트를 보여줘야 할 때, 시스템 브라우저로 튕겨
// 나가지 않고 앱 안에서 바로 열어주는 공용 모달. 화면마다 따로 만들지 않고 이거
// 하나만 화면 최상단에 두고 url/title만 바꿔가며 재사용한다.
export default function InAppWebViewModal({ visible, url, title, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      // 모달이 새로 열릴 때마다 이전 페이지의 로딩/에러 상태가 잠깐 보이지 않도록,
      // 닫혀있는 동안은 WebView 자체를 만들지 않는다.
      onShow={() => {
        setLoading(true);
        setError(null);
      }}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕ 닫기</Text>
          </Pressable>
        </View>

        {visible && url && (
          <View style={{ flex: 1 }}>
            <WebView
              source={{ uri: url }}
              style={{ flex: 1 }}
              onLoadStart={() => {
                setLoading(true);
                setError(null);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={(e) => {
                setLoading(false);
                setError(e.nativeEvent.description || "페이지를 열 수 없습니다");
              }}
              onHttpError={(e) => {
                setLoading(false);
                setError(`페이지를 불러오지 못했습니다 (HTTP ${e.nativeEvent.statusCode})`);
              }}
            />
            {loading && !error && (
              <View style={styles.overlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#0a7a3d" />
              </View>
            )}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 12 },
  closeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  closeText: { fontSize: 13, color: "#888", fontWeight: "600" },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  errorBox: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    backgroundColor: "rgba(226,72,61,0.95)",
    borderRadius: 8,
    padding: 10,
  },
  errorText: { color: "#fff", fontSize: 12.5, lineHeight: 17 },
});
