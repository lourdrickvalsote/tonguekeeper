import type { SourceType, LanguageMetadata } from "../types.js";

export interface PrioritySource {
  url: string;
  title: string;
  type: SourceType;
  description: string;
}

const JEJU_PRIORITY_SOURCES: PrioritySource[] = [
  {
    url: "https://sites.google.com/a/hawaii.edu/jejueo/jejueo-english-basic-dictionary",
    title: "Jejueo-English Basic Dictionary",
    type: "dictionary",
    description: "~2,000 entries with romanization, definitions, and example sentences compiled by UH Manoa linguists",
  },
  {
    url: "https://en.wikipedia.org/wiki/Jeju_language",
    title: "Wikipedia — Jeju Language",
    type: "wiki",
    description: "Comprehensive article covering phonology, grammar, vocabulary tables, and sociolinguistic status",
  },
  {
    url: "https://glottolog.org/resource/languoid/id/jeju1234",
    title: "Glottolog — Jejueo",
    type: "academic",
    description: "Language classification, ISO 639-3 code, geographic data, and bibliography of linguistic references",
  },
  {
    url: "https://www.endangeredlanguages.com/lang/8409/guide",
    title: "Endangered Languages Project — Jejueo",
    type: "archive",
    description: "Language vitality assessment, documentation samples, audio recordings, and revitalization guide",
  },
  {
    url: "https://aclanthology.org/W17-0117.pdf",
    title: "Jejueo Talking Dictionary (ACL 2017)",
    type: "academic",
    description: "Paper on collaborative multimedia dictionary with audio/video recordings of native speakers in Jejueo, Korean, Japanese, and English",
  },
  {
    url: "https://aclanthology.org/2020.lrec-1.318.pdf",
    title: "Jejueo Datasets for Machine Translation and Speech (LREC 2020)",
    type: "academic",
    description: "10,000 high-quality audio files with transcripts, parallel corpus for Jejueo-Korean MT research",
  },
  {
    url: "https://m.koreaherald.com/article/3448843",
    title: "Jeju Dialect Institute Online Dictionary",
    type: "dictionary",
    description: "20,000+ word definitions with dialect content spanning literature, songs, and video recordings",
  },
  {
    url: "https://scholarspace.manoa.hawaii.edu/bitstreams/1aa334b3-757b-43a6-b5aa-ed64ee40e55c/download",
    title: "Jejueo: Korea's Other Language (UH Manoa)",
    type: "academic",
    description: "Comprehensive grammar chapter covering phonology, morphology, syntax, and endangered status by William O'Grady",
  },
  {
    url: "https://www.researchgate.net/publication/394072212_A_SKETCH_GRAMMAR_OF_JEJUEO",
    title: "A Sketch Grammar of Jejueo",
    type: "academic",
    description: "Full sketch grammar including consonant/vowel inventory, agglutinative morphology, and clause structure",
  },
  {
    url: "https://jeju.guru/jeju-dialect-korean-and-hanja-resources/",
    title: "Jeju.guru — Dialect Resources",
    type: "dictionary",
    description: "Curated collection of Jeju dialect, standard Korean, and Hanja reference materials",
  },
  {
    url: "https://thelanguagecloset.com/2020/05/12/koreas-other-language-jejueo-jejumal-%EC%A0%9C%EC%A3%BC%EC%96%B4-%EC%A0%9C%EC%A3%BC%EB%A7%90/",
    title: "The Language Closet — Jejueo / Jejumal",
    type: "wiki",
    description: "Vocabulary examples, cultural context, comparison with standard Korean, and writing system overview",
  },
  {
    url: "https://www.koreatimes.co.kr/www/opinion/2025/02/197_392888.html",
    title: "Korea Times — Korea's Other Language, Jejueo",
    type: "archive",
    description: "Linguistic overview covering mutual unintelligibility with Korean, preservation status, and speaker demographics",
  },
  {
    url: "https://ko.wikipedia.org/wiki/%EC%A0%9C%EC%A3%BC%EC%96%B4",
    title: "한국어 위키백과 — 제주어",
    type: "wiki",
    description: "Korean Wikipedia article on Jejueo with vocabulary tables, phonology details, and grammar comparisons with standard Korean",
  },
  {
    url: "https://en.glosbe.com/jje/en",
    title: "Glosbe — Jejueo-English Dictionary",
    type: "dictionary",
    description: "Community-built Jejueo-English translation dictionary with example sentences and pronunciation",
  },
  {
    url: "https://namu.wiki/w/%EC%A0%9C%EC%A3%BC%EC%96%B4",
    title: "나무위키 — 제주어",
    type: "wiki",
    description: "Comprehensive Korean wiki article with extensive Jejueo vocabulary examples, phonology, and dialect comparisons",
  },
];

const PRIORITY_SOURCES_BY_LANGUAGE: Record<string, PrioritySource[]> = {
  jje: JEJU_PRIORITY_SOURCES,
};

// ─── Americas region countries ──────────────────────────────────────────────

const AMERICAS_COUNTRIES = new Set([
  "US", "CA", "MX", "GT", "BZ", "SV", "HN", "NI", "CR", "PA",
  "CO", "VE", "EC", "PE", "BO", "BR", "PY", "UY", "AR", "CL", "GY", "SR",
]);

const ASIA_PACIFIC_COUNTRIES = new Set([
  "JP", "CN", "TW", "VN", "LA", "MM", "TH", "KH", "IN", "NP", "BD", "LK",
  "PH", "MY", "ID", "PG", "FJ", "NZ", "AU", "SB", "VU", "TO", "WS",
]);

// ─── Universal source generation ────────────────────────────────────────────

function generateUniversalSources(meta: LanguageMetadata): PrioritySource[] {
  const sources: PrioritySource[] = [];
  const name = meta.language_name;
  const wikiName = name.replace(/ /g, "_");

  // Glottolog (requires glottocode)
  if (meta.glottocode) {
    sources.push({
      url: `https://glottolog.org/resource/languoid/id/${meta.glottocode}`,
      title: `Glottolog — ${name}`,
      type: "academic",
      description: `Language classification, bibliography, and geographic data for ${name}`,
    });
  }

  // Endangered Languages Project
  sources.push({
    url: `https://endangeredlanguages.com/lang/${meta.language_code}`,
    title: `Endangered Languages Project — ${name}`,
    type: "archive",
    description: "Language vitality assessment, documentation samples, and revitalization resources",
  });

  // English Wikipedia
  sources.push({
    url: `https://en.wikipedia.org/wiki/${wikiName}_language`,
    title: `Wikipedia — ${name} language`,
    type: "wiki",
    description: `Encyclopedia article on ${name} with phonology, grammar, and vocabulary overview`,
  });

  // ELAR (SOAS Endangered Languages Archive)
  sources.push({
    url: `https://www.elararchive.org/search/?q=${encodeURIComponent(name)}`,
    title: `ELAR — ${name} collections`,
    type: "archive",
    description: "Endangered Languages Archive search for field recordings, grammars, and documentation",
  });

  // Living Tongues Institute
  sources.push({
    url: `https://livingtongues.org/?s=${encodeURIComponent(name)}`,
    title: `Living Tongues — ${name}`,
    type: "archive",
    description: "Living Tongues Institute resources including talking dictionaries and field data",
  });

  // Glosbe multilingual dictionary
  sources.push({
    url: `https://en.glosbe.com/${meta.language_code}/en`,
    title: `Glosbe — ${name}-English Dictionary`,
    type: "dictionary",
    description: "Community-built translation dictionary with example sentences",
  });

  // Wiktionary
  sources.push({
    url: `https://en.wiktionary.org/wiki/Category:${wikiName}_language`,
    title: `Wiktionary — ${name} entries`,
    type: "dictionary",
    description: "Crowd-sourced dictionary entries with etymologies and translations",
  });

  // Kaipuleohone (University of Hawaiʻi)
  sources.push({
    url: `https://scholarspace.manoa.hawaii.edu/communities/kaipuleohone?query=${encodeURIComponent(name)}`,
    title: `Kaipuleohone — ${name}`,
    type: "archive",
    description: "UH Manoa digital language archive with field recordings and documentation",
  });

  // Forvo — pronunciation recordings by native speakers (audio-rich)
  sources.push({
    url: `https://forvo.com/languages/${meta.language_code}/`,
    title: `Forvo — ${name} pronunciations`,
    type: "dictionary",
    description: "Native speaker pronunciation recordings with audio files for individual words",
  });

  // Wikitongues — video recordings of endangered language speakers
  sources.push({
    url: `https://wikitongues.org/search/?query=${encodeURIComponent(name)}`,
    title: `Wikitongues — ${name}`,
    type: "archive",
    description: "Video and audio recordings of native speakers with transcriptions",
  });

  // Region-conditional: AILLA (Americas)
  const isAmericas = meta.macroarea === "South America"
    || meta.macroarea === "North America"
    || meta.countries?.some((c) => AMERICAS_COUNTRIES.has(c));

  if (isAmericas) {
    sources.push({
      url: `https://www.ailla.utexas.org/search?query=${encodeURIComponent(name)}`,
      title: `AILLA — ${name}`,
      type: "archive",
      description: "Archive of the Indigenous Languages of Latin America",
    });
  }

  // Region-conditional: PARADISEC (Pacific / Australia)
  const isPacific = meta.macroarea === "Papunesia"
    || meta.macroarea === "Australia"
    || meta.countries?.some((c) => ["AU", "PG", "FJ", "NZ", "VU", "SB", "TO", "WS"].includes(c));

  if (isPacific) {
    sources.push({
      url: `https://catalog.paradisec.org.au/search?query=${encodeURIComponent(name)}`,
      title: `PARADISEC — ${name}`,
      type: "archive",
      description: "Pacific and Regional Archive for Digital Sources in Endangered Cultures",
    });
  }

  // Region-conditional: Pangloss (Asia / Pacific)
  const isAsiaPacific = meta.macroarea === "Papunesia"
    || meta.macroarea === "Eurasia"
    || meta.countries?.some((c) => ASIA_PACIFIC_COUNTRIES.has(c));

  if (isAsiaPacific) {
    sources.push({
      url: `https://pangloss.cnrs.fr/?query=${encodeURIComponent(name)}`,
      title: `Pangloss — ${name}`,
      type: "archive",
      description: "CNRS Collection of oral data for endangered languages of Asia and the Pacific",
    });
  }

  return sources;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getPrioritySources(meta: LanguageMetadata): PrioritySource[] {
  // Hardcoded language-specific sources (e.g., Jeju)
  const specific = PRIORITY_SOURCES_BY_LANGUAGE[meta.language_code] || [];

  // Universal sources generated from metadata
  const universal = generateUniversalSources(meta);

  // Deduplicate: specific sources take precedence
  const seenUrls = new Set(specific.map((s) => s.url));
  const deduped = universal.filter((s) => !seenUrls.has(s.url));

  return [...specific, ...deduped];
}
