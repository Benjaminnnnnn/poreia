import type { User } from "firebase/auth";
import type {
  TripMessage,
  TripPermissions,
  TravelItinerary,
} from "@/shared/types";
import type { TripSession } from "@/shared/types";
import type {
  CreateTripRequest,
  PatchTripRequest,
  RefineTripRequest,
  ReplaceTripItineraryRequest,
  TripDetailResponse,
  TripMemberResponse,
  TripRole,
  TripSummaryResponse,
} from "@poreia/shared";
import { ApiServiceError, apiRequest } from "@/shared/api/apiService";

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

export interface AddTripMemberInput {
  email: string;
  role: Exclude<TripRole, "owner">;
}

export interface UpdateTripMemberInput {
  revoked?: boolean;
  role?: Exclude<TripRole, "owner">;
}

export interface TripMemberMutationResult {
  member: TripMemberResponse;
  summary: TripSummaryResponse;
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

export async function listTripMembers(
  authUser: User,
  tripId: string,
): Promise<TripMemberResponse[]> {
  return apiRequest<TripMemberResponse[]>(authUser, {
    method: "GET",
    url: `/api/v1/trips/${tripId}/members`,
  });
}

export async function addTripMember(
  authUser: User,
  tripId: string,
  input: AddTripMemberInput,
): Promise<TripMemberMutationResult> {
  return apiRequest<TripMemberMutationResult>(authUser, {
    method: "POST",
    url: `/api/v1/trips/${tripId}/members`,
    data: input,
  });
}

export async function updateTripMember(
  authUser: User,
  tripId: string,
  userId: string,
  input: UpdateTripMemberInput,
): Promise<TripMemberMutationResult> {
  return apiRequest<TripMemberMutationResult>(authUser, {
    method: "PATCH",
    url: `/api/v1/trips/${tripId}/members/${userId}`,
    data: input,
  });
}

export async function removeTripMember(
  authUser: User,
  tripId: string,
  userId: string,
): Promise<void> {
  await apiRequest<void>(authUser, {
    method: "DELETE",
    url: `/api/v1/trips/${tripId}/members/${userId}`,
  });
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

export async function patchTrip(
  authUser: User,
  tripId: string,
  input: PatchTripRequest,
): Promise<TripSession> {
  const detail = await apiRequest<TripDetailResponse>(authUser, {
    method: "PATCH",
    url: `/api/v1/trips/${tripId}`,
    data: input,
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
