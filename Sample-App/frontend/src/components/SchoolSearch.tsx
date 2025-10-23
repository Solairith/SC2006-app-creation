import React, { useEffect, useState } from "react";
import { searchSchools, type School } from "../lib/api";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

// ✅ Change the prop type: we now pass a school name (string), not an index
export const SchoolSearch: React.FC<{ user: any; onViewDetails: (schoolName: string) => void }> = ({ onViewDetails }) => {
  // 🔹 Search filters
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [zone, setZone] = useState("");
  const [type, setType] = useState("");

  // 🔹 Data + pagination states
  const [items, setItems] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  async function load(pageNum = 1) {
    try {
      setError(null);
      setLoading(true);
      const offset = (pageNum - 1) * limit;

      const data = await searchSchools({ q, level, zone, type, offset, limit });
      setItems(data.items || []);
      setTotalPages(data.total_pages || 1);
      setPage(pageNum);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, [level, zone, type]);

  const handleSearch = () => load(1);

  // 🔹 Generate truncated pagination buttons
  const renderPageButtons = () => {
    const buttons = [];
    const windowSize = 2;
    let start = page - windowSize;
    let end = page + windowSize;

    if (start < 1) {
      end += 1 - start;
      start = 1;
    }
    if (end > totalPages) {
      start -= end - totalPages;
      end = totalPages;
    }
    start = Math.max(start, 1);

    if (start > 1) {
      buttons.push(
        <Button key={1} variant={page === 1 ? "default" : "outline"} onClick={() => load(1)}>
          1
        </Button>
      );
      if (start > 2) buttons.push(<span key="dots-left" className="px-2">…</span>);
    }

    for (let i = start; i <= end; i++) {
      buttons.push(
        <Button
          key={i}
          variant={page === i ? "default" : "outline"}
          onClick={() => load(i)}
        >
          {i}
        </Button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) buttons.push(<span key="dots-right" className="px-2">…</span>);
      buttons.push(
        <Button
          key={totalPages}
          variant={page === totalPages ? "default" : "outline"}
          onClick={() => load(totalPages)}
        >
          {totalPages}
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Card className="p-4 space-y-3">
      {/* 🔹 Search bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Search schools..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* 🔹 Filter dropdowns */}
      <div className="grid sm:grid-cols-3 gap-2">
        {/* (Filters same as before) */}
        <select className="border border-border rounded-lg px-2 py-2" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">Any level</option>
          <option value="PRIMARY">Primary</option>
          <option value="SECONDARY">Secondary</option>
          <option value="JUNIOR_COLLEGE">Junior College</option>
          <option value="POLYTECHNIC">Polytechnic</option>
          <option value="UNIVERSITY">University</option>
        </select>

        <select className="border border-border rounded-lg px-2 py-2" value={zone} onChange={(e) => setZone(e.target.value)}>
          <option value="">Any zone</option>
          <option value="NORTH">North</option>
          <option value="SOUTH">South</option>
          <option value="EAST">East</option>
          <option value="WEST">West</option>
          <option value="CENTRAL">Central</option>
        </select>

        <select className="border border-border rounded-lg px-2 py-2" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Any type</option>
          <option value="GOVERNMENT">Government</option>
          <option value="GOV_AIDED">Gov Aided</option>
          <option value="INDEPENDENT">Independent</option>
          <option value="SPECIALISED">Specialised</option>
        </select>
      </div>

      {/* 🔹 Results list */}
      <div className="grid gap-2">
        {error && <div className="text-red-600">{error}</div>}
        {loading && <div className="text-muted">Loading…</div>}
        {!loading && items.length === 0 && <div className="text-muted">No results.</div>}

        {items.map((s, idx) => {
          const name = s.school_name || s.name || "Unnamed School";
          const address = s.address || "";
          const lev = s.mainlevel_code || "";
          const z = s.zone_code || "";
          const t = s.type_code || "";

          return (
            <div key={idx} className="card p-3 flex gap-3 items-center">
              <img
                className="w-24 h-16 rounded-lg object-cover border border-border"
                src={`https://picsum.photos/seed/${encodeURIComponent(name)}/200/120`}
              />
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  {name} {lev && <Badge>{lev}</Badge>}
                </div>
                <div className="text-sm text-muted">{address}</div>
                <div className="flex gap-2 mt-1">
                  {t && <Badge>{t}</Badge>}
                  {z && <Badge>{z}</Badge>}
                </div>
              </div>

              {/* ✅ CHANGED: pass school name instead of index */}
              <Button onClick={() => onViewDetails(name)}>Details</Button>
            </div>
          );
        })}
      </div>

      {/* 🔹 Pagination controls (truncated version) */}
      <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
        <Button variant="outline" disabled={page === 1} onClick={() => load(page - 1)}>
          Previous
        </Button>

        {renderPageButtons()}

        <Button variant="outline" disabled={page === totalPages} onClick={() => load(page + 1)}>
          Next
        </Button>
      </div>
    </Card>
  );
};
