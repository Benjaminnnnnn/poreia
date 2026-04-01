import type { AppEnv } from '../core/env';
import { AppError } from '../core/errors';
import { getGoogleAccessToken } from './googleAccessToken';
import {
  decodeDocument,
  type FirestoreDocument,
  encodeFields,
} from './values';

interface RawFirestoreDocument {
  createTime?: string;
  fields?: Record<string, unknown>;
  name: string;
  updateTime?: string;
}

interface CommitUpdateWrite {
  currentDocument?: { exists?: boolean; updateTime?: string };
  update: {
    fields: Record<string, unknown>;
    name: string;
  };
}

interface CommitDeleteWrite {
  currentDocument?: { exists?: boolean; updateTime?: string };
  delete: string;
}

type CommitWrite = CommitUpdateWrite | CommitDeleteWrite;

interface ListDocumentsResponse {
  documents?: RawFirestoreDocument[];
}

interface FirestoreErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface FirestoreClientOptions {
  emulatorAuth?: 'none' | 'owner';
}

function appendQueryParam(url: URL, key: string, value: string): void {
  const separator = url.search ? '&' : '?';
  url.search += `${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function parseFirestoreError(body: string): FirestoreErrorResponse | null {
  if (!body.trim()) {
    return null;
  }

  try {
    return JSON.parse(body) as FirestoreErrorResponse;
  } catch {
    return null;
  }
}

export class FirestoreClient {
  private readonly databasePath: string;
  private readonly documentsBaseUrl: string;
  private readonly projectId: string;

  constructor(
    private readonly env: AppEnv,
    private readonly options: FirestoreClientOptions = {},
  ) {
    this.projectId = env.firebaseProjectId;
    this.databasePath = `projects/${this.projectId}/databases/(default)`;

    const apiBase = env.firestoreEmulatorHost
      ? `http://${env.firestoreEmulatorHost}/v1`
      : 'https://firestore.googleapis.com/v1';

    this.documentsBaseUrl = `${apiBase}/${this.databasePath}/documents`;
  }

  private providerLabel(): string {
    return this.env.firestoreEmulatorHost
      ? `Firestore emulator at ${this.env.firestoreEmulatorHost}`
      : 'Firestore';
  }

  private async executeFetch(url: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? `Failed to reach ${this.providerLabel()}: ${error.message}`
          : `Failed to reach ${this.providerLabel()}.`;

      throw new AppError(503, 'provider_unavailable', message);
    }
  }

  private documentName(path: string): string {
    return `${this.databasePath}/documents/${path}`;
  }

  private async buildHeaders(headers?: HeadersInit): Promise<Headers> {
    const nextHeaders = new Headers(headers);

    if (this.env.firestoreEmulatorHost) {
      if (this.options.emulatorAuth === 'owner') {
        nextHeaders.set('Authorization', 'Bearer owner');
      }

      return nextHeaders;
    }

    const accessToken = await getGoogleAccessToken(this.env);
    nextHeaders.set('Authorization', `Bearer ${accessToken}`);
    return nextHeaders;
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const headers = await this.buildHeaders(init?.headers);

    const response = await this.executeFetch(url, {
      ...init,
      headers,
    });

    if (response.status === 404) {
      throw new AppError(404, 'trip_not_found', 'Document not found.');
    }

    if (!response.ok) {
      const body = await response.text();
      const parsedError = parseFirestoreError(body);
      const firestoreStatus = parsedError?.error?.status;
      const firestoreMessage = parsedError?.error?.message?.trim();

      if (firestoreStatus === 'FAILED_PRECONDITION' || firestoreStatus === 'ABORTED') {
        throw new AppError(409, 'stale_write', 'Trip has changed. Refresh and retry.');
      }

      throw new AppError(
        503,
        'provider_unavailable',
        firestoreMessage || body.trim() || `Firestore request failed with ${response.status}.`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async getDocument<T>(path: string): Promise<FirestoreDocument<T> | null> {
    const url = `${this.documentsBaseUrl}/${path}`;
    const headers = await this.buildHeaders();

    const response = await this.executeFetch(url, { headers });
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new AppError(
        503,
        'provider_unavailable',
        body.trim() || `Firestore request failed with ${response.status}.`,
      );
    }

    const payload = (await response.json()) as RawFirestoreDocument;
    return decodeDocument<T>(payload as never);
  }

  async listDocuments<T>(
    parentPath: string | undefined,
    collectionId: string,
    options?: {
      orderBy?: string;
      pageSize?: number;
    },
  ): Promise<Array<FirestoreDocument<T>>> {
    const url = new URL(
      parentPath
        ? `${this.documentsBaseUrl}/${parentPath}/${collectionId}`
        : `${this.documentsBaseUrl}/${collectionId}`,
    );

    if (options?.orderBy) {
      appendQueryParam(url, 'orderBy', options.orderBy);
    }

    if (options?.pageSize) {
      appendQueryParam(url, 'pageSize', String(options.pageSize));
    }

    const payload = await this.request<ListDocumentsResponse>(url.toString(), {
      method: 'GET',
    });

    return (payload.documents ?? []).map((document) =>
      decodeDocument<T>(document as never),
    );
  }

  async commit(writes: CommitWrite[]): Promise<void> {
    const url = `${this.documentsBaseUrl}:commit`;
    await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ writes }),
    });
  }

  buildUpdateWrite(
    path: string,
    data: Record<string, unknown>,
    currentDocument?: { exists?: boolean; updateTime?: string },
  ): CommitUpdateWrite {
    return {
      currentDocument,
      update: {
        name: this.documentName(path),
        fields: encodeFields(data as never),
      },
    };
  }

  buildDeleteWrite(
    path: string,
    currentDocument?: { exists?: boolean; updateTime?: string },
  ): CommitDeleteWrite {
    return {
      currentDocument,
      delete: this.documentName(path),
    };
  }
}
