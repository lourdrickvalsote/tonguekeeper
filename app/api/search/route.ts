import { NextRequest, NextResponse } from "next/server";
import { search, browse } from "@/lib/elastic";
import { getErrorMessage } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 20, offset = 0, cluster, language_code } = body as {
      query?: string;
      limit?: number;
      offset?: number;
      cluster?: string;
      language_code?: string;
    };

    if (!query) {
      // Browse mode: return recent entries
      try {
        const { entries, total } = await browse({ limit, offset, cluster, language_code });
        return NextResponse.json({ results: entries, total });
      } catch (err) {
        console.warn("[/api/search] Browse failed:", getErrorMessage(err));
        return NextResponse.json({ results: [], total: 0 });
      }
    }

    try {
      let { entries, total } = await search(query, { limit, offset, language_code });

      // Post-filter by semantic cluster if provided
      if (cluster && cluster !== "all") {
        entries = entries.filter(
          (entry) => entry.semantic_cluster === cluster
        );
      }

      return NextResponse.json({ results: entries, total });
    } catch (err) {
      console.warn("[/api/search] Elastic unavailable:", getErrorMessage(err));
      return NextResponse.json({ results: [], total: 0 });
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
