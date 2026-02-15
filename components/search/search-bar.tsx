"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchArchive } from "@/lib/api";
import type { LanguageEntry } from "@/lib/types";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  resultCount?: number;
  language?: LanguageEntry;
  placeholder?: string;
}

function useSuggestions(languageCode?: string) {
  const [suggestions, setSuggestions] = useState<{ label: string; description: string }[] | null>(null);

  useEffect(() => {
    if (!languageCode) {
      setSuggestions(null);
      return;
    }

    let cancelled = false;

    searchArchive("", { limit: 5, language_code: languageCode })
      .then(({ results }) => {
        if (cancelled) return;
        if (results.length === 0) {
          setSuggestions(null);
          return;
        }
        setSuggestions(
          results.map((entry) => ({
            label: entry.headword_native,
            description: entry.definitions?.[0]?.text || entry.pos || "",
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setSuggestions(null);
      });

    return () => { cancelled = true; };
  }, [languageCode]);

  return suggestions;
}

export function SearchBar({ onSearch, isLoading, resultCount, language, placeholder: placeholderProp }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const suggestions = useSuggestions(language?.iso_code);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchImmediate = useCallback(
    (searchQuery: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearch(searchQuery);
    },
    [onSearch]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch(value.trim());
      }, 300);
    },
    [onSearch]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        handleSearchImmediate(query.trim());
        setIsFocused(false);
      }
    },
    [query, handleSearchImmediate]
  );

  const handleSuggestionClick = useCallback(
    (term: string) => {
      setQuery(term);
      handleSearchImmediate(term);
      setIsFocused(false);
    },
    [handleSearchImmediate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && query) {
        setQuery("");
        handleSearchImmediate("");
        inputRef.current?.blur();
      }
    },
    [query, handleSearchImmediate]
  );

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} role="search" className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholderProp ?? (language ? `Search ${language.name} vocabulary...` : "Search vocabulary...")}
            aria-label={placeholderProp ?? (language ? `Search ${language.name} vocabulary` : "Search vocabulary")}
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
                onClick={() => {
                  setQuery("");
                  handleSearchImmediate("");
                }}
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
        </div>
      </form>

      {/* Quick suggestions (dynamic from Elasticsearch) */}
      {isFocused && !query && suggestions && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border/50 bg-card p-3 shadow-xl">
          <p className="mb-2 text-xs text-muted-foreground">Try searching for:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSuggestionClick(s.label)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-secondary/50 px-2.5 py-1 text-xs transition-colors hover:bg-secondary"
              >
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground">{s.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result count */}
      {resultCount !== undefined && resultCount > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {resultCount} {resultCount === 1 ? "result" : "results"}
          </Badge>
        </div>
      )}
    </div>
  );
}
