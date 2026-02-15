"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchLanguages } from "@/lib/api";
import {
  LanguageEntry,
  LanguageBrowserStats as BrowserStats,
  LanguageFilters,
  EndangermentStatus,
} from "@/lib/types";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageBrowserStats } from "@/components/languages/LanguageBrowserStats";
import { FilterBar } from "@/components/languages/FilterBar";
import { LanguageTable } from "@/components/languages/LanguageTable";
import { Map, TableProperties, Globe } from "lucide-react";

const WorldMap = dynamic(
  () => import("@/components/languages/WorldMap").then((m) => m.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full rounded-lg border border-border/30 bg-[#1a1a2e]">
        <Globe className="h-8 w-8 text-white/20 animate-pulse" />
        <p className="text-xs text-white/30 mt-2">Loading map...</p>
      </div>
    ),
  }
);

// ── URL <-> Filters helpers ──────────────────────────────────────────────

function filtersFromParams(params: URLSearchParams): LanguageFilters {
  const filters: LanguageFilters = {};
  const search = params.get("search");
  if (search) filters.search = search;

  const endangerment = params.get("endangerment");
  if (endangerment)
    filters.endangerment = endangerment.split(",") as EndangermentStatus[];

  const macroarea = params.get("macroarea");
  if (macroarea) filters.macroarea = macroarea.split(",");

  const family = params.get("family");
  if (family) filters.family = family;

  const minSpeakers = params.get("min_speakers");
  if (minSpeakers) filters.min_speakers = Number(minSpeakers);

  const maxSpeakers = params.get("max_speakers");
  if (maxSpeakers) filters.max_speakers = Number(maxSpeakers);

  const hasPreservation = params.get("has_preservation");
  if (hasPreservation === "true") filters.has_preservation = true;

  const sort = params.get("sort");
  if (sort) filters.sort = sort;

  return filters;
}

function filtersToParams(filters: LanguageFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.endangerment?.length)
    params.set("endangerment", filters.endangerment.join(","));
  if (filters.macroarea?.length)
    params.set("macroarea", filters.macroarea.join(","));
  if (filters.family) params.set("family", filters.family);
  if (filters.min_speakers != null)
    params.set("min_speakers", String(filters.min_speakers));
  if (filters.max_speakers != null)
    params.set("max_speakers", String(filters.max_speakers));
  if (filters.has_preservation) params.set("has_preservation", "true");
  if (filters.sort) params.set("sort", filters.sort);
  return params;
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function LanguageBrowserPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-col overflow-hidden bg-background">
          <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-sm px-5 py-2">
            <Skeleton className="h-5 w-40" />
          </header>
          <div className="flex-1 px-5 pt-6">
            <TableSkeleton />
          </div>
        </div>
      }
    >
      <LanguageBrowserContent />
    </Suspense>
  );
}

function LanguageBrowserContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters = useMemo(
    () => filtersFromParams(searchParams),
    [searchParams]
  );

  const [languages, setLanguages] = useState<LanguageEntry[]>([]);
  const [stats, setStats] = useState<BrowserStats>({
    total_endangered: 0,
    critically_endangered: 0,
    extinct: 0,
    with_preservation_data: 0,
  });
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("table");

  // Fetch languages when filters change
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchLanguages({ ...filters, limit: 10000 }).then((data) => {
      if (cancelled) return;
      setLanguages(data.languages);
      setTotal(data.total);
      setStats(data.stats);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  // Update URL when filters change
  const handleFiltersChange = useCallback(
    (newFilters: LanguageFilters) => {
      const params = filtersToParams(newFilters);
      const qs = params.toString();
      router.replace(`/languages${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  // Local filtering for mock mode (search + endangerment + macroarea + family + speakers + preservation)
  const filteredLanguages = useMemo(() => {
    let result = languages;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (lang) =>
          lang.name.toLowerCase().includes(q) ||
          lang.iso_code?.toLowerCase().includes(q) ||
          lang.glottocode.toLowerCase().includes(q) ||
          lang.language_family.toLowerCase().includes(q) ||
          lang.macroarea.toLowerCase().includes(q)
      );
    }

    if (filters.endangerment?.length) {
      result = result.filter((lang) =>
        filters.endangerment!.includes(lang.endangerment_status)
      );
    }

    if (filters.macroarea?.length) {
      result = result.filter((lang) =>
        filters.macroarea!.includes(lang.macroarea)
      );
    }

    if (filters.family) {
      const fam = filters.family.toLowerCase();
      result = result.filter((lang) =>
        lang.language_family.toLowerCase().includes(fam)
      );
    }

    if (filters.min_speakers != null) {
      result = result.filter(
        (lang) =>
          lang.speaker_count != null &&
          lang.speaker_count >= filters.min_speakers!
      );
    }

    if (filters.max_speakers != null) {
      result = result.filter(
        (lang) =>
          lang.speaker_count != null &&
          lang.speaker_count <= filters.max_speakers!
      );
    }

    if (filters.has_preservation) {
      result = result.filter(
        (lang) => lang.preservation_status.vocabulary_entries > 0
      );
    }

    return result;
  }, [languages, filters]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-sm px-5 py-2">
        <h1 className="font-serif text-base tracking-tight text-foreground/80 select-none">
          Endangered Languages
        </h1>

        <LanguageBrowserStats stats={stats} />
      </header>

      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        totalResults={filteredLanguages.length}
        totalLanguages={total}
      />

      {/* ── Tabs + Content ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-h-0 px-5 pt-3 pb-4">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex items-center justify-between mb-3">
            <TabsList>
              <TabsTrigger value="table" className="gap-1.5">
                <TableProperties className="h-3.5 w-3.5" />
                Table
              </TabsTrigger>
              <TabsTrigger value="map" className="gap-1.5">
                <Map className="h-3.5 w-3.5" />
                Map
              </TabsTrigger>
            </TabsList>

            <p className="text-xs text-muted-foreground/60 hidden md:block">
              Data from{" "}
              <a
                href="https://glottolog.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
              >
                Glottolog
              </a>{" "}
              &{" "}
              <a
                href="https://endangeredlanguages.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
              >
                ELP
              </a>
            </p>
          </div>

          {/* ── Table View ────────────────────────────────────── */}
          <TabsContent value="table" className="flex-1 min-h-0">
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <LanguageTable
                languages={filteredLanguages}
                totalLanguages={total}
              />
            )}
          </TabsContent>

          {/* ── Map View ──────────────────────────────────────── */}
          <TabsContent value="map" className="flex-1 min-h-0">
            {activeTab === "map" && (
              <WorldMap languages={filteredLanguages} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ── Loading Skeleton ────────────────────────────────────────────────────── */

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div className="border-b border-border/40 bg-muted/30 px-4 py-2.5">
        <div className="flex gap-12">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-12 px-4 py-3 border-b border-border/20 ${
            i % 2 === 1 ? "bg-muted/10" : ""
          }`}
        >
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
