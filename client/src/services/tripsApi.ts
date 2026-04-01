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

interface ApiErrorPayload {
  error?: {
    code?: string;
    details?: unknown;
    message?: string;
  };
}

interface ApiSuccessEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

class TripsApiError extends Error {
  readonly code?: string;
  readonly details?: unknown;
  readonly status: number;

  constructor(
    status: number,
    message: string,
    options: {
      code?: string;
      details?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "TripsApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

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

async function apiRequest<T>(
  authUser: User,
  path: string,
  init: RequestInit = {},
): Promise<ApiSuccessEnvelope<T>> {
  const token = await authUser.getIdToken();
  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return { data: undefined as T };
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccessEnvelope<T>
    | ApiErrorPayload
    | null;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    throw new TripsApiError(
      response.status,
      errorPayload?.error?.message || "Request failed.",
      {
        code: errorPayload?.error?.code,
        details: errorPayload?.error?.details,
      },
    );
  }

  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("API response was missing data.");
  }

  return payload as ApiSuccessEnvelope<T>;
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

export { TripsApiError };
