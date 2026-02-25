import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "./env";

type SessionPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

type LoginStatePayload = {
  state: string;
  pkceVerifier: string;
  returnTo?: string;
};

const enc = new TextEncoder();
const key = enc.encode(env.sessionSecret);

export const SESSION_COOKIE = "opkanban_session";
export const LOGIN_STATE_COOKIE = "opkanban_login";

const isProd = process.env.NODE_ENV === "production";

export function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: maxAgeSec,
  };
}

async function sign(payload: JWTPayload, maxAgeSec: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(key);
}

async function verify<T>(token: string): Promise<T | null> {
  try {
    const out = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return out.payload as T;
  } catch {
    return null;
  }
}

// ✅ token helpers (pro route handlers, které nastavují cookies přes NextResponse)
export async function createSessionToken(payload: SessionPayload) {
  return sign(payload, 60 * 60 * 8);
}

export async function createLoginStateToken(payload: LoginStatePayload) {
  return sign(payload, 60 * 10);
}

// ✅ read-only helpers (OK i v server components)
export async function getSession(): Promise<SessionPayload | null> {
  const c = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!c) return null;
  return verify<SessionPayload>(c);
}

export async function getLoginState(): Promise<LoginStatePayload | null> {
  const c = (await cookies()).get(LOGIN_STATE_COOKIE)?.value;
  if (!c) return null;
  return verify<LoginStatePayload>(c);
}