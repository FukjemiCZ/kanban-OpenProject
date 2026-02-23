import { NextRequest, NextResponse } from "next/server";
import { clearLoginState, getLoginState, setSession } from "@/lib/session";
import { exchangeCodeForToken } from "@/lib/openproject";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
  }

  const loginState = await getLoginState();
  if (!loginState || loginState.state !== state) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const token = await exchangeCodeForToken({
    code,
    codeVerifier: loginState.pkceVerifier,
  });

  await setSession({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
  });

  const returnTo =
    loginState.returnTo &&
    loginState.returnTo.startsWith("/") &&
    !loginState.returnTo.startsWith("//")
      ? loginState.returnTo
      : "/board";

  await clearLoginState();

  return NextResponse.redirect(new URL(returnTo, req.url));
}