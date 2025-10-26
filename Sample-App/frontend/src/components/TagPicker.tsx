
import React from "react";

export const TagPicker: React.FC<{
  options: string[];
  values: string[];
  onChange: (vals: string[]) => void;
  label?: string;
}> = ({ options, values, onChange, label }) => {
  const toggle = (opt: string) => {
    const set = new Set(values.map(v => v.toLowerCase()));
    if (set.has(opt.toLowerCase())) {
      onChange(values.filter(v => v.toLowerCase() !== opt.toLowerCase()));
    } else {
      onChange([...values, opt]);
    }
  };
  return (
    <div className="mt-2">
      {label && <div className="text-sm mb-1 font-medium">{label}</div>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = values.some(v => v.toLowerCase() === o.toLowerCase());
          return (
            <button key={o} type="button"
              onClick={() => toggle(o)}
              className={"px-3 py-1 rounded-full border text-sm " + (active ? "bg-black text-white" : "bg-white")}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
};
