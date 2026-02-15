import { VocabularyEntry, LanguageStats, AudioResult, PronunciationVideo, GrammarPattern, GrammarCategory, LanguageBrowserResponse, LanguageFilters, LanguageMetadata, LanguageEntry, LanguageOverview, SourceInfo, SignificantTermsResult, BrightDataMetrics, TranscriptData, PipelineRunArtifact } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// ── Search ──────────────────────────────────────────────────────────────────

export async function searchArchive(
  query: string,
  options: { limit?: number; offset?: number; language_code?: string } = {}
): Promise<{ results: VocabularyEntry[]; total: number }> {
  const { limit = 20, offset = 0, language_code } = options;

  try {
    const data = await apiFetch<{ results: VocabularyEntry[]; total: number }>(
      "/api/search",
      {
        method: "POST",
        body: JSON.stringify({ query, limit, offset, language_code }),
      }
    );
    return { results: data.results, total: data.total };
  } catch (err) {
    console.warn("[API] Search failed:", err);
    return { results: [], total: 0 };
  }
}

// ── Stats ───────────────────────────────────────────────────────────────────

export async function fetchStats(language_code?: string): Promise<LanguageStats> {
  try {
    const qs = language_code ? `?language_code=${encodeURIComponent(language_code)}` : "";
    return await apiFetch<LanguageStats>(`/api/stats${qs}`);
  } catch (err) {
    console.warn("[API] Stats failed:", err);
    return {
      total_entries: 0,
      total_sources: 0,
      total_audio_clips: 0,
      grammar_patterns: 0,
      coverage_percentage: 0,
      sources_by_type: { dictionary: 0, academic: 0, video: 0, archive: 0, wiki: 0 },
    };
  }
}

// ── Insights (significant_terms) ──────────────────────────────────────────

export async function fetchInsights(
  options: {
    language_code?: string;
    source_url?: string;
    cluster?: string;
  } = {}
): Promise<SignificantTermsResult> {
  try {
    const params = new URLSearchParams();
    if (options.language_code) params.set("language_code", options.language_code);
    if (options.source_url) params.set("source_url", options.source_url);
    if (options.cluster) params.set("cluster", options.cluster);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return await apiFetch<SignificantTermsResult>(`/api/insights${qs}`);
  } catch (err) {
    console.warn("[API] Insights failed:", err);
    return { clusters: [], pos: [], terms: [] };
  }
}

// ── Sources ────────────────────────────────────────────────────────────────

export async function fetchSources(language_code?: string): Promise<SourceInfo[]> {
  try {
    const qs = language_code ? `?language_code=${encodeURIComponent(language_code)}` : "";
    const data = await apiFetch<{ sources: SourceInfo[] }>(`/api/sources${qs}`);
    return data.sources;
  } catch (err) {
    console.warn("[API] Sources failed:", err);
    return [];
  }
}

export async function fetchEntriesBySource(
  sourceUrl: string,
  languageCode?: string
): Promise<VocabularyEntry[]> {
  try {
    const data = await apiFetch<{ entries: VocabularyEntry[] }>(
      "/api/sources/entries",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: sourceUrl, language_code: languageCode }),
      }
    );
    return data.entries;
  } catch (err) {
    console.warn("[API] Entries by source failed:", err);
    return [];
  }
}

// ── Grammar Patterns ────────────────────────────────────────────────────────

export async function searchGrammarPatterns(
  query: string,
  options: { limit?: number; offset?: number; category?: GrammarCategory } = {}
): Promise<{ patterns: GrammarPattern[]; total: number }> {
  const { limit = 20, offset = 0, category } = options;
  try {
    return await apiFetch<{ patterns: GrammarPattern[]; total: number }>(
      "/api/grammar",
      {
        method: "POST",
        body: JSON.stringify({ query, limit, offset, category }),
      }
    );
  } catch (err) {
    console.warn("[API] Grammar search failed:", err);
    return { patterns: [], total: 0 };
  }
}

export async function fetchGrammarStats(): Promise<{
  total: number;
  by_category: Record<string, number>;
}> {
  try {
    return await apiFetch<{ total: number; by_category: Record<string, number> }>(
      "/api/grammar/stats"
    );
  } catch (err) {
    console.warn("[API] Grammar stats failed:", err);
    return { total: 0, by_category: {} };
  }
}

// ── Preserve (start pipeline) ───────────────────────────────────────────────

export async function startPreservation(
  meta: LanguageMetadata
): Promise<{ ok: boolean; message?: string }> {
  try {
    const data = await apiFetch<{ message?: string }>("/api/preserve", {
      method: "POST",
      body: JSON.stringify(meta),
    });
    return { ok: true, message: data.message };
  } catch (err) {
    console.warn("[API] Preserve failed:", err);
    return { ok: false, message: String(err) };
  }
}

// ── Graph ───────────────────────────────────────────────────────────────────

export type GraphEdgeType = "related_term" | "cluster" | "embedding";

export interface GraphNode {
  id: string;
  headword: string;
  romanization?: string;
  cluster: string;
  sourceCount: number;
  definition?: string;
  degree?: number;
  [key: string]: unknown;
}
export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: GraphEdgeType;
  [key: string]: unknown;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total?: number;
}

// ── Pronunciation (HeyGen) ────────────────────────────────────────────────

export async function generatePronunciation(
  word: string,
  options?: { audioUrl?: string; language?: string }
): Promise<PronunciationVideo> {
  return apiFetch<PronunciationVideo>("/api/heygen/pronounce", {
    method: "POST",
    body: JSON.stringify({
      word,
      audio_url: options?.audioUrl,
      language: options?.language,
    }),
  });
}

export async function checkPronunciationCache(
  word: string,
  language?: string
): Promise<PronunciationVideo | null> {
  try {
    const data = await apiFetch<PronunciationVideo | { cached: false }>(
      "/api/heygen/pronounce/check",
      {
        method: "POST",
        body: JSON.stringify({ word, language }),
      }
    );
    if ("video_url" in data && data.video_url) return data as PronunciationVideo;
    return null;
  } catch {
    return null;
  }
}

// ── Pronunciation Videos (Featured) ──────────────────────────────────────

export async function fetchPronunciationVideos(
  languageCode?: string,
  limit = 5
): Promise<VocabularyEntry[]> {
  const { entries } = await apiFetch<{ entries: VocabularyEntry[] }>(
    "/api/pronunciations",
    {
      method: "POST",
      body: JSON.stringify({ language_code: languageCode, limit }),
    }
  );
  return entries;
}

// ── Audio Pipeline ────────────────────────────────────────────────────────

export async function processAudio(
  videoUrl: string
): Promise<AudioResult> {
  return apiFetch<AudioResult>("/api/audio", {
    method: "POST",
    body: JSON.stringify({ video_url: videoUrl }),
  });
}

// ── Transcript Viewer ────────────────────────────────────────────────────

export async function fetchTranscript(videoId: string): Promise<TranscriptData | null> {
  try {
    return await apiFetch<TranscriptData>(`/api/transcript/${encodeURIComponent(videoId)}`);
  } catch {
    return null;
  }
}

// ── Languages Browser ────────────────────────────────────────────────────

export async function fetchLanguages(
  filters: LanguageFilters = {}
): Promise<LanguageBrowserResponse> {
  try {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.endangerment?.length) params.set("endangerment", filters.endangerment.join(","));
    if (filters.macroarea?.length) params.set("macroarea", filters.macroarea.join(","));
    if (filters.family) params.set("family", filters.family);
    if (filters.min_speakers != null) params.set("min_speakers", String(filters.min_speakers));
    if (filters.max_speakers != null) params.set("max_speakers", String(filters.max_speakers));
    if (filters.has_preservation != null) params.set("has_preservation", String(filters.has_preservation));
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return await apiFetch<LanguageBrowserResponse>(
      `/api/languages${qs ? `?${qs}` : ""}`
    );
  } catch (err) {
    console.warn("[API] Languages fetch failed, using mock data:", err);
    return MOCK_LANGUAGES_RESPONSE;
  }
}

export async function fetchLanguage(glottocode: string): Promise<LanguageEntry> {
  return apiFetch<LanguageEntry>(`/api/languages/${encodeURIComponent(glottocode)}`);
}

export async function fetchLanguageOverview(
  glottocode: string
): Promise<LanguageOverview | null> {
  try {
    return await apiFetch<LanguageOverview>(
      `/api/languages/${encodeURIComponent(glottocode)}/overview`
    );
  } catch (err) {
    console.warn("[API] Language overview failed:", err);
    return null;
  }
}

const MOCK_LANGUAGES_RESPONSE: LanguageBrowserResponse = {
  languages: [
    { glottocode: "jeju1234", name: "Jejueo", iso_code: "jje", macroarea: "Eurasia", latitude: 33.38, longitude: 126.56, language_family: "Koreanic", endangerment_status: "critically_endangered", endangerment_level: 5, speaker_count: 5000, countries: ["KR"], preservation_status: { sources_discovered: 15, vocabulary_entries: 3247, audio_clips: 892, last_pipeline_run: "2026-02-15T10:30:00Z", coverage_percentage: 15.2 } },
    { glottocode: "ainu1240", name: "Ainu", iso_code: "ain", macroarea: "Eurasia", latitude: 42.98, longitude: 141.35, language_family: "Ainu", endangerment_status: "critically_endangered", endangerment_level: 5, speaker_count: 10, countries: ["JP"], preservation_status: { sources_discovered: 0, vocabulary_entries: 0, audio_clips: 0, last_pipeline_run: null, coverage_percentage: 0 } },
    { glottocode: "yaga1256", name: "Yagán", iso_code: "yag", macroarea: "South America", latitude: -54.93, longitude: -68.58, language_family: "Yaghan", endangerment_status: "critically_endangered", endangerment_level: 5, speaker_count: 1, countries: ["CL"], preservation_status: { sources_discovered: 0, vocabulary_entries: 0, audio_clips: 0, last_pipeline_run: null, coverage_percentage: 0 } },
    { glottocode: "live1238", name: "Livonian", iso_code: "liv", macroarea: "Eurasia", latitude: 57.57, longitude: 22.07, language_family: "Uralic", endangerment_status: "critically_endangered", endangerment_level: 5, speaker_count: 20, countries: ["LV"], preservation_status: { sources_discovered: 0, vocabulary_entries: 0, audio_clips: 0, last_pipeline_run: null, coverage_percentage: 0 } },
    { glottocode: "hawa1245", name: "Hawaiian", iso_code: "haw", macroarea: "Papunesia", latitude: 20.0, longitude: -156.32, language_family: "Austronesian", endangerment_status: "severely_endangered", endangerment_level: 4, speaker_count: 2000, countries: ["US"], preservation_status: { sources_discovered: 3, vocabulary_entries: 120, audio_clips: 45, last_pipeline_run: null, coverage_percentage: 0.6 } },
    { glottocode: "cher1273", name: "Cherokee", iso_code: "chr", macroarea: "North America", latitude: 35.47, longitude: -83.32, language_family: "Iroquoian", endangerment_status: "severely_endangered", endangerment_level: 4, speaker_count: 2100, countries: ["US"], preservation_status: { sources_discovered: 0, vocabulary_entries: 0, audio_clips: 0, last_pipeline_run: null, coverage_percentage: 0 } },
    { glottocode: "basq1248", name: "Basque", iso_code: "eus", macroarea: "Eurasia", latitude: 43.0, longitude: -2.0, language_family: "Basque", endangerment_status: "vulnerable", endangerment_level: 2, speaker_count: 750000, countries: ["ES", "FR"], preservation_status: { sources_discovered: 0, vocabulary_entries: 0, audio_clips: 0, last_pipeline_run: null, coverage_percentage: 0 } },
    { glottocode: "maor1246", name: "Māori", iso_code: "mri", macroarea: "Papunesia", latitude: -38.14, longitude: 176.24, language_family: "Austronesian", endangerment_status: "definitely_endangered", endangerment_level: 3, speaker_count: 50000, countries: ["NZ"], preservation_status: { sources_discovered: 0, vocabulary_entries: 0, audio_clips: 0, last_pipeline_run: null, coverage_percentage: 0 } },
    { glottocode: "okin1246", name: "Okinawan", iso_code: "ryu", macroarea: "Eurasia", latitude: 26.33, longitude: 127.77, language_family: "Japonic", endangerment_status: "definitely_endangered", endangerment_level: 3, speaker_count: 980000, countries: ["JP"], preservation_status: { sources_discovered: 0, vocabulary_entries: 0, audio_clips: 0, last_pipeline_run: null, coverage_percentage: 0 } },
    { glottocode: "arom1237", name: "Aromanian", iso_code: "rup", macroarea: "Eurasia", latitude: 40.65, longitude: 21.6, language_family: "Indo-European", endangerment_status: "definitely_endangered", endangerment_level: 3, speaker_count: 250000, countries: ["RO", "GR", "AL", "MK"], preservation_status: { sources_discovered: 0, vocabulary_entries: 0, audio_clips: 0, last_pipeline_run: null, coverage_percentage: 0 } },
    { glottocode: "dala1243", name: "Dalmatian", iso_code: "dlm", macroarea: "Eurasia", latitude: 42.64, longitude: 18.11, language_family: "Indo-European", endangerment_status: "extinct", endangerment_level: 6, speaker_count: 0, countries: ["HR"], preservation_status: { sources_discovered: 0, vocabulary_entries: 0, audio_clips: 0, last_pipeline_run: null, coverage_percentage: 0 } },
    { glottocode: "quec1387", name: "Quechua", iso_code: "que", macroarea: "South America", latitude: -13.52, longitude: -71.97, language_family: "Quechuan", endangerment_status: "vulnerable", endangerment_level: 2, speaker_count: 7000000, countries: ["PE", "BO", "EC"], preservation_status: { sources_discovered: 0, vocabulary_entries: 0, audio_clips: 0, last_pipeline_run: null, coverage_percentage: 0 } },
  ],
  total: 3142,
  stats: {
    total_endangered: 3142,
    critically_endangered: 577,
    extinct: 348,
    with_preservation_data: 2,
  },
};

// ── Graph ───────────────────────────────────────────────────────────────────

export async function fetchGraph(
  cluster = "all",
  headword?: string,
  language_code?: string,
  maxNodes?: number
): Promise<GraphData> {
  try {
    const params = new URLSearchParams();
    if (cluster !== "all") params.set("cluster", cluster);
    if (headword) params.set("headword", headword);
    if (language_code) params.set("language_code", language_code);
    if (maxNodes) params.set("max_nodes", String(maxNodes));
    const qs = params.toString();
    const data = await apiFetch<GraphData>(
      `/api/graph${qs ? `?${qs}` : ""}`
    );
    return data;
  } catch (err) {
    console.warn("[API] Graph failed:", err);
    return { nodes: [], edges: [] };
  }
}

// ── BrightData Metrics ──────────────────────────────────────────────────────

const EMPTY_BD_METRICS: BrightDataMetrics = {
  searches_geo_targeted: 0,
  searches_total: 0,
  scrapes_total: 0,
  sources_discovered_via_serp_api: 0,
  sources_unlocked: 0,
  sources_unlocked_urls: [],
  sources_crawled_via_web_unlocker: 0,
  avg_crawl_duration_cheerio_ms: 0,
  avg_crawl_duration_web_unlocker_ms: 0,
  countries_searched: [],
  content_unlocked_bytes: 0,
  content_standard_bytes: 0,
};

// ── Pipeline Runs ────────────────────────────────────────────────────────

export async function fetchPipelineRuns(
  languageCode: string
): Promise<PipelineRunArtifact[]> {
  try {
    return await apiFetch<PipelineRunArtifact[]>(
      `/api/runs/${encodeURIComponent(languageCode)}`
    );
  } catch (err) {
    console.warn("[API] Pipeline runs failed:", err);
    return [];
  }
}

export async function fetchPipelineRun(
  languageCode: string,
  runId: string
): Promise<PipelineRunArtifact | null> {
  try {
    return await apiFetch<PipelineRunArtifact>(
      `/api/runs/${encodeURIComponent(languageCode)}/${encodeURIComponent(runId)}`
    );
  } catch (err) {
    console.warn("[API] Pipeline run failed:", err);
    return null;
  }
}

export async function fetchBrightDataMetrics(): Promise<BrightDataMetrics> {
  try {
    return await apiFetch<BrightDataMetrics>("/api/brightdata/metrics");
  } catch (err) {
    console.warn("[API] BrightData metrics failed:", err);
    return EMPTY_BD_METRICS;
  }
}
