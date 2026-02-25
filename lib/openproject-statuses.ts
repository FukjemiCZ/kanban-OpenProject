type Status = {
  id: number;
  name?: string;
  color?: string; // typicky "#35C3F2"
  _links?: { self?: { href: string } };
};

type StatusesResponse = {
  _embedded?: {
    elements?: Status[];
  };
};

export async function getStatuses(accessToken: string) {
  const base = process.env.OPENPROJECT_BASE_URL;
  if (!base) throw new Error("Missing OPENPROJECT_BASE_URL");

  const res = await fetch(`${base}/api/v3/statuses`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/hal+json",
    },
    cache: "no-store",
  });

  const data = (await res.json()) as StatusesResponse & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(`OpenProject API error ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

/** Mapuje statusHref -> "#RRGGBB" */
export function buildStatusColorMap(statuses: StatusesResponse) {
  const m = new Map<string, string>();
  const items = statuses?._embedded?.elements ?? [];
  for (const s of items) {
    const href = s?._links?.self?.href;
    const color = s?.color;
    if (href && color) m.set(href, color);
  }
  return m;
}