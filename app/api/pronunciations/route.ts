import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/elastic";
import type { VocabularyEntry } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils/errors";

const INDEX_NAME = "language_resources";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { language_code, limit = 5 } = body as {
      language_code?: string;
      limit?: number;
    };

    const client = getClient();

    const filter: Record<string, unknown>[] = [
      { exists: { field: "pronunciation_video_url" } },
    ];
    if (language_code) {
      filter.push({ term: { language_code } });
    }

    const response = await client.search<VocabularyEntry>({
      index: INDEX_NAME,
      size: limit,
      query: {
        bool: { filter },
      },
      _source: [
        "id",
        "headword_native",
        "headword_romanized",
        "pos",
        "pronunciation_video_url",
        "audio_url",
        "ipa",
      ],
    });

    const entries = response.hits.hits
      .map((hit) => hit._source)
      .filter((s): s is VocabularyEntry => !!s);

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[/api/pronunciations] Error:", getErrorMessage(err));
    return NextResponse.json({ entries: [] });
  }
}
