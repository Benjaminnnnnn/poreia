import { Loader2 } from "lucide-react";
import React from "react";

interface PageLoadingProps {
  label?: string;
  className?: string;
}

export function PageLoading({
  label = "Loading…",
  className = "",
}: PageLoadingProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-8 py-6 shadow-xl backdrop-blur-xl">
        <Loader2 className="animate-spin text-[#D97757]" size={28} />
        <p className="text-sm font-medium text-white/80">{label}</p>
      </div>
    </div>
  );
}
