import { NextRequest, NextResponse } from "next/server";
import {
  dispatchCrawl,
  isCrawlError,
  type ExtractionType,
} from "@/lib/crawlers/dispatch";
import { apiError } from "@/lib/utils/api-response";

const WS_SERVER_URL =
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

// Fire-and-forget event emission to the WS server
async function emitCrawlEvent(
  action: string,
  status: "running" | "complete" | "error",
  data: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(`${WS_SERVER_URL}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent: "orchestrator",
        action: `crawl_${action}`,
        status,
        data,
      }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Fire-and-forget: crawl still succeeds if event emission fails
  }
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { url?: string; extraction_type?: ExtractionType };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  if (!body.url || typeof body.url !== "string") {
    return apiError("Missing required field: url", 400);
  }

  const { url, extraction_type = "generic" } = body;

  // Emit started event
  emitCrawlEvent("started", "running", {
    url,
    message: `Crawling ${url}...`,
  });

  const result = await dispatchCrawl(url, extraction_type);

  if (isCrawlError(result)) {
    emitCrawlEvent("failed", "error", {
      url,
      message: result.message,
    });
    return NextResponse.json(result, { status: 502 });
  }

  emitCrawlEvent("complete", "complete", {
    url,
    title: result.metadata.title,
    message: `Crawled ${result.metadata.title} (${result.content.length} chars)`,
    crawl_method: result.metadata.crawl_method,
    crawl_strategy: result.metadata.crawl_strategy,
    crawl_pages: result.metadata.crawl_pages,
    browserbase_url: result.metadata.browserbase_url,
  });

  return NextResponse.json(result);
}
