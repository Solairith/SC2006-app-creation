import React, { useMemo, useState } from "react";
import { X } from "lucide-react";

type Props = {
  label?: string;
  placeholder?: string;
  options: string[];
  values: string[];
  onChange: (vals: string[]) => void;
};

export default function SearchableMultiSelect({ label, placeholder = "Type to filter…", options, values, onChange }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.toLowerCase().includes(q));
  }, [query, options]);

  const add = (opt: string) => {
    if (!values.some(v => v.toLowerCase() === opt.toLowerCase())) {
      onChange([...values, opt]);
      setQuery("");
    }
  };
  const remove = (opt: string) => {
    onChange(values.filter(v => v.toLowerCase() !== opt.toLowerCase()));
  };

  return (
    <div className="w-full">
      {label && <div className="mb-1 text-sm font-medium">{label}</div>}
      <div className="border rounded-2xl p-2">
        {values.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {values.map(v => (
              <span key={v} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm">
                {v}
                <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`} className="opacity-60 hover:opacity-100">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full outline-none bg-transparent px-1 py-1 text-sm"
        />
        <div className="max-h-48 overflow-auto mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
          {filtered.map((o) => {
            const active = values.some(v => v.toLowerCase() === o.toLowerCase());
            return (
              <button
                key={o}
                type="button"
                onClick={() => add(o)}
                disabled={active}
                className={
                  "text-left px-3 py-1 rounded-full border text-sm " +
                  (active ? "opacity-50 cursor-not-allowed" : "hover:bg-muted")
                }
                title={active ? "Already selected" : "Add"}
              >
                {o}
              </button>
            );
          })}
          {filtered.length === 0 && <div className="text-sm text-muted">No matches</div>}
        </div>
      </div>
    </div>
  );
}
