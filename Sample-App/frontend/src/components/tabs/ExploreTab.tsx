// src/components/tabs/ExploreTab.tsx
import React, { useState, useEffect } from "react";
import { searchSchools, type School, getSchoolDetails } from "../../lib/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { useSavedSchools } from "../context/SavedSchoolsContext";
import { HeartToggle } from "../HeartToggle";

const SS_KEYS = {
  page: "explore.page",
  pageSize: "explore.pageSize",
  filters: "explore.filters",
  scroll: "explore.scrollY",
} as const;

interface ExploreTabProps {
  user: any;
  onViewDetails: (schoolName: string) => void;
  onRequireAuth: () => void;
}

type CutoffKey =
  | "POSTING GROUP 3 (EXPRESS)"
  | "POSTING GROUP 3 AFFILIATED"
  | "POSTING GROUP 2 (NORMAL ACAD)"
  | "POSTING GROUP 2 AFFILIATED"
  | "POSTING GROUP 1 (NORMAL TECH)"
  | "POSTING GROUP 1 AFFILIATED";

const LABELS: Record<CutoffKey, string> = {
  "POSTING GROUP 3 (EXPRESS)": "PG3 (Express)",
  "POSTING GROUP 3 AFFILIATED": "PG3 Affiliated",
  "POSTING GROUP 2 (NORMAL ACAD)": "PG2 (Normal Acad)",
  "POSTING GROUP 2 AFFILIATED": "PG2 Affiliated",
  "POSTING GROUP 1 (NORMAL TECH)": "PG1 (Normal Tech)",
  "POSTING GROUP 1 AFFILIATED": "PG1 Affiliated",
};

const CUTOFF_ORDER: CutoffKey[] = [
  "POSTING GROUP 3 (EXPRESS)",
  "POSTING GROUP 3 AFFILIATED",
  "POSTING GROUP 2 (NORMAL ACAD)",
  "POSTING GROUP 2 AFFILIATED",
  "POSTING GROUP 1 (NORMAL TECH)",
  "POSTING GROUP 1 AFFILIATED",
];

const isNA = (v?: string | null) => {
  if (!v) return true;
  const s = String(v).trim().toUpperCase();
  return s === "N/A" || s === "NA" || s === "-" || s === "";
};

function formatCutoffLine(
  cutoff_points?: Partial<Record<CutoffKey, string>> | null,
  level?: string
): string | null {
  if (!cutoff_points || level === "PRIMARY") return null;
  const parts: string[] = [];
  for (const k of CUTOFF_ORDER) {
    const v = cutoff_points[k];
    if (!isNA(v)) parts.push(`${LABELS[k]}: ${v}`);
  }
  return parts.length ? parts.join(" | ") : null;
}

type SearchFilters = {
  q?: string;
  level?: string;
  zone?: string;
  limit: number;
  offset: number;
};

export const ExploreTab: React.FC<ExploreTabProps> = ({
  user,
  onViewDetails,
  onRequireAuth,
}) => {
  const [items, setItems] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ q: "", level: "", zone: "" });

  // NEW: lightweight cache of details by school name
  const [detailsCache, setDetailsCache] = useState<
    Record<
      string,
      {
        cutoff_points?: Partial<Record<CutoffKey, string>> | null;
        fetched?: boolean;
      }
    >
  >({});

  const { savedSchools, addSchool, removeSchool } = useSavedSchools();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Restore once
  useEffect(() => {
    const savedPage = Number(sessionStorage.getItem(SS_KEYS.page) || "0") || 1;
    const savedPageSize = Number(sessionStorage.getItem(SS_KEYS.pageSize) || "0");
    const savedFilters = sessionStorage.getItem(SS_KEYS.filters);
    if (savedPageSize && savedPageSize !== pageSize) setPageSize(savedPageSize);
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch {}
    }
    handleSearch(savedPage || page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-filter on level/zone/pageSize change
  useEffect(() => {
    handleSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.level, filters.zone, pageSize]);

  // Restore scroll when results arrive
  useEffect(() => {
    if (!loading && items.length > 0) {
      const y = Number(sessionStorage.getItem(SS_KEYS.scroll) || "0");
      if (y > 0) {
        setTimeout(
          () => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }),
          0
        );
        sessionStorage.removeItem(SS_KEYS.scroll);
      }
    }
  }, [loading, items]);

  // NEW: after we load a page of items, fetch their details (cutoffs) in the background
  useEffect(() => {
    if (!items.length) return;

    const toFetch = items
      .map((s) => s.school_name)
      .filter((name) => name && !detailsCache[name]?.fetched);

    if (!toFetch.length) return;

    let cancelled = false;

    (async () => {
      // limit concurrency a little
      const batch = async (names: string[]) => {
        await Promise.all(
          names.map(async (n) => {
            try {
              const d = await getSchoolDetails(n);
              if (cancelled) return;
              setDetailsCache((prev) => ({
                ...prev,
                [n]: { cutoff_points: d?.cutoff_points ?? null, fetched: true },
              }));
            } catch {
              if (cancelled) return;
              setDetailsCache((prev) => ({ ...prev, [n]: { fetched: true } }));
            }
          })
        );
      };

      // chunk by 8
      for (let i = 0; i < toFetch.length && !cancelled; i += 8) {
        await batch(toFetch.slice(i, i + 8));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, detailsCache]);

  const handleSearch = async (newPage = 1) => {
    try {
      setLoading(true);

      const clean: SearchFilters = {
        limit: pageSize,
        offset: (newPage - 1) * pageSize,
      };
      if (filters.q.trim()) clean.q = filters.q;
      if (filters.level) clean.level = filters.level;
      if (filters.zone) clean.zone = filters.zone;

      const resp = await searchSchools(clean);
      setItems(resp.items || []);
      setTotal(resp.total || 0);
      setPage(newPage);

      sessionStorage.setItem(SS_KEYS.page, String(newPage));
      sessionStorage.setItem(SS_KEYS.pageSize, String(pageSize));
      sessionStorage.setItem(SS_KEYS.filters, JSON.stringify(filters));
    } catch (e) {
      console.error("Search failed:", e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFilters({ q: "", level: "", zone: "" });
    handleSearch(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch(1);
  };

  const handlePageChange = (newPage: number) => handleSearch(newPage);

  function renderPageButtons() {
    const buttons: React.ReactNode[] = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      buttons.push(
        <Button key={1} variant="outline" onClick={() => handlePageChange(1)}>
          1
        </Button>
      );
      if (startPage > 2) buttons.push(<span key="e1" className="px-2">…</span>);
    }

    for (let p = startPage; p <= endPage; p++) {
      buttons.push(
        <Button
          key={p}
          variant={p === page ? "default" : "outline"}
          onClick={() => handlePageChange(p)}
        >
          {p}
        </Button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) buttons.push(<span key="e2" className="px-2">…</span>);
      buttons.push(
        <Button
          key={totalPages}
          variant="outline"
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Button>
      );
    }

    return buttons;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Explore Schools</h2>
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading..." : `${total} schools found`}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="School name or location..."
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              onKeyPress={handleKeyPress}
              className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="w-40">
            <label className="block text-sm font-medium mb-1">Level</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
            >
              <option value="">All Levels</option>
              <option value="PRIMARY">Primary</option>
              <option value="SECONDARY">Secondary</option>
              <option value="Junior College">Junior College</option>
              <option value="MIXED LEVELS">Mixed</option>
            </select>
          </div>

          <div className="w-40">
            <label className="block text-sm font-medium mb-1">Zone</label>
            <select
              value={filters.zone}
              onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
              className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
            >
              <option value="">All Zones</option>
              <option value="NORTH">North</option>
              <option value="SOUTH">South</option>
              <option value="EAST">East</option>
              <option value="WEST">West</option>
              <option value="CENTRAL">Central</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => handleSearch(1)}>Search</Button>
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground">
        {loading
          ? "Loading..."
          : `Showing ${items.length} schools on page ${page} of ${totalPages}`}
      </div>

      {/* Cards */}
      <div>
        {loading ? (
          <div className="text-center py-8">Loading schools...</div>
        ) : items.length ? (
          <div className="grid gap-4">
            {items.map((school: any, idx: number) => {
              const name = school.school_name;
              const isSaved = savedSchools.some((s) => s.school_name === name);

              // read cached cutoffs and build one-line string
              const cutoff_points = detailsCache[name]?.cutoff_points;
              const cutLine = formatCutoffLine(cutoff_points, school.mainlevel_code);

              return (
                <Card
                  key={`${name}-${idx}`}
                  className="p-4 hover:shadow-md transition cursor-pointer hover:border-primary/50 relative"
                  onClick={() => {
                    sessionStorage.setItem(SS_KEYS.scroll, String(window.scrollY));
                    onViewDetails(name);
                  }}
                >
                  <div className="absolute top-2 right-2">
                    <HeartToggle
                      saved={isSaved}
                      onToggle={(e) => {
                        e?.stopPropagation?.();
                        if (!user) {
                          onRequireAuth();
                          return;
                        }
                        isSaved
                          ? removeSchool(name)
                          : addSchool({
                              school_name: name,
                              address: school.address,
                              mainlevel_code: school.mainlevel_code,
                              zone_code: school.zone_code,
                              // keep space for later: you could also save a summarized cutoff here if desired
                            });
                      }}
                    />
                  </div>

                  <h3 className="font-semibold text-lg">{name}</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {school.address}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {school.mainlevel_code && (
                      <Badge variant="secondary">{school.mainlevel_code}</Badge>
                    )}
                    {school.zone_code && (
                      <Badge variant="outline">{school.zone_code}</Badge>
                    )}
                  </div>

                  {/* NEW: one-line cutoffs */}
                  {cutLine && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Cut-offs: {cutLine}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <div className="text-muted-foreground space-y-2">
              <p>No schools found matching your criteria</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Previous
          </Button>

          {(() => {
            const buttons: React.ReactNode[] = [];
            const maxVisiblePages = 5;
            let startPage = Math.max(1, page - 2);
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            if (endPage - startPage + 1 < maxVisiblePages) {
              startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            if (startPage > 1) {
              buttons.push(
                <Button key={1} variant="outline" onClick={() => handlePageChange(1)}>
                  1
                </Button>
              );
              if (startPage > 2) buttons.push(<span key="e1" className="px-2">…</span>);
            }
            for (let p = startPage; p <= endPage; p++) {
              buttons.push(
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </Button>
              );
            }
            if (endPage < totalPages) {
              if (endPage < totalPages - 1) buttons.push(<span key="e2" className="px-2">…</span>);
              buttons.push(
                <Button
                  key={totalPages}
                  variant="outline"
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              );
            }
            return buttons;
          })()}
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
