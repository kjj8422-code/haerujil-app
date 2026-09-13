import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export type LeisureZone = {
  id: string;
  regionOffice: string;
  localOffice: string;
  placeType: string;
  placeName: string;
  banPeriod: string;
  areaDescription: string;
  bannedDevices: string;
  lat: number | null;
  lng: number | null;
  isJeju: boolean;
};

// leisure_restricted_zones는 pipeline/seed-leisure-zones.mjs로 한 번 적재해둔
// 해양경찰청 공식 자료다 (jeju-harbor-map처럼 매일 자동 갱신되지는 않음).
export function useLeisureZones() {
  const [zones, setZones] = useState<LeisureZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "leisure_restricted_zones"));
        if (cancelled) return;

        const rows: LeisureZone[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            regionOffice: data.regionOffice ?? "",
            localOffice: data.localOffice ?? "",
            placeType: data.placeType ?? "",
            placeName: data.placeName ?? "",
            banPeriod: data.banPeriod ?? "-",
            areaDescription: data.areaDescription ?? "",
            bannedDevices: data.bannedDevices ?? "",
            lat: typeof data.lat === "number" ? data.lat : null,
            lng: typeof data.lng === "number" ? data.lng : null,
            isJeju: !!data.isJeju,
          };
        });
        rows.sort((a, b) => a.placeName.localeCompare(b.placeName, "ko"));
        setZones(rows);
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

  return { zones, loading, error };
}
