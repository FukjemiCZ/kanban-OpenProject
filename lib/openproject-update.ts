type OpPatchLinks = {
  status?: { href: string };
  assignee?: { href: string } | null;
  priority?: { href: string };
  type?: { href: string };
  responsible?: { href: string } | null;
};

export async function patchOpenProjectWorkPackage(params: {
  baseUrl: string;
  accessToken: string;
  id: number;
  lockVersion?: number;
  links: OpPatchLinks;
}) {
  const { baseUrl, accessToken, id, lockVersion, links } = params;

  const body: Record<string, unknown> = {
    _links: links,
  };

  if (typeof lockVersion === "number") {
    body.lockVersion = lockVersion;
  }

  const res = await fetch(`${baseUrl}/api/v3/work_packages/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(
      `OpenProject PATCH failed (${res.status}): ${json?.message || json?.error || text || "unknown"}`
    );
  }

  return json;
}