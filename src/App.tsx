import React from "react";
import AppAuthShell from "./components/Auth";
import ProfilePage from "./components/ProfilePage";
import SearchOverlay from "./components/SearchOverlay";
import TripPage from "./components/TripPage";
import { useAppNavigation, AppNavigationProvider } from "./context/AppNavigation";
import { TripsProvider } from "./context/TripsContext";

const AppContent: React.FC = () => {
  const {
    state: { currentTripId, isProfilePage },
  } = useAppNavigation();

  return (
    <TripsProvider>
      <div className="min-h-0 flex-1">
        {currentTripId ? (
          <TripPage tripId={currentTripId} />
        ) : isProfilePage ? (
          <ProfilePage />
        ) : (
          <SearchOverlay />
        )}
      </div>
    </TripsProvider>
  );
};

export default function App() {
  return (
    <AppNavigationProvider>
      <div className="app-summer relative h-[100dvh] w-full overflow-hidden bg-[rgb(248,245,240)] font-sans text-slate-900">
        <AppAuthShell>
          <AppContent />
        </AppAuthShell>

        <style>{`
          @keyframes progress {
            0% { width: 0%; opacity: 1; }
            50% { width: 70%; }
            100% { width: 100%; opacity: 0; }
          }
          .animate-progress {
            animation: progress 2s ease-in-out infinite;
          }
          .animate-spin-slow {
            animation: spin 3s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </AppNavigationProvider>
  );
}
