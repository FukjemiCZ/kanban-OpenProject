import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getBoardOptionsFromOpenProject,
  type BoardOptionField,
} from "@/lib/openproject-board-options";

const ALLOWED_FIELDS: BoardOptionField[] = [
  "assigneeName",
  "responsibleName",
  "typeName",
  "priorityName",
  "projectName",
];

function isBoardOptionField(v: string): v is BoardOptionField {
  return ALLOWED_FIELDS.includes(v as BoardOptionField);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const field = url.searchParams.get("field") ?? "";
  const q = url.searchParams.get("q") ?? "";

  if (!isBoardOptionField(field)) {
    return NextResponse.json(
      {
        error: "Invalid field",
        allowed: ALLOWED_FIELDS,
      },
      { status: 400 }
    );
  }

  try {
    const options = await getBoardOptionsFromOpenProject({
      accessToken: session.accessToken,
      field,
      q,
    });

    return NextResponse.json({
      field,
      q,
      options,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load options" },
      { status: 500 }
    );
  }
}