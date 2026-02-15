import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/elastic";
import { downloadAudio } from "@/lib/audio-store";
import type { ElasticDocument } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils/errors";
import { apiError } from "@/lib/utils/api-response";

const INDEX_NAME = "language_resources";

/**
 * POST /api/audio/download
 *
 * Downloads audio files referenced by entries in Elasticsearch and uploads
 * them to Cloudflare R2. Updates entries with R2 URLs once uploaded.
 *
 * Body: { limit?: number } — max entries to process (default 100)
 * Returns: { processed: number, downloaded: number, failed: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = (body as { limit?: number }).limit || 100;

    const client = getClient();

    // Find entries with external audio URLs (not already on R2)
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL || "";
    const response = await client.search<ElasticDocument>({
      index: INDEX_NAME,
      size: limit,
      query: {
        bool: {
          must: [
            { exists: { field: "audio_url" } },
            { prefix: { audio_url: "http" } },
          ],
          must_not: workerUrl
            ? { prefix: { audio_url: workerUrl } }
            : { match_none: {} },
        },
      },
      _source: ["audio_url", "language_code"],
    });

    const hits = response.hits.hits.filter(
      (h) => h._source?.audio_url && h._source.audio_url.startsWith("http")
    );

    let downloaded = 0;
    let failed = 0;

    for (const hit of hits) {
      const url = hit._source!.audio_url!;
      const langCode = hit._source!.language_code;
      const r2Url = await downloadAudio(url, langCode);

      if (r2Url) {
        await client.update({
          index: INDEX_NAME,
          id: hit._id!,
          doc: { audio_url: r2Url },
        });
        downloaded++;
      } else {
        failed++;
      }
    }

    if (downloaded > 0) {
      await client.indices.refresh({ index: INDEX_NAME });
    }

    return NextResponse.json({
      processed: hits.length,
      downloaded,
      failed,
    });
  } catch (err) {
    console.error("[/api/audio/download] Failed:", getErrorMessage(err));
    return apiError("Audio download failed: " + getErrorMessage(err), 500);
  }
}
