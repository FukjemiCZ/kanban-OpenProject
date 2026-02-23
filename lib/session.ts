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
  returnTo?: string; // ✅ NOVÉ
};

const enc = new TextEncoder();
const key = enc.encode(env.sessionSecret);

const SESSION_COOKIE = "opkanban_session";
const LOGIN_STATE_COOKIE = "opkanban_login";

const isProd = process.env.NODE_ENV === "production";

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

export async function setSession(payload: SessionPayload) {
  const token = await sign(payload, 60 * 60 * 8);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd, // localhost=false, prod=true
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!c) return null;
  return verify<SessionPayload>(c);
}

export async function clearSession() {
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
}

export async function setLoginState(payload: LoginStatePayload) {
  const token = await sign(payload, 60 * 10);
  (await cookies()).set(LOGIN_STATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function getLoginState(): Promise<LoginStatePayload | null> {
  const c = (await cookies()).get(LOGIN_STATE_COOKIE)?.value;
  if (!c) return null;
  return verify<LoginStatePayload>(c);
}

export async function clearLoginState() {
  (await cookies()).set(LOGIN_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
}