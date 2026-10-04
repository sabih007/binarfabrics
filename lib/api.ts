/* ==========================================================================
   Route-handler helpers: consistent JSON envelopes and error translation.

   Every handler returns either
     { ok: true,  data: … }
   or
     { ok: false, error: { message, code?, fields? } }
   so the client only ever has one shape to branch on.
   ========================================================================== */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = {
  ok: false;
  error: { message: string; code?: string; fields?: Record<string, string> };
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiOk<T>>({ ok: true, data }, init);
}

export function fail(
  message: string,
  status = 400,
  extra?: { code?: string; fields?: Record<string, string> }
) {
  return NextResponse.json<ApiErr>({ ok: false, error: { message, ...extra } }, { status });
}

/** Throw this from anywhere inside a handler to return a clean error. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message);
  }
}

function zodFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Wraps a handler so thrown errors become tidy JSON instead of a 500 HTML page.
 * Unexpected errors are logged server-side and reported generically to the
 * client — we never leak a stack trace or a database message.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return fail(err.message, err.status, { code: err.code });
      }
      if (err instanceof ZodError) {
        return fail("Please check the highlighted fields.", 422, {
          code: "VALIDATION",
          fields: zodFields(err),
        });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          const target = (err.meta?.target as string[] | undefined)?.join(", ") ?? "value";
          return fail(`That ${target} is already taken.`, 409, { code: "DUPLICATE" });
        }
        if (err.code === "P2025") return fail("Not found.", 404, { code: "NOT_FOUND" });
        if (err.code === "P2003") {
          return fail("That record is still referenced elsewhere.", 409, { code: "FK" });
        }
      }
      if (err instanceof Prisma.PrismaClientInitializationError) {
        console.error("[api] database unreachable:", err.message);
        return fail("The store is temporarily unavailable. Please try again.", 503, {
          code: "DB_DOWN",
        });
      }
      console.error("[api] unhandled error:", err);
      return fail("Something went wrong on our end.", 500, { code: "INTERNAL" });
    }
  };
}

/** Body parser that fails politely on malformed JSON. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body.");
  }
}

/** Best-effort client IP, used for rate limiting only. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
