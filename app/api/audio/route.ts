import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/utils/errors";
import { apiError } from "@/lib/utils/api-response";

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://localhost:3003";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { video_url, audio_url } = body as {
      video_url?: string;
      audio_url?: string;
    };

    if (!video_url && !audio_url) {
      return apiError("Either video_url or audio_url is required", 400);
    }

    // Route to the appropriate FastAPI endpoint
    const endpoint = video_url ? "/process-video" : "/transcribe";
    const payload = video_url
      ? { video_url, language: body.language, chunk_seconds: body.chunk_seconds }
      : { audio_url, language: body.language };

    const res = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(600_000), // 10 min — long videos take time
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return apiError((data as { detail?: string }).detail || `ML service error ${res.status}`, res.status);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/audio] Failed:", getErrorMessage(err));
    return apiError("Could not reach ML service. Is it running? (python ml/server.py)", 503);
  }
}
