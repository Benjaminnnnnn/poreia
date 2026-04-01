import type { User } from "firebase/auth";

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

export class ApiError extends Error {
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
    this.name = "ApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export async function apiRequest<T>(
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
    throw new ApiError(
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
