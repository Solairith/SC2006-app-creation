// src/context/SavedSchoolsContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface SavedSchool {
  school_name: string;
  address?: string;
  mainlevel_code?: string;
  zone_code?: string;
  cutoff_primary?: string | null;
}

interface Ctx {
  savedSchools: SavedSchool[];
  addSchool: (school: SavedSchool) => void;
  removeSchool: (schoolName: string) => void;
  clearAll: () => void;
}

/** Build a storage key that is unique per user */
const storageKey = (uid: string | number | null | undefined) =>
  `saved.schools:${uid ?? "anon"}`;

function loadSaved(uid: string | number | null | undefined): SavedSchool[] {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    return raw ? (JSON.parse(raw) as SavedSchool[]) : [];
  } catch {
    return [];
  }
}

function persist(uid: string | number | null | undefined, list: SavedSchool[]) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(list));
  } catch {}
}

const SavedSchoolsContext = createContext<Ctx | undefined>(undefined);

/**
 * Provider
 * Pass the *current user id* via `userId`. Use `null` when logged out.
 * Example:
 *   <SavedSchoolsProvider userId={user?.id}> ... </SavedSchoolsProvider>
 */
export const SavedSchoolsProvider: React.FC<
  React.PropsWithChildren<{ userId?: string | number | null }>
> = ({ userId = null, children }) => {
  // hydrate from the correct bucket on first mount
  const [savedSchools, setSavedSchools] = useState<SavedSchool[]>(
    () => loadSaved(userId)
  );

  // when the user changes, switch buckets
  useEffect(() => {
    setSavedSchools(loadSaved(userId));
  }, [userId]);

  // persist whenever this user's list changes
  useEffect(() => {
    persist(userId, savedSchools);
  }, [userId, savedSchools]);

  const addSchool = (school: SavedSchool) => {
    setSavedSchools((prev) => {
      if (prev.some((s) => s.school_name === school.school_name)) return prev;
      return [...prev, school];
    });
  };

  const removeSchool = (schoolName: string) => {
    setSavedSchools((prev) => prev.filter((s) => s.school_name !== schoolName));
  };

  const clearAll = () => setSavedSchools([]);

  const value = useMemo(
    () => ({ savedSchools, addSchool, removeSchool, clearAll }),
    [savedSchools]
  );

  return (
    <SavedSchoolsContext.Provider value={value}>
      {children}
    </SavedSchoolsContext.Provider>
  );
};

export const useSavedSchools = () => {
  const ctx = useContext(SavedSchoolsContext);
  if (!ctx) throw new Error("useSavedSchools must be used within SavedSchoolsProvider");
  return ctx;
};
