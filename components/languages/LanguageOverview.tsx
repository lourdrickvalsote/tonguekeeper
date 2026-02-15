"use client";

import { useEffect, useState, useRef } from "react";
import {
  ChevronDown,
  BookOpen,
  Users,
  ExternalLink,
  Sparkles,
  Languages,
  Loader2,
  Check,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLanguageOverview } from "@/lib/api";
import type { LanguageEntry, LanguageOverview, ExternalLinkType } from "@/lib/types";

// ── Link type labels ────────────────────────────────────────────────────────

const LINK_TYPE_LABELS: Record<ExternalLinkType, string> = {
  wikipedia: "Wiki",
  glottolog: "Glottolog",
  elp: "ELP",
  elar: "ELAR",
  ethnologue: "Ethno.",
  other: "Resource",
};

// ── Loading steps ───────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: "Researching language", threshold: 0 },
  { label: "Gathering linguistic data", threshold: 5 },
  { label: "Analyzing speaker demographics", threshold: 12 },
  { label: "Compiling references", threshold: 18 },
  { label: "Structuring overview", threshold: 22 },
] as const;

function OverviewLoading({ languageName }: { languageName: string }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentStepIndex = LOADING_STEPS.reduce(
    (acc, step, i) => (elapsed >= step.threshold ? i : acc),
    0
  );

  return (
    <div className="px-5 py-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-3.5 w-3.5 text-primary/60" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          About {languageName}
        </span>
      </div>

      {/* Progress steps */}
      <div className="mb-5 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-xs font-medium text-foreground/80">
            Generating overview for {languageName}...
          </span>
          <span className="ml-auto text-[10px] font-mono tabular-nums text-muted-foreground/50">
            {elapsed}s
          </span>
        </div>

        <div className="space-y-1.5">
          {LOADING_STEPS.map((step, i) => {
            const isDone = i < currentStepIndex;
            const isCurrent = i === currentStepIndex;
            return (
              <div
                key={step.label}
                className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
                  isDone || isCurrent ? "opacity-100" : "opacity-30"
                }`}
              >
                {isDone ? (
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                ) : (
                  <div className="h-3 w-3 rounded-full border border-border/60 shrink-0" />
                )}
                <span
                  className={
                    isDone
                      ? "text-muted-foreground line-through"
                      : isCurrent
                        ? "text-foreground/80"
                        : "text-muted-foreground/50"
                  }
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Column skeleton */}
      <div className="grid grid-cols-1 divide-y divide-border/30 md:grid-cols-3 md:divide-y-0 md:divide-x md:divide-border/30">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`py-4 md:py-0 ${
              i === 0 ? "md:pr-5" : i === 1 ? "md:px-5" : "md:pl-5"
            }`}
          >
            <Skeleton className="h-4 w-28 mb-3" />
            <div className="space-y-3">
              <div>
                <Skeleton className="h-2.5 w-16 mb-1" />
                <Skeleton className="h-3.5 w-full" />
              </div>
              <div>
                <Skeleton className="h-2.5 w-20 mb-1" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
              <div>
                <Skeleton className="h-2.5 w-14 mb-1" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature row helper ──────────────────────────────────────────────────────

function FeatureRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="py-1.5">
      <dt className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] leading-relaxed text-foreground/80">
        {value}
      </dd>
    </div>
  );
}

// ── Props ───────────────────────────────────────────────────────────────────

interface LanguageOverviewSectionProps {
  language: LanguageEntry;
}

// ── Component ───────────────────────────────────────────────────────────────

export function LanguageOverviewSection({
  language,
}: LanguageOverviewSectionProps) {
  const [overview, setOverview] = useState<LanguageOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchLanguageOverview(language.glottocode)
      .then(setOverview)
      .finally(() => setIsLoading(false));
  }, [language.glottocode]);

  // Silent fail — don't render anything if overview failed or is empty
  if (!isLoading && !overview) return null;

  return (
    <section className="border-b border-border/40">
      {isLoading ? (
        <OverviewLoading languageName={language.name} />
      ) : overview ? (
        <div className="px-5 py-4">
          {/* Section header with collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex w-full items-center gap-2 text-left group mb-1"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              About {language.name}
            </span>
            <ChevronDown
              className={`ml-auto h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200 ${
                isCollapsed ? "" : "rotate-180"
              }`}
            />
          </button>

          {!isCollapsed && (
            <div className="mt-3">
              {/* Summary */}
              {(() => {
                const paragraphs = overview.summary.split("\n\n");
                return (
                  <div className="text-sm leading-relaxed text-foreground/80 space-y-2 mb-5">
                    <p>{paragraphs[0]}</p>
                    {paragraphs.length > 1 && !summaryExpanded && (
                      <button
                        onClick={() => setSummaryExpanded(true)}
                        className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
                      >
                        Read more
                      </button>
                    )}
                    {summaryExpanded &&
                      paragraphs.slice(1).map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                );
              })()}

              {/* Info columns — editorial layout with vertical hairlines */}
              <div className="grid grid-cols-1 divide-y divide-border/30 md:grid-cols-3 md:divide-y-0 md:divide-x md:divide-border/30">
                {/* Linguistic Features */}
                <div className="py-4 md:py-0 md:pr-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Languages className="h-3.5 w-3.5 text-primary/60" />
                    <h3 className="font-serif text-sm tracking-tight text-foreground">
                      Linguistic Features
                    </h3>
                  </div>
                  <dl className="space-y-0">
                    <FeatureRow
                      label="Writing System"
                      value={overview.linguistic_features.writing_system}
                    />
                    <FeatureRow
                      label="Phonology"
                      value={overview.linguistic_features.phonology}
                    />
                    <FeatureRow
                      label="Word Order"
                      value={overview.linguistic_features.word_order}
                    />
                    <FeatureRow
                      label="Morphology"
                      value={overview.linguistic_features.morphological_type}
                    />
                  </dl>
                  {(() => {
                    const features = overview.linguistic_features.notable_features ?? [];
                    if (features.length === 0) return null;
                    const visible = featuresExpanded ? features : features.slice(0, 3);
                    const hiddenCount = features.length - 3;
                    return (
                      <div className="mt-3 pt-3 border-t border-border/20">
                        <dt className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 mb-1.5">
                          Notable Features
                        </dt>
                        <dd>
                          <ul className="space-y-1">
                            {visible.map((f, i) => (
                              <li
                                key={i}
                                className="text-[13px] leading-relaxed text-foreground/80 pl-3 relative"
                              >
                                <span className="absolute left-0 top-[0.55em] h-1 w-1 rounded-full bg-border" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          {features.length > 3 && (
                            <button
                              onClick={() => setFeaturesExpanded(!featuresExpanded)}
                              className="text-xs text-primary hover:text-primary/80 transition-colors mt-1.5 cursor-pointer"
                            >
                              {featuresExpanded ? "Show less" : `Show ${hiddenCount} more`}
                            </button>
                          )}
                        </dd>
                      </div>
                    );
                  })()}
                </div>

                {/* Speaker Demographics */}
                <div className="py-4 md:py-0 md:px-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-3.5 w-3.5 text-primary/60" />
                    <h3 className="font-serif text-sm tracking-tight text-foreground">
                      Speaker Demographics
                    </h3>
                  </div>
                  <dl className="space-y-0">
                    <FeatureRow
                      label="Speakers"
                      value={overview.demographics.speaker_count_detail}
                    />
                    <FeatureRow
                      label="Age Distribution"
                      value={overview.demographics.age_distribution}
                    />
                    <FeatureRow
                      label="Geography"
                      value={overview.demographics.geographic_distribution}
                    />
                    <FeatureRow
                      label="Revitalization"
                      value={overview.demographics.revitalization_efforts}
                    />
                  </dl>
                </div>

                {/* References */}
                <div className="py-4 md:py-0 md:pl-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-3.5 w-3.5 text-primary/60" />
                    <h3 className="font-serif text-sm tracking-tight text-foreground">
                      References
                    </h3>
                  </div>
                  {overview.external_links.length > 0 ? (
                    <div className="space-y-0">
                      {overview.external_links.map((link, i) => {
                        const label =
                          LINK_TYPE_LABELS[link.type] ||
                          LINK_TYPE_LABELS.other;
                        return (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-baseline gap-2 py-1.5 text-[13px] transition-colors"
                          >
                            <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-accent-foreground/60 w-16">
                              {label}
                            </span>
                            <span className="text-foreground/70 group-hover:text-primary transition-colors truncate">
                              {link.title}
                            </span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground/40 italic">
                      No reference links available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
