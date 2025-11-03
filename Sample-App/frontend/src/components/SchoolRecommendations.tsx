import React, { useEffect, useMemo, useState } from "react";
import { getRecommendations, type School } from "../lib/api";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

import { HeartToggle } from "./HeartToggle";
import { useSavedSchools } from "./context/SavedSchoolsContext";

type RecItem = School & {
  score: number;
  score_percent: number;
  reasons?: any;
  distance_km?: number;
  postal_code?: string;
};

export const SchoolRecommendations: React.FC<{ onViewDetails: (name: string) => void }> = ({ onViewDetails }) => {
  const [items, setItems] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homePostal, setHomePostal] = useState<string | null>(null);
  const { addSchool, savedSchools, removeSchool } = useSavedSchools();

  const savedNames = useMemo(() => new Set(savedSchools.map(s => s.school_name)), [savedSchools]);

  const PAGE_SIZE = 20;
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [minScore, setMinScore] = useState<number>(1); // hide 0% by default

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await getRecommendations();
        if (r.error) {
          setError(r.error);
        } else {
          setItems(r.items || []);
        }
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => (items || []).filter((it) => (it?.score_percent ?? 0) >= minScore),
    [items, minScore]
  );

  const canLoadMore = visible < filtered.length;
  const shown = filtered.slice(0, visible);

  if (loading) return <Card className="p-4">Loading personalized recommendations…</Card>;
  if (error) return <Card className="p-4 text-red-600">Error: {error}</Card>;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Recommended for you</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Min match:</span>
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value));
              setVisible(PAGE_SIZE); // reset paging when filter changes
            }}
          >
            <option value={0}>Show all</option>
            <option value={1}>≥ 1%</option>
            <option value={20}>≥ 20%</option>
            <option value={40}>≥ 40%</option>
            <option value={60}>≥ 60%</option>
            <option value={80}>≥ 80%</option>
          </select>
        </div>
      </div>

      {homePostal && (
        <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-lg">
          📍 Calculating distances from: <strong>{homePostal}</strong>
        </div>
      )}

      {/* RESULTS */}
      <div className="grid md:grid-cols-1 gap-3">
        {shown.map((s) => {
          const isSaved = savedNames.has(s.school_name);
          return (
            <div
              key={s.school_name}
              className="relative border rounded-xl p-3 hover:shadow-md transition cursor-pointer hover:border-primary/50 hover:bg-gray-50"
              onClick={() => onViewDetails(s.school_name)}
            >
              {/* Heart toggle in the corner */}
              <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                <HeartToggle
                  saved={isSaved}
                  onToggle={() =>
                    isSaved
                      ? removeSchool(s.school_name)
                      : addSchool({
                          school_name: s.school_name,
                          address: s.address,
                          mainlevel_code: s.mainlevel_code,
                        })
                  }
                />
              </div>

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-lg font-medium flex items-center gap-2">
                    {s.school_name}
                    {s.mainlevel_code && <Badge>{s.mainlevel_code}</Badge>}
                  </div>
                  <div className="text-sm text-muted">{s.address}</div>

                  {/* Score + distance */}
                  <div className="text-sm mt-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">{s.score_percent}%</span>
                      <span>match</span>
                      {s.distance_km !== undefined && s.distance_km !== null ? (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          📍 {Number.isFinite(s.distance_km) ? s.distance_km.toFixed(1) : s.distance_km} km away
                        </span>
                      ) : (
                        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                          📍 Distance not available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match reasons */}
                  {s.reasons && (
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      {s.reasons.cca_matches?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">CCAs:</span>
                          <span>{s.reasons.cca_matches.join(", ")}</span>
                        </div>
                      )}
                      {s.reasons.subject_matches?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Subjects:</span>
                          <span>{s.reasons.subject_matches.join(", ")}</span>
                        </div>
                      )}
                      
                    </div>
                  )}
                </div>

                {/* right-side action area placeholder, if you need later */}
                <div className="ml-2" onClick={(e) => e.stopPropagation()} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / counts */}
      <div className="text-sm text-muted-foreground">
        Showing {shown.length} of {filtered.length} recommended schools
        {filtered.length === 0 && items.length > 0 && (
          <span className="text-orange-600 ml-2">(no items ≥ {minScore}% match)</span>
        )}
      </div>

      {/* Load more */}
      {canLoadMore && (
        <Button
          className="w-full mt-2"
          variant="outline"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
        >
          Load more
        </Button>
      )}
    </Card>
  );
};
