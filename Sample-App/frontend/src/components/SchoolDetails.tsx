import React, { useEffect, useState } from "react";
import { getSchoolDetails, type School } from "../lib/api";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface DetailedSchool extends School {
  ccas?: string[];
  subjects?: string[];
  telephone_no?: string;
  email_address?: string;
  url_address?: string;
}

export const SchoolDetails: React.FC<{
  schoolName: string;
  onBack: () => void;
}> = ({ schoolName, onBack }) => {
  const [school, setSchool] = useState<DetailedSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSchoolDetails(schoolName);
        setSchool(data);
      } catch (e: any) {
        setError("Failed to load school details");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [schoolName]);

  if (loading) return <Card className="p-6">Loading…</Card>;
  if (error) return <Card className="p-6 text-red-600">{error}</Card>;
  if (!school) return <Card className="p-6">School not found.</Card>;

  const name = school.school_name || school.name || "School";
  const level = school.mainlevel_code || "";
  const zone = school.zone_code || "";
  const type = school.type_code || "";
  const addr = school.address || "";

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold flex items-center gap-2">
          {name} {level && <Badge>{level}</Badge>}
        </div>
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
      </div>

      {/* Address + Zone/Type */}
      <div>
        <p className="text-muted">{addr}</p>
        <div className="flex gap-2 mt-2">
          {type && <Badge>{type}</Badge>}
          {zone && <Badge>{zone}</Badge>}
        </div>
      </div>

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

      {/* Subjects */}
      {school.subjects && school.subjects.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mt-6 mb-2">Subjects Offered</h3>
          <div className="flex flex-wrap gap-2">
            {school.subjects.map((subj, idx) => (
              <Badge key={idx} variant="secondary">
                {subj}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* CCAs */}
      {school.ccas && school.ccas.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mt-6 mb-2">
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
    </Card>
  );
};
