"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EndangermentBadge } from "@/components/languages/EndangermentBadge";
import { fetchLanguages } from "@/lib/api";
import type { LanguageEntry } from "@/lib/types";
import { Search, Zap, Users, MapPin, Loader2, Check } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function countryToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function formatSpeakers(count: number | null): string {
  if (count == null) return "Unknown";
  if (count === 0) return "No living speakers";
  return `~${count.toLocaleString()}`;
}

// ── Language Row ─────────────────────────────────────────────────────────────

function LanguageRow({
  lang,
  isSelected,
  onSelect,
}: {
  lang: LanguageEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
        isSelected ? "bg-primary/10" : "hover:bg-secondary/50"
      }`}
    >
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {lang.name}
          </span>
          {isSelected && (
            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
        </div>
        <span className="text-[11px] text-muted-foreground/60 font-mono truncate">
          {lang.iso_code} · {lang.language_family} · {lang.macroarea}
        </span>
      </div>
      <EndangermentBadge status={lang.endangerment_status} size="sm" />
    </button>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface PreservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (language: LanguageEntry) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function PreservationDialog({
  open,
  onOpenChange,
  onStart,
}: PreservationDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LanguageEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<LanguageEntry | null>(null);
  const [featured, setFeatured] = useState<{
    critical: LanguageEntry[];
    severe: LanguageEntry[];
  }>({ critical: [], severe: [] });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state + fetch featured languages when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setIsSearching(false);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 100);

      // Fetch featured languages
      Promise.all([
        fetchLanguages({ endangerment: ["critically_endangered"], limit: 4 }),
        fetchLanguages({ endangerment: ["severely_endangered"], limit: 4 }),
      ]).then(([critical, severe]) => {
        setFeatured({
          critical: critical.languages,
          severe: severe.languages,
        });
      });
    }
  }, [open]);

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      fetchLanguages({ search: value.trim(), limit: 15 })
        .then((data) => {
          setResults(data.languages);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 300);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelect = useCallback((lang: LanguageEntry) => {
    setSelected(lang);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selected) {
      onStart(selected);
    }
  }, [selected, onStart]);

  const hasQuery = query.trim().length > 0;
  const hasFeatured = featured.critical.length > 0 || featured.severe.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 left-[calc(50%+100px)]">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="font-serif">Begin Preservation</DialogTitle>
          <DialogDescription>
            Search for an endangered language to preserve
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="px-5 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, code, or family..."
              className="pl-10 h-10 border-border/60 bg-card"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>
        </div>

        {/* Featured languages (shown when no query) */}
        {!hasQuery && hasFeatured && (
          <ScrollArea className="max-h-[320px] mx-5 mt-2 rounded-md border border-border/50">
            <div>
              {featured.critical.length > 0 && (
                <>
                  <div className="px-3 pt-2.5 pb-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                      Critically Endangered
                    </span>
                  </div>
                  <div className="divide-y divide-border/30">
                    {featured.critical.map((lang) => (
                      <LanguageRow
                        key={lang.glottocode}
                        lang={lang}
                        isSelected={selected?.glottocode === lang.glottocode}
                        onSelect={() => handleSelect(lang)}
                      />
                    ))}
                  </div>
                </>
              )}
              {featured.severe.length > 0 && (
                <>
                  <div className="px-3 pt-2.5 pb-1 border-t border-border/30">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                      Severely Endangered
                    </span>
                  </div>
                  <div className="divide-y divide-border/30">
                    {featured.severe.map((lang) => (
                      <LanguageRow
                        key={lang.glottocode}
                        lang={lang}
                        isSelected={selected?.glottocode === lang.glottocode}
                        onSelect={() => handleSelect(lang)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Search results (shown when query exists) */}
        {hasQuery && results.length > 0 && (
          <ScrollArea className="max-h-[320px] mx-5 mt-2 rounded-md border border-border/50">
            <div className="divide-y divide-border/30">
              {results.map((lang) => (
                <LanguageRow
                  key={lang.glottocode}
                  lang={lang}
                  isSelected={selected?.glottocode === lang.glottocode}
                  onSelect={() => handleSelect(lang)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* No results */}
        {hasQuery && !isSearching && results.length === 0 && (
          <div className="px-5 pt-2">
            <p className="text-xs text-muted-foreground/60 text-center py-4">
              No languages found for &quot;{query}&quot;
            </p>
          </div>
        )}

        {/* Selected language preview */}
        {selected && (
          <div className="mx-5 mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-serif text-sm font-medium text-foreground">
                {selected.name}
              </span>
              <EndangermentBadge
                status={selected.endangerment_status}
                size="sm"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono">
                {selected.iso_code} · {selected.glottocode}
              </span>
              <span>{selected.language_family}</span>
              <span>{selected.macroarea}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {formatSpeakers(selected.speaker_count)}
              </span>
              {selected.countries?.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selected.countries.map(countryToFlag).join(" ")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="px-5 pb-5 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="gap-1.5"
          >
            <Zap className="h-3.5 w-3.5" />
            Start Preservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
