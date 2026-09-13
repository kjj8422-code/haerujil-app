import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export type Harbor = {
  id: string;
  name: string;
  address: string;
  region: string;
  type: string;
  lat: number | null;
  lng: number | null;
  fishingHouseholds: number | null;
  totalPopulation: number | null;
};

// harbors 컬렉션 전체를 한 번에 읽어와 메모리에 올려둔다.
// (전국 데이터라 수천 건일 수 있지만, Firestore 무료 사용량 안에서 화면 하나 띄우는
// 정도는 충분히 감당된다. 나중에 지역별로 나눠 불러오는 방식으로 최적화할 수 있다.)
export function useHarbors() {
  const [harbors, setHarbors] = useState<Harbor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "harbors"));
        if (cancelled) return;

        const rows: Harbor[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name ?? "",
            address: data.address ?? "",
            region: data.region ?? "미상",
            type: data.type ?? "미분류",
            lat: typeof data.lat === "number" ? data.lat : null,
            lng: typeof data.lng === "number" ? data.lng : null,
            fishingHouseholds:
              typeof data.fishingHouseholds === "number" ? data.fishingHouseholds : null,
            totalPopulation:
              typeof data.totalPopulation === "number" ? data.totalPopulation : null,
          };
        });
        rows.sort((a, b) => a.name.localeCompare(b.name, "ko"));
        setHarbors(rows);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { harbors, loading, error };
}
