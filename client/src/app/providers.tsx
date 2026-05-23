"use client";

import React from "react";
import { TooltipProvider } from "@/components/ui/Tooltip";
import AuthRoute from "@/app/auth";

const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <TooltipProvider>
      <div className="app-summer relative h-[100dvh] w-full overflow-hidden bg-[rgb(248,245,240)] font-sans text-slate-900">
        <AuthRoute>
          <div className="min-h-0 flex-1">{children}</div>
        </AuthRoute>
        <style>{`
          .animate-spin-slow {
            animation: spin 3s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
};

export default AppProviders;
