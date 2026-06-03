import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppAuth } from "@/entities/auth/model/AuthProvider";
import { replaceTripItinerary } from "@/entities/trip/api/tripsService";
import type { TravelItinerary, TripSession } from "@/shared/types";
import { tripQueryKeys } from "./tripQueryKeys";

function applyItinerary(trip: TripSession, itinerary: TravelItinerary): TripSession {
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

export function useUpdateTripItineraryMutation() {
  const {
    state: { authUser },
  } = useAppAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tripId,
      itinerary,
    }: {
      tripId: string;
      itinerary: TravelItinerary;
    }) => {
      const trips =
        queryClient.getQueryData<TripSession[]>(tripQueryKeys.lists()) ?? [];
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) throw new Error("Trip not found");
      return replaceTripItinerary(authUser, tripId, {
        expectedVersion: trip.version,
        itinerary,
      });
    },
    onMutate: async ({ tripId, itinerary }) => {
      await queryClient.cancelQueries({ queryKey: tripQueryKeys.lists() });
      const snapshot = queryClient.getQueryData<TripSession[]>(
        tripQueryKeys.lists(),
      );
      queryClient.setQueryData<TripSession[]>(
        tripQueryKeys.lists(),
        (trips = []) =>
          trips.map((t) => (t.id === tripId ? applyItinerary(t, itinerary) : t)),
      );
      return { snapshot };
    },
    onSuccess: (updatedTrip) => {
      queryClient.setQueryData<TripSession[]>(
        tripQueryKeys.lists(),
        (trips = []) =>
          trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)),
      );
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(tripQueryKeys.lists(), context.snapshot);
      }
    },
  });
}
