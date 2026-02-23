import { NextRequest, NextResponse } from "next/server";
import { generatePkce, randomState } from "@/lib/pkce";
import { setLoginState } from "@/lib/session";
import { getAuthorizeUrl } from "@/lib/openproject";

export async function GET(req: NextRequest) {
  const { verifier, challenge } = generatePkce();
  const state = randomState();

  // přijmeme např. /api/auth/login?returnTo=/board?type=Task
  const url = new URL(req.url);
  const returnToParam = url.searchParams.get("returnTo");

  const safeReturnTo =
    returnToParam &&
    returnToParam.startsWith("/") &&
    !returnToParam.startsWith("//")
      ? returnToParam
      : "/board";

  await setLoginState({
    state,
    pkceVerifier: verifier,
    returnTo: safeReturnTo, // <-- NOVÉ
  });

  const authorizeUrl = getAuthorizeUrl({
    state,
    codeChallenge: challenge,
  });

  return NextResponse.redirect(authorizeUrl);
}