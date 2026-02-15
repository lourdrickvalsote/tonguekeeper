import type { SourceType, LanguageMetadata } from "../types";
import { kvGet, kvSet, cacheKeys, hashQuery, TTL } from "../kv-cache";
import { parseCitations, type CitationReference } from "../utils/citations.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SonarSource {
  url: string;
  title: string;
  description: string;
  source_type: SourceType;
}

export interface SonarResult {
  sources: SonarSource[];
  raw_text: string;
  citations: string[];
  citation_references: CitationReference[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
const MODEL = "sonar";
const MAX_TOKENS = 2048;
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

/** Noise domains to exclude from all Sonar searches */
export const DOMAIN_DENYLIST = [
  "-facebook.com",
  "-instagram.com",
  "-pinterest.com",
  "-tiktok.com",
  "-twitter.com",
  "-x.com",
  "-amazon.com",
  "-ebay.com",
  "-etsy.com",
  "-quora.com",
];

/** Trusted linguistic/academic domains for focused academic queries */
export const ACADEMIC_DOMAIN_ALLOWLIST = [
  "glottolog.org",
  "endangeredlanguages.com",
  "elararchive.org",
  "livingtongues.org",
  "aclanthology.org",
  "researchgate.net",
  "academia.edu",
  "jstor.org",
  "scholar.google.com",
  "en.wikipedia.org",
  "en.wiktionary.org",
  "scholarspace.manoa.hawaii.edu",
  "catalog.paradisec.org.au",
  "pangloss.cnrs.fr",
  "ailla.utexas.org",
  "wikitongues.org",
];

const SYSTEM_MESSAGE = `You are a research assistant helping discover online resources for endangered languages. Return specific URLs, titles, and descriptions of resources you find. Be comprehensive — check academic databases, dictionaries, YouTube, government archives, and community websites.

Return your findings as a JSON array of objects with these fields:
- url: the direct URL to the resource
- title: descriptive title of the resource
- description: brief description of what language data it contains

Return ONLY the JSON array, no other text.`;

// ─── Source type classification ──────────────────────────────────────────────

export function classifySourceType(url: string, description: string): SourceType {
  const combined = `${url} ${description}`.toLowerCase();
  if (/dictionary|dict|wiktionary|word.?list|lexicon/.test(combined)) return "dictionary";
  if (/scholar|academic|journal|paper|arxiv|research|thesis|phonolog/.test(combined)) return "academic";
  if (/youtube|video|vimeo|lesson/.test(combined)) return "video";
  if (/archive\.org|museum|collection|oral.?history|recording/.test(combined)) return "archive";
  if (/wiki/.test(combined)) return "wiki";
  return "archive";
}

// ─── Retry helper ────────────────────────────────────────────────────────────

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core API call ───────────────────────────────────────────────────────────

interface PerplexityResponse {
  choices: { message: { content: string } }[];
  citations?: string[];
}

export async function searchSonar(query: string, externalSignal?: AbortSignal, domainFilter?: string[]): Promise<SonarResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not set");
  }

  // Check KV cache before hitting the API (include domain filter in key)
  const qHash = hashQuery({ q: query, df: domainFilter?.sort().join(",") });
  const cacheKey = cacheKeys.perplexity(qHash);
  const cached = await kvGet<SonarResult>(cacheKey);
  if (cached) {
    console.log(`[Perplexity] Cache hit for query: "${query.slice(0, 60)}…"`);
    return cached;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (externalSignal?.aborted) {
      throw new Error("Discovery cancelled");
    }

    try {
      const fetchSignal = externalSignal
        ? AbortSignal.any([AbortSignal.timeout(TIMEOUT_MS), externalSignal])
        : AbortSignal.timeout(TIMEOUT_MS);

      const res = await fetch(PERPLEXITY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_MESSAGE },
            { role: "user", content: query },
          ],
          max_tokens: MAX_TOKENS,
          ...(domainFilter?.length && { search_domain_filter: domainFilter }),
        }),
        signal: fetchSignal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const err = new Error(`Perplexity API ${res.status}: ${body}`);

        if (isRetryable(res.status) && attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(
            `[Perplexity] Retryable error (${res.status}), attempt ${attempt + 1}/${MAX_RETRIES}. Retrying in ${Math.round(delay)}ms...`
          );
          lastError = err;
          await sleep(delay);
          continue;
        }

        throw err;
      }

      const data = (await res.json()) as PerplexityResponse;
      const rawText = data.choices[0]?.message?.content || "[]";
      const citations = data.citations || [];

      const result = parseResponse(rawText, citations);

      // Cache non-empty results (fire-and-forget)
      if (result.sources.length > 0) {
        kvSet(cacheKey, result, TTL.PERPLEXITY);
      }

      return result;
    } catch (err) {
      lastError = err as Error;

      // Don't retry on abort (timeout) or non-retryable errors
      const isTimeout = (err as Error).name === "TimeoutError" || (err as Error).name === "AbortError";
      if (isTimeout && attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(
          `[Perplexity] Timeout on attempt ${attempt + 1}/${MAX_RETRIES}. Retrying in ${Math.round(delay)}ms...`
        );
        await sleep(delay);
        continue;
      }

      if (attempt >= MAX_RETRIES - 1) {
        break;
      }
    }
  }

  throw lastError || new Error("searchSonar failed after retries");
}

// ─── Response parsing ────────────────────────────────────────────────────────

function parseResponse(rawText: string, citations: string[]): SonarResult {
  const sources: SonarSource[] = [];
  const seen = new Set<string>();

  // Extract JSON array from the LLM response (handles markdown code blocks)
  try {
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        url?: string;
        title?: string;
        description?: string;
      }>;

      for (const item of parsed) {
        if (item.url && !seen.has(item.url)) {
          seen.add(item.url);
          sources.push({
            url: item.url,
            title: item.title || item.url,
            description: item.description || "",
            source_type: classifySourceType(item.url, item.description || ""),
          });
        }
      }
    }
  } catch {
    console.warn("[Perplexity] Failed to parse JSON from response, using citations only");
  }

  // Add citations not already captured from the JSON
  for (const url of citations) {
    if (url && !seen.has(url)) {
      seen.add(url);
      sources.push({
        url,
        title: url,
        description: "Discovered via Perplexity citation",
        source_type: classifySourceType(url, ""),
      });
    }
  }

  // Parse inline [N] references to build citation-to-claim mapping
  const parsed = parseCitations(rawText, citations);

  return { sources, raw_text: rawText, citations, citation_references: parsed.citation_references };
}

// ─── Contact language search terms ──────────────────────────────────────────

interface ContactSearchTerms {
  dictionary: string;
  preservation: string;
}

const CONTACT_LANGUAGE_TERMS: Record<string, ContactSearchTerms> = {
  English:    { dictionary: "dictionary",   preservation: "language preservation" },
  Korean:     { dictionary: "사전",         preservation: "보전" },
  Japanese:   { dictionary: "辞書",         preservation: "言語保存" },
  Chinese:    { dictionary: "词典",         preservation: "语言保护" },
  "Mandarin Chinese": { dictionary: "词典", preservation: "语言保护" },
  Spanish:    { dictionary: "diccionario",  preservation: "preservación lengua" },
  Portuguese: { dictionary: "dicionário",   preservation: "preservação língua" },
  French:     { dictionary: "dictionnaire", preservation: "préservation langue" },
  Russian:    { dictionary: "словарь",      preservation: "сохранение языка" },
  Hindi:      { dictionary: "शब्दकोश",     preservation: "भाषा संरक्षण" },
  Indonesian: { dictionary: "kamus",        preservation: "pelestarian bahasa" },
  Malay:      { dictionary: "kamus",        preservation: "pemuliharaan bahasa" },
  Arabic:     { dictionary: "قاموس",        preservation: "حفظ اللغة" },
  Thai:       { dictionary: "พจนานุกรม",    preservation: "การอนุรักษ์ภาษา" },
  Turkish:    { dictionary: "sözlük",       preservation: "dil koruma" },
  Swahili:    { dictionary: "kamusi",       preservation: "uhifadhi wa lugha" },
  Vietnamese: { dictionary: "từ điển",      preservation: "bảo tồn ngôn ngữ" },
  Filipino:   { dictionary: "diksyunaryo",  preservation: "pagpapanatili ng wika" },
  Bengali:    { dictionary: "অভিধান",      preservation: "ভাষা সংরক্ষণ" },
  Tamil:      { dictionary: "அகராதி",       preservation: "மொழி பாதுகாப்பு" },
  Nepali:     { dictionary: "शब्दकोश",     preservation: "भाषा संरक्षण" },
  Burmese:    { dictionary: "အဘိဓာန်",     preservation: "ဘာသာစကား ထိန်းသိမ်းခြင်း" },
  Khmer:      { dictionary: "វចនានុក្រម",   preservation: "ការអភិរក្សភាសា" },
  Persian:    { dictionary: "فرهنگ لغت",    preservation: "حفظ زبان" },
  German:     { dictionary: "Wörterbuch",   preservation: "Spracherhaltung" },
  Dutch:      { dictionary: "woordenboek",  preservation: "taalbehoud" },
  Italian:    { dictionary: "dizionario",   preservation: "preservazione linguistica" },
  Urdu:       { dictionary: "لغت",          preservation: "زبان کا تحفظ" },
  Amharic:    { dictionary: "መዝገበ ቃላት",   preservation: "ቋንቋ ጥበቃ" },
  Hausa:      { dictionary: "kamus",        preservation: "kiyaye harshe" },
  Yoruba:     { dictionary: "ìwé atúmọ̀",   preservation: "ìtọ́jú èdè" },
  Zulu:       { dictionary: "isichazamazwi", preservation: "ukulondoloza ulimi" },
};

function getContactLanguageSearchTerms(contactLang: string): ContactSearchTerms | null {
  return CONTACT_LANGUAGE_TERMS[contactLang]
    || CONTACT_LANGUAGE_TERMS[
      Object.keys(CONTACT_LANGUAGE_TERMS).find(
        (k) => k.toLowerCase() === contactLang.toLowerCase()
      ) || ""
    ]
    || null;
}

// ─── Query generation ────────────────────────────────────────────────────────

const MAX_SEED_QUERIES = 24;

export function generateSearchQueries(meta: LanguageMetadata): string[] {
  const lang = meta.language_name;
  const queries: string[] = [];

  // Tier 1: Core name-based queries (always generated)
  queries.push(`${lang} online dictionary word list`);
  queries.push(`${lang} audio recordings oral history`);
  queries.push(`${lang} academic papers computational linguistics`);
  queries.push(`${lang} YouTube native speaker lessons`);
  queries.push(`${lang} endangered language archive preservation`);
  queries.push(`${lang} grammar reference documentation`);
  queries.push(`${lang} parallel corpus dataset NLP`);
  queries.push(`${lang} textbook PDF learning materials`);

  // Tier 2: Native name queries
  if (meta.native_name) {
    queries.push(`${meta.native_name} dictionary`);
    queries.push(`${meta.native_name} vocabulary`);
  }

  // Tier 3: Alternate name queries (up to 3)
  if (meta.alternate_names?.length) {
    for (const alt of meta.alternate_names.slice(0, 3)) {
      queries.push(`${alt} language dictionary word list`);
    }
  }

  // Tier 4: Contact language queries
  if (meta.contact_languages?.length) {
    for (const contact of meta.contact_languages) {
      const terms = getContactLanguageSearchTerms(contact);
      if (terms) {
        const searchName = meta.native_name || lang;
        queries.push(`${searchName} ${terms.dictionary}`);
        queries.push(`${searchName} ${terms.preservation}`);
      }
    }
  }

  // Tier 5: Country/region queries (up to 2)
  if (meta.countries?.length) {
    for (const country of meta.countries.slice(0, 2)) {
      queries.push(`${lang} language ${country} documentation`);
    }
  }

  // Tier 6: Language family queries
  if (meta.language_family) {
    queries.push(`${meta.language_family} family ${lang} comparative vocabulary`);
  }

  return queries.slice(0, MAX_SEED_QUERIES);
}
