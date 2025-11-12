import React from "react";
import { Heart } from "lucide-react";

export const HeartToggle: React.FC<{
  saved: boolean;
  onToggle: (e?: React.MouseEvent) => void;
  size?: number;
  className?: string;          // ← add
}> = ({ saved, onToggle, size = 20, className }) => {
  return (
    <button
      aria-label={saved ? "Unsave" : "Save"}
      onClick={(e) => { e.stopPropagation(); onToggle(e); }}
      className={`p-2 rounded-full hover:bg-muted/60 transition ${className || ""}`}  // ← forward
    >
      <Heart
        width={size}
        height={size}
        className={saved ? "fill-red-500" : "fill-transparent"}
      />
    </button>
  );
};
