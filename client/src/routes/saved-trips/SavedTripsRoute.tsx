import { useAppNavigation } from "@/app/navigation";
import SavedTripCard from "@/components/ui/SavedTripCard";
import Surface from "@/components/ui/Surface";
import { useTrips } from "@/features/trips/state/TripsContext";
import { hasFiniteCoordinates } from "@/lib/coordinates";
import {
  getActivityImage,
  type ResolvedActivityImage,
} from "@/services/activityImageService";
import type { Activity, TravelItinerary } from "@/types";
import React, { startTransition, useEffect, useMemo, useState } from "react";

const formatTripDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

/** Get representative activity for cover image **/
function getRepresentativeActivity(
  itinerary: TravelItinerary | null,
): Activity | undefined {
  return itinerary?.days
    .flatMap((day) => day.activities)
    .find((activity) => {
      return hasFiniteCoordinates(activity);
    });
}

/** Helper: extract stop count from itinerary */
const getTripStopCount = (itinerary: TravelItinerary | null) =>
  itinerary?.days.reduce((sum, day) => sum + day.activities.length, 0) ?? 0;

/** Helper: extract country from trip destination */
const getTripCountry = (trip: any) => {
  const destination = trip.currentItinerary?.destination;
  if (!destination) return "";

  // Extract last segment from destination (usually country)
  const parts = destination.trim().split(",");
  return parts[parts.length - 1]?.trim() || "";
};

/** Helper: format stop count label */
const formatStopCountLabel = (count: number) => {
  return `${count} ${count === 1 ? "stop" : "stops"}`;
};

const SavedTripsRoute: React.FC = () => {
  const {
    actions: { openTrip },
  } = useAppNavigation();
  const {
    actions: { deleteTrip },
    state: { isLoadingTrips, trips },
  } = useTrips();
  const [tripImages, setTripImages] = useState<
    Record<string, ResolvedActivityImage>
  >({});

  // Filter trips that need cover images loaded
  const tripsNeedingImages = useMemo(
    () =>
      trips.filter((trip) => {
        return (
          Boolean(trip.currentItinerary) &&
          Boolean(getRepresentativeActivity(trip.currentItinerary)) &&
          !tripImages[trip.id]
        );
      }),
    [trips, tripImages],
  );

  // Load cover images for trips
  useEffect(() => {
    let isCancelled = false;

    if (!tripsNeedingImages.length) {
      return;
    }

    void Promise.all(
      tripsNeedingImages.map(async (trip) => {
        const itinerary = trip.currentItinerary;
        const activity = getRepresentativeActivity(itinerary);
        if (!itinerary || !activity) {
          return null;
        }

        const image = await getActivityImage(activity, itinerary.destination);
        return image ? ([trip.id, image] as const) : null;
      }),
    ).then((results) => {
      if (isCancelled) {
        return;
      }

      const resolvedImages = results.filter(
        (result): result is readonly [string, ResolvedActivityImage] =>
          Boolean(result),
      );
      if (!resolvedImages.length) {
        return;
      }

      startTransition(() => {
        setTripImages((current) => {
          const next = { ...current };
          resolvedImages.forEach(([tripId, image]) => {
            next[tripId] = image;
          });
          return next;
        });
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [tripsNeedingImages]);

  return (
    <div className="relative h-full overflow-y-auto scrollbar-themed">
      {/* Background layer */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1563085463-3761d7041366?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Nature landscape"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/30" />
      </div>

      {/* Content layer */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-[4.5rem] pb-8 sm:px-6 sm:pt-[5rem] lg:px-8 lg:pt-[5.5rem]">
        <div className="mb-6">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white/60">
            Your itineraries
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-[1.1] tracking-tight text-white drop-shadow-lg sm:text-3xl">
            Saved trips
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/75 drop-shadow-sm sm:text-base">
            Keep multiple trips in progress and pick up where you left off.
          </p>
        </div>

        {isLoadingTrips ? (
          <Surface
            as="div"
            variant="dashed"
            radius="xl"
            className="px-5 py-10 text-center border border-white/10 bg-white/5 backdrop-blur-sm"
          >
            <p className="font-display text-[1.7rem] leading-none tracking-[-0.04em] text-white drop-shadow-lg">
              Loading your trips.
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/75 drop-shadow-sm">
              Pulling your saved itineraries.
            </p>
          </Surface>
        ) : trips.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trips.map((trip) => {
              const itinerary = trip.currentItinerary;
              const country = getTripCountry(trip);
              const coverImage = tripImages[trip.id]?.url;
              const stopCount = getTripStopCount(itinerary);

              return (
                <SavedTripCard
                  key={trip.id}
                  trip={trip}
                  coverImage={coverImage}
                  badgeText={country || "Saved trip"}
                  metadataLabel={`${itinerary?.totalDays ?? 0} day plan`}
                  metadataSecondary={`Updated ${formatTripDate(trip.updatedAt)}`}
                  stopCountLabel={formatStopCountLabel(stopCount)}
                  onOpen={() => openTrip(trip.id)}
                  onDelete={(event) => {
                    event.stopPropagation();
                    deleteTrip(trip.id);
                  }}
                  variant="full"
                />
              );
            })}
          </div>
        ) : (
          <Surface
            as="div"
            variant="dashed"
            radius="xl"
            className="px-5 py-10 text-center border border-white/10 bg-white/5 backdrop-blur-sm"
          >
            <p className="font-display text-[1.7rem] leading-none tracking-[-0.04em] text-white drop-shadow-lg">
              Your trip shelf is empty.
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/75 drop-shadow-sm">
              The first itinerary you generate will stay here so you can jump
              back in without reopening a menu.
            </p>
          </Surface>
        )}
      </div>
    </div>
  );
};

export default SavedTripsRoute;
