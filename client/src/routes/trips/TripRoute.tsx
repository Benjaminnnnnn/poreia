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
  <Surface
    variant="glass"
    padding="none"
    radius="md"
    className={`flex items-center justify-center bg-[rgba(255,250,245,0.72)] ${className}`}
  >
    <div className="flex flex-col items-center gap-3 text-[rgba(92,58,36,0.96)]">
      <Loader2
        className="animate-spin text-[rgba(217,102,58,0.92)]"
        size={32}
      />
      <p className="font-medium">{label}</p>
    </div>
  </Surface>
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
      <div className="flex h-full min-h-0 items-center justify-center bg-[rgba(255,250,245,0.66)] backdrop-blur-xl">
        <Loader2
          className="animate-spin text-[rgba(217,102,58,0.92)]"
          size={32}
        />
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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[rgba(255,250,245,0.22)]">
      <div className="flex-1 min-h-0 overflow-hidden">
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
