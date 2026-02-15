import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/utils/errors";
import { apiError } from "@/lib/utils/api-response";

const WS_SERVER_URL =
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept both `language` (old) and `language_name` (new)
    const language_name = body.language_name || body.language;
    const language_code = body.language_code;

    if (!language_name || !language_code) {
      return apiError("Missing required fields: language_name (or language), language_code", 400);
    }

    // Forward all metadata fields to WS server
    const res = await fetch(`${WS_SERVER_URL}/preserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, language_name, language_code }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return apiError((data as { error?: string }).error || `WS server error ${res.status}`, res.status);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/preserve] Failed:", getErrorMessage(err));
    return apiError("Could not reach backend server. Is it running?", 503);
  }
}
