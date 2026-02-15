import { ProxyAgent, fetch as proxyFetch, Agent } from "undici";
import * as cheerio from "cheerio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RawEntry {
  headword: string;
  definition: string;
  pos?: string;
  source_url: string;
}

export interface BulkScrapeConfig {
  base_url: string;
  page_pattern: string; // e.g. "?page={n}" — {n} replaced with page number
  entry_selector: string; // CSS selector for entry containers
  fields: {
    headword: string; // CSS selector within entry for headword
    definition: string; // CSS selector within entry for definition
    pos?: string; // CSS selector within entry for part of speech
  };
  max_pages?: number; // default: 100
  start_page?: number; // default: 1
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROXY_TIMEOUT_MS = 15_000;
const BULK_CONCURRENCY = 10;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface BrightDataConfig {
  host: string;
  port: string;
  username: string;
  password: string;
}

function getBrightDataConfig(): BrightDataConfig {
  const host = process.env.BRIGHTDATA_PROXY_HOST;
  const port = process.env.BRIGHTDATA_PROXY_PORT;
  const username = process.env.BRIGHTDATA_PROXY_USERNAME;
  const password = process.env.BRIGHTDATA_PROXY_PASSWORD;

  if (!host || !port || !username || !password) {
    throw new Error(
      "BrightData not configured: set BRIGHTDATA_PROXY_HOST, BRIGHTDATA_PROXY_PORT, BRIGHTDATA_PROXY_USERNAME, BRIGHTDATA_PROXY_PASSWORD"
    );
  }

  return { host, port, username, password };
}

/**
 * Check if BrightData proxy is configured (all 3 env vars set).
 * Non-throwing — safe to call in conditional checks.
 */
export function brightDataConfigured(): boolean {
  return !!(
    process.env.BRIGHTDATA_PROXY_HOST &&
    process.env.BRIGHTDATA_PROXY_PORT &&
    process.env.BRIGHTDATA_PROXY_USERNAME &&
    process.env.BRIGHTDATA_PROXY_PASSWORD
  );
}

// ---------------------------------------------------------------------------
// Proxy Fetch
// ---------------------------------------------------------------------------

/**
 * Fetch a URL through BrightData's residential proxy.
 * Use for Korean government sites or other geo-blocked content.
 *
 * @returns The raw HTML content of the page.
 * @throws If BrightData is not configured or the request fails.
 */
export async function fetchViaProxy(url: string, country?: string): Promise<string> {
  const { host, port, username, password } = getBrightDataConfig();
  const user = country ? `${username}-country-${country}` : username;
  const proxyUrl = `http://${user}:${password}@${host}:${port}`;
  const agent = new ProxyAgent({
    uri: proxyUrl,
    requestTls: { rejectUnauthorized: false },
  });

  const res = await proxyFetch(url, {
    dispatcher: agent,
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.5,en;q=0.3",
    },
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Proxy fetch failed (${res.status}): ${url}`);
  }

  return res.text();
}

// ---------------------------------------------------------------------------
// Bulk Dictionary Scraping
// ---------------------------------------------------------------------------

/**
 * Scrape a paginated dictionary site in bulk through BrightData proxy.
 * Fetches pages concurrently (10 at a time) and parses entries with cheerio.
 *
 * Stops when a page returns zero entries (end of pagination) or max_pages is reached.
 *
 * @example
 * const entries = await bulkScrapeDictionary({
 *   base_url: "https://dict.jeju.go.kr/search",
 *   page_pattern: "?page={n}",
 *   entry_selector: ".dict-entry",
 *   fields: {
 *     headword: ".entry-word",
 *     definition: ".entry-def",
 *     pos: ".entry-pos",
 *   },
 *   max_pages: 200,
 * });
 */
export async function bulkScrapeDictionary(
  config: BulkScrapeConfig
): Promise<RawEntry[]> {
  const maxPages = config.max_pages ?? 100;
  const startPage = config.start_page ?? 1;
  const allEntries: RawEntry[] = [];
  let reachedEnd = false;
  let totalFailed = 0;

  console.log(
    `[brightdata] Starting bulk scrape: ${config.base_url} (pages ${startPage}-${startPage + maxPages - 1})`
  );

  for (
    let batch = startPage;
    batch <= startPage + maxPages - 1 && !reachedEnd;
    batch += BULK_CONCURRENCY
  ) {
    const pageNumbers = Array.from(
      { length: Math.min(BULK_CONCURRENCY, startPage + maxPages - batch) },
      (_, i) => batch + i
    );

    const results = await Promise.allSettled(
      pageNumbers.map((n) => fetchAndParsePage(n, config))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.length === 0) {
          reachedEnd = true;
          break;
        }
        allEntries.push(...result.value);
      } else {
        totalFailed++;
        console.warn(
          `[brightdata] Page fetch failed: ${result.reason}`
        );
      }
    }

    console.log(
      `[brightdata] Progress: ${allEntries.length} entries from ${batch + pageNumbers.length - startPage} pages (${totalFailed} failed)`
    );
  }

  console.log(
    `[brightdata] Bulk scrape complete: ${allEntries.length} entries total`
  );

  return allEntries;
}

// ---------------------------------------------------------------------------
// Internal: Fetch & Parse a Single Page
// ---------------------------------------------------------------------------

async function fetchAndParsePage(
  pageNum: number,
  config: BulkScrapeConfig
): Promise<RawEntry[]> {
  const url =
    config.base_url + config.page_pattern.replace("{n}", String(pageNum));

  const html = await fetchViaProxy(url);
  const $ = cheerio.load(html);
  const entries: RawEntry[] = [];

  $(config.entry_selector).each((_, el) => {
    const $entry = $(el);

    const headword = $entry.find(config.fields.headword).text().trim();
    const definition = $entry.find(config.fields.definition).text().trim();
    const pos = config.fields.pos
      ? $entry.find(config.fields.pos).text().trim() || undefined
      : undefined;

    // Skip entries missing required fields
    if (!headword || !definition) return;

    entries.push({
      headword,
      definition,
      pos,
      source_url: url,
    });
  });

  return entries;
}
