import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "solid" | "secondary"; // Add "secondary" here
}

export const Badge: React.FC<BadgeProps> = ({
  className = "",
  variant = "default",
  ...rest
}) => {
  const baseClasses = "inline-block rounded-full px-2 py-0.5 text-xs";
  
  const variantClasses = {
    default: "border border-indigo-200 bg-indigo-50 text-indigo-700",
    outline: "border border-gray-300 bg-transparent text-gray-700",
    solid: "border border-indigo-600 bg-indigo-600 text-white",
    secondary: "border border-gray-200 bg-gray-100 text-gray-700", // Add styles for secondary
  };
  
  return (
    <span 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`} 
      {...rest} 
    />
  );
};