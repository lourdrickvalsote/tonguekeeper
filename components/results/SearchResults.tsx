"use client";

import { useEffect, useRef, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { BookOpen, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VocabularyCard } from "./vocabulary-card";
import type { VocabularyEntry } from "@/lib/types";

interface SearchResultsProps {
  results: VocabularyEntry[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasSearched: boolean;
  query: string;
  error?: string;
  onCardClick?: (entry: VocabularyEntry) => void;
  onLoadMore: () => void;
  languageName?: string;
}

function SkeletonCard() {
  return (
    <div className="border-b border-border/40 py-4">
      <div className="flex items-baseline gap-2.5">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-10 rounded-full" />
      </div>
      <Skeleton className="mt-1.5 h-4 w-16" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-3/4" />
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-4 w-14 rounded-full" />
        <div className="flex gap-1">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  isLoading: boolean
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(isLoading);
  loadingRef.current = isLoading;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    // Find the nearest scrollable ancestor
    let scrollEl: HTMLElement | null = sentinel.parentElement;
    while (scrollEl) {
      const { overflowY } = getComputedStyle(scrollEl);
      if (overflowY === "auto" || overflowY === "scroll") break;
      scrollEl = scrollEl.parentElement;
    }

    if (!scrollEl) return;

    const check = () => {
      if (loadingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        onLoadMore();
      }
    };

    scrollEl.addEventListener("scroll", check, { passive: true });
    // Check immediately in case content is shorter than viewport
    requestAnimationFrame(check);

    return () => scrollEl.removeEventListener("scroll", check);
  }, [onLoadMore, hasMore, isLoading]);

  return sentinelRef;
}

export function SearchResults({
  results,
  totalCount,
  hasMore,
  isLoading,
  isLoadingMore,
  hasSearched,
  query,
  error,
  onCardClick,
  onLoadMore,
  languageName,
}: SearchResultsProps) {
  const sentinelRef = useInfiniteScroll(onLoadMore, hasMore, isLoadingMore);

  const uniqueResults = useMemo(() => {
    const seen = new Set<string>();
    return results.filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  }, [results]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive/60" />
        <p className="text-sm text-foreground/80">{error}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Please try again or adjust your search
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpen className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {hasSearched
            ? `No results found for "${query}"`
            : "No vocabulary data yet. Run a preservation pipeline to extract vocabulary from sources."}
        </p>
        {hasSearched && (
          <p className="mt-1 text-xs text-muted-foreground/60">
            Try searching in {languageName || "native"} script or English
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {totalCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {uniqueResults.length} of {totalCount} entries
        </p>
      )}

      <AnimatePresence mode="popLayout">
        {uniqueResults.map((entry) => (
          <VocabularyCard
            key={entry.id}
            entry={entry}
            onCardClick={onCardClick}
            languageName={languageName}
          />
        ))}
      </AnimatePresence>

      {isLoadingMore && (
        <div className="flex flex-col gap-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {hasMore && !isLoadingMore && <div ref={sentinelRef} className="h-4" />}

      {!hasMore && uniqueResults.length > 0 && totalCount > uniqueResults.length && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          End of results
        </p>
      )}
    </div>
  );
}
