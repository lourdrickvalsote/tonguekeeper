import { NextRequest, NextResponse } from "next/server";
import { searchGrammarPatterns } from "@/lib/elastic";
import type { GrammarCategory } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, category, limit = 20, offset = 0, language_code } = body as {
      query?: string;
      category?: GrammarCategory;
      limit?: number;
      offset?: number;
      language_code?: string;
    };

    const { patterns, total } = await searchGrammarPatterns(
      query || "",
      { limit, offset, category, language_code }
    );

    return NextResponse.json({ patterns, total });
  } catch (err) {
    console.error("[/api/grammar] Error:", getErrorMessage(err));
    return NextResponse.json({ patterns: [], total: 0 });
  }
}
