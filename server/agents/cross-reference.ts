import { getErrorMessage } from "../../lib/utils/errors.js";
import { emitEvent } from "../utils/event-emitter.js";
import { searchByHeadword, indexEntries } from "../utils/http.js";
import {
  runCrossReferenceAgent as runAgent,
  type CrossRefEntry,
  type SearchResult,
} from "../../lib/agents/cross-reference-agent.js";
import type { VocabularyEntry } from "../types.js";

function toSearchResult(entry: VocabularyEntry): SearchResult {
  return {
    id: entry.id,
    headword_native: entry.headword_native,
    headword_romanized: entry.headword_romanized || "",
    pos: entry.pos,
    definitions: entry.definitions,
    semantic_cluster: entry.semantic_cluster,
    cross_references: entry.cross_references,
  };
}

function toCrossRefEntry(entry: VocabularyEntry): CrossRefEntry {
  return {
    headword_native: entry.headword_native,
    headword_romanized: entry.headword_romanized || "",
    pos: entry.pos,
    definitions: entry.definitions,
    example_sentences: entry.example_sentences.map((e) => ({
      target: e.target,
      contact: e.contact || "",
      english: e.english || "",
    })),
    semantic_domain: entry.semantic_cluster,
    related_terms: entry.related_terms,
    source_url: entry.cross_references[0]?.source_url || "",
    source_title: entry.cross_references[0]?.source_title || "",
  };
}

export async function runCrossReferenceAgent(
  newEntries: VocabularyEntry[],
  sourceTitle: string,
  languageName: string,
  language_code: string
): Promise<VocabularyEntry[]> {
  if (newEntries.length === 0) return [];

  const linkEvent = emitEvent("cross_reference", "linked_entries", "running", {
    count: newEntries.length,
    message: `Cross-referencing ${newEntries.length} entries from ${sourceTitle}...`,
  });

  const crossRefEntries = newEntries.map(toCrossRefEntry);

  const onProgress = (message: string, count: number): void => {
    emitEvent("cross_reference", "linked_entries", "running", {
      count,
      message,
    }, linkEvent.id);
  };

  const onSearchExisting = async (query: string): Promise<SearchResult[]> => {
    try {
      const results = await searchByHeadword(query, language_code);
      return results.map(toSearchResult);
    } catch (err) {
      console.warn(`[CrossRef] Elastic search failed for "${query}": ${getErrorMessage(err)}`);
      return [];
    }
  };

  const onMergeEntries = async (
    primaryId: string,
    _secondaryIds: string[],
    mergedData: Record<string, unknown>
  ): Promise<void> => {
    // Build a partial vocabulary entry with merged data and re-index it
    const defs = (mergedData.definitions as { language: string; text: string }[]) || [];
    const examples =
      (mergedData.example_sentences as { target: string; contact: string; english: string }[]) || [];
    const crossRefs =
      (mergedData.cross_references as {
        source_title: string;
        source_url: string;
        source_type: string;
      }[]) || [];
    const relatedTerms = (mergedData.related_terms as string[]) || [];
    const semanticDomain = mergedData.semantic_domain as string | undefined;

    // Preserve new linguistic fields from merged data
    const conjugations = mergedData.conjugations as VocabularyEntry["conjugations"] | undefined;
    const morphology = mergedData.morphology as VocabularyEntry["morphology"] | undefined;
    const usage = mergedData.usage as VocabularyEntry["usage"] | undefined;
    const ipa = mergedData.ipa as string | undefined;
    const grammarNotes = mergedData.grammar_notes as string | undefined;
    const languageConfidence = mergedData.language_confidence as VocabularyEntry["language_confidence"] | undefined;

    const mergedEntry: VocabularyEntry = {
      id: primaryId,
      headword_native: "",
      headword_romanized: "",
      pos: "",
      definitions: defs.map((d) => ({
        language: String(d.language || "en"),
        text: d.text,
      })),
      example_sentences: examples.map((e) => ({
        target: e.target,
        contact: e.contact || "",
        english: e.english || "",
        source_url: "",
      })),
      related_terms: relatedTerms,
      cross_references: crossRefs.map((cr: Record<string, unknown>) => ({
        source_title: cr.source_title as string,
        source_url: cr.source_url as string,
        source_type: (cr.source_type as string) || "archive",
        ...(cr.reliability_score != null ? { reliability_score: cr.reliability_score as number } : {}),
      })),
      semantic_cluster: semanticDomain,
      ipa,
      conjugations,
      morphology,
      usage,
      grammar_notes: grammarNotes,
      language_confidence: languageConfidence,
      source_count: crossRefs.length,
    };

    await indexEntries([mergedEntry], language_code);
  };

  try {
    const result = await runAgent(
      crossRefEntries,
      sourceTitle,
      languageName,
      onProgress,
      onSearchExisting,
      onMergeEntries,
    );

    // Log token usage
    const tu = result.token_usage;
    console.log(
      `[CrossRef] Token usage for "${sourceTitle}": ${tu.input_tokens} in / ${tu.output_tokens} out / ${tu.cache_read_tokens} cache-read`
    );

    // Emit completion events — reuse ID so the card updates
    if (result.merged_count > 0) {
      emitEvent("cross_reference", "linked_entries", "complete", {
        count: result.merged_count,
        message: `Cross-referenced ${result.merged_count} entries across sources`,
      }, linkEvent.id);
    } else {
      emitEvent("cross_reference", "linked_entries", "complete", {
        count: 0,
        message: `Cross-referencing complete for ${sourceTitle} (no duplicates found)`,
      }, linkEvent.id);
    }

    if (result.clusters.length > 0) {
      emitEvent("cross_reference", "semantic_clustering", "complete", {
        count: result.clusters.length,
        message: `Identified ${result.clusters.length} semantic clusters: ${result.clusters.join(", ")}`,
      });
    }

    return newEntries;
  } catch (err) {
    emitEvent("cross_reference", "linked_entries", "error", {
      message: `Cross-referencing failed: ${getErrorMessage(err)}`,
    }, linkEvent.id);
    return newEntries;
  }
}
