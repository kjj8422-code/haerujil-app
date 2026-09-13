import { Pressable, StyleSheet, Text, View } from "react-native";
import { buildCctvSearchUrl, buildTideSearchUrl } from "../utils/externalLinks";

type Props = {
  placeName: string;
  onOpen: (url: string, title: string) => void;
};

// 항구·구역 카드 어디서나 재사용하는 "🎥 실시간 CCTV"/"🌊 물때·파고" 버튼 한 쌍.
// 모달은 각 화면이 하나만 들고 있고(목록이 몇천 건이어도 카드마다 모달을 만들지
// 않기 위해) 이 컴포넌트는 눌렸을 때 어떤 url/title을 열어야 하는지만 알려준다.
export default function PlaceInfoButtons({ placeName, onOpen }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.btn}
        onPress={() => onOpen(buildCctvSearchUrl(placeName), `🎥 ${placeName} CCTV`)}
      >
        <Text style={styles.btnText}>🎥 실시간 CCTV</Text>
      </Pressable>
      <Pressable
        style={[styles.btn, styles.btnTide]}
        onPress={() => onOpen(buildTideSearchUrl(placeName), `🌊 ${placeName} 물때·파고`)}
      >
        <Text style={[styles.btnText, styles.btnTideText]}>🌊 물때·파고</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginTop: 10 },
  btn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#eef6f0",
    borderWidth: 1,
    borderColor: "#0a7a3d",
  },
  btnText: { fontSize: 12, fontWeight: "700", color: "#0a7a3d" },
  btnTide: { backgroundColor: "#eaf4fb", borderColor: "#0a5fc4" },
  btnTideText: { color: "#0a5fc4" },
});
