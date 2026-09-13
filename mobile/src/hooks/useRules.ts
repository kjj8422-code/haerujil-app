import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export type Rule = {
  id: string;
  species: string;
  banPeriod: string;
  minSize: string;
  category: string;
  jejuSpecific: boolean;
  note: string | null;
  lastChanged: string | null;
};

export const CATEGORY_LABEL: Record<string, string> = {
  fish: "어류",
  cephalopod: "두족류",
  crustacean: "갑각류",
  shellfish: "패류",
  seaweed: "해조류",
  other: "기타",
};

// rules 컬렉션은 pipeline/sync-legal-data.mjs가 jeju-harbor-map에서 매일 자동으로
// 가져와 채워준다 — 법이 바뀌면 다음 동기화 때 이 화면에도 자동 반영된다.
export function useRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "rules"));
        if (cancelled) return;

        const rows: Rule[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            species: data.species ?? doc.id,
            banPeriod: data.banPeriod ?? "-",
            minSize: data.minSize ?? "-",
            category: data.category ?? "other",
            jejuSpecific: !!data.jejuSpecific,
            note: data.note ?? null,
            lastChanged: data.lastChanged ?? null,
          };
        });
        rows.sort((a, b) => a.species.localeCompare(b.species, "ko"));
        setRules(rows);
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

  return { rules, loading, error };
}
