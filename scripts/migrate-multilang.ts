/**
 * Migration script for multi-language support.
 *
 * Performs 3 operations on the live `language_resources` index:
 * 1. Adds `language_name` field mapping (keyword) if missing
 * 2. Backfills `language_name: "Jejueo"` on existing Jeju entries
 * 3. Renames `jejueo` → `target` and `korean` → `contact` in example_sentences
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage: npx tsx scripts/migrate-multilang.ts
 */

import "dotenv/config";
import { Client } from "@elastic/elasticsearch";
import { getErrorMessage } from "../lib/utils/errors.js";

const INDEX = "language_resources";
const GRAMMAR_INDEX = "grammar_patterns";

function getClient(): Client {
  const node = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;
  if (!node || !apiKey) {
    throw new Error("Missing ELASTIC_URL or ELASTIC_API_KEY");
  }
  return new Client({ node, auth: { apiKey } });
}

async function main() {
  const client = getClient();

  console.log("=== Multi-Language Migration ===\n");

  // ─── Step 1: Add language_name mapping ───────────────────────────────────

  console.log("Step 1: Adding language_name mapping to language_resources...");
  try {
    await client.indices.putMapping({
      index: INDEX,
      properties: {
        language_name: { type: "keyword" },
      },
    });
    console.log("  ✅ language_name mapping added (keyword)\n");
  } catch (err) {
    const msg = getErrorMessage(err);
    if (msg.includes("already exists") || msg.includes("merge")) {
      console.log("  ℹ️  language_name mapping already exists\n");
    } else {
      console.error("  ❌ Failed:", msg);
    }
  }

  // Also add target/contact mappings for example_sentences (legacy index may only have jejueo/korean)
  console.log("Step 1b: Adding target/contact mappings for example_sentences...");
  try {
    await client.indices.putMapping({
      index: INDEX,
      properties: {
        example_sentences: {
          type: "nested",
          properties: {
            target: { type: "text" },
            contact: { type: "text" },
          },
        },
      },
    });
    console.log("  ✅ target/contact mappings added\n");
  } catch (err) {
    const msg = getErrorMessage(err);
    if (msg.includes("already exists") || msg.includes("merge")) {
      console.log("  ℹ️  target/contact mappings already exist\n");
    } else {
      console.error("  ❌ Failed:", msg);
    }
  }

  // Add differences_from_contact mapping to grammar_patterns
  console.log("Step 1c: Adding differences_from_contact mapping to grammar_patterns...");
  try {
    await client.indices.putMapping({
      index: GRAMMAR_INDEX,
      properties: {
        differences_from_contact: { type: "text" },
        language_code: { type: "keyword" },
        examples: {
          type: "nested",
          properties: {
            target: { type: "text" },
            contact: { type: "text" },
          },
        },
      },
    });
    console.log("  ✅ grammar_patterns mappings updated\n");
  } catch (err) {
    const msg = getErrorMessage(err);
    if (msg.includes("already exists") || msg.includes("merge")) {
      console.log("  ℹ️  Mappings already exist\n");
    } else {
      console.error("  ❌ Failed:", msg);
    }
  }

  // ─── Step 2: Backfill language_name on Jeju entries ──────────────────────

  console.log("Step 2: Backfilling language_name='Jejueo' on Jeju entries...");
  try {
    const result = await client.updateByQuery({
      index: INDEX,
      query: {
        bool: {
          must: [{ term: { language_code: "jje" } }],
          must_not: [{ exists: { field: "language_name" } }],
        },
      },
      script: {
        source: "ctx._source.language_name = params.name",
        params: { name: "Jejueo" },
      },
      refresh: true,
    });
    console.log(`  ✅ Updated ${result.updated ?? 0} entries\n`);
  } catch (err) {
    console.error("  ❌ Failed:", getErrorMessage(err));
  }

  // ─── Step 3: Rename jejueo→target, korean→contact in example_sentences ──

  console.log("Step 3: Renaming jejueo→target, korean→contact in example_sentences...");
  try {
    const result = await client.updateByQuery({
      index: INDEX,
      query: {
        nested: {
          path: "example_sentences",
          query: {
            exists: { field: "example_sentences.jejueo" },
          },
        },
      },
      script: {
        source: `
          if (ctx._source.example_sentences != null) {
            for (def ex : ctx._source.example_sentences) {
              if (ex.containsKey('jejueo') && !ex.containsKey('target')) {
                ex.target = ex.jejueo;
              }
              if (ex.containsKey('korean') && !ex.containsKey('contact')) {
                ex.contact = ex.korean;
              }
            }
          }
        `,
      },
      refresh: true,
    });
    console.log(`  ✅ Updated ${result.updated ?? 0} documents\n`);
  } catch (err) {
    console.error("  ❌ Failed:", getErrorMessage(err));
  }

  // Also migrate grammar_patterns examples
  console.log("Step 3b: Renaming jejueo→target, korean→contact in grammar_patterns examples...");
  try {
    const result = await client.updateByQuery({
      index: GRAMMAR_INDEX,
      query: {
        nested: {
          path: "examples",
          query: {
            exists: { field: "examples.jejueo" },
          },
        },
      },
      script: {
        source: `
          if (ctx._source.examples != null) {
            for (def ex : ctx._source.examples) {
              if (ex.containsKey('jejueo') && !ex.containsKey('target')) {
                ex.target = ex.jejueo;
              }
              if (ex.containsKey('korean') && !ex.containsKey('contact')) {
                ex.contact = ex.korean;
              }
            }
          }
          if (ctx._source.containsKey('differences_from_korean') && !ctx._source.containsKey('differences_from_contact')) {
            ctx._source.differences_from_contact = ctx._source.differences_from_korean;
          }
        `,
      },
      refresh: true,
    });
    console.log(`  ✅ Updated ${result.updated ?? 0} grammar patterns\n`);
  } catch (err) {
    console.error("  ❌ Failed:", getErrorMessage(err));
  }

  console.log("=== Migration Complete ===");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
