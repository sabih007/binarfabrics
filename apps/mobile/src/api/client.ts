/* ==========================================================================
   The only place the app talks to the network.

   Every endpoint on the store answers with one of two envelopes:
       { ok: true,  data: … }
       { ok: false, error: { message, code?, fields? } }
   so this module unwraps `data` on success and throws an `ApiError` carrying
   the server's own wording on failure. Screens show `error.message` directly —
   the API already phrases errors for customers.

   The app never holds database credentials: the Next.js API is the only thing
   that touches Postgres.
   ========================================================================== */

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

/** A server-sent error, or a transport failure with `status === 0`. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Worth a "try again" button: transport blips and server-side faults. */
  get isRetryable() {
    return this.status === 0 || this.status >= 500;
  }
}

type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string; code?: string; fields?: Record<string, string> } };

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Query parameters; `undefined`, `null` and `''` entries are dropped. */
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  if (!API_URL) {
    throw new ApiError(
      'The app is not configured yet. Set EXPO_PUBLIC_API_URL to your store URL.',
      0,
      'NO_API_URL'
    );
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return `${API_URL}${path}${query ? `?${query}` : ''}`;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, signal } = options;
  const url = buildUrl(path, params);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    // An aborted request is a cancellation, not a failure — let it through so
    // React Query can discard it quietly.
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new ApiError("Couldn't reach the store. Check your connection.", 0, 'NETWORK');
  }

  let payload: Envelope<T> | null = null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    // A non-JSON body means something upstream answered instead of the API.
    payload = null;
  }

  if (payload && payload.ok === false) {
    throw new ApiError(
      payload.error.message,
      response.status,
      payload.error.code,
      payload.error.fields
    );
  }

  if (!response.ok || !payload) {
    throw new ApiError(
      response.status >= 500
        ? 'The store is having trouble right now. Please try again.'
        : 'That request could not be completed.',
      response.status,
      'UNEXPECTED'
    );
  }

  return payload.data;
}
