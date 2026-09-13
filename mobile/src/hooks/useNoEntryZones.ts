import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export type NoEntryZone = {
  id: string;
  name: string;
  address: string;
  type: string;
  typeLabel: string;
  regionCode: string;
  sortOrder: number;
  effectiveDate: string;
  status: string;
  coastGuardOffice: string | null;
  coastGuardPhone: string | null;
};

// jeju_no_entry_zones 컬렉션도 pipeline/sync-legal-data.mjs가 jeju-harbor-map에서
// 매일 자동으로 가져와 채워준다.
export function useNoEntryZones() {
  const [zones, setZones] = useState<NoEntryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "jeju_no_entry_zones"));
        if (cancelled) return;

        const rows: NoEntryZone[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name ?? doc.id,
            address: data.address ?? "",
            type: data.type ?? "",
            typeLabel: data.typeLabel ?? "미분류",
            regionCode: data.regionCode ?? "",
            sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
            effectiveDate: data.effectiveDate ?? "-",
            status: data.status ?? "-",
            coastGuardOffice: data.coastGuardOffice ?? null,
            coastGuardPhone: data.coastGuardPhone ?? null,
          };
        });
        rows.sort((a, b) => a.name.localeCompare(b.name, "ko"));
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
