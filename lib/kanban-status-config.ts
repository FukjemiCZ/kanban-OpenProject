import { env } from "@/lib/env";

type BoardColumnKey =
  | "new"
  | "in_progress"
  | "blocker"
  | "done"
  | "review"
  | "qa"
  | "waiting_customer"
  | "other";

export type ColumnStatusFallback = {
  href: string;
  name?: string;
};

export type ColumnStatusMap = Partial<Record<BoardColumnKey, ColumnStatusFallback>>;

const ALLOWED_KEYS: BoardColumnKey[] = [
  "new",
  "in_progress",
  "blocker",
  "done",
  "review",
  "qa",
  "waiting_customer",
  "other",
];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeHref(href: string): string {
  const s = href.trim();
  if (!s) return s;
  // Pokud někdo omylem zadá celé URL, stáhneme jen path
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const u = new URL(s);
      return u.pathname;
    }
  } catch {
    // ignore, vrátíme původní string níže
  }
  return s;
}

export function getColumnStatusMapFromEnv(): ColumnStatusMap {
  const raw = (process.env.OPENPROJECT_COLUMN_STATUS_MAP ?? "").trim();

  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `Invalid OPENPROJECT_COLUMN_STATUS_MAP JSON: ${
        e instanceof Error ? e.message : "unknown parse error"
      }`
    );
  }

  if (!isObject(parsed)) {
    throw new Error("OPENPROJECT_COLUMN_STATUS_MAP must be a JSON object");
  }

  const out: ColumnStatusMap = {};

  for (const key of ALLOWED_KEYS) {
    const entry = parsed[key];
    if (!entry) continue;

    if (!isObject(entry)) {
      throw new Error(`OPENPROJECT_COLUMN_STATUS_MAP.${key} must be an object`);
    }

    const href = typeof entry.href === "string" ? normalizeHref(entry.href) : "";
    const name = typeof entry.name === "string" ? entry.name.trim() : undefined;

    if (!href) {
      throw new Error(`OPENPROJECT_COLUMN_STATUS_MAP.${key}.href is required`);
    }

    out[key] = { href, name };
  }

  return out;
}

/**
 * Vrátí absolutní URL na status resource v OpenProject API.
 * Přijímá jak "/api/v3/statuses/5", tak "api/v3/statuses/5", případně celé URL.
 */
export function resolveStatusHrefAgainstBase(href: string): string {
  const base = env.openProjectBaseUrl.replace(/\/+$/, "");

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  const path = href.startsWith("/") ? href : `/${href}`;
  return `${base}${path}`;
}