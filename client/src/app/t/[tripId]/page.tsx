"use client";

import { useAppAuth, useAppHeaderState } from "@/entities/auth/model/AuthProvider";
import TripCollaborationPanel from "./CollaborationPanel";
import { PageLoading } from "@/shared/ui/PageLoading";
import Button from "@/shared/ui/Button";
import { TripsProvider, useTrips } from "@/entities/trip/model/tripsContext";
import type { TravelItinerary } from "@/shared/types";
import RefineForm from "./RefineForm";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Lock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import React, {
  Suspense,
  lazy,
  use,
  useEffect,
  useState,
} from "react";

const ItineraryResult = lazy(() => import("@/entities/itinerary/ui/ItineraryView"));

type WorkspaceTab = "itinerary" | "notes";

function TripPageContent({ tripId }: { tripId: string }) {
  const router = useRouter();
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
      const timer = setTimeout(() => router.push("/"), 0);
      return () => clearTimeout(timer);
    }
  }, [router, isLoadingTrips, isRefining, trip]);

  useEffect(() => {
    setActiveWorkspaceTab("itinerary");
    setIsInvitePanelOpen(false);
  }, [tripId]);

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

      <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
        {!trip ? (
          <PageLoading className="h-full" label="Loading your trip…" />
        ) : trip.currentItinerary ? (
          <Suspense
            fallback={
              <PageLoading className="h-full" label="Loading itinerary workspace…" />
            }
          >
            <ItineraryResult
              headerActions={
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setIsInvitePanelOpen(true)}
                  className="min-h-[46px] px-3.5"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/20 text-primary-foreground">
                    {trip.visibility === "shared" ? (
                      <Globe size={14} />
                    ) : trip.permissions?.canManageMembers ? (
                      <Users size={14} />
                    ) : (
                      <Lock size={14} />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col items-start leading-none">
                    <span className="text-[0.82rem] font-semibold tracking-[-0.01em]">
                      Share
                    </span>
                    <span className="mt-1 text-[0.63rem] font-semibold uppercase tracking-[0.18em] opacity-80">
                      {trip.visibility === "shared"
                        ? "Public"
                        : `${trip.memberCount} with access`}
                    </span>
                  </span>
                </Button>
              }
              itinerary={trip.currentItinerary}
              onUpdate={handleManualItineraryUpdate}
              onWorkspaceTabChange={setActiveWorkspaceTab}
              className="h-full w-full bg-transparent shadow-none"
            />
          </Suspense>
        ) : (
          <PageLoading className="h-full" label="Planning your trip…" />
        )}
      </div>

      <AnimatePresence>
        {trip && activeWorkspaceTab === "itinerary" &&
        trip.permissions?.canEdit !== false ? (
          <motion.div
            key="refine-form"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <RefineForm
              inputValue={inputValue}
              isRefining={isRefining}
              onInputChange={setInputValue}
              onSubmit={handleRefine}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {trip && (
        <TripCollaborationPanel
          canManageMembers={trip.permissions?.canManageMembers ?? false}
          memberCount={trip.memberCount}
          onClose={() => setIsInvitePanelOpen(false)}
          open={isInvitePanelOpen}
          trip={trip}
        />
      )}
    </div>
  );
}

function AuthenticatedTripPage({ tripId }: { tripId: string }) {
  const {
    state: { authUser },
  } = useAppAuth();

  return (
    <TripsProvider user={authUser}>
      <TripPageContent tripId={tripId} />
    </TripsProvider>
  );
}

export default function TripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const { authUser, openAuthModal } = useAppHeaderState();
  const router = useRouter();

  useEffect(() => {
    if (!authUser) {
      openAuthModal();
      router.push("/");
    }
  }, [authUser, openAuthModal, router]);

  if (!authUser) {
    return null;
  }

  return <AuthenticatedTripPage tripId={tripId} />;
}
