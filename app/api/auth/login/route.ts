import { NextRequest, NextResponse } from "next/server";
import { generatePkce, randomState } from "@/lib/pkce";
import { getAuthorizeUrl } from "@/lib/openproject";
import { createLoginStateToken, cookieOptions, LOGIN_STATE_COOKIE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { verifier, challenge } = generatePkce();
  const state = randomState();

  const url = new URL(req.url);
  const returnToParam = url.searchParams.get("returnTo");
  const safeReturnTo =
    returnToParam && returnToParam.startsWith("/") && !returnToParam.startsWith("//")
      ? returnToParam
      : "/board";

  const token = await createLoginStateToken({ state, pkceVerifier: verifier, returnTo: safeReturnTo });
  const authorizeUrl = getAuthorizeUrl({ state, codeChallenge: challenge });

  const res = NextResponse.redirect(authorizeUrl, { status: 302 });
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set(LOGIN_STATE_COOKIE, token, cookieOptions(60 * 10));
  return res;
}