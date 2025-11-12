import React, { useEffect, useState } from "react";
import { getSchoolDetails, type School } from "../lib/api";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { HeartToggle } from "./HeartToggle";
import { Badge } from "./ui/badge";
import { useSavedSchools } from "./context/SavedSchoolsContext";

interface DetailedSchool extends School {
  ccas?: string[];
  subjects?: string[];
  telephone_no?: string;
  email_address?: string;
  url_address?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  cutoff_points?: {
    "POSTING GROUP 3 (EXPRESS)"?: string;
    "POSTING GROUP 3 AFFILIATED"?: string;
    "POSTING GROUP 2 (NORMAL ACAD)"?: string;
    "POSTING GROUP 2 AFFILIATED"?: string;
    "POSTING GROUP 1 (NORMAL TECH)"?: string;
    "POSTING GROUP 1 AFFILIATED"?: string;
  } | null;
}

/** Build OneMap Advanced Mini-Map URL (postal or lat/lon). */
function buildOneMapMiniMapURL(opts: { postal?: string; lat?: number; lon?: number }) {
  const base = "https://www.onemap.gov.sg/amm/amm.html";
  const params = new URLSearchParams({
    mapStyle: "Default",
    zoomLevel: "16",
    popupWidth: "220",
  });

  if (opts.lat != null && opts.lon != null) {
    params.set("marker", `latlng:${opts.lat},${opts.lon}!colour:red`);
  } else if (opts.postal) {
    const p = String(opts.postal).trim();
    const six = p.replace(/\D/g, "").slice(0, 6);
    params.set("marker", `postalcode:${six}!colour:red`);
  }

  return `${base}?${params.toString()}`;
}

// ---------- Cutoff helpers ----------
const isNA = (v?: string | null) => {
  if (!v) return true;
  const s = String(v).trim().toUpperCase();
  return s === "N/A" || s === "NA" || s === "-" || s === "";
};

const cutoffItems = [
  { key: "POSTING GROUP 3 (EXPRESS)",     label: "PG3 (Express)" },
  { key: "POSTING GROUP 3 AFFILIATED",    label: "PG3 Affiliated" },
  { key: "POSTING GROUP 2 (NORMAL ACAD)", label: "PG2 (Normal Acad)" },
  { key: "POSTING GROUP 2 AFFILIATED",    label: "PG2 Affiliated" },
  { key: "POSTING GROUP 1 (NORMAL TECH)", label: "PG1 (Normal Tech)" },
  { key: "POSTING GROUP 1 AFFILIATED",    label: "PG1 Affiliated" },
] as const;

/** Extract a numeric value from a cutoff string like "22" or "22-24". */
function parseFirstNumber(s?: string | null): number | null {
  if (!s) return null;
  const m = String(s).match(/\d+/);
  return m ? Number(m[0]) : null;
}

/** Summarize a full cutoff map to a single representative number (min of all non-NA). */
function summarizeCutoffPrimary(cp?: DetailedSchool["cutoff_points"] | null): string | null {
  if (!cp) return null;
  const nums: number[] = [];
  for (const k of Object.keys(cp) as Array<keyof NonNullable<typeof cp>>) {
    const v = cp[k];
    if (!isNA(v)) {
      const n = parseFirstNumber(v);
      if (typeof n === "number" && !Number.isNaN(n)) nums.push(n);
    }
  }
  if (!nums.length) return null;
  return String(Math.min(...nums));
}

export const SchoolDetails: React.FC<{
  schoolName: string;
  onBack: () => void;
  user?: any;
  onRequireAuth?: () => void;
}> = ({ schoolName, onBack, user, onRequireAuth }) => {
  const [school, setSchool] = useState<DetailedSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addSchool, savedSchools, removeSchool } = useSavedSchools();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getSchoolDetails(schoolName);
        setSchool(data);
      } catch {
        setError("Failed to load school details");
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolName]);

  if (loading) return <Card className="p-6">Loading…</Card>;
  if (error) return <Card className="p-6 text-red-600">{error}</Card>;
  if (!school) return <Card className="p-6">School not found.</Card>;

  const name = school.school_name || "School";
  const level = school.mainlevel_code || "";
  const zone = school.zone_code || "";
  const type = school.type_code || "";
  const addr = school.address || "";
  const postal = school.postal_code || "";
  const isSaved = savedSchools.some((s) => s.school_name === name);

  const hasMap = Boolean(
    (school.latitude != null && school.longitude != null) || postal
  );

  // Build visible cutoff rows
  const cutoffRows =
    school.cutoff_points
      ? cutoffItems
          .map(({ key, label }) => ({
            label,
            value: school.cutoff_points![key as keyof NonNullable<DetailedSchool["cutoff_points"]>],
          }))
          .filter(({ value }) => !isNA(value))
      : [];

  const showCutoffs = level !== "PRIMARY" && cutoffRows.length > 0;

  // Single-line summary for saving (optional but useful)
  const cutoffPrimary = summarizeCutoffPrimary(school.cutoff_points);

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold flex items-center gap-2">
          {name} {level && <Badge>{level}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button onClick={onBack} variant="outline">
            Back
          </Button>
          <HeartToggle
            saved={isSaved}
            onToggle={(e) => {
              e?.stopPropagation?.();
              if (!user) {
                onRequireAuth?.();
                return;
              }
              if (isSaved) {
                removeSchool(name);
              } else {
                addSchool({
                  school_name: name,
                  address: addr,
                  mainlevel_code: level,
                  zone_code: zone,
                  cutoff_primary: cutoffPrimary ?? null,
                });
              }
            }}
          />
        </div>
      </div>

      {/* Address + Zone/Type */}
      <div>
        <p className="text-muted">{addr}</p>
        <div className="flex gap-2 mt-2">
          {type && <Badge>{type}</Badge>}
          {zone && <Badge>{zone}</Badge>}
        </div>
      </div>

      {/* Location Map */}
      {hasMap && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">Location Map</h3>
          <div className="rounded-xl overflow-hidden border">
            <iframe
              title="School location"
              src={buildOneMapMiniMapURL({
                postal,
                lat: school.latitude,
                lon: school.longitude,
              })}
              width="100%"
              height="420"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Source: OneMap (Singapore Land Authority)
          </p>
        </div>
      )}

      {/* Contact Info */}
      {(school.telephone_no || school.email_address || school.url_address) && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg mt-4">Contact Information</h3>
          {school.telephone_no && (
            <p>
              📞 <strong>Telephone:</strong> {school.telephone_no}
            </p>
          )}
          {school.email_address && (
            <p>
              ✉️ <strong>Email:</strong>{" "}
              <a
                href={`mailto:${school.email_address}`}
                className="text-blue-600 hover:underline"
              >
                {school.email_address}
              </a>
            </p>
          )}
          {school.url_address && (
            <p>
              🌐 <strong>Website:</strong>{" "}
              <a
                href={school.url_address}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {school.url_address}
              </a>
            </p>
          )}
        </div>
      )}

      {/* Cut-off Points (hide N/A; hide entirely for PRIMARY) */}
      {showCutoffs && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">Cut-off Points (2024)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-gray-700">
            {cutoffRows.map(({ label, value }) => (
              <p key={label}>
                <strong>{label}:</strong> {value}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Subjects + CCAs */}
      {(school.subjects?.length || school.ccas?.length) && (
        <div className="flex flex-col md:flex-row gap-6 mt-6">
          {school.subjects && school.subjects.length > 0 && (
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Subjects Offered</h3>
              <div className="flex flex-wrap gap-2">
                {school.subjects.map((subj, idx) => (
                  <Badge key={idx} variant="secondary">
                    {subj}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {school.ccas && school.ccas.length > 0 && (
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">
                Co-Curricular Activities (CCAs)
              </h3>
              <div className="flex flex-wrap gap-2">
                {school.ccas.map((cca, idx) => (
                  <Badge key={idx} variant="outline">
                    {cca}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
