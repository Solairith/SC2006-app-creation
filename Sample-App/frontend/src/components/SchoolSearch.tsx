// src/components/SchoolSearch.tsx
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
  const [pageSize, setPageSize] = useState(20); // Default to 20 schools per page
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function load(newPage = 1) {
    setLoading(true);
    const r = await searchSchools({ 
      q, 
      level, 
      zone, 
      limit: pageSize, 
      offset: (newPage - 1) * pageSize 
    });
    setItems(r.items);
    setTotal(r.total);
    setPage(newPage);
    setLoading(false);
  }

  useEffect(() => { 
    load(1); 
  }, [pageSize]); // Reload when page size changes

  function handleSearch() {
    load(1);
  }

  function handleClear() {
    setQ("");
    setLevel("");
    setZone("");
    // Don't reset pageSize, but reload with cleared filters
    load(1);
  }

  function renderPageButtons() {
    const buttons = [];
    const maxVisiblePages = 5; // Show max 5 page buttons
    
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
      buttons.push(
        <Button key={1} variant="outline" onClick={() => load(1)}>
          1
        </Button>
      );
      if (startPage > 2) {
        buttons.push(<span key="ellipsis1" className="px-2">...</span>);
      }
    }

    // Page numbers
    for (let p = startPage; p <= endPage; p++) {
      buttons.push(
        <Button key={p} variant={p === page ? "default" : "outline"} onClick={() => load(p)}>
          {p}
        </Button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="ellipsis2" className="px-2">...</span>);
      }
      buttons.push(
        <Button key={totalPages} variant="outline" onClick={() => load(totalPages)}>
          {totalPages}
        </Button>
      );
    }

    return buttons;
  }

  const handleForYou = async () => {
    if (!user) { onRequireAuth(); return; }
    onGoRecommendations();
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row gap-2 items-center">
        <Input 
          placeholder="Search Schools" 
          value={q} 
          onChange={(e) => setQ(e.target.value)}
          className="md:max-w-[560px] lg:max-w-[1040px]"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />

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
        </select>

        {/* Page size selector */}
        <select 
          className="border rounded px-2 py-2" 
          value={pageSize} 
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          <option value={20}>20 per page</option>
          <option value={40}>40 per page</option>
          <option value={60}>60 per page</option>
        </select>

        <Button onClick={handleForYou}>For you</Button>
        <Button variant="outline" onClick={handleSearch}>Search</Button>
        <Button variant="outline" onClick={handleClear}>Clear</Button>
      </div>

      {/* Results count */}
      <div className="mt-4 text-sm text-muted-foreground">
        {loading ? "Loading..." : `Showing ${items.length} of ${total} schools (Page ${page} of ${totalPages})`}
      </div>

      {/* Schools grid */}
      <div className="mt-4 grid md:grid-cols-2 gap-3">
        {loading && <div className="col-span-2 text-center py-8">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            No schools found matching your criteria
          </div>
        )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
          <Button 
            variant="outline" 
            disabled={page === 1} 
            onClick={() => load(page - 1)}
          >
            Previous
          </Button>
          
          {renderPageButtons()}
          
          <Button 
            variant="outline" 
            disabled={page === totalPages} 
            onClick={() => load(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  );
};