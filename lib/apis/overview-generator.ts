import Anthropic from "@anthropic-ai/sdk";
import type { LanguageEntry, LanguageOverview } from "../types";
import { ENDANGERMENT_LABELS } from "../types";

// ── Constants ───────────────────────────────────────────────────────────────

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar";
const PERPLEXITY_MAX_TOKENS = 4096;
const PERPLEXITY_TIMEOUT_MS = 25_000;

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const CLAUDE_MAX_TOKENS = 4096;

// ── Perplexity research step ────────────────────────────────────────────────

const RESEARCH_SYSTEM_PROMPT = `You are an expert linguist and ethnographer specializing in endangered and minority languages. Research the given language comprehensively, drawing on academic sources, language archives, and documentation projects.

Cover the following areas:
1. **Overview**: History, where it is spoken, cultural significance, why it is endangered
2. **Linguistic Features**: Writing system (if any), phonological inventory, word order (SOV, SVO, etc.), morphological type (agglutinative, isolating, polysynthetic, etc.), any notably unique or interesting features
3. **Speaker Demographics**: Current speaker estimates, age distribution of speakers, geographic distribution, whether there are revitalization or documentation efforts underway
4. **Key Resources**: URLs to Wikipedia articles, Glottolog pages, Endangered Languages Project entries, ELAR archives, or other significant reference pages for this language

Be thorough and factual. Include specific details where available. If information is scarce, say so rather than speculating.`;

function buildResearchPrompt(language: LanguageEntry): string {
  const parts = [
    `Research the language: **${language.name}**`,
    `- ISO 639-3 code: ${language.iso_code}`,
    `- Glottocode: ${language.glottocode}`,
    `- Language family: ${language.language_family}`,
    `- Macroarea: ${language.macroarea}`,
  ];

  if (language.countries?.length) {
    parts.push(`- Countries: ${language.countries.join(", ")}`);
  }

  parts.push(
    `- Endangerment status: ${ENDANGERMENT_LABELS[language.endangerment_status] || language.endangerment_status}`
  );

  if (language.speaker_count != null) {
    parts.push(
      `- Estimated speakers: ${language.speaker_count === 0 ? "No living speakers (extinct)" : `~${language.speaker_count.toLocaleString()}`}`
    );
  }

  if (language.alternate_names?.length) {
    parts.push(`- Also known as: ${language.alternate_names.slice(0, 5).join(", ")}`);
  }

  return parts.join("\n");
}

async function researchLanguage(language: LanguageEntry): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY is not set");

  const res = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        { role: "system", content: RESEARCH_SYSTEM_PROMPT },
        { role: "user", content: buildResearchPrompt(language) },
      ],
      max_tokens: PERPLEXITY_MAX_TOKENS,
    }),
    signal: AbortSignal.timeout(PERPLEXITY_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Perplexity API ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0]?.message?.content || "";
}

// ── Claude structuring step ─────────────────────────────────────────────────

const STRUCTURE_TOOL: Anthropic.Tool = {
  name: "save_language_overview",
  description:
    "Save a structured language overview extracted from research text. Include all available information.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description:
          "2-3 paragraph overview of the language covering its history, where it is spoken, cultural significance, and endangerment context. Write in clear, engaging prose.",
      },
      linguistic_features: {
        type: "object",
        properties: {
          writing_system: {
            type: "string",
            description: "Writing system used (e.g., Latin script, no standard orthography, etc.)",
          },
          phonology: {
            type: "string",
            description: "Brief description of the sound system — notable consonants, vowels, tones, etc.",
          },
          word_order: {
            type: "string",
            description: "Typical word order (e.g., SOV, SVO, VSO, free)",
          },
          morphological_type: {
            type: "string",
            description: "Morphological typology (e.g., agglutinative, isolating, polysynthetic, fusional)",
          },
          notable_features: {
            type: "array",
            items: { type: "string" },
            description: "List of linguistically notable or unique features",
          },
        },
      },
      demographics: {
        type: "object",
        properties: {
          speaker_count_detail: {
            type: "string",
            description: "Detailed speaker count information with source/date if available",
          },
          age_distribution: {
            type: "string",
            description: "Age distribution of speakers (e.g., mostly elderly, intergenerational transmission status)",
          },
          geographic_distribution: {
            type: "string",
            description: "Where speakers are located geographically",
          },
          revitalization_efforts: {
            type: "string",
            description: "Any language revitalization, documentation, or preservation efforts underway",
          },
        },
      },
      external_links: {
        type: "array",
        items: {
          type: "object",
          properties: {
            url: { type: "string", description: "Full URL to the resource" },
            title: {
              type: "string",
              description: "Descriptive title for the link",
            },
            type: {
              type: "string",
              enum: ["wikipedia", "glottolog", "elp", "elar", "ethnologue", "other"],
              description: "Type of resource",
            },
          },
          required: ["url", "title", "type"],
        },
        description:
          "Links to key reference pages. Always include Glottolog and Wikipedia if they exist.",
      },
    },
    required: ["summary", "linguistic_features", "demographics", "external_links"],
  },
};

async function structureOverview(
  researchText: string,
  language: LanguageEntry
): Promise<LanguageOverview> {
  const client = new Anthropic({ maxRetries: 3 });

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: CLAUDE_MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: `Below is research about the ${language.name} language (${language.iso_code}, ${language.glottocode}). Extract and structure the information using the save_language_overview tool. Only include facts present in the research text — do not fabricate information.\n\n---\n\n${researchText}`,
      },
    ],
    tools: [STRUCTURE_TOOL],
    tool_choice: { type: "tool", name: "save_language_overview" },
  });

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );

  if (!toolBlock) {
    throw new Error("Claude did not return a tool_use block");
  }

  const input = toolBlock.input as Omit<LanguageOverview, "generated_at">;

  return {
    ...input,
    generated_at: new Date().toISOString(),
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function generateLanguageOverview(
  language: LanguageEntry
): Promise<LanguageOverview> {
  // Step 1: Perplexity researches the language
  const researchText = await researchLanguage(language);

  // Step 2: Claude structures the research into typed JSON
  const overview = await structureOverview(researchText, language);

  return overview;
}
