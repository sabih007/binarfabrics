/* ==========================================================================
   Admin authentication.

   Sessions are stateless JWTs signed with AUTH_SECRET, stored in an httpOnly,
   SameSite=Lax cookie. No session table to clean up; to revoke everyone,
   rotate AUTH_SECRET.
   ========================================================================== */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { env } from "./env";
import { prisma } from "./db";
import { HttpError } from "./api";

export const SESSION_COOKIE = "binar_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export interface Session {
  sub: string;
  email: string;
  name: string;
  role: "OWNER" | "STAFF";
}

const secret = () => new TextEncoder().encode(env.authSecret);

// ------------------------------------------------------------------ passwords

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// ------------------------------------------------------------------- tokens

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ email: session.email, name: session.name, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

/** Verifies a token. Returns null rather than throwing on a bad/expired one. */
export async function readSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role === "OWNER" ? "OWNER" : "STAFF",
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ cookies

export async function startSession(session: Session) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** The signed-in admin, or null. Safe to call from server components. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return readSession(jar.get(SESSION_COOKIE)?.value);
}

/** Use inside admin route handlers — throws 401 when signed out. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Please sign in.", "UNAUTHENTICATED");
  return session;
}

/** Destructive actions (delete, staff management) are owner-only. */
export async function requireOwner(): Promise<Session> {
  const session = await requireAdmin();
  if (session.role !== "OWNER") {
    throw new HttpError(403, "Only the store owner can do that.", "FORBIDDEN");
  }
  return session;
}

// ---------------------------------------------------------------- sign in

export async function authenticate(email: string, password: string): Promise<Session> {
  const user = await prisma.adminUser.findUnique({ where: { email } });

  // Always run a hash comparison so a missing account and a wrong password
  // take the same time — otherwise the response time leaks which emails exist.
  const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const valid = await verifyPassword(password, hash);

  if (!user || !user.active || !valid) {
    throw new HttpError(401, "Incorrect email or password.", "BAD_CREDENTIALS");
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { sub: user.id, email: user.email, name: user.name, role: user.role };
}
