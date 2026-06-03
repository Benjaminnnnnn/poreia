import { useQuery } from "@tanstack/react-query";
import { useAppAuth } from "@/entities/auth/model/AuthProvider";
import {
  getTripDetail,
  listTrips,
} from "@/entities/trip/api/tripsService";
import type { TripSession } from "@/shared/types";
import { tripQueryKeys } from "./tripQueryKeys";

export function useTripsQuery() {
  const {
    state: { authUser },
  } = useAppAuth();

  return useQuery<TripSession[]>({
    queryKey: tripQueryKeys.lists(),
    queryFn: async () => {
      const summaries = await listTrips(authUser);
      if (!summaries.length) return summaries;

      const detailResults = await Promise.allSettled(
        summaries.map((trip) => getTripDetail(authUser, trip.id)),
      );

      const detailMap = new Map(
        detailResults
          .flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))
          .map((d) => [d.id, d]),
      );

      return summaries
        .map((s) => detailMap.get(s.id) ?? s)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    },
    staleTime: 5 * 60 * 1000,
  });
}
