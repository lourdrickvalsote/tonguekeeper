import { getErrorMessage } from "./utils/errors";

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

/**
 * Download an audio file from a URL and upload it to Cloudflare R2.
 * Returns the R2-served URL or null on failure.
 */
export async function downloadAudio(url: string, languageCode?: string): Promise<string | null> {
  if (!CLOUDFLARE_WORKER_URL) {
    console.warn("[audio-store] CLOUDFLARE_WORKER_URL not set, skipping R2 upload");
    return null;
  }

  try {
    // Generate deterministic key from URL
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(url)
    );
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);

    const ext = new URL(url).pathname.split(".").pop()?.match(/^(mp3|wav|ogg|m4a|webm)$/)
      ? `.${new URL(url).pathname.split(".").pop()}`
      : ".mp3";
    const key = languageCode
      ? `audio/${languageCode}/${hashHex}${ext}`
      : `audio/${hashHex}${ext}`;

    // Check if already uploaded to R2
    const checkRes = await fetch(`${CLOUDFLARE_WORKER_URL}/audio/${key}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5_000),
    });
    if (checkRes.ok) {
      return `${CLOUDFLARE_WORKER_URL}/audio/${key}`;
    }

    // Download from source
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[audio-store] HTTP ${res.status} for ${url}`);
      return null;
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      console.warn(`[audio-store] File too large (${contentLength} bytes): ${url}`);
      return null;
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_FILE_SIZE) {
      console.warn(`[audio-store] File too large (${buffer.byteLength} bytes): ${url}`);
      return null;
    }

    // Upload to R2 via Cloudflare Worker
    const uploadRes = await fetch(`${CLOUDFLARE_WORKER_URL}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Key": key,
      },
      body: buffer,
      signal: AbortSignal.timeout(30_000),
    });

    if (!uploadRes.ok) {
      console.warn(`[audio-store] R2 upload failed: ${uploadRes.status}`);
      return null;
    }

    return `${CLOUDFLARE_WORKER_URL}/audio/${key}`;
  } catch (err) {
    console.warn(`[audio-store] Failed to download ${url}: ${getErrorMessage(err)}`);
    return null;
  }
}
