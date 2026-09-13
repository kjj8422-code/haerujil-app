import { useState } from "react";

// 카드가 수백~수천 개일 수 있는 목록 화면에서, 카드마다 모달을
// 따로 만들지 않고 화면당 딱 하나의 모달 상태만 공유해서 쓰기 위한 훅.
// PlaceInfoButtons의 onOpen에 그대로 넘기고, <InAppWebViewModal {...modalProps} />
// 로 화면 최상단에 한 번만 렌더링하면 된다.
export function usePlaceInfoModal() {
  const [modal, setModal] = useState<{ url: string; title: string } | null>(null);

  return {
    modalProps: {
      visible: modal !== null,
      url: modal?.url ?? null,
      title: modal?.title ?? "",
      onClose: () => setModal(null),
    },
    open: (url: string, title: string) => setModal({ url, title }),
  };
}
