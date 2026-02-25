import { env } from "@/lib/env";

export type BoardOptionField =
  | "assigneeName"
  | "responsibleName"
  | "typeName"
  | "priorityName"
  | "projectName";

export type BoardOption = {
  key: string;
  label: string;
  apiValue?: string | null;
};

function baseHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function mapCollectionElements(json: any): any[] {
  // OpenProject APIv3 kolekce obvykle vrací `_embedded.elements`
  return asArray(json?._embedded?.elements);
}

function normalizeLabel(v: any): string {
  return String(v ?? "").trim();
}

function makeKey(apiValue: string | null | undefined, label: string): string {
  if (apiValue === null) return "__null__";
  if (apiValue) return apiValue;
  return `label:${label.toLowerCase()}`;
}

async function fetchOpenProject(accessToken: string, path: string) {
  const base = env.openProjectBaseUrl.replace(/\/+$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "GET",
    headers: baseHeaders(accessToken),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenProject options fetch failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json();
}

function filterByQuery<T extends { label: string }>(items: T[], q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((i) => i.label.toLowerCase().includes(needle));
}

export async function getBoardOptionsFromOpenProject(args: {
  accessToken: string;
  field: BoardOptionField;
  q?: string;
}): Promise<BoardOption[]> {
  const { accessToken, field, q = "" } = args;

  switch (field) {
    case "typeName": {
      const json = await fetchOpenProject(accessToken, "/api/v3/types");
      const elements = mapCollectionElements(json);

      const out = elements
        .map((e) => {
          const href = e?._links?.self?.href as string | undefined;
          const label = normalizeLabel(e?.name ?? e?.title);
          if (!label) return null;
          return { key: makeKey(href, label), label, apiValue: href };
        })
        .filter(Boolean) as BoardOption[];

      return filterByQuery(out, q).sort((a, b) => a.label.localeCompare(b.label, "cs"));
    }

    case "priorityName": {
      const json = await fetchOpenProject(accessToken, "/api/v3/priorities");
      const elements = mapCollectionElements(json);

      const out = elements
        .map((e) => {
          const href = e?._links?.self?.href as string | undefined;
          const label = normalizeLabel(e?.name ?? e?.title);
          if (!label) return null;
          return { key: makeKey(href, label), label, apiValue: href };
        })
        .filter(Boolean) as BoardOption[];

      return filterByQuery(out, q).sort((a, b) => a.label.localeCompare(b.label, "cs"));
    }

    case "projectName": {
      // Pozn.: API projektů může být větší; pro MVP načítáme collection a filtrujeme serverově/locálně.
      const json = await fetchOpenProject(accessToken, "/api/v3/projects");
      const elements = mapCollectionElements(json);

      const out = elements
        .map((e) => {
          const href = e?._links?.self?.href as string | undefined;
          const label = normalizeLabel(e?.name ?? e?.title);
          if (!label) return null;
          return { key: makeKey(href, label), label, apiValue: href };
        })
        .filter(Boolean) as BoardOption[];

      return filterByQuery(out, q).sort((a, b) => a.label.localeCompare(b.label, "cs"));
    }

    case "assigneeName":
    case "responsibleName": {
      // OpenProject users endpoint existuje, ale dostupnost závisí na oprávněních.
      const json = await fetchOpenProject(accessToken, "/api/v3/users");
      const elements = mapCollectionElements(json);

      const out = elements
        .map((e) => {
          const href = e?._links?.self?.href as string | undefined;
          const label = normalizeLabel(e?.name ?? e?.title ?? e?.login);
          if (!label) return null;
          return { key: makeKey(href, label), label, apiValue: href };
        })
        .filter(Boolean) as BoardOption[];

      return filterByQuery(out, q).sort((a, b) => a.label.localeCompare(b.label, "cs"));
    }

    default:
      return [];
  }
}