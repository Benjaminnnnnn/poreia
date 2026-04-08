import AppProviders from "@/app/providers";
import AppRouter from "@/app/router";
import AuthRoute from "@/features/auth/components/AuthRoute";
import { TripsProvider } from "@/features/trips/state/TripsContext";
import React from "react";

const AuthenticatedApp: React.FC = () => {
  return (
    <TripsProvider>
      <div className="min-h-0 flex-1">
        <AppRouter />
      </div>
    </TripsProvider>
  );
};

export default function App() {
  return (
    <AppProviders>
      <div className="app-summer relative h-[100dvh] w-full overflow-hidden bg-[rgb(248,245,240)] font-sans text-slate-900">
        <AuthRoute>
          <AuthenticatedApp />
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
    </AppProviders>
  );
}
