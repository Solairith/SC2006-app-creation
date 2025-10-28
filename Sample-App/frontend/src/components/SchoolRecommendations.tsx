import React, { useEffect, useState } from "react";
import { getRecommendations, type School } from "../lib/api";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

type RecItem = School & { 
  score: number; 
  score_percent: number; 
  reasons?: any;
  distance_km?: number;
};

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

          <div 
            key={s.school_name} 
            className="border rounded-xl p-3 hover:shadow-md transition cursor-pointer hover:border-primary/50 hover:bg-gray-50"
            onClick={() => onViewDetails(s.school_name)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-lg font-medium flex items-center gap-2">
                  {s.school_name}
                  {s.mainlevel_code && <Badge>{s.mainlevel_code}</Badge>}
                </div>
                <div className="text-sm text-muted">{s.address}</div>
                
                {/* Distance display */}
                <div className="text-sm mt-1">
                  <span className="font-semibold">{s.score_percent}%</span> match
                  {s.distance_km && (
                    <span className="ml-2 text-muted-foreground">
                      • {s.distance_km.toFixed(1)} km away
                    </span>
                  )}
                </div>

                {/* Match reasons */}
                {s.reasons && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.reasons.cca_matches && s.reasons.cca_matches.length > 0 && (
                      <span>CCAs: {s.reasons.cca_matches.join(', ')} • </span>
                    )}
                    {s.reasons.subject_matches && s.reasons.subject_matches.length > 0 && (
                      <span>Subjects: {s.reasons.subject_matches.join(', ')} • </span>
                    )}
                    {s.reasons.level_match && <span>Level match • </span>}
                  </div>
                )}
              </div>
              
              {/* Keep the button but make it less prominent */}
              <div className="ml-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onViewDetails(s.school_name)}
                >
                  Details
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="text-muted">No results</div>}
    </Card>
  );
};