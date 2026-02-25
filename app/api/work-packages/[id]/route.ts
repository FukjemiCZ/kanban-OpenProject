import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getWorkPackageById } from "@/lib/openproject";

type Params = { params: Promise<{ id: string }> };

function jsonError(status: number, message: string, extra?: any) {
  return NextResponse.json({ error: message, ...(extra ? { extra } : {}) }, { status });
}

function isNonEmptyObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0;
}

function hrefToLink(href: any) {
  // allow null to unset relationship
  if (href === null) return { href: null };

  if (typeof href === "string" && href.startsWith("/api/")) return { href };

  // tolerate accidental absolute URL -> convert to /api/... if possible
  if (typeof href === "string" && href.startsWith("http")) {
    const idx = href.indexOf("/api/");
    if (idx >= 0) return { href: href.slice(idx) };
  }

  return null;
}

function parseStatusMapFromEnv(): Record<string, string> | null {
  const raw = process.env.KANBAN_STATUS_BY_COLUMN_KEY;
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof k === "string" && typeof v === "string" && v.startsWith("/api/")) {
        out[k] = v;
      }
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

async function opPatch(accessToken: string, id: number, payload: any) {
  const base = process.env.OPENPROJECT_BASE_URL;
  if (!base) throw new Error("Missing env OPENPROJECT_BASE_URL");

  const url = `${base.replace(/\/$/, "")}/api/v3/work_packages/${id}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/hal+json, application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (typeof data === "object" && data?.message) ||
      (typeof data === "object" && data?.error) ||
      (typeof data === "string" && data) ||
      `OpenProject API error ${res.status}`;

    return { ok: false as const, status: res.status, data, message: msg };
  }

  return { ok: true as const, status: res.status, data };
}

/**
 * OpenProject work_package response neobsahuje barvu statusu.
 * Barva je na /api/v3/statuses, takže si ji dohledáme podle statusHref.
 */
async function fetchStatusColor(accessToken: string, statusHref: string | null | undefined) {
  if (!statusHref) return null;

  const base = process.env.OPENPROJECT_BASE_URL;
  if (!base) throw new Error("Missing env OPENPROJECT_BASE_URL");

  const res = await fetch(`${base.replace(/\/$/, "")}/api/v3/statuses`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/hal+json",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const elements: any[] = data?._embedded?.elements ?? [];

  const hit = elements.find((s) => s?._links?.self?.href === statusHref);
  const color = hit?.color;
  return typeof color === "string" ? color : null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session?.accessToken) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const wpId = Number(id);
  if (!Number.isFinite(wpId) || wpId <= 0) return jsonError(400, "Invalid work package id");

  const wp = await getWorkPackageById(session.accessToken, wpId);

  // volitelně: přidáme statusColor i pro detail drawer
  const statusHref = wp?._links?.status?.href ?? null;
  const statusColor = await fetchStatusColor(session.accessToken, statusHref);

  return NextResponse.json({ ...wp, statusColor });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session?.accessToken) return jsonError(401, "Unauthorized");

  const { id } = await params;
  const wpId = Number(id);
  if (!Number.isFinite(wpId) || wpId <= 0) return jsonError(400, "Invalid work package id");

  const body = await req.json().catch(() => ({} as any));

  // lockVersion is REQUIRED by OpenProject
  const lockVersion = body?.lockVersion;
  if (typeof lockVersion !== "number") {
    return jsonError(400, "Missing lockVersion (required by OpenProject for PATCH).");
  }

  // 1) direct field edits (Drawer)
  const directFields: any = {};

  if (typeof body?.subject === "string") directFields.subject = body.subject;

  if (isNonEmptyObject(body?.description)) {
    directFields.description = body.description; // { format, raw }
  }

  if (typeof body?.startDate === "string" || body?.startDate === null) {
    directFields.startDate = body.startDate;
  }

  if (typeof body?.dueDate === "string" || body?.dueDate === null) {
    directFields.dueDate = body.dueDate;
  }

  if (typeof body?.percentageDone === "number" || body?.percentageDone === null) {
    directFields.percentageDone = body.percentageDone;
  }

  // 2) build _links from various FE shapes (DnD + Drawer)
  const opPayload: any = { lockVersion, ...directFields };
  const ensureLinks = () => {
    if (!opPayload._links) opPayload._links = {};
  };

  const mapped = [
    ["statusHref", "status"],
    ["assigneeHref", "assignee"],
    ["responsibleHref", "responsible"],
    ["priorityHref", "priority"],
    ["typeHref", "type"],
  ] as const;

  // Top-level *Href fields (DnD)
  for (const [from, to] of mapped) {
    if (Object.prototype.hasOwnProperty.call(body, from)) {
      const link = hrefToLink(body[from]);
      if (!link) return jsonError(400, `Invalid ${from}. Expected "/api/..." or null.`);
      ensureLinks();
      opPayload._links[to] = link;
    }
  }

  // "links" object from FE
  if (body?.links && typeof body.links === "object") {
    // links.statusHref style
    for (const [from, to] of mapped) {
      if (Object.prototype.hasOwnProperty.call(body.links, from)) {
        const link = hrefToLink(body.links[from]);
        if (!link) return jsonError(400, `Invalid links.${from}. Expected "/api/..." or null.`);
        ensureLinks();
        opPayload._links[to] = link;
      }
    }

    // proper OpenProject keys in "links"
    const properKeys = ["status", "assignee", "responsible", "priority", "type"] as const;
    for (const k of properKeys) {
      if (Object.prototype.hasOwnProperty.call(body.links, k)) {
        const v = body.links[k];
        const href = v?.href ?? v; // allow {href} or string/null
        const link = hrefToLink(href);
        if (!link) return jsonError(400, `Invalid links.${k}. Expected "/api/..." or null.`);
        ensureLinks();
        opPayload._links[k] = link;
      }
    }
  }

  // 3) boardMove.statusColumnKey (optional)
  const boardMove = body?.boardMove;
  const statusMap = parseStatusMapFromEnv();

  if (boardMove?.statusColumnKey && typeof boardMove.statusColumnKey === "string") {
    const key = boardMove.statusColumnKey;
    const mappedHref = statusMap?.[key];

    if (mappedHref) {
      ensureLinks();
      opPayload._links.status = { href: mappedHref };
    } else {
      // If FE also sent statusHref, we're fine; otherwise it's unsupported.
      const alreadyHasStatus =
        opPayload._links?.status &&
        Object.prototype.hasOwnProperty.call(opPayload._links.status, "href");
      if (!alreadyHasStatus) {
        return jsonError(
          400,
          `Unsupported boardMove.statusColumnKey="${key}". Provide statusHref ("/api/...") or configure KANBAN_STATUS_BY_COLUMN_KEY env JSON.`,
          { key }
        );
      }
    }
  }

  // 4) Validate: at least one change besides lockVersion
  const hasDirect = Object.keys(directFields).length > 0;
  const hasLinks = isNonEmptyObject(opPayload._links);
  const hasBoardMove =
    Boolean(boardMove?.statusColumnKey) && typeof boardMove.statusColumnKey === "string";

  if (!hasDirect && !hasLinks && !hasBoardMove) {
    return jsonError(
      400,
      "No supported changes provided. Provide fields (subject/description/startDate/dueDate/percentageDone), link changes (status/assignee/...), or boardMove.statusColumnKey."
    );
  }

  // 5) Patch OpenProject
  const patched = await opPatch(session.accessToken, wpId, opPayload);
  if (!patched.ok) {
    return jsonError(
      patched.status,
      `OpenProject API error ${patched.status}: ${patched.message}`,
      patched.data
    );
  }

  // ✅ 6) Enrich response with statusColor so FE can update card background immediately
  const newStatusHref = patched.data?._links?.status?.href ?? null;
  const statusColor = await fetchStatusColor(session.accessToken, newStatusHref);

  return NextResponse.json({ ...patched.data, statusColor });
}