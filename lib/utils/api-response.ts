import { NextResponse } from "next/server";

export function apiError(
  message: string,
  status: number = 500
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
