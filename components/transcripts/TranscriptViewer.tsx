"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Captions, Clock, Languages, Loader2, Volume2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchTranscript } from "@/lib/api";
import type { AudioSegment, TranscriptData, WordTimestamp } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ── Props ──────────────────────────────────────────────────────────────────

interface TranscriptViewerProps {
  videoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function TranscriptViewer({
  videoId,
  open,
  onOpenChange,
}: TranscriptViewerProps) {
  const [data, setData] = useState<TranscriptData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCorrected, setShowCorrected] = useState(true);
  const [playingWordKey, setPlayingWordKey] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const playingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch transcript on open
  useEffect(() => {
    if (!open || !videoId) return;

    setIsLoading(true);
    setError(null);
    fetchTranscript(videoId)
      .then((result) => {
        if (result) {
          setData(result);
        } else {
          setError("Transcript not found for this video.");
        }
      })
      .catch(() => setError("Failed to load transcript."))
      .finally(() => setIsLoading(false));
  }, [open, videoId]);

  // Clean up on close
  useEffect(() => {
    if (!open) {
      setPlayingWordKey(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
      }
    }
  }, [open]);

  const playWordClip = useCallback(
    (word: WordTimestamp, segIndex: number, wordIndex: number) => {
      const audio = audioRef.current;
      if (!audio || !data) return;

      const wordKey = `${segIndex}-${wordIndex}`;
      const clipUrl = data.word_clips[word.word.trim()];

      // Stop current playback
      audio.pause();
      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
      }

      if (clipUrl) {
        // Direct clip playback
        audio.src = clipUrl;
        audio.currentTime = 0;
        setPlayingWordKey(wordKey);

        audio.onended = () => setPlayingWordKey(null);
        audio.onerror = () => setPlayingWordKey(null);
        audio.play().catch(() => setPlayingWordKey(null));
      } else if (data.audio_urls.length > 0) {
        // Fallback: seek within chunk audio
        const chunkSeconds = 30;
        const chunkIdx = Math.min(
          Math.floor(word.start / chunkSeconds),
          data.audio_urls.length - 1
        );
        const localStart = word.start - chunkIdx * chunkSeconds;
        const localEnd = word.end - chunkIdx * chunkSeconds;
        const chunkUrl = data.audio_urls[chunkIdx];

        audio.src = chunkUrl;
        setPlayingWordKey(wordKey);

        audio.onloadedmetadata = () => {
          audio.currentTime = localStart;
          audio.play().catch(() => setPlayingWordKey(null));

          // Stop playback after word duration
          const duration = (localEnd - localStart) * 1000;
          playingTimeoutRef.current = setTimeout(() => {
            audio.pause();
            setPlayingWordKey(null);
          }, duration + 100);
        };
        audio.onerror = () => setPlayingWordKey(null);
      }
    },
    [data]
  );

  const playSegment = useCallback(
    (segment: AudioSegment) => {
      const audio = audioRef.current;
      if (!audio || !data || data.audio_urls.length === 0) return;

      audio.pause();
      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
      }

      const chunkSeconds = 30;
      const chunkIdx = Math.min(
        Math.floor(segment.start / chunkSeconds),
        data.audio_urls.length - 1
      );
      const localStart = segment.start - chunkIdx * chunkSeconds;
      const localEnd = segment.end - chunkIdx * chunkSeconds;
      const chunkUrl = data.audio_urls[chunkIdx];

      audio.src = chunkUrl;
      setPlayingWordKey(`seg-${segment.start}`);

      audio.onloadedmetadata = () => {
        audio.currentTime = localStart;
        audio.play().catch(() => setPlayingWordKey(null));

        const duration = (localEnd - localStart) * 1000;
        playingTimeoutRef.current = setTimeout(() => {
          audio.pause();
          setPlayingWordKey(null);
        }, duration + 100);
      };
      audio.onerror = () => setPlayingWordKey(null);
    },
    [data]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="none" />

      <DialogContent showCloseButton={false} className="sm:max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <div className="flex flex-col max-h-[85vh]">
          <DialogHeader className="shrink-0 px-6 pt-5 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Captions className="h-4 w-4 text-muted-foreground shrink-0" />
                <DialogTitle className="text-sm font-medium truncate">
                  {data?.language_name
                    ? `${data.language_name} Transcript`
                    : `Transcript`}
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {data && (
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-0 bg-secondary/50"
                >
                  <Clock className="mr-1 h-2.5 w-2.5" />
                  {formatDuration(data.duration_seconds)}
                </Badge>
                {data.language_name && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-0 bg-secondary/50"
                  >
                    <Languages className="mr-1 h-2.5 w-2.5" />
                    {data.language_name}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-0 bg-secondary/50"
                >
                  {data.segments.length} segments
                </Badge>
                {Object.keys(data.word_clips).length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-0 bg-primary/10 text-primary"
                  >
                    <Volume2 className="mr-1 h-2.5 w-2.5" />
                    {Object.keys(data.word_clips).length} word clips
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Corrected / Raw toggle */}
          {data && data.corrected !== data.transcript && (
            <div className="shrink-0 px-6 py-2 border-b border-border/30 bg-secondary/20">
              <div className="flex gap-1">
                <button
                  onClick={() => setShowCorrected(true)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                    showCorrected
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  Corrected
                </button>
                <button
                  onClick={() => setShowCorrected(false)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                    !showCorrected
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  Raw
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground/60">
                  Loading transcript...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <Captions className="h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : data && !showCorrected ? (
            /* Raw transcript — plain text, no word-level interaction */
            <div className="min-h-0 overflow-y-auto">
              <div className="px-6 py-4">
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {data.transcript}
                </p>
              </div>
            </div>
          ) : data ? (
            /* Corrected transcript with word-level segments */
            <div className="min-h-0 overflow-y-auto">
              <div className="px-6 py-3 space-y-1">
                {data.segments.map((segment, segIdx) => (
                  <SegmentRow
                    key={segIdx}
                    segment={segment}
                    segIndex={segIdx}
                    wordClips={data.word_clips}
                    playingWordKey={playingWordKey}
                    onPlayWord={playWordClip}
                    onPlaySegment={playSegment}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Segment Row ────────────────────────────────────────────────────────────

function SegmentRow({
  segment,
  segIndex,
  wordClips,
  playingWordKey,
  onPlayWord,
  onPlaySegment,
}: {
  segment: AudioSegment;
  segIndex: number;
  wordClips: Record<string, string>;
  playingWordKey: string | null;
  onPlayWord: (word: WordTimestamp, segIdx: number, wordIdx: number) => void;
  onPlaySegment: (segment: AudioSegment) => void;
}) {
  const hasWords = segment.words && segment.words.length > 0;
  const isSegmentPlaying = playingWordKey === `seg-${segment.start}`;

  return (
    <div className="group flex gap-3 py-1.5 rounded-md transition-colors hover:bg-secondary/30">
      {/* Timestamp */}
      <button
        onClick={() => onPlaySegment(segment)}
        className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] tabular-nums font-mono transition-colors cursor-pointer ${
          isSegmentPlaying
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/50"
        }`}
        title="Play segment"
      >
        {formatTimestamp(segment.start)}
      </button>

      {/* Words */}
      <div className="flex-1 min-w-0">
        {hasWords ? (
          <p className="text-sm leading-relaxed">
            {segment.words!.map((word, wIdx) => (
              <ClickableWord
                key={wIdx}
                word={word}
                segIndex={segIndex}
                wordIndex={wIdx}
                hasClip={word.word.trim() in wordClips}
                isPlaying={playingWordKey === `${segIndex}-${wIdx}`}
                onPlay={onPlayWord}
              />
            ))}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/80">
            {segment.text}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Clickable Word ─────────────────────────────────────────────────────────

function ClickableWord({
  word,
  segIndex,
  wordIndex,
  hasClip,
  isPlaying,
  onPlay,
}: {
  word: WordTimestamp;
  segIndex: number;
  wordIndex: number;
  hasClip: boolean;
  isPlaying: boolean;
  onPlay: (word: WordTimestamp, segIdx: number, wordIdx: number) => void;
}) {
  const handleClick = useCallback(() => {
    onPlay(word, segIndex, wordIndex);
  }, [word, segIndex, wordIndex, onPlay]);

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`
        inline cursor-pointer rounded-sm transition-all duration-150
        ${
          isPlaying
            ? "bg-primary/20 text-primary ring-1 ring-primary/30"
            : hasClip
              ? "text-foreground/90 decoration-primary/30 underline decoration-dashed underline-offset-4 hover:bg-primary/10 hover:text-primary"
              : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground"
        }
      `}
      title={
        hasClip
          ? `Play "${word.word.trim()}" (${formatTimestamp(word.start)})`
          : `${word.word.trim()} (${formatTimestamp(word.start)})`
      }
    >
      {word.word}
    </span>
  );
}
