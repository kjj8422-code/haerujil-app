// Firebase 초기화 — 앱 전체에서 이 파일 하나만 import해서 쓴다.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  getAuth,
  // @ts-expect-error — firebase 패키지의 TS 타입 선언은 이 함수를 "웹/노드" 기준으로만
  // 노출해서 tsc가 못 찾지만, 실제 앱은 Metro 번들러가 react-native 조건으로 빌드하므로
  // 런타임에는 정상적으로 존재한다(Firebase JS SDK v11+의 알려진 타입 한계).
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";

// Fast Refresh(코드 저장 시 자동 새로고침)로 이 파일이 여러 번 실행돼도
// Firebase 앱이 중복 초기화되지 않도록 방어한다.
export const app: FirebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

// 로그인 상태를 폰 안에 저장(AsyncStorage)해서, 앱을 껐다 켜도 로그인이 유지되게 한다.
// (이걸 안 하면 매번 앱을 켤 때마다 "새로운 익명 사용자"로 취급되어 랭킹·게시글 작성자가 바뀐다.)
// Fast Refresh로 initializeAuth가 두 번 호출되면 에러가 나므로, 이미 초기화됐으면
// getAuth로 기존 인스턴스를 그대로 가져온다.
export let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export const db: Firestore = getFirestore(app);
