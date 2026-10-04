/* ==========================================================================
   Browser-side API client.

   Unwraps the { ok, data | error } envelope so callers get the payload or a
   thrown ApiError carrying the field-level messages from Zod.
   ========================================================================== */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string; code?: string; fields?: Record<string, string> } };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    // Offline, DNS failure, connection refused — never a parseable envelope.
    throw new ApiError("Couldn't reach the server. Check your connection.", 0, "NETWORK");
  }

  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(
      res.ok ? "The server sent an unreadable response." : `Request failed (${res.status}).`,
      res.status,
      "BAD_RESPONSE"
    );
  }

  if (!res.ok || !body.ok) {
    const error = "error" in body ? body.error : undefined;
    throw new ApiError(
      error?.message ?? `Request failed (${res.status}).`,
      res.status,
      error?.code,
      error?.fields
    );
  }

  return body.data;
}

export const apiGet = <T>(path: string) => api<T>(path);

export const apiSend = <T>(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown) =>
  api<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
