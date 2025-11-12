// src/components/tabs/SavedTab.tsx
import React from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { useSavedSchools } from "../context/SavedSchoolsContext";
import { HeartToggle } from "../HeartToggle";
import { useCutoffDetails } from "../hooks/useCutoffDetails";

export const SavedTab: React.FC<{
  user: any;
  onViewDetails: (name: string) => void;
  onRequireAuth: () => void;
}> = ({ user, onViewDetails, onRequireAuth }) => {
  const { savedSchools, removeSchool } = useSavedSchools();

  const details = useCutoffDetails(
    savedSchools.map((s) => ({
      school_name: s.school_name,
      mainlevel_code: (s as any).mainlevel_code,
    }))
  );

  if (!savedSchools.length) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No saved schools yet.
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {savedSchools.map((s, i) => {
        const cut = details[s.school_name]?.cutoffLine;
        return (
          <Card
            key={`${s.school_name}-${i}`}
            className="p-4 hover:shadow-md transition cursor-pointer hover:border-primary/50 relative"
            onClick={() => onViewDetails(s.school_name)}
          >
            <div className="absolute top-2 right-2">
              <HeartToggle
                saved={true}
                onToggle={(e) => {
                  e?.stopPropagation?.();
                  removeSchool(s.school_name);
                }}
              />
            </div>

            <h3 className="font-semibold text-lg">{s.school_name}</h3>
            {s.address && (
              <p className="text-muted-foreground text-sm mt-1">{s.address}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {(s as any).mainlevel_code && (
                <Badge variant="secondary">{(s as any).mainlevel_code}</Badge>
              )}
              {(s as any).zone_code && (
                <Badge variant="outline">{(s as any).zone_code}</Badge>
              )}
            </div>

            {cut && (
              <div className="mt-2 text-sm text-muted-foreground">
                Cut-offs: {cut}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
