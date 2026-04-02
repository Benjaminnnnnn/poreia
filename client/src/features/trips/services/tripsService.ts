import type { User } from "firebase/auth";
import type {
  TripMessage,
  TripPermissions,
  TravelItinerary,
} from "@/types";
import type { TripSession } from "@/types";
import type {
  CreateTripRequest,
  RefineTripRequest,
  ReplaceTripItineraryRequest,
  TripDetailResponse,
  TripSummaryResponse,
} from "@poreia/shared";
import { ApiServiceError, apiRequest } from "@/services/apiService";

function toTripSession(
  summary: TripSummaryResponse,
  options: {
    currentItinerary?: TravelItinerary | null;
    messages?: TripMessage[];
    permissions?: TripPermissions;
  } = {},
): TripSession {
  return {
    ...summary,
    currentItinerary: options.currentItinerary ?? null,
    messages: options.messages ?? [],
    permissions: options.permissions,
  };
}

function fromTripDetail(detail: TripDetailResponse): TripSession {
  return toTripSession(detail.summary, {
    currentItinerary: detail.currentItinerary,
    messages: detail.recentMessages,
    permissions: detail.permissions,
  });
}

export async function listTrips(authUser: User): Promise<TripSession[]> {
  const params = new URLSearchParams({
    scope: "all",
    status: "all",
  });
  const summaries = await apiRequest<TripSummaryResponse[]>(authUser, {
    method: "GET",
    url: `/api/v1/trips?${params.toString()}`,
  });

  return summaries.map((summary) => toTripSession(summary));
}

export async function getTripDetail(
  authUser: User,
  tripId: string,
): Promise<TripSession> {
  const detail = await apiRequest<TripDetailResponse>(authUser, {
    method: "GET",
    url: `/api/v1/trips/${tripId}`,
  });

  return fromTripDetail(detail);
}

export async function createTrip(
  authUser: User,
  prompt: string,
): Promise<TripSession> {
  const request: CreateTripRequest = {
    clientRequestId: crypto.randomUUID(),
    prompt,
  };
  const detail = await apiRequest<TripDetailResponse>(authUser, {
    method: "POST",
    url: "/api/v1/trips",
    data: request,
  });

  return fromTripDetail(detail);
}

export async function refineTrip(
  authUser: User,
  tripId: string,
  input: {
    expectedVersion: number;
    prompt: string;
  },
): Promise<TripSession> {
  const request: RefineTripRequest = {
    clientRequestId: crypto.randomUUID(),
    ...input,
  };
  const detail = await apiRequest<TripDetailResponse>(authUser, {
    method: "POST",
    url: `/api/v1/trips/${tripId}/refinements`,
    data: request,
  });

  return fromTripDetail(detail);
}

export async function replaceTripItinerary(
  authUser: User,
  tripId: string,
  input: {
    expectedVersion: number;
    itinerary: TravelItinerary;
  },
): Promise<TripSession> {
  const request: ReplaceTripItineraryRequest = input;
  const detail = await apiRequest<TripDetailResponse>(authUser, {
    method: "PUT",
    url: `/api/v1/trips/${tripId}/itinerary`,
    data: request,
  });

  return fromTripDetail(detail);
}

export async function deleteTrip(authUser: User, tripId: string): Promise<void> {
  await apiRequest<void>(authUser, {
    method: "DELETE",
    url: `/api/v1/trips/${tripId}`,
  });
}

export { ApiServiceError as TripsApiError };
