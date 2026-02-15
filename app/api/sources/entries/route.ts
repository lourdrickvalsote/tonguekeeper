import { NextRequest, NextResponse } from "next/server";
import { getEntriesBySource } from "@/lib/elastic";
import { getErrorMessage } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const { source_url, language_code, limit } = (await request.json()) as {
      source_url: string;
      language_code?: string;
      limit?: number;
    };

    if (!source_url) {
      return NextResponse.json(
        { error: "source_url is required" },
        { status: 400 }
      );
    }

    const { entries, total } = await getEntriesBySource(source_url, {
      language_code,
      limit,
    });

    return NextResponse.json({ entries, total });
  } catch (err) {
    console.warn(
      "[/api/sources/entries] Error:",
      getErrorMessage(err)
    );
    return NextResponse.json({ entries: [], total: 0 });
  }
}
