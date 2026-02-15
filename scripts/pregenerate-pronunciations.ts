/**
 * Pre-generate HeyGen pronunciation videos for the 20 most common Jeju words.
 * Results are cached in Cloudflare KV for fast retrieval.
 *
 * Usage: npx tsx scripts/pregenerate-pronunciations.ts
 */

import dotenv from "dotenv";
import path from "path";
import { batchGeneratePronunciations } from "../lib/heygen";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const COMMON_JEJU_WORDS = [
  "하르방",   // grandfather
  "할망",     // grandmother
  "바당",     // sea
  "하영",     // many/much
  "수다",     // talk
  "혼저",     // welcome
  "감수광",   // tangerine
  "해녀",     // woman diver
  "갈옷",     // persimmon-dyed clothes
  "돌하르방", // stone grandfather statue
  "오름",     // volcanic cone
  "곶자왈",   // lava forest
  "놈삭",     // seaweed
  "이녁",     // you
  "무사",     // why
  "경",       // so/therefore
  "느영나영", // together
  "촐래",     // quickly
  "졸라",     // very
  "멩질",     // holiday
];

async function main() {
  if (!process.env.HEYGEN_API_KEY) {
    console.error("Error: HEYGEN_API_KEY is not set in .env.local");
    process.exit(1);
  }

  console.log(`Pre-generating pronunciation videos for ${COMMON_JEJU_WORDS.length} Jeju words...\n`);

  const results = await batchGeneratePronunciations(COMMON_JEJU_WORDS);

  console.log(`\n=== Results ===`);
  console.log(`Generated: ${results.size} / ${COMMON_JEJU_WORDS.length}`);

  for (const [word, url] of results) {
    console.log(`  ${word} → ${url}`);
  }
}

main().catch((err) => {
  console.error("Pre-generation failed:", err);
  process.exit(1);
});
