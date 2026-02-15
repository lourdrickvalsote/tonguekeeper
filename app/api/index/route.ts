import { NextRequest, NextResponse } from "next/server";
import { bulkIndex } from "@/lib/elastic";
import type { VocabularyEntry } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils/errors";
import { apiError } from "@/lib/utils/api-response";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { entries?: VocabularyEntry[]; language_code?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const entries = body.entries;
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return apiError("Missing or empty entries array", 400);
  }

  const language_code = body.language_code;
  if (!language_code) {
    return apiError("language_code is required", 400);
  }

  try {
    const result = await bulkIndex(entries, language_code);
    return NextResponse.json({ indexed: result.indexed });
  } catch (err) {
    console.error("[/api/index] Bulk index failed:", getErrorMessage(err));
    return apiError("Indexing failed: " + getErrorMessage(err), 502);
  }
}
