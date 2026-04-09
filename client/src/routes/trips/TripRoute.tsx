import { Loader2 } from "lucide-react";
import React, { Suspense, lazy, useEffect, useState } from "react";
import { useAppNavigation } from "@/app/navigation";
import TripCollaborationPanel from "@/features/trip-collaboration/components/TripCollaborationPanel";
import TripInviteButton from "@/features/trip-collaboration/components/TripInviteButton";
import { useTrips } from "@/features/trips/state/TripsContext";
import type { TravelItinerary } from "@/types";
import Surface from "@/components/ui/Surface";
import RefineForm from "@/routes/trips/components/RefineForm";

const ItineraryResult = lazy(() => import("@/components/ItineraryResult"));

type WorkspaceTab = "itinerary" | "notes";

interface SurfaceFallbackProps {
  className?: string;
  label: string;
}

const SurfaceFallback: React.FC<SurfaceFallbackProps> = ({
  className = "",
  label,
}) => (
  <div
    className={`flex items-center justify-center rounded-[0.7rem] border border-white/20 bg-white/10 backdrop-blur-xl ${className}`}
  >
    <div className="flex flex-col items-center gap-3 text-white">
      <Loader2 className="animate-spin text-[#D97757]" size={32} />
      <p className="font-medium">{label}</p>
    </div>
  </div>
);

interface TripRouteProps {
  tripId: string;
}

const TripRoute: React.FC<TripRouteProps> = ({ tripId }) => {
  const {
    actions: { goHome },
  } = useAppNavigation();
  const {
    actions: { refineTrip, updateTripItinerary },
    meta: { getTripById, isRefiningTrip },
    state: { isLoadingTrips },
  } = useTrips();
  const trip = getTripById(tripId);
  const isRefining = isRefiningTrip(tripId);
  const [inputValue, setInputValue] = useState("");
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<WorkspaceTab>("itinerary");
  const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);

  useEffect(() => {
    if (!trip && !isRefining && !isLoadingTrips) {
      const timer = setTimeout(() => goHome(), 0);
      return () => clearTimeout(timer);
    }
  }, [goHome, isLoadingTrips, isRefining, trip]);

  useEffect(() => {
    setActiveWorkspaceTab("itinerary");
    setIsInvitePanelOpen(false);
  }, [tripId]);

  if (!trip) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-black/60 backdrop-blur-xl">
        <Loader2 className="animate-spin text-[#D97757]" size={32} />
      </div>
    );
  }

  const handleManualItineraryUpdate = (newItinerary: TravelItinerary) => {
    void updateTripItinerary(tripId, newItinerary);
  };

  const handleRefine = async (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = inputValue.trim();
    if (!prompt || isRefining) {
      return;
    }

    setInputValue("");
    await refineTrip(tripId, prompt);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden pt-[4.5rem] sm:pt-[5rem]">
      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/45 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/25" />
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
        {trip.currentItinerary ? (
          <Suspense
            fallback={
              <SurfaceFallback
                className="h-full"
                label="Loading itinerary workspace..."
              />
            }
          >
            <ItineraryResult
              headerActions={
                trip.permissions?.canManageMembers ? (
                  <TripInviteButton
                    memberCount={trip.memberCount}
                    onClick={() => setIsInvitePanelOpen(true)}
                  />
                ) : null
              }
              itinerary={trip.currentItinerary}
              onUpdate={handleManualItineraryUpdate}
              onWorkspaceTabChange={setActiveWorkspaceTab}
              className="h-full w-full bg-transparent shadow-none"
            />
          </Suspense>
        ) : (
          <SurfaceFallback className="h-full" label="Planning your trip..." />
        )}
      </div>

      {activeWorkspaceTab === "itinerary" &&
      trip.permissions?.canEdit !== false ? (
        <RefineForm
          inputValue={inputValue}
          isRefining={isRefining}
          onInputChange={setInputValue}
          onSubmit={handleRefine}
        />
      ) : null}

      <TripCollaborationPanel
        canManageMembers={trip.permissions?.canManageMembers ?? false}
        memberCount={trip.memberCount}
        onClose={() => setIsInvitePanelOpen(false)}
        open={isInvitePanelOpen}
        tripId={tripId}
      />
    </div>
  );
};

export default TripRoute;
