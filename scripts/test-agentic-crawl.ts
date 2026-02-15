/**
 * Test script for agentic browsing + source triage + country-aware crawling.
 *
 * Usage: npx tsx scripts/test-agentic-crawl.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { brightdataScrapeMarkdown, brightDataMCPConfigured } from "../lib/apis/brightdata-mcp";
import { dispatchCrawl } from "../lib/crawlers/dispatch";
import { getErrorMessage } from "../lib/utils/errors.js";

async function testBrightDataCountry() {
  console.log("\n=== Test 1: BrightData MCP with country param ===\n");

  if (!brightDataMCPConfigured()) {
    console.log("SKIP — BRIGHTDATA_API_TOKEN not set");
    return;
  }

  // Scrape a Korean page with country=KR for geo-targeted access
  const url = "https://ko.wikipedia.org/wiki/%EC%A0%9C%EC%A3%BC%EC%96%B4";
  console.log(`Scraping ${url} with country=KR...`);

  try {
    const md = await brightdataScrapeMarkdown(url, "KR");
    console.log(`✓ Got ${md.length} chars of markdown`);
    console.log(`  First 200 chars: ${md.slice(0, 200).replace(/\n/g, " ")}...`);
  } catch (err) {
    console.error(`✗ Failed: ${getErrorMessage(err)}`);
  }
}

async function testSourceTriage() {
  console.log("\n=== Test 2: Source Triage (dead URL should skip Stagehand) ===\n");

  // This URL should be inaccessible — triage should prevent Stagehand launch
  const deadUrl = "https://thisdomaindoesnotexist12345.example.com/page";
  console.log(`Crawling dead URL: ${deadUrl}`);
  console.log("Expected: Should fail quickly without launching Stagehand\n");

  const start = Date.now();
  try {
    const result = await dispatchCrawl(deadUrl, "generic", {
      language_code: "jje",
      language_name: "Jejueo",
      countries: ["KR"],
    });
    console.log(`Result: ${JSON.stringify(result).slice(0, 200)}`);
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`✓ Failed in ${elapsed}ms: ${getErrorMessage(err)}`);
    if (elapsed < 15_000) {
      console.log("  ✓ Fast failure — Stagehand was NOT launched (triage worked)");
    } else {
      console.log("  ⚠ Slow failure — Stagehand may have been launched");
    }
  }
}

async function testAgenticBrowsing() {
  console.log("\n=== Test 3: Agentic Browsing (observe → classify → execute) ===\n");

  if (!process.env.BROWSERBASE_API_KEY) {
    console.log("SKIP — BROWSERBASE_API_KEY not set");
    return;
  }

  // Test with Endangered Languages Project — has pagination
  const url = "https://www.endangeredlanguages.com/lang/country/Korea,%20South";
  console.log(`Crawling ${url}`);
  console.log("Expected: Stagehand should classify page type and use appropriate strategy\n");

  const start = Date.now();
  try {
    const result = await dispatchCrawl(url, "generic", {
      language_code: "jje",
      language_name: "Jejueo",
      countries: ["KR"],
    });

    if ("error" in result) {
      console.log(`✗ CrawlError: ${result.message}`);
    } else {
      const elapsed = Date.now() - start;
      console.log(`✓ Success in ${elapsed}ms`);
      console.log(`  Title: ${result.metadata.title}`);
      console.log(`  Type: ${result.metadata.type}`);
      console.log(`  Language: ${result.metadata.language}`);
      console.log(`  Content length: ${result.content.length} chars`);
      console.log(`  First 300 chars: ${result.content.slice(0, 300).replace(/\n/g, " ")}...`);
    }
  } catch (err) {
    console.error(`✗ Failed: ${getErrorMessage(err)}`);
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Agentic Crawl Test Suite                       ║");
  console.log("╚══════════════════════════════════════════════════╝");

  await testBrightDataCountry();
  await testSourceTriage();
  await testAgenticBrowsing();

  console.log("\n=== All tests complete ===\n");
}

main().catch(console.error);
