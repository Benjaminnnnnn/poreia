import type {
  TripMessage,
  TripPermissions,
  TravelItinerary,
} from "@/types";
import type { TripSession } from "@/types";
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

export async function listTrips(): Promise<TripSession[]> {
  const params = new URLSearchParams({
    scope: "all",
    status: "all",
  });
  const summaries = await apiRequest<TripSummaryResponse[]>({
    method: "GET",
    url: `/api/v1/trips?${params.toString()}`,
  });

  return summaries.map((summary) => toTripSession(summary));
}

export async function getTripDetail(
  tripId: string,
): Promise<TripSession> {
  const detail = await apiRequest<TripDetailResponse>({
    method: "GET",
    url: `/api/v1/trips/${tripId}`,
  });

  return fromTripDetail(detail);
}

export async function listTripMembers(
  tripId: string,
): Promise<TripMemberResponse[]> {
  return apiRequest<TripMemberResponse[]>({
    method: "GET",
    url: `/api/v1/trips/${tripId}/members`,
  });
}

export async function addTripMember(
  tripId: string,
  input: AddTripMemberInput,
): Promise<TripMemberMutationResult> {
  return apiRequest<TripMemberMutationResult>({
    method: "POST",
    url: `/api/v1/trips/${tripId}/members`,
    data: input,
  });
}

export async function updateTripMember(
  tripId: string,
  userId: string,
  input: UpdateTripMemberInput,
): Promise<TripMemberMutationResult> {
  return apiRequest<TripMemberMutationResult>({
    method: "PATCH",
    url: `/api/v1/trips/${tripId}/members/${userId}`,
    data: input,
  });
}

export async function removeTripMember(
  tripId: string,
  userId: string,
): Promise<void> {
  await apiRequest<void>({
    method: "DELETE",
    url: `/api/v1/trips/${tripId}/members/${userId}`,
  });
}

export async function createTrip(
  prompt: string,
): Promise<TripSession> {
  const request: CreateTripRequest = {
    clientRequestId: crypto.randomUUID(),
    prompt,
  };
  const detail = await apiRequest<TripDetailResponse>({
    method: "POST",
    url: "/api/v1/trips",
    data: request,
  });

  return fromTripDetail(detail);
}

export async function refineTrip(
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
  const detail = await apiRequest<TripDetailResponse>({
    method: "POST",
    url: `/api/v1/trips/${tripId}/refinements`,
    data: request,
  });

  return fromTripDetail(detail);
}

export async function replaceTripItinerary(
  tripId: string,
  input: {
    expectedVersion: number;
    itinerary: TravelItinerary;
  },
): Promise<TripSession> {
  const request: ReplaceTripItineraryRequest = input;
  const detail = await apiRequest<TripDetailResponse>({
    method: "PUT",
    url: `/api/v1/trips/${tripId}/itinerary`,
    data: request,
  });

  return fromTripDetail(detail);
}

export async function patchTrip(
  tripId: string,
  input: PatchTripRequest,
): Promise<TripSession> {
  const detail = await apiRequest<TripDetailResponse>({
    method: "PATCH",
    url: `/api/v1/trips/${tripId}`,
    data: input,
  });
  return fromTripDetail(detail);
}

export async function deleteTrip(tripId: string): Promise<void> {
  await apiRequest<void>({
    method: "DELETE",
    url: `/api/v1/trips/${tripId}`,
  });
}

export { ApiServiceError as TripsApiError };
