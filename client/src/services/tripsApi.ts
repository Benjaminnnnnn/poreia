import type { User } from "firebase/auth";
import type {
  TripMessage,
  TripPermissions,
  TravelItinerary,
} from "../types";
import type { TripSession } from "../types";
import type {
  CreateTripRequest,
  RefineTripRequest,
  ReplaceTripItineraryRequest,
  TripDetailResponse,
  TripSummaryResponse,
} from "@poreia/shared";
import { ApiError, apiRequest } from "./apiClient";

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
  const response = await apiRequest<TripSummaryResponse[]>(
    authUser,
    `/api/v1/trips?${params.toString()}`,
  );

  return response.data.map((summary) => toTripSession(summary));
}

export async function getTripDetail(
  authUser: User,
  tripId: string,
): Promise<TripSession> {
  const response = await apiRequest<TripDetailResponse>(
    authUser,
    `/api/v1/trips/${tripId}`,
  );

  return fromTripDetail(response.data);
}

export async function createTrip(
  authUser: User,
  prompt: string,
): Promise<TripSession> {
  const request: CreateTripRequest = {
    clientRequestId: crypto.randomUUID(),
    prompt,
  };
  const response = await apiRequest<TripDetailResponse>(authUser, "/api/v1/trips", {
    method: "POST",
    body: JSON.stringify(request),
  });

  return fromTripDetail(response.data);
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
  const response = await apiRequest<TripDetailResponse>(
    authUser,
    `/api/v1/trips/${tripId}/refinements`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );

  return fromTripDetail(response.data);
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
  const response = await apiRequest<TripDetailResponse>(
    authUser,
    `/api/v1/trips/${tripId}/itinerary`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    },
  );

  return fromTripDetail(response.data);
}

export async function deleteTrip(authUser: User, tripId: string): Promise<void> {
  await apiRequest<void>(authUser, `/api/v1/trips/${tripId}`, {
    method: "DELETE",
  });
}

export { ApiError as TripsApiError };
