import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { parseCsv } from "@/lib/csv";
import { importLeadsForUser } from "@/lib/leads/service";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("CSV file is required");
    if (file.size > 10 * 1024 * 1024) throw new Error("CSV max size is 10MB");
    const rows = parseCsv(await file.text());
    const summary = await importLeadsForUser(user.id, rows, file.name);
    return NextResponse.json(summary);
  } catch (error) {
    return jsonError(error);
  }
}
