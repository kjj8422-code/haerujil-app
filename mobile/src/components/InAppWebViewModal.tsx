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
          {/* 회색 텍스트 하나뿐이던 예전 닫기 버튼이 눈에 잘 안 띈다는 피드백을 받아,
              배경이 있는 동그란 X 버튼으로 바꿔서 "닫는 곳"이 한눈에 보이게 했다. */}
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
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
            {/* 상단 헤더의 X와 별개로, 페이지 내용 위에도 항상 떠 있는 닫기 버튼을
                하나 더 둔다 — 웹페이지가 스크롤되거나 헤더가 눈에 잘 안 띄는
                상황에서도 어디서든 바로 닫을 수 있게 하기 위한 보험. */}
            <Pressable onPress={onClose} hitSlop={12} style={styles.floatingCloseBtn}>
              <Text style={styles.floatingCloseIcon}>✕</Text>
            </Pressable>
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
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { fontSize: 18, fontWeight: "700", color: "#333", lineHeight: 20 },
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
  floatingCloseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(20,20,20,0.55)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5,
  },
  floatingCloseIcon: { fontSize: 18, fontWeight: "700", color: "#fff", lineHeight: 20 },
});
