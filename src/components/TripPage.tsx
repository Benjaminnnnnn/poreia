import { LayoutList, Loader2, SendHorizontal, Sparkles } from "lucide-react";
import React, { Suspense, lazy, useEffect, useState } from "react";
import { useAppNavigation } from "../context/AppNavigation";
import { useTrips } from "../context/TripsContext";
import { TravelItinerary } from "../types";
import Button from "./ui/Button";
import Surface from "./ui/Surface";

const ItineraryResult = lazy(() => import("./ItineraryResult"));

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

interface TripPageProps {
  tripId: string;
}

const TripPage: React.FC<TripPageProps> = ({ tripId }) => {
  const {
    actions: { goHome },
  } = useAppNavigation();
  const {
    actions: { refineTrip, updateTrip },
    meta: { getTripById, isRefiningTrip },
  } = useTrips();
  const trip = getTripById(tripId);
  const isRefining = isRefiningTrip(tripId);
  const [inputValue, setInputValue] = useState("");
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<WorkspaceTab>("itinerary");

  useEffect(() => {
    if (!trip && !isRefining) {
      const timer = setTimeout(() => goHome(), 0);
      return () => clearTimeout(timer);
    }
  }, [goHome, isRefining, trip]);

  useEffect(() => {
    setActiveWorkspaceTab("itinerary");
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
    updateTrip({
      ...trip,
      currentItinerary: newItinerary,
      updatedAt: Date.now(),
    });
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

      {activeWorkspaceTab === "itinerary" ? (
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center px-3 md:bottom-5 md:px-4">
          <div className="pointer-events-auto w-full max-w-full md:max-w-2xl">
            <form onSubmit={handleRefine} className="group relative">
              <div className="absolute inset-0 rounded-[0.7rem] border border-[rgba(228,215,201,0.95)] bg-[rgba(255,250,245,0.97)] shadow-[0_14px_36px_rgba(108,62,26,0.12)]" />
              <div className="relative flex items-center p-1.5">
                <div className="pl-2.5 pr-2 text-[rgba(217,102,58,0.92)]">
                  {isRefining ? (
                    <Sparkles className="animate-spin-slow" size={18} />
                  ) : (
                    <LayoutList size={18} />
                  )}
                </div>
                <label htmlFor="trip-refine-input" className="sr-only">
                  Refine your itinerary
                </label>
                <input
                  id="trip-refine-input"
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Refine this trip (e.g., 'Add a dinner spot on Day 2')"
                  className="field-focus h-11 w-full rounded-[0.45rem] border border-transparent bg-transparent px-1 text-sm font-medium text-[rgba(74,43,26,0.96)] placeholder:text-[rgba(118,77,54,0.58)] md:text-base"
                  disabled={isRefining}
                />
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isRefining}
                  size="icon"
                  aria-label="Refine itinerary"
                  className="border-[rgba(214,98,54,0.2)] p-2 disabled:opacity-50"
                >
                  <SendHorizontal size={16} />
                </Button>
              </div>
              {isRefining ? (
                <div className="animate-progress absolute bottom-0 left-2 right-2 h-[2px] bg-[rgba(230,106,63,0.72)]" />
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TripPage;
