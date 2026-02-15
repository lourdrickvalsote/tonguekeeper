import { config } from "dotenv";
config({ path: ".env.local" });

import { Client } from "@elastic/elasticsearch";
import { ENDANGERED_LANGUAGE_ANALYSIS } from "./elastic-analyzers";
import { scrollAll, bulkIndex } from "../lib/elastic";
import type { VocabularyEntry, GrammarPattern } from "../lib/types";

const INDEX_NAME = "language_resources";
const GRAMMAR_INDEX = "grammar_patterns";

// ---------------------------------------------------------------------------
// Scroll all grammar patterns (mirrors scrollAll for vocabulary)
// ---------------------------------------------------------------------------

async function scrollAllGrammar(client: Client): Promise<(GrammarPattern & { language_code?: string })[]> {
  const patterns: (GrammarPattern & { language_code?: string })[] = [];

  let response = await client.search<GrammarPattern & { language_code?: string }>({
    index: GRAMMAR_INDEX,
    scroll: "1m",
    size: 1000,
    query: { match_all: {} },
    _source: { excludes: ["embedding"] },
    sort: [{ created_at: "desc" }],
  });

  while (response.hits.hits.length > 0) {
    for (const hit of response.hits.hits) {
      if (hit._source) patterns.push(hit._source);
    }

    if (!response._scroll_id) break;

    response = await client.scroll<GrammarPattern & { language_code?: string }>({
      scroll_id: response._scroll_id,
      scroll: "1m",
    });
  }

  if (response._scroll_id) {
    await client.clearScroll({ scroll_id: response._scroll_id }).catch(() => {});
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// Index creation with new analyzers (shared with setup-elastic.ts)
// ---------------------------------------------------------------------------

async function createLanguageResourcesIndex(client: Client) {
  await client.indices.create({
    index: INDEX_NAME,
    settings: {
      analysis: ENDANGERED_LANGUAGE_ANALYSIS,
    },
    mappings: {
      properties: {
        id: { type: "keyword" },
        language_code: { type: "keyword" },
        glottocode: { type: "keyword" },
        language_name: { type: "keyword" },

        headword_native: {
          type: "keyword",
          fields: {
            text: { type: "text", analyzer: "korean_text" },
            partial: { type: "text", analyzer: "agglutinative_text", search_analyzer: "standard" },
          },
        },

        headword_romanized: {
          type: "keyword",
          fields: {
            text: { type: "text", analyzer: "standard" },
            normalized: { type: "text", analyzer: "romanized_text" },
          },
        },

        pos: { type: "keyword" },

        definitions: {
          type: "nested",
          properties: {
            language: { type: "keyword" },
            text: { type: "text" },
          },
        },

        example_sentences: {
          type: "nested",
          properties: {
            target: { type: "text" },
            contact: { type: "text", analyzer: "korean_text" },
            english: { type: "text", analyzer: "standard" },
            source_url: { type: "keyword" },
            jejueo: { type: "text" },
            korean: { type: "text", analyzer: "korean_text" },
          },
        },

        audio_url: { type: "keyword" },
        related_terms: { type: "keyword" },
        semantic_cluster: { type: "keyword" },

        cross_references: {
          type: "nested",
          properties: {
            source_title: { type: "text" },
            source_url: { type: "keyword" },
            source_type: { type: "keyword" },
          },
        },

        cultural_context: { type: "text" },

        ipa: {
          type: "keyword",
          fields: {
            searchable: { type: "text", analyzer: "ipa_search" },
          },
        },

        conjugations: {
          type: "nested",
          properties: {
            form: { type: "keyword" },
            native: { type: "keyword" },
            romanized: {
              type: "keyword",
              fields: {
                normalized: { type: "text", analyzer: "romanized_text" },
              },
            },
            notes: { type: "text" },
          },
        },

        morphology: {
          type: "object",
          properties: {
            root: { type: "keyword" },
            root_romanized: {
              type: "keyword",
              fields: {
                normalized: { type: "text", analyzer: "romanized_text" },
              },
            },
            affixes: { type: "keyword" },
            compound_parts: { type: "keyword" },
            derivation_notes: { type: "text" },
          },
        },

        usage: {
          type: "object",
          properties: {
            register: { type: "keyword" },
            frequency: { type: "keyword" },
            age_group: { type: "keyword" },
            geographic_note: { type: "text" },
          },
        },

        grammar_notes: { type: "text" },

        embedding: {
          type: "dense_vector",
          dims: 1024,
          index: true,
          similarity: "cosine",
        },

        created_at: { type: "date" },
      },
    },
  });
}

async function createGrammarPatternsIndex(client: Client) {
  await client.indices.create({
    index: GRAMMAR_INDEX,
    settings: {
      analysis: ENDANGERED_LANGUAGE_ANALYSIS,
    },
    mappings: {
      properties: {
        id: { type: "keyword" },

        title: {
          type: "text",
          fields: { keyword: { type: "keyword" } },
        },

        title_native: {
          type: "keyword",
          fields: {
            text: { type: "text", analyzer: "korean_text" },
            partial: { type: "text", analyzer: "agglutinative_text", search_analyzer: "standard" },
          },
        },

        category: { type: "keyword" },
        description: { type: "text" },
        rule: { type: "text" },

        examples: {
          type: "nested",
          properties: {
            target: { type: "text" },
            contact: { type: "text", analyzer: "korean_text" },
            english: { type: "text", analyzer: "standard" },
            annotation: { type: "text" },
            jejueo: { type: "text" },
            korean: { type: "text", analyzer: "korean_text" },
          },
        },

        language_code: { type: "keyword" },
        related_vocabulary: { type: "keyword" },
        differences_from_contact: { type: "text" },
        source_urls: { type: "keyword" },
        confidence: { type: "keyword" },

        embedding: {
          type: "dense_vector",
          dims: 1024,
          index: true,
          similarity: "cosine",
        },

        created_at: { type: "date" },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Main: scroll -> delete -> recreate -> re-insert
// ---------------------------------------------------------------------------

async function main() {
  const node = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;

  if (!node || !apiKey) {
    console.error("Missing ELASTIC_URL or ELASTIC_API_KEY in .env.local");
    process.exit(1);
  }

  const client = new Client({ node, auth: { apiKey } });

  // Verify connection
  const info = await client.info();
  console.log(`Connected to Elasticsearch ${info.version.number}`);

  // ── Phase 1: Extract all data ──────────────────────────────────────────

  console.log("\n--- Phase 1: Extracting data ---");

  let vocabEntries: VocabularyEntry[] = [];
  let vocabLangCode = "jje";
  let vocabGlottocode: string | undefined;
  let vocabLangName: string | undefined;

  const vocabExists = await client.indices.exists({ index: INDEX_NAME });
  if (vocabExists) {
    console.log(`Scrolling all documents from "${INDEX_NAME}"...`);
    vocabEntries = await scrollAll();
    console.log(`  Found ${vocabEntries.length} vocabulary entries`);

    // Extract metadata from first entry
    if (vocabEntries.length > 0) {
      const first = vocabEntries[0] as unknown as Record<string, unknown>;
      vocabLangCode = (first.language_code as string) || "jje";
      vocabGlottocode = first.glottocode as string | undefined;
      vocabLangName = first.language_name as string | undefined;
    }
  } else {
    console.log(`Index "${INDEX_NAME}" does not exist, will create empty.`);
  }

  let grammarPatterns: (GrammarPattern & { language_code?: string })[] = [];
  let grammarLangCode = "jje";

  const grammarExists = await client.indices.exists({ index: GRAMMAR_INDEX });
  if (grammarExists) {
    console.log(`Scrolling all documents from "${GRAMMAR_INDEX}"...`);
    grammarPatterns = await scrollAllGrammar(client);
    console.log(`  Found ${grammarPatterns.length} grammar patterns`);

    if (grammarPatterns.length > 0 && grammarPatterns[0].language_code) {
      grammarLangCode = grammarPatterns[0].language_code;
    }
  } else {
    console.log(`Index "${GRAMMAR_INDEX}" does not exist, will create empty.`);
  }

  // ── Phase 2: Delete and recreate indices ───────────────────────────────

  console.log("\n--- Phase 2: Recreating indices with new analyzers ---");

  if (vocabExists) {
    console.log(`Deleting "${INDEX_NAME}"...`);
    await client.indices.delete({ index: INDEX_NAME });
  }

  if (grammarExists) {
    console.log(`Deleting "${GRAMMAR_INDEX}"...`);
    await client.indices.delete({ index: GRAMMAR_INDEX });
  }

  console.log(`Creating "${INDEX_NAME}" with endangered language analyzers...`);
  await createLanguageResourcesIndex(client);
  console.log(`  Done.`);

  console.log(`Creating "${GRAMMAR_INDEX}" with endangered language analyzers...`);
  await createGrammarPatternsIndex(client);
  console.log(`  Done.`);

  // ── Phase 3: Re-insert data ────────────────────────────────────────────

  console.log("\n--- Phase 3: Re-inserting data ---");

  if (vocabEntries.length > 0) {
    console.log(`Re-indexing ${vocabEntries.length} vocabulary entries...`);
    const BATCH_SIZE = 200;
    let totalIndexed = 0;

    for (let i = 0; i < vocabEntries.length; i += BATCH_SIZE) {
      const batch = vocabEntries.slice(i, i + BATCH_SIZE);
      const result = await bulkIndex(batch, vocabLangCode, vocabGlottocode, vocabLangName);
      totalIndexed += result.indexed;
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.indexed}/${batch.length} indexed (${totalIndexed}/${vocabEntries.length} total)`);
    }

    console.log(`  Vocabulary re-indexing complete: ${totalIndexed}/${vocabEntries.length}`);
  }

  if (grammarPatterns.length > 0) {
    // Use dynamic import to avoid circular dependency
    const { bulkIndexGrammarPatterns } = await import("../lib/elastic");

    console.log(`Re-indexing ${grammarPatterns.length} grammar patterns...`);
    const result = await bulkIndexGrammarPatterns(grammarPatterns, grammarLangCode);
    console.log(`  Grammar re-indexing complete: ${result.indexed}/${grammarPatterns.length}`);
  }

  // ── Phase 4: Verify ────────────────────────────────────────────────────

  console.log("\n--- Phase 4: Verification ---");

  const vocabCount = await client.count({ index: INDEX_NAME });
  const grammarCount = await client.count({ index: GRAMMAR_INDEX });

  console.log(`  ${INDEX_NAME}: ${vocabCount.count} documents`);
  console.log(`  ${GRAMMAR_INDEX}: ${grammarCount.count} documents`);

  // Test the new analyzers
  console.log("\nAnalyzer tests:");

  try {
    const romanizedTest = await client.indices.analyze({
      index: INDEX_NAME,
      analyzer: "romanized_text",
      text: "halm\u014Fni",
    });
    console.log(`  romanized_text("halm\u014Fni") -> [${romanizedTest.tokens?.map(t => t.token).join(", ")}]`);
  } catch {
    console.log("  romanized_text test: skipped (index may be empty)");
  }

  try {
    const ipaTest = await client.indices.analyze({
      index: INDEX_NAME,
      analyzer: "ipa_search",
      text: "/pwada/",
    });
    console.log(`  ipa_search("/pwada/") -> [${ipaTest.tokens?.map(t => t.token).join(", ")}]`);
  } catch {
    console.log("  ipa_search test: skipped");
  }

  try {
    const ngramTest = await client.indices.analyze({
      index: INDEX_NAME,
      analyzer: "agglutinative_text",
      text: "\uD558\uB974\uBC29",
    });
    console.log(`  agglutinative_text("\uD558\uB974\uBC29") -> [${ngramTest.tokens?.map(t => t.token).join(", ")}]`);
  } catch {
    console.log("  agglutinative_text test: skipped");
  }

  console.log("\nReindex complete. New analyzers are active.");
  console.log("Analyzers: korean_text, romanized_text, agglutinative_text, ipa_search");
}

main().catch((err) => {
  console.error("Reindex failed:", err);
  process.exit(1);
});
