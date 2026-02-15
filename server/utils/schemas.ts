import { z } from "zod";

const AgentTypeSchema = z.enum([
  "discovery",
  "extraction",
  "cross_reference",
  "pronunciation",
  "orchestrator",
]);

const AgentStatusSchema = z.enum(["running", "complete", "error"]);

export const EmitEventSchema = z.object({
  id: z.string().uuid().optional(),
  agent: AgentTypeSchema,
  action: z.string().min(1).max(100),
  status: AgentStatusSchema,
  data: z.record(z.string(), z.unknown()).optional().default({}),
  timestamp: z.string().optional(),
});

export const PreserveRequestSchema = z
  .object({
    language_name: z.string().min(1).max(200).optional(),
    language: z.string().min(1).max(200).optional(),
    language_code: z.string().min(2).max(10),
    glottocode: z.string().max(20).optional(),
    alternate_names: z.array(z.string().max(200)).max(500).optional(),
    native_name: z.string().max(200).optional(),
    macroarea: z.string().max(100).optional(),
    language_family: z.string().max(200).optional(),
    countries: z.array(z.string().max(100)).max(50).optional(),
    contact_languages: z.array(z.string().max(100)).max(50).optional(),
    endangerment_status: z.string().max(50).optional(),
    speaker_count: z.number().int().nonnegative().nullable().optional(),
  })
  .refine((d) => d.language_name || d.language, {
    message: "Either language_name or language is required",
  });
