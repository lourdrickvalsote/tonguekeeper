import { NextRequest, NextResponse } from "next/server";
import { generatePronunciationVideo } from "@/lib/heygen";
import { getErrorMessage } from "@/lib/utils/errors";
import { apiError } from "@/lib/utils/api-response";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, audio_url, avatar_id, language } = body as {
      word?: string;
      audio_url?: string;
      avatar_id?: string;
      language?: string;
    };

    if (!word) {
      return apiError("Missing required field: word", 400);
    }

    if (!process.env.HEYGEN_API_KEY) {
      return apiError("HEYGEN_API_KEY is not configured", 503);
    }

    const result = await generatePronunciationVideo(word, {
      audio_url,
      avatar_id,
      language,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = getErrorMessage(err);
    console.error("[/api/heygen/pronounce] Failed:", message);

    if (message.includes("creation failed")) {
      return apiError(message, 502);
    }

    return apiError("Could not generate pronunciation video", 503);
  }
}
