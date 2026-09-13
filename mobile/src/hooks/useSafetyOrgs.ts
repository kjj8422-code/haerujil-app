import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export type SafetyOrg = {
  id: string;
  recognitionNo: string;
  name: string;
  certs: string;
};

export function useSafetyOrgs() {
  const [orgs, setOrgs] = useState<SafetyOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "safety_orgs"));
        if (cancelled) return;

        const rows: SafetyOrg[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            recognitionNo: data.recognitionNo ?? doc.id,
            name: data.name ?? "",
            certs: data.certs ?? "",
          };
        });
        rows.sort((a, b) => a.name.localeCompare(b.name, "ko"));
        setOrgs(rows);
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

  return { orgs, loading, error };
}
