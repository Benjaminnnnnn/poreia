import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAppAuth } from "@/features/auth/components/AppAuthShell";
import {
  createTrip as createTripRequest,
  deleteTrip as deleteTripRequest,
  getTripDetail,
  listTrips,
  refineTrip as refineTripRequest,
  replaceTripItinerary,
} from "@/features/trips/services/tripsService";
import type { TripSession, TravelItinerary, TripSummaryResponse } from "@/types";

interface TripsContextValue {
  actions: {
    createTrip: (prompt: string) => Promise<TripSession | null>;
    deleteTrip: (tripId: string) => Promise<void>;
    refreshTrip: (tripId: string) => Promise<void>;
    refineTrip: (tripId: string, prompt: string) => Promise<void>;
    syncTripSummary: (summary: TripSummaryResponse) => void;
    updateTripItinerary: (
      tripId: string,
      itinerary: TravelItinerary,
    ) => Promise<void>;
  };
  meta: {
    getTripById: (tripId: string) => TripSession | undefined;
    isRefiningTrip: (tripId: string) => boolean;
  };
  state: {
    isCreatingTrip: boolean;
    isLoadingTrips: boolean;
    refiningTripId: string | null;
    trips: TripSession[];
  };
}

const TripsContext = createContext<TripsContextValue | null>(null);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

function mergeTrip(current: TripSession | undefined, incoming: TripSession): TripSession {
  if (!current) {
    return incoming;
  }

  return {
    ...current,
    ...incoming,
    currentItinerary: incoming.currentItinerary ?? current.currentItinerary,
    messages: incoming.messages.length ? incoming.messages : current.messages,
    permissions: incoming.permissions ?? current.permissions,
  };
}

function upsertTripCollection(
  currentTrips: TripSession[],
  incomingTrips: TripSession[],
): TripSession[] {
  const tripMap = new Map(currentTrips.map((trip) => [trip.id, trip]));

  incomingTrips.forEach((trip) => {
    tripMap.set(trip.id, mergeTrip(tripMap.get(trip.id), trip));
  });

  return [...tripMap.values()].sort(
    (left, right) =>
      Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );
}

function applyItineraryToTrip(
  trip: TripSession,
  itinerary: TravelItinerary,
): TripSession {
  return {
    ...trip,
    title: itinerary.title,
    destination: itinerary.destination,
    overview: itinerary.overview,
    totalDays: itinerary.totalDays,
    totalBudget: itinerary.totalBudget,
    currency: itinerary.currency,
    currentItinerary: itinerary,
    updatedAt: new Date().toISOString(),
  };
}

export const TripsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const {
    state: { authUser },
  } = useAppAuth();
  const [trips, setTrips] = useState<TripSession[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [refiningTripId, setRefiningTripId] = useState<string | null>(null);
  const tripsRef = useRef<TripSession[]>([]);
  const tripOperationChainsRef = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    tripsRef.current = trips;
  }, [trips]);

  const replaceTrips = useCallback((incomingTrips: TripSession[]) => {
    setTrips((currentTrips) => upsertTripCollection(currentTrips, incomingTrips));
  }, []);

  const replaceTrip = useCallback((incomingTrip: TripSession) => {
    replaceTrips([incomingTrip]);
  }, [replaceTrips]);

  const syncTripSummary = useCallback((summary: TripSummaryResponse) => {
    setTrips((currentTrips) =>
      currentTrips.map((currentTrip) =>
        currentTrip.id === summary.id
          ? {
              ...currentTrip,
              ...summary,
            }
          : currentTrip,
      ),
    );
  }, []);

  const getTripById = useCallback(
    (tripId: string) => trips.find((trip) => trip.id === tripId),
    [trips],
  );

  const getTripByIdFromRef = useCallback((tripId: string) => {
    return tripsRef.current.find((trip) => trip.id === tripId);
  }, []);

  const queueTripOperation = useCallback(
    (tripId: string, operation: () => Promise<void>) => {
      const previousOperation =
        tripOperationChainsRef.current.get(tripId) ?? Promise.resolve();
      const nextOperation = previousOperation
        .catch(() => undefined)
        .then(operation);

      tripOperationChainsRef.current.set(tripId, nextOperation);
      void nextOperation.finally(() => {
        if (tripOperationChainsRef.current.get(tripId) === nextOperation) {
          tripOperationChainsRef.current.delete(tripId);
        }
      });

      return nextOperation;
    },
    [],
  );

  useEffect(() => {
    let isCancelled = false;

    setTrips([]);
    setIsLoadingTrips(true);
    setIsCreatingTrip(false);
    setRefiningTripId(null);
    tripOperationChainsRef.current.clear();

    void (async () => {
      try {
        const listedTrips = await listTrips(authUser);
        if (isCancelled) {
          return;
        }

        replaceTrips(listedTrips);

        if (!listedTrips.length) {
          return;
        }

        const detailResults = await Promise.allSettled(
          listedTrips.map((trip) => getTripDetail(authUser, trip.id)),
        );

        if (isCancelled) {
          return;
        }

        const detailedTrips = detailResults.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );

        if (detailedTrips.length) {
          replaceTrips(detailedTrips);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!isCancelled) {
          setIsLoadingTrips(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [authUser, replaceTrips]);

  const createTrip = useCallback(
    async (prompt: string) => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt || isCreatingTrip) {
        return null;
      }

      setIsCreatingTrip(true);

      try {
        const createdTrip = await createTripRequest(authUser, trimmedPrompt);
        replaceTrip(createdTrip);
        return createdTrip;
      } catch (error) {
        console.error(error);
        alert(getErrorMessage(error, "Failed to plan trip. Please try again."));
        return null;
      } finally {
        setIsCreatingTrip(false);
      }
    },
    [authUser, isCreatingTrip, replaceTrip],
  );

  const deleteTrip = useCallback(
    async (tripId: string) => {
      const trip = getTripByIdFromRef(tripId);
      if (!trip) {
        return;
      }

      try {
        await queueTripOperation(tripId, async () => {
          await deleteTripRequest(authUser, tripId);
          setTrips((currentTrips) =>
            currentTrips.filter((currentTrip) => currentTrip.id !== tripId),
          );
        });
      } catch (error) {
        console.error(error);
        alert(getErrorMessage(error, "Failed to delete trip."));
      }
    },
    [authUser, getTripByIdFromRef, queueTripOperation],
  );

  const refreshTrip = useCallback(
    async (tripId: string) => {
      const trip = getTripByIdFromRef(tripId);
      if (!trip) {
        return;
      }

      try {
        const refreshedTrip = await getTripDetail(authUser, tripId);
        replaceTrip(refreshedTrip);
      } catch (error) {
        console.error(error);
        alert(getErrorMessage(error, "Failed to refresh trip details."));
      }
    },
    [authUser, getTripByIdFromRef, replaceTrip],
  );

  const refineTrip = useCallback(
    async (tripId: string, prompt: string) => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt || refiningTripId) {
        return;
      }

      const trip = getTripByIdFromRef(tripId);
      if (!trip) {
        return;
      }

      setRefiningTripId(tripId);

      try {
        await queueTripOperation(tripId, async () => {
          const currentTrip = getTripByIdFromRef(tripId);
          if (!currentTrip) {
            return;
          }

          const refinedTrip = await refineTripRequest(authUser, tripId, {
            expectedVersion: currentTrip.version,
            prompt: trimmedPrompt,
          });

          replaceTrip(refinedTrip);
        });
      } catch (error) {
        console.error(error);
        alert(getErrorMessage(error, "Failed to update itinerary."));
      } finally {
        setRefiningTripId((currentTripId) =>
          currentTripId === tripId ? null : currentTripId,
        );
      }
    },
    [authUser, getTripByIdFromRef, queueTripOperation, refiningTripId, replaceTrip],
  );

  const updateTripItinerary = useCallback(
    async (tripId: string, itinerary: TravelItinerary) => {
      const trip = getTripByIdFromRef(tripId);
      if (!trip) {
        return;
      }

      setTrips((currentTrips) =>
        currentTrips.map((currentTrip) =>
          currentTrip.id === tripId
            ? applyItineraryToTrip(currentTrip, itinerary)
            : currentTrip,
        ),
      );

      try {
        await queueTripOperation(tripId, async () => {
          const currentTrip = getTripByIdFromRef(tripId);
          if (!currentTrip) {
            return;
          }

          const updatedTrip = await replaceTripItinerary(authUser, tripId, {
            expectedVersion: currentTrip.version,
            itinerary,
          });

          replaceTrip(updatedTrip);
        });
      } catch (error) {
        console.error(error);

        try {
          const refreshedTrip = await getTripDetail(authUser, tripId);
          replaceTrip(refreshedTrip);
        } catch (refreshError) {
          console.error(refreshError);
        }

        alert(getErrorMessage(error, "Failed to save itinerary changes."));
      }
    },
    [authUser, getTripByIdFromRef, queueTripOperation, replaceTrip],
  );

  const meta = useMemo<TripsContextValue["meta"]>(
    () => ({
      getTripById,
      isRefiningTrip: (tripId: string) => refiningTripId === tripId,
    }),
    [getTripById, refiningTripId],
  );

  const actions = useMemo<TripsContextValue["actions"]>(
    () => ({
      createTrip,
      deleteTrip,
      refreshTrip,
      refineTrip,
      syncTripSummary,
      updateTripItinerary,
    }),
    [createTrip, deleteTrip, refreshTrip, refineTrip, syncTripSummary, updateTripItinerary],
  );

  const state = useMemo<TripsContextValue["state"]>(
    () => ({
      isCreatingTrip,
      isLoadingTrips,
      refiningTripId,
      trips,
    }),
    [isCreatingTrip, isLoadingTrips, refiningTripId, trips],
  );

  const value = useMemo<TripsContextValue>(
    () => ({
      actions,
      meta,
      state,
    }),
    [actions, meta, state],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
};

export const useTrips = () => {
  const context = use(TripsContext);

  if (!context) {
    throw new Error("useTrips must be used within TripsProvider.");
  }

  return context;
};
