import { NextResponse, type NextRequest } from "next/server";

const OP_BASE = process.env.OPENPROJECT_BASE_URL!;
const OP_TOKEN = process.env.OPENPROJECT_TOKEN!;

function basicAuthHeaderFromApiKey(token: string) {
  const raw = `apikey:${token}`;
  const b64 = Buffer.from(raw).toString("base64");
  return `Basic ${b64}`;
}

function mapAllowedValues(form: any) {
  const schema = form?._embedded?.schema ?? {};

  const pickAllowed = (field: string) =>
    (schema?.[field]?.allowedValues ?? [])
      .map((v: any) => ({
        href: v?.href,
        title: v?.title ?? v?.name ?? v?.href,
      }))
      .filter((x: any) => x.href);

  return {
    allowed: {
      status: pickAllowed("status"),
      assignee: pickAllowed("assignee"),
      priority: pickAllowed("priority"),
    },
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const url = `${OP_BASE}/api/v3/work_packages/${id}/form`;
  const res = await fetch(url, {
    headers: {
      Authorization: basicAuthHeaderFromApiKey(OP_TOKEN),
      Accept: "application/hal+json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return new NextResponse(text || `HTTP ${res.status}`, { status: res.status });
  }

  const form = await res.json();
  return NextResponse.json(mapAllowedValues(form));
}