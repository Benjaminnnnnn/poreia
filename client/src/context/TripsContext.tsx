import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { useAppAuth } from "../components/Auth";
import { generateOrRefineItinerary } from "../services/itineraryService";
import { TripSession } from "../types";

const TRIPS_STORAGE_KEY = "poreia_trips";
const TRIPS_STORAGE_VERSION = 1;

interface PersistedTripsPayload {
  trips: TripSession[];
  version: number;
}

interface TripsContextValue {
  actions: {
    createTrip: (prompt: string) => Promise<TripSession | null>;
    deleteTrip: (tripId: string) => void;
    refineTrip: (tripId: string, prompt: string) => Promise<void>;
    updateTrip: (trip: TripSession) => void;
  };
  meta: {
    getTripById: (tripId: string) => TripSession | undefined;
    isRefiningTrip: (tripId: string) => boolean;
  };
  state: {
    isCreatingTrip: boolean;
    refiningTripId: string | null;
    trips: TripSession[];
  };
}

const TripsContext = createContext<TripsContextValue | null>(null);

const getTripsStorageKey = (userId: string) => `${TRIPS_STORAGE_KEY}:${userId}`;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const parseTripsPayload = (stored: string): TripSession[] => {
  const parsed = JSON.parse(stored) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as TripSession[];
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as PersistedTripsPayload).trips)
  ) {
    return (parsed as PersistedTripsPayload).trips;
  }

  return [];
};

const loadTrips = (userId: string | null): TripSession[] => {
  if (typeof window === "undefined" || !userId) {
    return [];
  }

  for (const storageKey of [getTripsStorageKey(userId), TRIPS_STORAGE_KEY]) {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        continue;
      }

      return parseTripsPayload(stored);
    } catch {
      continue;
    }
  }

  return [];
};

const saveTrips = (userId: string | null, trips: TripSession[]) => {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  const payload: PersistedTripsPayload = {
    version: TRIPS_STORAGE_VERSION,
    trips,
  };

  window.localStorage.setItem(
    getTripsStorageKey(userId),
    JSON.stringify(payload),
  );
};

export const TripsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const {
    state: { authUser },
  } = useAppAuth();
  const [trips, setTrips] = useState<TripSession[]>(() => loadTrips(authUser.uid));
  const [loadedTripsUserId, setLoadedTripsUserId] = useState(authUser.uid);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [refiningTripId, setRefiningTripId] = useState<string | null>(null);

  useEffect(() => {
    if (loadedTripsUserId === authUser.uid) {
      return;
    }

    setTrips(loadTrips(authUser.uid));
    setLoadedTripsUserId(authUser.uid);
    setIsCreatingTrip(false);
    setRefiningTripId(null);
  }, [authUser.uid, loadedTripsUserId]);

  useEffect(() => {
    if (loadedTripsUserId !== authUser.uid) {
      return;
    }

    saveTrips(authUser.uid, trips);
  }, [authUser.uid, loadedTripsUserId, trips]);

  const updateTripById = useCallback(
    (tripId: string, updater: (trip: TripSession) => TripSession) => {
      setTrips((currentTrips) =>
        currentTrips.map((trip) =>
          trip.id === tripId ? updater(trip) : trip,
        ),
      );
    },
    [],
  );

  const updateTrip = useCallback(
    (updatedTrip: TripSession) => {
      updateTripById(updatedTrip.id, () => updatedTrip);
    },
    [updateTripById],
  );

  const deleteTrip = useCallback((tripId: string) => {
    setTrips((currentTrips) =>
      currentTrips.filter((trip) => trip.id !== tripId),
    );
  }, []);

  const createTrip = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isCreatingTrip) {
        return null;
      }

      setIsCreatingTrip(true);
      const newId = uuidv4();
      const timestamp = Date.now();

      try {
        const itinerary = await generateOrRefineItinerary(prompt);

        const newTrip: TripSession = {
          id: newId,
          title: itinerary.destination || prompt,
          createdAt: timestamp,
          currentItinerary: itinerary,
          messages: [{ role: "user", text: prompt, timestamp }],
          updatedAt: timestamp,
        };

        setTrips((currentTrips) => [newTrip, ...currentTrips]);
        return newTrip;
      } catch (error) {
        console.error(error);
        alert(getErrorMessage(error, "Failed to plan trip. Please try again."));
        return null;
      } finally {
        setIsCreatingTrip(false);
      }
    },
    [isCreatingTrip],
  );

  const getTripById = useCallback(
    (tripId: string) => trips.find((trip) => trip.id === tripId),
    [trips],
  );

  const refineTrip = useCallback(
    async (tripId: string, prompt: string) => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt || refiningTripId) {
        return;
      }

      const trip = getTripById(tripId);
      if (!trip) {
        return;
      }

      const timestamp = Date.now();
      const updatedMessages = [
        ...trip.messages,
        {
          role: "user" as const,
          text: trimmedPrompt,
          timestamp,
        },
      ];

      updateTripById(tripId, (currentTrip) => ({
        ...currentTrip,
        messages: updatedMessages,
      }));
      setRefiningTripId(tripId);

      try {
        const newItinerary = await generateOrRefineItinerary(
          trimmedPrompt,
          updatedMessages,
          trip.currentItinerary,
        );

        updateTripById(tripId, (currentTrip) => ({
          ...currentTrip,
          currentItinerary: newItinerary,
          title: newItinerary.destination || currentTrip.title,
          updatedAt: Date.now(),
        }));
      } catch (error) {
        console.error(error);
        alert(getErrorMessage(error, "Failed to update itinerary."));
      } finally {
        setRefiningTripId((currentTripId) =>
          currentTripId === tripId ? null : currentTripId,
        );
      }
    },
    [getTripById, refiningTripId, updateTripById],
  );

  const meta = useMemo<TripsContextValue["meta"]>(
    () => ({
      getTripById,
      isRefiningTrip: (tripId: string) => refiningTripId === tripId,
    }),
    [getTripById, refiningTripId],
  );

  const state = useMemo<TripsContextValue["state"]>(
    () => ({
      isCreatingTrip,
      refiningTripId,
      trips,
    }),
    [isCreatingTrip, refiningTripId, trips],
  );

  const actions = useMemo<TripsContextValue["actions"]>(
    () => ({
      createTrip,
      deleteTrip,
      refineTrip,
      updateTrip,
    }),
    [createTrip, deleteTrip, refineTrip, updateTrip],
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
