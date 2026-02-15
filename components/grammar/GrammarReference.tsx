"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, BookText, Loader2, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GrammarPatternCard } from "./GrammarPatternCard";
import { GrammarPatternDetail } from "./GrammarPatternDetail";
import { searchGrammarPatterns, fetchGrammarStats } from "@/lib/api";
import type { GrammarPattern, GrammarCategory } from "@/lib/types";
import { GRAMMAR_CATEGORY_LABELS } from "@/lib/types";

const ALL_CATEGORIES: GrammarCategory[] = [
  "verb_conjugation",
  "particle_usage",
  "sentence_structure",
  "honorific_system",
  "negation",
  "question_formation",
  "phonological_rule",
  "morphological_rule",
  "other",
];

function SkeletonCard() {
  return (
    <div className="border-b border-border/40 py-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="mt-2.5 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-4/5" />
      <Skeleton className="mt-2 h-8 w-full rounded" />
    </div>
  );
}

interface GrammarReferenceProps {
  onVocabularySearch?: (term: string) => void;
}

export function GrammarReference({ onVocabularySearch }: GrammarReferenceProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GrammarCategory | null>(null);
  const [patterns, setPatterns] = useState<GrammarPattern[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<GrammarPattern | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch stats on mount
  useEffect(() => {
    fetchGrammarStats().then((s) => setStats(s.by_category));
  }, []);

  const doSearch = useCallback(
    async (searchQuery: string, category: GrammarCategory | null) => {
      setIsLoading(true);
      try {
        const { patterns: results, total: resultTotal } = await searchGrammarPatterns(
          searchQuery,
          { category: category || undefined, limit: 50 }
        );
        setPatterns(results);
        setTotal(resultTotal);
        setHasLoaded(true);
      } catch (err) {
        console.error("[GrammarReference] Search failed:", err);
        setPatterns([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Load on mount and when category changes
  useEffect(() => {
    doSearch(query, activeCategory);
  }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        doSearch(value.trim(), activeCategory);
      }, 300);
    },
    [doSearch, activeCategory]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query.trim(), activeCategory);
    },
    [query, activeCategory, doSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch("", activeCategory);
    inputRef.current?.focus();
  }, [doSearch, activeCategory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && query) {
        handleClear();
        inputRef.current?.blur();
      }
    },
    [query, handleClear]
  );

  const handleCategoryClick = useCallback(
    (cat: GrammarCategory) => {
      setActiveCategory((prev) => (prev === cat ? null : cat));
    },
    []
  );

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="shrink-0 px-5 py-3">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search grammar patterns..."
            aria-label="Search grammar patterns"
            className="h-10 border-border/60 bg-card pl-10 pr-20 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Clear search"
                onClick={handleClear}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              className="h-7 px-3 text-xs"
              aria-label="Submit search"
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </form>

        {/* Category filter chips */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const count = stats[cat] || 0;
            const isActive = activeCategory === cat;
            return (
              <Badge
                key={cat}
                variant={isActive ? "default" : "outline"}
                className={`cursor-pointer px-2 py-0 text-[10px] transition-colors ${
                  isActive
                    ? ""
                    : "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                }`}
                onClick={() => handleCategoryClick(cat)}
              >
                {GRAMMAR_CATEGORY_LABELS[cat]}
                {count > 0 && (
                  <span className={`ml-1 ${isActive ? "opacity-70" : "text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
                {isActive && <X className="ml-1 h-2.5 w-2.5" />}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 pb-4">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : patterns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookText className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {hasLoaded
                  ? query
                    ? `No grammar patterns found for "${query}"`
                    : "No grammar patterns found. Run a preservation pipeline to extract grammar patterns from sources."
                  : "Loading grammar patterns..."}
              </p>
              {hasLoaded && query && (
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Try a different search or clear the category filter
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {total > 0 && (
                <p className="text-xs text-muted-foreground">
                  Showing {patterns.length} of {total} pattern{total !== 1 ? "s" : ""}
                  {activeCategory && ` in ${GRAMMAR_CATEGORY_LABELS[activeCategory]}`}
                </p>
              )}

              <AnimatePresence initial={false}>
                {patterns.map((pattern) => (
                  <GrammarPatternCard
                    key={pattern.id}
                    pattern={pattern}
                    onClick={setSelectedPattern}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Detail modal */}
      <GrammarPatternDetail
        pattern={selectedPattern}
        open={!!selectedPattern}
        onOpenChange={(open) => {
          if (!open) setSelectedPattern(null);
        }}
        onVocabularyClick={(term) => {
          setSelectedPattern(null);
          onVocabularySearch?.(term);
        }}
      />
    </div>
  );
}
