import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getWorkPackageById } from "@/lib/openproject";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const wpId = Number(id);

  if (!Number.isFinite(wpId) || wpId <= 0) {
    return NextResponse.json({ error: "Invalid work package id" }, { status: 400 });
  }

  try {
    const wp = await getWorkPackageById(session.accessToken, wpId);
    return NextResponse.json(wp);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}