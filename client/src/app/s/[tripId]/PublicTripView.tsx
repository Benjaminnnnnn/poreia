"use client";

import { PageLoading } from "@/shared/ui/PageLoading";
import type { PublicTripResponse } from "@/shared/types";
import React, { Suspense, lazy, useEffect, useState } from "react";

const ItineraryResult = lazy(() => import("@/entities/itinerary/ui/ItineraryView"));

interface PublicTripViewProps {
  tripId: string;
}

type FetchState =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error" }
  | { status: "ok"; trip: PublicTripResponse };

const PublicTripView: React.FC<PublicTripViewProps> = ({ tripId }) => {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });
    fetch(`/api/v1/share/${tripId}`)
      .then(async (res) => {
        if (res.status === 404) {
          setState({ status: "not_found" });
          return;
        }
        if (!res.ok) {
          setState({ status: "error" });
          return;
        }
        const body = (await res.json()) as { data: PublicTripResponse };
        setState({ status: "ok", trip: body.data });
      })
      .catch(() => setState({ status: "error" }));
  }, [tripId]);

  const itinerary =
    state.status === "ok"
      ? {
          destination: state.trip.destination,
          title: state.trip.title,
          totalDays: state.trip.totalDays,
          totalBudget: state.trip.totalBudget,
          currency: state.trip.currency,
          overview: state.trip.overview,
          days: state.trip.days,
          budgetBreakdown: state.trip.budgetBreakdown,
        }
      : null;

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
        {state.status === "loading" ? (
          <PageLoading className="h-full" label="Loading itinerary…" />
        ) : state.status === "not_found" ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-2xl border border-white/10 bg-black/60 px-8 py-6 text-center backdrop-blur-sm">
              <p className="text-lg font-semibold text-white">Trip not found</p>
              <p className="mt-2 text-sm text-white/60">
                This link may be private or no longer available.
              </p>
            </div>
          </div>
        ) : state.status === "error" ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-2xl border border-white/10 bg-black/60 px-8 py-6 text-center backdrop-blur-sm">
              <p className="text-lg font-semibold text-white">
                Something went wrong
              </p>
              <p className="mt-2 text-sm text-white/60">
                Could not load this itinerary. Please try again.
              </p>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <PageLoading className="h-full" label="Loading itinerary…" />
            }
          >
            <ItineraryResult
              itinerary={itinerary!}
              className="h-full w-full bg-transparent shadow-none"
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default PublicTripView;
