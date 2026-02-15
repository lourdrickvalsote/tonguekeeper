"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchLanguage } from "@/lib/api";
import {
  LanguageEntry,
  ENDANGERMENT_COLORS,
} from "@/lib/types";
import { useAgentEventsContext } from "@/lib/websocket";
import { useActiveLanguage } from "@/lib/active-language";
import type { LanguageMetadata } from "@/lib/types";
import { SearchPanel } from "@/components/search/search-panel";
import { RunHistory } from "@/components/pipeline/RunHistory";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { EndangermentBadge } from "@/components/languages/EndangermentBadge";
import { LanguageOverviewSection } from "@/components/languages/LanguageOverview";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  MapPin,
  Users,
  Globe,
  Zap,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Mini map (dynamic, SSR disabled for Leaflet) ─────────────────────────────

const MiniMap = dynamic(
  () => import("@/components/languages/MiniMap").then((m) => m.MiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 w-48 rounded-lg bg-[#1a1a2e] border border-border/30 flex items-center justify-center">
        <Globe className="h-5 w-5 text-white/20 animate-pulse" />
      </div>
    ),
  }
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function countryToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function formatSpeakers(count: number | null): string {
  if (count == null) return "Unknown";
  if (count === 0) return "No living speakers";
  return `~${count.toLocaleString()} speakers`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LanguageDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <LanguageDetailContent />
    </Suspense>
  );
}

function LanguageDetailContent() {
  const params = useParams();
  const glottocode = params.glottocode as string;
  const [language, setLanguage] = useState<LanguageEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setNotFound(false);
    fetchLanguage(glottocode)
      .then((data) => setLanguage(data))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [glottocode]);

  if (isLoading) return <DetailSkeleton />;
  if (notFound || !language) return <NotFoundState glottocode={glottocode} />;

  return (
    <motion.div
      className="flex h-full flex-col overflow-y-auto bg-background"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
    >
      {/* Header bar */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 16 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        }}
      >
        <LanguageHeader language={language} />
      </motion.div>

      {/* AI-generated language overview */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 16 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        }}
      >
        <LanguageOverviewSection language={language} />
      </motion.div>

      {/* Pipeline run history */}
      {language.preservation_status.vocabulary_entries > 0 && (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
          }}
        >
          <RunHistory languageCode={language.iso_code} />
        </motion.div>
      )}

      {/* Main content: archive or empty state */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 16 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        }}
      >
        <LanguageBody language={language} />
      </motion.div>
    </motion.div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function buildMetadata(lang: LanguageEntry): LanguageMetadata {
  return {
    language_name: lang.name,
    language_code: lang.iso_code,
    glottocode: lang.glottocode,
    native_name: lang.alternate_names?.[0],
    alternate_names: lang.alternate_names,
    macroarea: lang.macroarea,
    language_family: lang.language_family,
    countries: lang.countries,
    contact_languages: lang.contact_languages,
    endangerment_status: lang.endangerment_status,
    speaker_count: lang.speaker_count,
  };
}

function LanguageHeader({ language }: { language: LanguageEntry }) {
  const router = useRouter();
  const { startPipeline, pipelineStatus } = useAgentEventsContext();
  const hasData = language.preservation_status.vocabulary_entries > 0;

  const handlePreservation = useCallback(() => {
    startPipeline(buildMetadata(language));
  }, [startPipeline, language]);

  return (
    <header className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-sm">
      {/* Top bar with back + stats */}
      <div className="flex items-center justify-between px-5 py-2">
        <button
          onClick={() => router.push("/languages")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Languages
        </button>
        <StatsBar languageCode={language.iso_code} />
      </div>

      {/* Language info + mini map */}
      <div className="flex items-start justify-between gap-6 px-5 pb-4">
        {/* Left: metadata */}
        <div className="flex flex-col gap-2 min-w-0">
          {/* Name + badge + preservation button */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-xl tracking-tight text-foreground">
              {language.name}
            </h1>
            <EndangermentBadge status={language.endangerment_status} />
            {hasData && (
              <Button
                size="sm"
                variant={pipelineStatus === "running" ? "outline" : "default"}
                onClick={handlePreservation}
                disabled={pipelineStatus === "running" || pipelineStatus === "complete"}
                className="h-7 gap-1.5 text-xs"
              >
                {pipelineStatus === "running" ? (
                  <>
                    <Zap className="h-3 w-3 animate-pulse" />
                    Preserving...
                  </>
                ) : pipelineStatus === "complete" ? (
                  <>
                    <BookOpen className="h-3 w-3" />
                    Preserved
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3" />
                    Run Preservation
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Codes row */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>{language.iso_code}</span>
            <span className="text-border">·</span>
            <span>{language.glottocode}</span>
            <span className="text-border">·</span>
            <span className="font-sans">{language.language_family}</span>
            <span className="text-border">·</span>
            <span className="font-sans">{language.macroarea}</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {formatSpeakers(language.speaker_count)}
            </span>

            {language.countries?.length > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span title={language.countries.join(", ")}>
                  {language.countries.map(countryToFlag).join(" ")}
                </span>
              </span>
            )}

            {language.preservation_status.vocabulary_entries > 0 && (
              <span className="flex items-center gap-1.5 text-emerald-700">
                <BookOpen className="h-3.5 w-3.5" />
                {language.preservation_status.vocabulary_entries.toLocaleString()} entries
              </span>
            )}
          </div>
        </div>

        {/* Right: mini map */}
        {language.latitude != null && language.longitude != null && (
          <div className="shrink-0 hidden md:block">
            <MiniMap
              latitude={language.latitude}
              longitude={language.longitude}
              color={ENDANGERMENT_COLORS[language.endangerment_status]}
              languageName={language.name}
            />
          </div>
        )}
      </div>
    </header>
  );
}

// ── Body (archive or empty state) ────────────────────────────────────────────

function LanguageBody({ language }: { language: LanguageEntry }) {
  const { pipelineStatus } = useAgentEventsContext();
  const hasData = language.preservation_status.vocabulary_entries > 0;
  const isActive = pipelineStatus === "running" || pipelineStatus === "complete";

  if (hasData || isActive) {
    return <SearchPanel language={language} embedded />;
  }

  return <EmptyState language={language} />;
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ language }: { language: LanguageEntry }) {
  const router = useRouter();
  const { setActiveLanguage } = useActiveLanguage();

  const handlePreservation = useCallback(() => {
    // Set active language in context and flag auto-start for dashboard
    setActiveLanguage(language);
    sessionStorage.setItem("tk-auto-start", "true");
    router.push("/dashboard");
  }, [language, router, setActiveLanguage]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4 max-w-md">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <BookOpen className="h-7 w-7 text-primary" />
        </div>

        {/* Title */}
        <div>
          <h2 className="font-serif text-lg text-foreground mb-1">
            No preservation data yet
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            TongueKeeper&apos;s AI agents will discover and compile vocabulary,
            grammar patterns, and audio recordings for{" "}
            <strong>{language.name}</strong>.
          </p>
        </div>

        {/* CTA */}
        <Button
          onClick={handlePreservation}
          className="mt-2 gap-2"
        >
          <Zap className="h-4 w-4" />
          Begin Preservation
        </Button>

        {/* Subtext */}
        <p className="text-xs text-muted-foreground/60 max-w-sm">
          This process may take a while depending on available sources. You&apos;ll see real-time
          updates as agents discover sources and extract vocabulary.
        </p>
      </div>
    </div>
  );
}

// ── Not Found ────────────────────────────────────────────────────────────────

function NotFoundState({ glottocode }: { glottocode: string }) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <h2 className="font-serif text-lg text-foreground mb-1">
            Language not found
          </h2>
          <p className="text-sm text-muted-foreground">
            No language with glottocode{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              {glottocode}
            </code>{" "}
            was found in our database.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/languages")}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to Languages
        </Button>
      </div>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header skeleton */}
      <header className="shrink-0 border-b border-border/60 px-5">
        <div className="flex items-center justify-between py-2">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="flex items-start justify-between gap-6 pb-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-32 w-48 rounded-lg hidden md:block" />
        </div>
      </header>

      {/* Overview skeleton */}
      <div className="border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2 mb-5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-40 rounded-md mt-2" />
        </div>
      </div>
    </div>
  );
}
