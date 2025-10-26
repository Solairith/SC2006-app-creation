import React, { useEffect, useState } from "react";
import { getRecommendations, type School } from "../lib/api";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

type RecItem = School & { score: number; score_percent: number; reasons?: any };

export const SchoolRecommendations: React.FC<{ onViewDetails: (name: string) => void }> = ({ onViewDetails }) => {
  const [items, setItems] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await getRecommendations();
        if (r?.error) setError(r.error);
        else setItems(r.items || []);
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Card className="p-4">Loading recommendations…</Card>;
  if (error) return <Card className="p-4 text-red-600">Error: {error}</Card>;

  return (
    <Card className="p-4">
      <div className="text-xl font-semibold mb-3">Recommended for you</div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((s) => (
          <div key={s.school_name} className="border rounded-xl p-3 flex items-start justify-between">
            <div>
              <div className="text-lg font-medium flex items-center gap-2">
                {s.school_name}
                {s.mainlevel_code && <Badge>{s.mainlevel_code}</Badge>}
              </div>
              <div className="text-sm text-muted">{s.address}</div>
              <div className="text-sm mt-1">
                <span className="font-semibold">{s.score_percent}%</span> match
              </div>
            </div>
            <div>
              <Button onClick={() => onViewDetails(s.school_name)}>Details</Button>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="text-muted">No results</div>}
    </Card>
  );
};