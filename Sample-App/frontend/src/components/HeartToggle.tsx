
import React from "react";
import { Heart } from "lucide-react";

export const HeartToggle: React.FC<{
  saved: boolean;
  onToggle: () => void;
  size?: number;
}> = ({ saved, onToggle, size = 20 }) => {
  return (
    <button
      aria-label={saved ? "Unsave" : "Save"}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="p-2 rounded-full hover:bg-muted/60 transition"
    >
      <Heart
        width={size}
        height={size}
        className={saved ? "fill-red-500" : "fill-transparent"}
      />
    </button>
  );
};
