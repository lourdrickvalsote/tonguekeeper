import { bulkIndex, bulkIndexGrammarPatterns, bulkIndexSourceOutcomes, search, searchByHeadword as searchByHeadwordES } from "../../lib/elastic.js";
import type { VocabularyEntry, GrammarPattern } from "../types.js";
import type { PipelineSourceOutcome } from "../../lib/types.js";

export async function indexEntries(
  entries: VocabularyEntry[],
  language_code: string,
  glottocode?: string,
  language_name?: string
): Promise<{ indexed: number }> {
  return bulkIndex(entries as Parameters<typeof bulkIndex>[0], language_code, glottocode, language_name);
}

export async function indexGrammarPatterns(
  patterns: GrammarPattern[],
  language_code: string
): Promise<{ indexed: number }> {
  return bulkIndexGrammarPatterns(patterns as Parameters<typeof bulkIndexGrammarPatterns>[0], language_code);
}

export async function indexSourceOutcomes(
  outcomes: PipelineSourceOutcome[],
  language_code: string
): Promise<{ indexed: number }> {
  return bulkIndexSourceOutcomes(outcomes, language_code);
}

export async function searchElastic(
  query: string,
  _filters?: Record<string, unknown>,
  language_code?: string
): Promise<VocabularyEntry[]> {
  const { entries } = await search(query, { limit: 20, language_code });
  return entries as unknown as VocabularyEntry[];
}

export async function searchByHeadword(
  query: string,
  language_code?: string
): Promise<VocabularyEntry[]> {
  const { entries } = await searchByHeadwordES(query, { limit: 20, language_code });
  return entries as unknown as VocabularyEntry[];
}
