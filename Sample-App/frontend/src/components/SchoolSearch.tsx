import React, { useEffect, useState } from "react";
import { searchSchools, type School } from "../lib/api";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

export const SchoolSearch: React.FC<{
  user: any;
  onViewDetails: (schoolName: string) => void;
  onGoRecommendations: () => void;
  onRequireAuth: () => void;
}> = ({ user, onViewDetails, onGoRecommendations, onRequireAuth }) => {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [zone, setZone] = useState("");
  const [items, setItems] = useState<School[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function load(newPage = 1) {
    setLoading(true);
    const r = await searchSchools({ q, level, zone, limit, offset: (newPage - 1) * limit });
    setItems(r.items);
    setTotal(r.total);
    setPage(newPage);
    setLoading(false);
  }

  useEffect(() => { load(1); }, []);

  function renderPageButtons() {
    const arr = [];
    for (let p = 1; p <= totalPages; p++) {
      arr.push(
        <Button key={p} variant={p === page ? "default" : "outline"} onClick={() => load(p)}>
          {p}
        </Button>
      );
    }
    return arr;
  }

  const handleForYou = async () => {
    if (!user) { onRequireAuth(); return; }
    onGoRecommendations();
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row gap-2 items-center">
        <Input placeholder="Search Schools" value={q} onChange={(e) => setQ(e.target.value)}
	className="md:max-w-[560px] lg:max-w-[1040px]"/>

        <select className="border rounded px-2 py-2" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">Any level</option>
          <option value="PRIMARY">Primary</option>
          <option value="SECONDARY">Secondary</option>
        </select>
        <select className="border rounded px-2 py-2" value={zone} onChange={(e) => setZone(e.target.value)}>
          <option value="">Any zone</option>
          <option value="NORTH">North</option>
          <option value="SOUTH">South</option>
          <option value="EAST">East</option>
          <option value="WEST">West</option>
          <option value="CENTRAL">Central</option>
        </select>

        {/* Replaced "Any type" dropdown with "For you" button */}
        <Button onClick={handleForYou}>For you</Button>
        <Button variant="outline" onClick={() => load(1)}>Search</Button>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        {loading && <div>Loading…</div>}
        {!loading &&
          items.map((s) => {
            const name = s.school_name;
            const level = s.mainlevel_code;
            const zone = s.zone_code;
            const type = s.type_code;
            const addr = s.address;
            return (
              <div key={name} className="border rounded-xl p-3">
                <div className="text-lg font-medium flex items-center gap-2">
                  {name} {level && <Badge>{level}</Badge>}
                </div>
                <div className="text-sm text-muted">{addr}</div>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  {zone && <Badge variant="outline">{zone}</Badge>}
                  {type && <Badge variant="outline">{type}</Badge>}
                </div>
                <div className="mt-3">
                  <Button onClick={() => onViewDetails(name)}>Details</Button>
                </div>
              </div>
            );
          })}
      </div>

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
