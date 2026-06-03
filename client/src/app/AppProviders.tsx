"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/shared/ui/Tooltip";
import AuthRoute from "@/entities/auth/model/AuthProvider";
import { AppHeaderBar } from "@/widgets/AppHeader/ui/AppHeaderBar";

const queryClient = new QueryClient();

const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="app-summer relative h-[100dvh] w-full overflow-hidden bg-[rgb(248,245,240)] font-sans text-slate-900">
        <AuthRoute header={<AppHeaderBar />}>
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
    </QueryClientProvider>
  );
};

export default AppProviders;
