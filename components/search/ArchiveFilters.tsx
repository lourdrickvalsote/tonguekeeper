"use client";

import { useMemo } from "react";
import { Volume2, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  GrammarCategory,
  VocabSortOption,
  GrammarSortOption,
} from "@/lib/types";
import { GRAMMAR_CATEGORY_LABELS } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface VocabFilters {
  clusters: Record<string, number>;
  activeCluster: string | null;
  onClusterChange: (cluster: string | null) => void;
  posCounts: Record<string, number>;
  activePOS: string | null;
  onPOSChange: (pos: string | null) => void;
  sort: VocabSortOption;
  onSortChange: (sort: VocabSortOption) => void;
  hasAudioOnly: boolean;
  onHasAudioChange: (v: boolean) => void;
  minSources: number;
  onMinSourcesChange: (v: number) => void;
}

interface GrammarFilters {
  grammarStats: Record<string, number>;
  activeCategory: GrammarCategory | null;
  onCategoryChange: (cat: GrammarCategory | null) => void;
  activeConfidence: string | null;
  onConfidenceChange: (c: string | null) => void;
  sort: GrammarSortOption;
  onSortChange: (sort: GrammarSortOption) => void;
  hasExamplesOnly: boolean;
  onHasExamplesChange: (v: boolean) => void;
}

interface ArchiveFiltersProps {
  mode: "vocabulary" | "grammar";
  onModeChange: (mode: "vocabulary" | "grammar") => void;
  vocab: VocabFilters;
  grammar: GrammarFilters;
}

// ── Shared styles ────────────────────────────────────────────────────────────

const selectClass =
  "h-7 cursor-pointer appearance-none rounded-md border border-border/50 bg-muted/20 pl-2 pr-6 text-[11px] text-foreground outline-none transition-colors hover:border-border focus:border-primary/40 focus:ring-1 focus:ring-primary/20";

const toggleClass = (active: boolean) =>
  cn(
    "flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition-colors",
    active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground"
  );

const chipClass =
  "flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground";

// ── Helpers ──────────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className={chipClass}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted/60 hover:text-foreground"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

// ── Sort labels ──────────────────────────────────────────────────────────────

const VOCAB_SORT_LABELS: Record<VocabSortOption, string> = {
  relevance: "Sort: Relevance",
  alphabetical: "Sort: A \u2192 Z",
  newest: "Sort: Newest",
  sources: "Sort: Most Sources",
};

const GRAMMAR_SORT_LABELS: Record<GrammarSortOption, string> = {
  relevance: "Sort: Relevance",
  newest: "Sort: Newest",
  examples: "Sort: Most Examples",
};

const SOURCE_OPTIONS = [
  { value: 0, label: "Sources: Any" },
  { value: 2, label: "Sources: 2+" },
  { value: 3, label: "Sources: 3+" },
  { value: 5, label: "Sources: 5+" },
];

const CONFIDENCE_OPTIONS = [
  { value: "", label: "Confidence: Any" },
  { value: "high", label: "Confidence: High" },
  { value: "medium", label: "Confidence: Medium" },
  { value: "low", label: "Confidence: Low" },
];

// ── Component ────────────────────────────────────────────────────────────────

export function ArchiveFilters({ mode, onModeChange, vocab, grammar }: ArchiveFiltersProps) {
  // Sorted cluster entries (by count desc)
  const clusterEntries = useMemo(
    () =>
      Object.entries(vocab.clusters).sort(
        (a, b) => b[1] - a[1]
      ),
    [vocab.clusters]
  );

  // Sorted POS entries (by count desc)
  const posEntries = useMemo(
    () =>
      Object.entries(vocab.posCounts).sort(
        (a, b) => b[1] - a[1]
      ),
    [vocab.posCounts]
  );

  // Grammar categories with counts (sorted by count desc, zeros at end)
  const categoryEntries = useMemo(
    () =>
      (Object.keys(GRAMMAR_CATEGORY_LABELS) as GrammarCategory[])
        .map((cat) => ({ cat, count: grammar.grammarStats[cat] || 0 }))
        .sort((a, b) => b.count - a.count),
    [grammar.grammarStats]
  );

  // Active filter chips
  const vocabActive = vocab.activeCluster || vocab.activePOS || vocab.hasAudioOnly || vocab.minSources > 0 || vocab.sort !== "relevance";
  const grammarActive = grammar.activeCategory || grammar.activeConfidence || grammar.hasExamplesOnly || grammar.sort !== "relevance";
  const hasActiveFilters = mode === "vocabulary" ? vocabActive : grammarActive;

  const clearAll = () => {
    if (mode === "vocabulary") {
      vocab.onClusterChange(null);
      vocab.onPOSChange(null);
      vocab.onSortChange("relevance");
      vocab.onHasAudioChange(false);
      vocab.onMinSourcesChange(0);
    } else {
      grammar.onCategoryChange(null);
      grammar.onConfidenceChange(null);
      grammar.onSortChange("relevance");
      grammar.onHasExamplesChange(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Row 1: Mode toggle + quick filters (all left-aligned) */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Vocabulary / Grammar toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-0.5 shrink-0">
          <button
            onClick={() => onModeChange("vocabulary")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              mode === "vocabulary"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Vocabulary
          </button>
          <button
            onClick={() => onModeChange("grammar")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              mode === "grammar"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Grammar
          </button>
        </div>

        {/* Filters */}
          {mode === "vocabulary" ? (
            <>
              {/* Cluster dropdown */}
              {clusterEntries.length > 0 && (
                <select
                  value={vocab.activeCluster || ""}
                  onChange={(e) => vocab.onClusterChange(e.target.value || null)}
                  className={selectClass}
                  aria-label="Filter vocabulary by semantic cluster"
                >
                  <option value="">Cluster: All</option>
                  {clusterEntries.map(([cluster, count]) => (
                    <option key={cluster} value={cluster}>
                      {cluster} ({count})
                    </option>
                  ))}
                </select>
              )}

              {/* POS dropdown */}
              {posEntries.length > 0 && (
                <select
                  value={vocab.activePOS || ""}
                  onChange={(e) => vocab.onPOSChange(e.target.value || null)}
                  className={selectClass}
                  aria-label="Filter by part of speech"
                >
                  <option value="">Part of Speech: All</option>
                  {posEntries.map(([pos, count]) => (
                    <option key={pos} value={pos}>
                      {pos} ({count})
                    </option>
                  ))}
                </select>
              )}

              {/* Sort */}
              <select
                value={vocab.sort}
                onChange={(e) => vocab.onSortChange(e.target.value as VocabSortOption)}
                className={selectClass}
                aria-label="Sort vocabulary results"
              >
                {Object.entries(VOCAB_SORT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Audio toggle */}
              <button
                type="button"
                onClick={() => vocab.onHasAudioChange(!vocab.hasAudioOnly)}
                className={toggleClass(vocab.hasAudioOnly)}
                aria-label="Show only entries with audio recordings"
                aria-pressed={vocab.hasAudioOnly}
              >
                <Volume2 className="h-3 w-3" />
                Has Audio
              </button>

              {/* Sources */}
              <select
                value={vocab.minSources}
                onChange={(e) => vocab.onMinSourcesChange(Number(e.target.value))}
                className={selectClass}
                aria-label="Filter by minimum number of cross-reference sources"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              {/* Category dropdown */}
              <select
                value={grammar.activeCategory || ""}
                onChange={(e) =>
                  grammar.onCategoryChange(
                    (e.target.value as GrammarCategory) || null
                  )
                }
                className={selectClass}
                aria-label="Filter by grammar category"
              >
                <option value="">Category: All</option>
                {categoryEntries.map(({ cat, count }) => (
                  <option key={cat} value={cat}>
                    {GRAMMAR_CATEGORY_LABELS[cat]}
                    {count > 0 ? ` (${count})` : ""}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={grammar.sort}
                onChange={(e) => grammar.onSortChange(e.target.value as GrammarSortOption)}
                className={selectClass}
                aria-label="Sort grammar patterns"
              >
                {Object.entries(GRAMMAR_SORT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Has Examples toggle */}
              <button
                type="button"
                onClick={() => grammar.onHasExamplesChange(!grammar.hasExamplesOnly)}
                className={toggleClass(grammar.hasExamplesOnly)}
                aria-label="Show only patterns with example sentences"
                aria-pressed={grammar.hasExamplesOnly}
              >
                <FileText className="h-3 w-3" />
                With Examples
              </button>

              {/* Confidence */}
              <select
                value={grammar.activeConfidence || ""}
                onChange={(e) => grammar.onConfidenceChange(e.target.value || null)}
                className={selectClass}
                aria-label="Filter by confidence level"
              >
                {CONFIDENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </>
          )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {mode === "vocabulary" ? (
            <>
              {vocab.activeCluster && (
                <FilterChip
                  label={`Cluster: ${vocab.activeCluster}`}
                  onRemove={() => vocab.onClusterChange(null)}
                />
              )}
              {vocab.activePOS && (
                <FilterChip
                  label={`POS: ${vocab.activePOS}`}
                  onRemove={() => vocab.onPOSChange(null)}
                />
              )}
              {vocab.hasAudioOnly && (
                <FilterChip
                  label="Has audio"
                  onRemove={() => vocab.onHasAudioChange(false)}
                />
              )}
              {vocab.minSources > 0 && (
                <FilterChip
                  label={`Sources: ${vocab.minSources}+`}
                  onRemove={() => vocab.onMinSourcesChange(0)}
                />
              )}
              {vocab.sort !== "relevance" && (
                <FilterChip
                  label={VOCAB_SORT_LABELS[vocab.sort]}
                  onRemove={() => vocab.onSortChange("relevance")}
                />
              )}
            </>
          ) : (
            <>
              {grammar.activeCategory && (
                <FilterChip
                  label={GRAMMAR_CATEGORY_LABELS[grammar.activeCategory]}
                  onRemove={() => grammar.onCategoryChange(null)}
                />
              )}
              {grammar.activeConfidence && (
                <FilterChip
                  label={`Confidence: ${grammar.activeConfidence}`}
                  onRemove={() => grammar.onConfidenceChange(null)}
                />
              )}
              {grammar.hasExamplesOnly && (
                <FilterChip
                  label="With examples"
                  onRemove={() => grammar.onHasExamplesChange(false)}
                />
              )}
              {grammar.sort !== "relevance" && (
                <FilterChip
                  label={GRAMMAR_SORT_LABELS[grammar.sort]}
                  onRemove={() => grammar.onSortChange("relevance")}
                />
              )}
            </>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
