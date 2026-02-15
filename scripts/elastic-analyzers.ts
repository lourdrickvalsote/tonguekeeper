// ---------------------------------------------------------------------------
// Shared analysis settings for endangered language indices
// ---------------------------------------------------------------------------
// These analyzers handle the phonological and orthographic diversity found
// across endangered languages: diacritical romanizations, IPA transcriptions,
// agglutinative morphology, and non-Latin scripts.
//
// Imported by both setup-elastic.ts and reindex-with-analyzers.ts.

export const ENDANGERED_LANGUAGE_ANALYSIS = {
  char_filter: {
    // Normalizes romanization diacritics to base ASCII forms.
    // Covers IPA-influenced romanizations common in linguistic fieldwork
    // (Koreanic, Austronesian, Uralic, Sino-Tibetan, Niger-Congo, etc.)
    romanization_normalizer: {
      type: "mapping" as const,
      mappings: [
        // Vowel diacritics
        "\u014F => o", "\u01D2 => o", "\u014D => o", "\u00F6 => o", "\u00F8 => o",
        "\u016D => u", "\u01D4 => u", "\u016B => u", "\u00FC => u",
        "\u0103 => a", "\u01CE => a", "\u0101 => a", "\u00E4 => a",
        "\u0115 => e", "\u011B => e", "\u0113 => e",
        "\u012D => i", "\u01D0 => i", "\u012B => i",
        // IPA-influenced romanization vowels
        "\u0259 => a",  // schwa
        "\u025B => e",  // open-mid front
        "\u0254 => o",  // open-mid back
        "\u0268 => i",  // barred i
        "\u0289 => u",  // barred u
        // Consonant diacritics
        "\u014B => ng", // eng
        "\u0272 => ny", // palatal nasal
        "\u025F => dy", // palatal stop
        "\u0263 => gh", // voiced velar fricative
        "\u0283 => sh", // voiceless postalveolar
        "\u0292 => zh", // voiced postalveolar
        "\u0278 => f",  // voiceless bilabial
        "\u03B2 => v",  // voiced bilabial
        "\u03B8 => th", // voiceless dental
        "\u00F0 => dh", // voiced dental
        "\u027E => r",  // alveolar tap
        "\u0279 => r",  // alveolar approximant
        "\u026C => lh", // voiceless lateral
        "\u00F1 => n",  // n with tilde
        // Glottal stops (common in Austronesian, Mayan, Salishan)
        "\u0294 => ",   // glottal stop
        "\u02BC => ",   // modifier letter apostrophe
        "\u02BB => ",   // turned comma
        "\u02C0 => ",   // modifier glottal stop
        // Length markers (common in Polynesian, Japonic)
        "\u02D0 => ",   // triangular colon
        "\u02D1 => ",   // half-length
        // Tone/stress marks (common in Sino-Tibetan, Niger-Congo)
        "\u0301 => ",   // acute accent (combining)
        "\u0300 => ",   // grave accent (combining)
        "\u0302 => ",   // circumflex (combining)
        "\u030C => ",   // caron (combining)
        "\u0304 => ",   // macron (combining)
      ],
    },
    // Strips IPA notation marks for searchable phonemic content
    ipa_normalizer: {
      type: "mapping" as const,
      mappings: [
        "/ => ",   // phonemic brackets
        "[ => ",   // phonetic brackets
        "] => ",
        "\u02C8 => ",  // primary stress
        "\u02CC => ",  // secondary stress
        "\u02D0 => ",  // length mark
        "\u02D1 => ",  // half-length
        ". => ",       // syllable boundary
        "\u203F => ",  // undertie (linking)
      ],
    },
  },
  filter: {
    // Edge n-gram for prefix matching in agglutinative languages.
    // min 2 avoids single-char noise; max 15 covers most morpheme combinations
    // (Koreanic, Uralic, Turkic, Quechuan, Bantu languages benefit most)
    partial_match: {
      type: "edge_ngram" as const,
      min_gram: 2,
      max_gram: 15,
    },
  },
  analyzer: {
    // Backward compat: preserved as-is
    korean_text: {
      type: "standard" as const,
      stopwords: "_none_" as const,
    },
    // Romanized text with diacritic normalization + ASCII folding.
    // Searches for "omoni" will match "ŏmŏni", "halmoni" matches "halmŏni"
    romanized_text: {
      type: "custom" as const,
      tokenizer: "standard",
      char_filter: ["romanization_normalizer"],
      filter: ["lowercase", "asciifolding"],
    },
    // Edge n-gram analyzer for agglutinative languages.
    // Typing first few characters of a word matches the full entry.
    agglutinative_text: {
      type: "custom" as const,
      tokenizer: "standard",
      filter: ["lowercase", "partial_match"],
    },
    // IPA field search: strips notation marks, keeps phonemic content.
    // Search "pwada" matches entry with IPA /pwada/
    ipa_search: {
      type: "custom" as const,
      tokenizer: "keyword",
      char_filter: ["ipa_normalizer"],
      filter: ["lowercase"],
    },
  },
};
