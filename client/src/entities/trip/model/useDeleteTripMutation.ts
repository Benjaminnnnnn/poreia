import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppAuth } from "@/entities/auth/model/AuthProvider";
import { deleteTrip } from "@/entities/trip/api/tripsService";
import type { TripSession } from "@/shared/types";
import { tripQueryKeys } from "./tripQueryKeys";

export function useDeleteTripMutation() {
  const {
    state: { authUser },
  } = useAppAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tripId: string) => deleteTrip(authUser, tripId),
    onMutate: async (tripId) => {
      await queryClient.cancelQueries({ queryKey: tripQueryKeys.lists() });
      const snapshot = queryClient.getQueryData<TripSession[]>(
        tripQueryKeys.lists(),
      );
      queryClient.setQueryData<TripSession[]>(
        tripQueryKeys.lists(),
        (trips = []) => trips.filter((t) => t.id !== tripId),
      );
      return { snapshot };
    },
    onError: (_err, _tripId, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(tripQueryKeys.lists(), context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tripQueryKeys.lists() });
    },
  });
}
