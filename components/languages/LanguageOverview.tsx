"use client";

import { useEffect, useState, useRef } from "react";
import {
  ChevronDown,
  Globe,
  BookOpen,
  Users,
  ExternalLink,
  Sparkles,
  Languages,
  Pen,
  Type,
  Layers,
  Search,
  Loader2,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetchLanguageOverview } from "@/lib/api";
import type { LanguageEntry, LanguageOverview, ExternalLinkType } from "@/lib/types";

// ── Link type config ────────────────────────────────────────────────────────

const LINK_TYPE_META: Record<
  ExternalLinkType,
  { label: string; color: string }
> = {
  wikipedia: { label: "Wikipedia", color: "#636363" },
  glottolog: { label: "Glottolog", color: "#1E40AF" },
  elp: { label: "ELP", color: "#047857" },
  elar: { label: "ELAR", color: "#6D28D9" },
  ethnologue: { label: "Ethnologue", color: "#B45309" },
  other: { label: "Resource", color: "#78716C" },
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

  // Find current step based on elapsed seconds
  const currentStepIndex = LOADING_STEPS.reduce(
    (acc, step, i) => (elapsed >= step.threshold ? i : acc),
    0
  );

  return (
    <div className="px-5 py-4">
      {/* Real section header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-3.5 w-3.5 text-primary/60" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          About {languageName}
        </span>
        <Badge
          variant="secondary"
          className="px-1.5 py-0 text-[9px] text-muted-foreground/50"
        >
          AI
        </Badge>
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
                  isDone || isCurrent
                    ? "opacity-100"
                    : "opacity-30"
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

      {/* Card skeleton with real headers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="gap-0 border-border/50 bg-card/80 p-0">
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10">
                <Languages className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Linguistic Features
              </span>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 border-border/50 bg-card/80 p-0">
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10">
                <Users className="h-3 w-3 text-emerald-600" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Speaker Demographics
              </span>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 border-border/50 bg-card/80 p-0">
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/10">
                <BookOpen className="h-3 w-3 text-amber-600" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                References
              </span>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Feature row helper ──────────────────────────────────────────────────────

function FeatureRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {label}
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">{value}</p>
      </div>
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
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[9px] text-muted-foreground/50"
            >
              AI
            </Badge>
            <ChevronDown
              className={`ml-auto h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200 ${
                isCollapsed ? "" : "rotate-180"
              }`}
            />
          </button>

          {!isCollapsed && (
            <div className="mt-3">
              {/* Summary */}
              <div className="text-sm leading-relaxed text-foreground/80 space-y-2 mb-5">
                {overview.summary.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              {/* Info cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Linguistic Features */}
                <Card className="gap-0 border-border/50 bg-card/80 p-0">
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10">
                        <Languages className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Linguistic Features
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <FeatureRow
                        icon={Pen}
                        label="Writing System"
                        value={overview.linguistic_features.writing_system}
                      />
                      <FeatureRow
                        icon={Type}
                        label="Phonology"
                        value={overview.linguistic_features.phonology}
                      />
                      <FeatureRow
                        icon={Layers}
                        label="Word Order"
                        value={overview.linguistic_features.word_order}
                      />
                      <FeatureRow
                        icon={Layers}
                        label="Morphology"
                        value={overview.linguistic_features.morphological_type}
                      />
                      {overview.linguistic_features.notable_features?.length ? (
                        <div className="pt-1.5 mt-1.5 border-t border-border/30">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                            Notable Features
                          </p>
                          <ul className="space-y-0.5">
                            {overview.linguistic_features.notable_features.map(
                              (f, i) => (
                                <li
                                  key={i}
                                  className="text-xs leading-relaxed text-foreground/80"
                                >
                                  <span className="text-muted-foreground/40 mr-1.5">·</span>
                                  {f}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                {/* Speaker Demographics */}
                <Card className="gap-0 border-border/50 bg-card/80 p-0">
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10">
                        <Users className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Speaker Demographics
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <FeatureRow
                        icon={Users}
                        label="Speakers"
                        value={overview.demographics.speaker_count_detail}
                      />
                      <FeatureRow
                        icon={Users}
                        label="Age Distribution"
                        value={overview.demographics.age_distribution}
                      />
                      <FeatureRow
                        icon={Globe}
                        label="Geography"
                        value={overview.demographics.geographic_distribution}
                      />
                      <FeatureRow
                        icon={Sparkles}
                        label="Revitalization"
                        value={overview.demographics.revitalization_efforts}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* External Links */}
                <Card className="gap-0 border-border/50 bg-card/80 p-0">
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/10">
                        <BookOpen className="h-3 w-3 text-amber-600" />
                      </div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        References
                      </span>
                    </div>
                    <div className="space-y-1">
                      {overview.external_links.length > 0 ? (
                        overview.external_links.map((link, i) => {
                          const meta =
                            LINK_TYPE_META[link.type] || LINK_TYPE_META.other;
                          return (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-md p-1.5 text-xs transition-colors hover:bg-secondary/50 group"
                            >
                              <Badge
                                variant="outline"
                                className="shrink-0 border-0 px-1.5 py-0 text-[9px] font-medium"
                                style={{
                                  backgroundColor: `${meta.color}10`,
                                  color: meta.color,
                                }}
                              >
                                {meta.label}
                              </Badge>
                              <span className="truncate text-muted-foreground group-hover:text-foreground transition-colors">
                                {link.title}
                              </span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                            </a>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground/50 py-2">
                          No reference links available
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
