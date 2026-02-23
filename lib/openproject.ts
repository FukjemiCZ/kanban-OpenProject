import { env } from "./env";
import type { OpenProjectCollection, OpenProjectUser, OpenProjectWorkPackage } from "./types";

function url(path: string) {
  return `${env.openProjectBaseUrl}${path}`;
}

export function getAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
}) {
  const u = new URL(url("/oauth/authorize"));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", env.clientId);
  u.searchParams.set("redirect_uri", env.redirectUri);
  u.searchParams.set("state", params.state);
  u.searchParams.set("code_challenge", params.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

export async function exchangeCodeForToken(input: {
  code: string;
  codeVerifier: string;
}) {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", input.code);
  body.set("redirect_uri", env.redirectUri);
  body.set("client_id", env.clientId);
  body.set("client_secret", env.clientSecret);
  body.set("code_verifier", input.codeVerifier);

  const res = await fetch(url("/oauth/token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    created_at?: number;
  };
}

async function opFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(url(path), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/hal+json, application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenProject API error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

export async function getCurrentUser(accessToken: string) {
  return opFetch<OpenProjectUser>("/api/v3/users/me", accessToken);
}

export async function getWorkPackages(accessToken: string, pageSize = 100) {
  return opFetch<OpenProjectCollection<OpenProjectWorkPackage>>(
    `/api/v3/work_packages?pageSize=${pageSize}`,
    accessToken
  );
}

export async function getWorkPackageById(accessToken: string, id: number) {
  return opFetch<OpenProjectWorkPackage>(`/api/v3/work_packages/${id}`, accessToken);
}
