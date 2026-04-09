import axios from "axios";
import type { AxiosRequestConfig } from "axios";
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
}

export class ApiServiceError extends Error {
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
    this.name = "ApiServiceError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export async function apiRequest<T>(
  authUser: User,
  config: AxiosRequestConfig,
): Promise<T> {
  const token = await authUser.getIdToken();

  try {
    const response = await axios.request<ApiSuccessEnvelope<T>>({
      ...config,
      headers: {
        Authorization: `Bearer ${token}`,
        ...config.headers,
      },
    });

    return response.data.data;
  } catch (error) {
    if (!axios.isAxiosError<ApiErrorPayload>(error)) {
      throw error;
    }

    const status = error.response?.status ?? 500;
    const errorPayload = error.response?.data;

    throw new ApiServiceError(
      status,
      errorPayload?.error?.message || error.message || "Request failed.",
      {
        code: errorPayload?.error?.code,
        details: errorPayload?.error?.details,
      },
    );
  }
}
