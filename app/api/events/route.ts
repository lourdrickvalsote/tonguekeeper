import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/utils/errors";
import { apiError } from "@/lib/utils/api-response";

const WS_SERVER_URL =
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

export const dynamic = "force-dynamic";

/**
 * GET /api/events — SSE proxy
 *
 * Fetches the last 200 events from the WS server's /events HTTP endpoint
 * and streams them as Server-Sent Events. Falls back gracefully if the
 * WS server is unreachable.
 */
export async function GET() {
  try {
    // Fetch the ring buffer snapshot from the WS server
    const res = await fetch(`${WS_SERVER_URL}/events`, {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    if (!res.ok) {
      return apiError(`WS server returned ${res.status}`, 502);
    }

    const events = await res.json();

    // Stream the events as SSE so the frontend polling fallback works
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const event of events as unknown[]) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    return apiError(`WS server unreachable: ${getErrorMessage(err)}`, 503);
  }
}
