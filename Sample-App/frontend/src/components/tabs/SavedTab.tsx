import React from "react";
import { useSavedSchools } from "../context/SavedSchoolsContext";

interface SavedTabProps {
  onViewDetails: (schoolName: string) => void;
}

export const SavedTab: React.FC<SavedTabProps> = ({ onViewDetails }) => {
  const { savedSchools, removeSchool } = useSavedSchools();

  if (savedSchools.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border">
        <p className="text-muted-foreground text-lg">No saved schools yet</p>
        <p className="text-muted-foreground mt-2">
          Explore schools and save them to see them here
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Saved Schools</h2>

      <div className="grid gap-4">
        {savedSchools.map((school, index) => (
          <div
            key={index}
            className="bg-card border rounded-lg p-4 hover:shadow-md transition cursor-pointer hover:border-primary/50"
          >
            <div
              onClick={() => onViewDetails(school.school_name)}
              className="cursor-pointer"
            >
              <h3 className="font-semibold text-lg">{school.school_name}</h3>
              {school.address && (
                <p className="text-muted-foreground text-sm mt-1">
                  {school.address}
                </p>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  {school.mainlevel_code && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {school.mainlevel_code}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ Remove Button */}
            <button
              onClick={() => removeSchool(school.school_name)}
              className="mt-3 text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
