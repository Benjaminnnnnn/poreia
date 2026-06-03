import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppAuth } from "@/entities/auth/model/AuthProvider";
import { refineTrip } from "@/entities/trip/api/tripsService";
import type { TripSession } from "@/shared/types";
import { tripQueryKeys } from "./tripQueryKeys";

export function useRefineTripMutation() {
  const {
    state: { authUser },
  } = useAppAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId, prompt }: { tripId: string; prompt: string }) => {
      const trips =
        queryClient.getQueryData<TripSession[]>(tripQueryKeys.lists()) ?? [];
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) throw new Error("Trip not found");
      return refineTrip(authUser, tripId, {
        expectedVersion: trip.version,
        prompt,
      });
    },
    onSuccess: (refinedTrip) => {
      queryClient.setQueryData<TripSession[]>(
        tripQueryKeys.lists(),
        (trips = []) =>
          trips.map((t) => (t.id === refinedTrip.id ? refinedTrip : t)),
      );
    },
  });
}
