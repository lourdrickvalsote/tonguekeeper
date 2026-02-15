import { NextRequest } from "next/server";
import { apiError } from "@/lib/utils/api-response";
import { getErrorMessage } from "@/lib/utils/errors";
import type { PipelineRunArtifact } from "@/lib/types";

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || "";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ languageCode: string; runId: string }> }
) {
  const { languageCode, runId } = await params;

  if (!CLOUDFLARE_WORKER_URL) {
    return apiError("Worker URL not configured", 503);
  }

  try {
    const key = `runs/${languageCode}/${runId}.json`;
    const res = await fetch(`${CLOUDFLARE_WORKER_URL}/${key}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return apiError("Run not found", 404);
    }

    const artifact: PipelineRunArtifact = await res.json();
    return Response.json(artifact);
  } catch (err) {
    return apiError(getErrorMessage(err));
  }
}
