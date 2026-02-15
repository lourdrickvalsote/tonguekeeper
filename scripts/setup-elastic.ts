import { config } from "dotenv";
config({ path: ".env.local" });
import { Client } from "@elastic/elasticsearch";
import { ENDANGERED_LANGUAGE_ANALYSIS } from "./elastic-analyzers";

const INDEX_NAME = "language_resources";
const GRAMMAR_INDEX = "grammar_patterns";
const SOURCE_OUTCOMES_INDEX = "source_outcomes";

async function main() {
  const node = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;

  if (!node || !apiKey) {
    console.error(
      "Missing env vars. Set ELASTIC_URL and ELASTIC_API_KEY in .env.local or environment."
    );
    process.exit(1);
  }

  const client = new Client({
    node,
    auth: { apiKey },
  });

  // Verify connection
  try {
    const info = await client.info();
    console.log(
      `Connected to Elasticsearch ${info.version.number} (${info.cluster_name})`
    );
  } catch (err) {
    console.error("Failed to connect to Elasticsearch:", err);
    process.exit(1);
  }

  // Check if index already exists
  const exists = await client.indices.exists({ index: INDEX_NAME });
  if (exists) {
    console.log(`Index "${INDEX_NAME}" already exists. Deleting...`);
    await client.indices.delete({ index: INDEX_NAME });
    console.log(`   Deleted.`);
  }

  // Create index with mappings
  console.log(`Creating index "${INDEX_NAME}"...`);

  await client.indices.create({
    index: INDEX_NAME,
    settings: {
      analysis: ENDANGERED_LANGUAGE_ANALYSIS,
    },
    mappings: {
      properties: {
        // --- Core vocabulary fields ---
        id: { type: "keyword" },
        language_code: { type: "keyword" },
        glottocode: { type: "keyword" },
        language_name: { type: "keyword" },

        headword_native: {
          type: "keyword",
          fields: {
            text: {
              type: "text",
              analyzer: "korean_text",
            },
            partial: {
              type: "text",
              analyzer: "agglutinative_text",
              search_analyzer: "standard",
            },
          },
        },

        headword_romanized: {
          type: "keyword",
          fields: {
            text: {
              type: "text",
              analyzer: "standard",
            },
            normalized: {
              type: "text",
              analyzer: "romanized_text",
            },
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
            // Legacy fields (backward compat with existing documents)
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

        // --- Linguistic enrichment fields ---
        ipa: {
          type: "keyword",
          fields: {
            searchable: {
              type: "text",
              analyzer: "ipa_search",
            },
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
                normalized: {
                  type: "text",
                  analyzer: "romanized_text",
                },
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
                normalized: {
                  type: "text",
                  analyzer: "romanized_text",
                },
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

        // --- Vector embedding (JINA v3, 1024 dims) ---
        embedding: {
          type: "dense_vector",
          dims: 1024,
          index: true,
          similarity: "cosine",
        },

        // --- Metadata ---
        created_at: { type: "date" },
      },
    },
  });

  console.log(`Index "${INDEX_NAME}" created successfully.`);
  console.log();
  console.log("Mapping summary:");
  console.log("  headword_native    -> keyword + text (korean_text) + partial (agglutinative_text)");
  console.log("  headword_romanized -> keyword + text (standard) + normalized (romanized_text)");
  console.log("  ipa                -> keyword + searchable (ipa_search)");
  console.log("  definitions        -> nested { language: keyword, text: text }");
  console.log("  example_sentences  -> nested { target, contact, english, source_url }");
  console.log("  cross_references   -> nested { source_title, source_url, source_type }");
  console.log("  conjugations       -> nested { form, native, romanized + normalized }");
  console.log("  morphology         -> object { root, root_romanized + normalized, affixes, ... }");
  console.log("  embedding          -> dense_vector (1024 dims, cosine, HNSW indexed)");
  console.log("  + language_code, pos, audio_url, related_terms, semantic_cluster, cultural_context, created_at");

  // ─── Grammar patterns index ────────────────────────────────────────────────

  const grammarExists = await client.indices.exists({ index: GRAMMAR_INDEX });
  if (grammarExists) {
    console.log(`\nIndex "${GRAMMAR_INDEX}" already exists. Deleting...`);
    await client.indices.delete({ index: GRAMMAR_INDEX });
    console.log(`   Deleted.`);
  }

  console.log(`\nCreating index "${GRAMMAR_INDEX}"...`);

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
            partial: {
              type: "text",
              analyzer: "agglutinative_text",
              search_analyzer: "standard",
            },
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
            // Legacy fields (backward compat with existing documents)
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

  console.log(`Index "${GRAMMAR_INDEX}" created successfully.`);
  console.log();
  console.log("Grammar patterns mapping summary:");
  console.log("  title            -> text + keyword");
  console.log("  title_native     -> keyword + text (korean_text) + partial (agglutinative_text)");
  console.log("  category         -> keyword (verb_conjugation, particle_usage, etc.)");
  console.log("  examples         -> nested { target, contact, english, annotation }");
  console.log("  embedding        -> dense_vector (1024 dims, cosine, HNSW indexed)");
  console.log("  + language_code, description, rule, related_vocabulary, differences_from_contact, source_urls, confidence");

  console.log("\nAnalyzers configured:");
  console.log("  korean_text        -> standard tokenizer, no stopwords (backward compat)");
  console.log("  romanized_text     -> standard + romanization_normalizer + lowercase + asciifolding");
  console.log("  agglutinative_text -> standard + lowercase + edge_ngram(2-15)");
  console.log("  ipa_search         -> keyword + ipa_normalizer + lowercase");

  // ─── Source outcomes index ──────────────────────────────────────────────────

  const sourceOutcomesExists = await client.indices.exists({ index: SOURCE_OUTCOMES_INDEX });
  if (sourceOutcomesExists) {
    console.log(`\nIndex "${SOURCE_OUTCOMES_INDEX}" already exists. Deleting...`);
    await client.indices.delete({ index: SOURCE_OUTCOMES_INDEX });
    console.log(`   Deleted.`);
  }

  console.log(`\nCreating index "${SOURCE_OUTCOMES_INDEX}"...`);

  await client.indices.create({
    index: SOURCE_OUTCOMES_INDEX,
    mappings: {
      properties: {
        url: { type: "keyword" },
        title: {
          type: "text",
          fields: { keyword: { type: "keyword" } },
        },
        type: { type: "keyword" },
        language_code: { type: "keyword" },
        status: { type: "keyword" },
        entry_count: { type: "integer" },
        grammar_count: { type: "integer" },
        audio_count: { type: "integer" },
        error: { type: "text" },
        discovered_via: { type: "keyword" },
        pipeline_run_at: { type: "date" },
      },
    },
  });

  console.log(`Index "${SOURCE_OUTCOMES_INDEX}" created successfully.`);
  console.log();
  console.log("Source outcomes mapping summary:");
  console.log("  url, type, language_code, status, discovered_via -> keyword");
  console.log("  title -> text + keyword");
  console.log("  entry_count, grammar_count, audio_count -> integer");
  console.log("  pipeline_run_at -> date");

  console.log("\nNext steps:");
  console.log("  1. Use bulkIndex() from lib/elastic.ts to index vocabulary data");
  console.log("  2. Use bulkIndexGrammarPatterns() for grammar patterns");
  console.log("  3. Use bulkIndexSourceOutcomes() for source outcomes");
  console.log("  4. Use search() for hybrid BM25 + kNN queries");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
