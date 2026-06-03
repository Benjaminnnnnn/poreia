import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppAuth } from "@/entities/auth/model/AuthProvider";
import { createTrip } from "@/entities/trip/api/tripsService";
import type { TripSession } from "@/shared/types";
import { tripQueryKeys } from "./tripQueryKeys";

export function useCreateTripMutation() {
  const {
    state: { authUser },
  } = useAppAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prompt: string) => createTrip(authUser, prompt),
    onSuccess: (newTrip) => {
      queryClient.setQueryData<TripSession[]>(
        tripQueryKeys.lists(),
        (trips = []) =>
          [newTrip, ...trips.filter((t) => t.id !== newTrip.id)].sort(
            (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
          ),
      );
    },
  });
}
