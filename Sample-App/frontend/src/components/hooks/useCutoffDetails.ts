// src/hooks/useCutoffDetails.ts
import { useEffect, useState } from "react";
import { getSchoolDetails } from "../../lib/api";

type CutoffKey =
  | "POSTING GROUP 3 (EXPRESS)"
  | "POSTING GROUP 3 AFFILIATED"
  | "POSTING GROUP 2 (NORMAL ACAD)"
  | "POSTING GROUP 2 AFFILIATED"
  | "POSTING GROUP 1 (NORMAL TECH)"
  | "POSTING GROUP 1 AFFILIATED";

const LABELS: Record<CutoffKey, string> = {
  "POSTING GROUP 3 (EXPRESS)": "PG3 (Express)",
  "POSTING GROUP 3 AFFILIATED": "PG3 Affiliated",
  "POSTING GROUP 2 (NORMAL ACAD)": "PG2 (Normal Acad)",
  "POSTING GROUP 2 AFFILIATED": "PG2 Affiliated",
  "POSTING GROUP 1 (NORMAL TECH)": "PG1 (Normal Tech)",
  "POSTING GROUP 1 AFFILIATED": "PG1 Affiliated",
};

const ORDER: CutoffKey[] = [
  "POSTING GROUP 3 (EXPRESS)",
  "POSTING GROUP 3 AFFILIATED",
  "POSTING GROUP 2 (NORMAL ACAD)",
  "POSTING GROUP 2 AFFILIATED",
  "POSTING GROUP 1 (NORMAL TECH)",
  "POSTING GROUP 1 AFFILIATED",
];

const isNA = (v?: string | null) => {
  if (!v) return true;
  const s = String(v).trim().toUpperCase();
  return s === "N/A" || s === "NA" || s === "-" || s === "";
};

function summarizeCutoffs(
  cutoff_points?: Partial<Record<CutoffKey, string>> | null,
  level?: string
): string | null {
  if (!cutoff_points || level === "PRIMARY") return null;
  const parts: string[] = [];
  for (const k of ORDER) {
    const v = cutoff_points[k];
    if (!isNA(v)) parts.push(`${LABELS[k]}: ${v}`);
  }
  return parts.length ? parts.join(" | ") : null;
}

type Input = { school_name: string; mainlevel_code?: string }[];

export function useCutoffDetails(items: Input) {
  const [cache, setCache] = useState<
    Record<
      string,
      { cutoffLine?: string | null; fetched?: boolean }
    >
  >({});

  useEffect(() => {
    if (!items?.length) return;

    const toFetch = items
      .map((s) => s.school_name)
      .filter((n) => n && !cache[n]?.fetched);

    if (!toFetch.length) return;

    let cancelled = false;
    const nameToLevel = Object.fromEntries(
      items.map((s) => [s.school_name, s.mainlevel_code])
    );

    const run = async () => {
      const chunk = async (names: string[]) => {
        await Promise.all(
          names.map(async (n) => {
            try {
              const d = await getSchoolDetails(n);
              if (cancelled) return;
              const line = summarizeCutoffs(d?.cutoff_points, nameToLevel[n]);
              setCache((prev) => ({
                ...prev,
                [n]: { cutoffLine: line, fetched: true },
              }));
            } catch {
              if (cancelled) return;
              setCache((prev) => ({ ...prev, [n]: { fetched: true } }));
            }
          })
        );
      };
      for (let i = 0; i < toFetch.length && !cancelled; i += 8) {
        await chunk(toFetch.slice(i, i + 8));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [items, cache]);

  return cache; // cache[name]?.cutoffLine
}
