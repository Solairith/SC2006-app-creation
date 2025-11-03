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
  postal_code?: string;
};

export const SchoolRecommendations: React.FC<{ onViewDetails: (name: string) => void }> = ({ onViewDetails }) => {
  const [items, setItems] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homePostal, setHomePostal] = useState<string | null>(null);

  useEffect(() => {
  (async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching recommendations...');
      const r = await getRecommendations();
      
      console.log('Recommendations response:', r);
      
      if (r.error) {
        setError(r.error);
      } else {
        setItems(r.items || []);
        console.log('Set items:', r.items?.length);
        
        // Check if we have items but they all have 0 score
        if (r.items && r.items.length > 0) {
          const zeroScoreItems = r.items.filter(item => item.score_percent === 0);
          if (zeroScoreItems.length === r.items.length) {
            console.log('All items have 0% score, but showing them anyway');
          }
        }
      }
    } catch (e: any) {
      console.error('Error in recommendations:', e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  })();
}, []);

  if (loading) return <Card className="p-4">Loading personalized recommendations…</Card>;
  if (error) return <Card className="p-4 text-red-600">Error: {error}</Card>;

  return (
    <Card className="p-4">
      <div className="text-xl font-semibold mb-3">Recommended for you</div>

      {/* Show home postal if available */}
      {homePostal && (
        <div className="text-sm text-muted-foreground mb-4 p-3 bg-blue-50 rounded-lg">
          📍 Calculating distances from: <strong>{homePostal}</strong>
        </div>
      )}

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
                
                {/* Enhanced distance and score display */}
                <div className="text-sm mt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{s.score_percent}%</span>
                    <span>match</span>
                    {s.distance_km !== undefined && s.distance_km !== null ? (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        📍 {s.distance_km.toFixed(1)} km away
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
                    {s.reasons.cca_matches && s.reasons.cca_matches.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">CCAs:</span>
                        <span>{s.reasons.cca_matches.join(', ')}</span>
                      </div>
                    )}
                    {s.reasons.subject_matches && s.reasons.subject_matches.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Subjects:</span>
                        <span>{s.reasons.subject_matches.join(', ')}</span>
                      </div>
                    )}
                    {s.reasons.distance_km !== undefined && s.reasons.distance_km !== null && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Distance:</span>
                        <span>{s.reasons.distance_km} km</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="ml-2" onClick={(e) => e.stopPropagation()}>

              </div>
            </div>
          </div>
        ))}
      </div>

{items.length > 0 && (
  <div className="text-sm text-muted-foreground mb-4">
    Showing {items.length} schools sorted by relevance
    {items[0]?.score_percent === 0 && (
      <span className="text-orange-600 ml-2">
        (all have 0% match - check your preferences)
      </span>
    )}
  </div>
)}
    </Card>
  );
};