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
  const [opts, setOpts] = useState<{levels:string[], subjects:string[], ccas:string[]}>({levels:[], subjects:[], ccas:[]});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r: any = await getPreferences();
        if (r?.ok) {
          setLevel(r.level || "");
          setSubjects(r.subjects || []);
          setCcas(r.ccas || []);
          setMaxDistance(r.max_distance_km != null ? String(r.max_distance_km) : "");
          setHomeAddress(r.home_address || ""); 
        }
      } catch (e:any) {
        
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
  try {
    const preferencesData = {
      level: level || undefined,
      subjects: subjects,
      ccas: ccas,
      max_distance_km: maxDistance ? Number(maxDistance) : undefined,
      home_address: homeAddress || undefined,
    };
    
    console.log('Saving preferences:', preferencesData);
    
    await savePreferences(preferencesData);
    setSaved(true);
    
    console.log('Preferences saved successfully');
    
    // Notify parent that preferences were saved
    window.dispatchEvent(new CustomEvent('preferences-saved'));
  } catch (e: any) {
    console.error('Failed to save preferences:', e);
    setError(e.message || "Failed to save preferences. Please check console for details.");
  }
};

  return (
    <Card className="p-4">
      <div className="text-xl font-semibold mb-3">Your Preferences</div>
      <div className="grid md:grid-cols-2 gap-3">
        {/* ADD HOME ADDRESS FIELD */}
        <div className="md:col-span-2">
          <div className="text-sm mb-1">Home Address</div>
          <input 
            className="border rounded px-2 py-2 w-full" 
            placeholder="Enter your home address for distance calculation"
            value={homeAddress} 
            onChange={(e) => setHomeAddress(e.target.value)} 
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your address will be used to calculate distance to schools
          </p>
        </div>
        
        <div>
          <div className="text-sm mb-1">Level</div>
          <select className="border rounded px-2 py-2 w-full" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Select level</option>
            <option value="PRIMARY">Primary</option>
            <option value="SECONDARY">Secondary</option>
            <option value="Junior College">Junior College</option>
            <option value="MIXED LEVELS">Mixed Levels</option>
          </select>
        </div>
        <div>
          <div className="text-sm mb-1">Max distance (km)</div>
          <input className="border rounded px-2 py-2 w-full" placeholder="e.g. 8" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <SearchableMultiSelect options={opts.subjects} values={subjects} onChange={setSubjects} label="Subjects" />
        </div>
        <div className="md:col-span-2">
          <SearchableMultiSelect options={opts.ccas} values={ccas} onChange={setCcas} label="CCAs" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onSave}>Save</Button>
        {saved && <span className="text-sm text-green-700">Saved!</span>}
        {error && <span className="text-sm text-red-700">Error: {error}</span>}
      </div>
    </Card>
  );
};