// src/context/SavedSchoolsContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface SavedSchool {
  school_name: string;
  address?: string;
  mainlevel_code?: string;
  zone_code?: string;            
  cutoff_primary?: string | null; 
}

interface SavedSchoolsContextType {
  savedSchools: SavedSchool[];
  addSchool: (school: SavedSchool) => void;
  removeSchool: (schoolName: string) => void;
}

const SavedSchoolsContext = createContext<SavedSchoolsContextType | undefined>(
  undefined
);

export const SavedSchoolsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [savedSchools, setSavedSchools] = useState<SavedSchool[]>(() => {
    const stored = localStorage.getItem("savedSchools");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("savedSchools", JSON.stringify(savedSchools));
  }, [savedSchools]);

  const addSchool = (school: SavedSchool) => {
    setSavedSchools((prev) => {
      if (prev.some((s) => s.school_name === school.school_name)) return prev;
      return [...prev, school];
    });
  };

  const removeSchool = (schoolName: string) => {
    setSavedSchools((prev) => prev.filter((s) => s.school_name !== schoolName));
  };

  return (
    <SavedSchoolsContext.Provider value={{ savedSchools, addSchool, removeSchool }}>
      {children}
    </SavedSchoolsContext.Provider>
  );
};

export const useSavedSchools = () => {
  const context = useContext(SavedSchoolsContext);
  if (!context)
    throw new Error("useSavedSchools must be used within a SavedSchoolsProvider");
  return context;
};
