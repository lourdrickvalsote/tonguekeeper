import { getErrorMessage } from "../../lib/utils/errors.js";
import { emitEvent } from "../utils/event-emitter.js";
import { indexEntries } from "../utils/http.js";
import { generatePronunciationVideo } from "../../lib/heygen.js";
import type { VocabularyEntry } from "../types.js";

const MAX_VIDEOS = 5;

/**
 * Select the top entries for pronunciation video generation.
 * Priority: entries with native audio_url first, then by cross-reference count, then first extracted.
 */
function selectTopEntries(entries: VocabularyEntry[]): VocabularyEntry[] {
  const sorted = [...entries].sort((a, b) => {
    // Prefer entries with native audio (lip-sync > TTS)
    const aHasAudio = a.audio_url ? 1 : 0;
    const bHasAudio = b.audio_url ? 1 : 0;
    if (bHasAudio !== aHasAudio) return bHasAudio - aHasAudio;

    // Then by cross-reference count (more verified = more interesting)
    const aCross = a.cross_references?.length || 0;
    const bCross = b.cross_references?.length || 0;
    return bCross - aCross;
  });

  return sorted.slice(0, MAX_VIDEOS);
}

/**
 * Non-blocking pronunciation video generation step.
 * Runs after the main pipeline completes (same pattern as enrichment).
 * Generates HeyGen avatar videos for the top entries and stores the URL on the entry.
 */
export async function runPronunciationGeneration(
  entries: VocabularyEntry[],
  languageName: string,
  language_code: string
): Promise<void> {
  const selected = selectTopEntries(entries);
  if (selected.length === 0) return;

  const pronunciationEvent = emitEvent("pronunciation", "generating_videos", "running", {
    count: selected.length,
    message: `Generating pronunciation videos for ${selected.length} words...`,
  });

  let generated = 0;

  for (const entry of selected) {
    const word = entry.headword_native;

    try {
      emitEvent("pronunciation", "generating_videos", "running", {
        message: `Generating pronunciation video for "${word}"...`,
        count: generated,
      }, pronunciationEvent.id);

      const result = await generatePronunciationVideo(word, {
        language: languageName,
        audio_url: entry.audio_url,
      });

      entry.pronunciation_video_url = result.video_url;

      await indexEntries([entry], language_code);
      generated++;

      console.log(
        `[Pronunciation] ${result.cached ? "cached" : "generated"}: ${word} → ${result.video_url}`
      );
    } catch (err) {
      console.error(`[Pronunciation] Failed for "${word}":`, getErrorMessage(err));
    }
  }

  emitEvent("pronunciation", "generating_videos", "complete", {
    count: generated,
    message: `Generated ${generated} pronunciation video${generated !== 1 ? "s" : ""}.`,
  }, pronunciationEvent.id);
}
