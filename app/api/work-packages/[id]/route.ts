import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getWorkPackageById } from "@/lib/openproject";
import { env } from "@/lib/env";
import { patchOpenProjectWorkPackage } from "@/lib/openproject-update";
import {
  getColumnStatusMapFromEnv,
  resolveStatusHrefAgainstBase,
} from "@/lib/kanban-status-config";

type Params = { params: Promise<{ id: string }> };

type BoardColumnKey =
  | "new"
  | "in_progress"
  | "blocker"
  | "done"
  | "review"
  | "qa"
  | "waiting_customer"
  | "other";

type PatchBody = {
  lockVersion?: number;
  links?: {
    statusHref?: string;
    assigneeHref?: string | null;
    priorityHref?: string;
    typeHref?: string;
    responsibleHref?: string | null;
  };
  boardMove?: {
    // klient může poslat sloupec místo statusHref a server ho dopočítá z env mapy
    statusColumnKey?: BoardColumnKey;
  };
};

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

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const wpId = Number(id);

  if (!Number.isFinite(wpId) || wpId <= 0) {
    return NextResponse.json({ error: "Invalid work package id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const linksPayload = body.links ?? {};
  const links: Record<string, any> = {};

  // 1) statusHref přímo od klienta
  let resolvedStatusHref = linksPayload.statusHref;

  // 2) fallback: status sloupec -> env mapa
  if (!resolvedStatusHref && body.boardMove?.statusColumnKey) {
    try {
      const map = getColumnStatusMapFromEnv();
      const mapped = map[body.boardMove.statusColumnKey];
      if (mapped?.href) {
        resolvedStatusHref = resolveStatusHrefAgainstBase(mapped.href);
      }
    } catch (e) {
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : "Invalid OPENPROJECT_COLUMN_STATUS_MAP",
        },
        { status: 500 }
      );
    }
  }

  if (resolvedStatusHref) links.status = { href: resolvedStatusHref };

  if ("assigneeHref" in linksPayload) {
    links.assignee =
      linksPayload.assigneeHref === null ? null : { href: linksPayload.assigneeHref };
  }

  if (linksPayload.priorityHref) links.priority = { href: linksPayload.priorityHref };
  if (linksPayload.typeHref) links.type = { href: linksPayload.typeHref };

  if ("responsibleHref" in linksPayload) {
    links.responsible =
      linksPayload.responsibleHref === null ? null : { href: linksPayload.responsibleHref };
  }

  if (Object.keys(links).length === 0) {
    return NextResponse.json(
      { error: "No supported changes provided (links or boardMove.statusColumnKey)." },
      { status: 400 }
    );
  }

  try {
    const updated = await patchOpenProjectWorkPackage({
      baseUrl: env.openProjectBaseUrl.replace(/\/+$/, ""),
      accessToken: session.accessToken,
      id: wpId,
      lockVersion: body.lockVersion,
      links,
    });

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 422 }
    );
  }
}