import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export type LawChange = {
  id: string;
  effective: string;
  status: string;
  scope: string;
  title: string;
  before: string | null;
  after: string | null;
  note: string | null;
  source: string | null;
  sourceUrl: string | null;
  species: string[];
};

export function useLawChanges() {
  const [changes, setChanges] = useState<LawChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "law_changes"));
        if (cancelled) return;

        const rows: LawChange[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            effective: data.effective ?? "",
            status: data.status ?? "",
            scope: data.scope ?? "",
            title: data.title ?? "",
            before: data.before ?? null,
            after: data.after ?? null,
            note: data.note ?? null,
            source: data.source ?? null,
            sourceUrl: data.sourceUrl ?? null,
            species: Array.isArray(data.species) ? data.species : [],
          };
        });
        // 최신 시행일이 위로 오게 정렬 (jeju-harbor-map과 동일한 정렬 방식)
        rows.sort((a, b) => b.effective.localeCompare(a.effective));
        setChanges(rows);
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

  return { changes, loading, error };
}
