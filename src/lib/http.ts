import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(error: unknown, status = 400) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 422 });
  }
  const message = error instanceof Error ? error.message : "Request failed";
  const code = message === "Forbidden" ? 403 : status;
  return NextResponse.json({ error: message }, { status: code });
}

export async function parseJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
