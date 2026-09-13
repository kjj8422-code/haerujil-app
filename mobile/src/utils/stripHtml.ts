// jeju-harbor-map의 note 필드는 웹페이지용이라 <b>...</b> 같은 HTML 태그가 섞여있을 수
// 있다. React Native의 <Text>는 HTML을 해석하지 못하므로, 태그만 제거하고 내용(글자)은
// 그대로 남긴다 — 굵게 표시되는 효과만 없어질 뿐, 법적으로 중요한 텍스트 정보는 그대로 보존.
export function stripHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/<[^>]+>/g, "");
}
