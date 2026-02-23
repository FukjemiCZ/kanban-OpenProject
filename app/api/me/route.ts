import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/lib/openproject";

export async function GET() {
  const session = await getSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const me = await getCurrentUser(session.accessToken);
    return NextResponse.json(me);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
