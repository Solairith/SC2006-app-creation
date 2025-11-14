import React, { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { getPreferences, savePreferences } from "../lib/api";
import SearchableMultiSelect from "./SearchableMultiSelect";

export const UserProfile: React.FC = () => {
  const [level, setLevel] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [ccas, setCcas] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState<string>("");
  const [homeAddress, setHomeAddress] = useState("");
  const [saved, setSaved] = useState(false);
  const [opts, setOpts] = useState<{ levels: string[]; subjects: string[]; ccas: string[] }>({
    levels: [],
    subjects: [],
    ccas: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ---------- Validation helpers ----------
  const postalValid = /^\d{6}$/.test(homeAddress);

  // Allow empty OR positive number (integer/decimal)
  const maxDistanceValid =
    maxDistance.trim() === "" ||
    (/^\d+(\.\d+)?$/.test(maxDistance) && Number(maxDistance) > 0);

  const postalHelp =
    homeAddress && !postalValid ? "Enter a valid 6-digit postal code." : "";

  const maxDistanceHelp =
    maxDistance.trim() !== "" && !maxDistanceValid
      ? "Enter a positive number (e.g., 8 or 8.5)."
      : "";

  useEffect(() => {
    (async () => {
      try {
        const r: any = await getPreferences();
        if (r?.ok) {
          setLevel(r.level || "");
          setSubjects(r.subjects || []);
          setCcas(r.ccas || []);
          setMaxDistance(
            r.max_distance_km != null && r.max_distance_km !== ""
              ? String(r.max_distance_km)
              : ""
          );
          // prefer home_postal if available, else home_address
          setHomeAddress((r.home_postal || r.home_address || "").toString());
        }
      } catch {
        // ignore load error
      }
      try {
        const res = await fetch("/api/schools/options", { credentials: "include" });
        const data = await res.json();
        if (data?.ok) setOpts({ levels: data.levels || [], subjects: data.subjects || [], ccas: data.ccas || [] });
      } catch {}
    })();
  }, []);

  const onSave = async () => {
    setSaved(false);
    setError(null);

    if (!postalValid) {
      setError("Please enter a valid 6-digit Singapore postal code.");
      return;
    }
    if (!maxDistanceValid) {
      setError("Max Distance must be a positive number (km).");
      return;
    }

    try {
      setSaving(true);

      const preferencesData = {
        level: level || undefined,
        subjects,
        ccas,
        max_distance_km: maxDistance.trim() ? Number(maxDistance) : undefined,
        // Send both keys (safe if backend only uses one)
        home_address: homeAddress || undefined,
        home_postal: homeAddress || undefined,
      };

      await savePreferences(preferencesData);
      setSaved(true);

      // Notify parent/other tabs if needed
      window.dispatchEvent(new CustomEvent("preferences-saved"));
    } catch (e: any) {
      console.error("Failed to save preferences:", e);
      setError(e.message || "Failed to save preferences. Please check console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="text-xl font-semibold mb-3">Your Preferences</div>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <div className="grid md:grid-cols-2 gap-3">
        {/* Postal Code */}
        <div className="md:col-span-2">
          <div className="text-sm mb-1">Postal Code</div>
          <input
            className={`border rounded px-2 py-2 w-full ${homeAddress && !postalValid ? "border-red-500" : ""}`}
            placeholder="6-digit postal code (e.g., 238801)"
            value={homeAddress}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setHomeAddress(v);
              if (error) setError(null);
            }}
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
          />
          {postalHelp && <p className="text-xs text-red-600 mt-1">{postalHelp}</p>}
        </div>

        {/* Level */}
        <div>
          <div className="text-sm mb-1">Level</div>
          <select
            className="border rounded px-2 py-2 w-full"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              if (error) setError(null);
            }}
          >
            <option value="">Select level</option>
            <option value="PRIMARY">Primary</option>
            <option value="SECONDARY">Secondary</option>
            <option value="Junior College">Junior College</option>
            <option value="MIXED LEVELS">Mixed Levels</option>
          </select>
        </div>

        {/* Max distance */}
        <div>
          <div className="text-sm mb-1">Max distance (km)</div>
          <input
            className={`border rounded px-2 py-2 w-full ${
              maxDistance.trim() !== "" && !maxDistanceValid ? "border-red-500" : ""
            }`}
            placeholder="e.g. 8"
            value={maxDistance}
            onChange={(e) => {
              const raw = e.target.value;
              // Allow only digits and a single dot
              const cleaned = raw.replace(/[^0-9.]/g, "");
              const parts = cleaned.split(".");
              const normalized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
              setMaxDistance(normalized);
              if (error) setError(null);
            }}
          />
          {maxDistanceHelp && <p className="text-xs text-red-600 mt-1">{maxDistanceHelp}</p>}
        </div>

        {/* Subjects */}
        <div className="md:col-span-2">
          <SearchableMultiSelect
            options={opts.subjects}
            values={subjects}
            onChange={(v) => {
              setSubjects(v);
              if (error) setError(null);
            }}
            label="Subjects"
          />
        </div>

        {/* CCAs */}
        <div className="md:col-span-2">
          <SearchableMultiSelect
            options={opts.ccas}
            values={ccas}
            onChange={(v) => {
              setCcas(v);
              if (error) setError(null);
            }}
            label="CCAs"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onSave} disabled={saving || !postalValid || !maxDistanceValid}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-sm text-green-700">Saved!</span>}
      </div>
    </Card>
  );
};
