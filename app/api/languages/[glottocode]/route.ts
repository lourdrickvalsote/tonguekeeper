import { NextRequest, NextResponse } from "next/server";
import { getLanguage } from "@/lib/elastic";
import { kvGet, kvSet, cacheKeys, TTL } from "@/lib/kv-cache";
import type { LanguageEntry } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils/errors";
import { apiError } from "@/lib/utils/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ glottocode: string }> }
) {
  const { glottocode } = await params;

  try {
    // Check cache
    const cacheKey = cacheKeys.language(glottocode);
    const cached = await kvGet<LanguageEntry>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const language = await getLanguage(glottocode);

    if (!language) {
      return apiError("Language not found", 404);
    }

    // Cache for 1 hour
    await kvSet(cacheKey, language, TTL.LANGUAGE);

    return NextResponse.json(language);
  } catch (err) {
    console.warn(`[/api/languages/${glottocode}] Failed:`, getErrorMessage(err));
    return apiError("Failed to fetch language", 500);
  }
}
