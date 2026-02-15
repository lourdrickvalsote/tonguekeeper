"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LanguageFilters,
  EndangermentStatus,
  ENDANGERMENT_COLORS,
  ENDANGERMENT_LABELS,
  MACROAREAS,
} from "@/lib/types";

// ── Constants ───────────────────────────────────────────────────────────────

const ENDANGERMENT_OPTIONS: EndangermentStatus[] = [
  "vulnerable",
  "definitely_endangered",
  "severely_endangered",
  "critically_endangered",
  "extinct",
];

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name (A \u2192 Z)" },
  { value: "endangerment_desc", label: "Most Endangered" },
  { value: "speakers_asc", label: "Fewest Speakers" },
  { value: "speakers_desc", label: "Most Speakers" },
  { value: "preservation_desc", label: "Most Preserved" },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: LanguageFilters;
  onFiltersChange: (filters: LanguageFilters) => void;
  totalResults: number;
  totalLanguages: number;
  languageFamilies?: string[];
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export function FilterBar({
  filters,
  onFiltersChange,
  totalResults,
  totalLanguages,
  languageFamilies = [],
  className,
}: FilterBarProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [familySearch, setFamilySearch] = useState(filters.family || "");
  const [minSpeakers, setMinSpeakers] = useState(
    filters.min_speakers != null ? String(filters.min_speakers) : ""
  );
  const [maxSpeakers, setMaxSpeakers] = useState(
    filters.max_speakers != null ? String(filters.max_speakers) : ""
  );
  const [sortOpen, setSortOpen] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const familyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const speakerTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    if (sortOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sortOpen]);

  // Sync local inputs when filters change externally (e.g. URL nav)
  useEffect(() => {
    setSearchValue(filters.search || "");
    setFamilySearch(filters.family || "");
    setMinSpeakers(
      filters.min_speakers != null ? String(filters.min_speakers) : ""
    );
    setMaxSpeakers(
      filters.max_speakers != null ? String(filters.max_speakers) : ""
    );
  }, [filters.search, filters.family, filters.min_speakers, filters.max_speakers]);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const update = useCallback(
    (patch: Partial<LanguageFilters>) => {
      onFiltersChange({ ...filters, ...patch });
    },
    [filters, onFiltersChange]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.endangerment?.length) count++;
    if (filters.macroarea?.length) count++;
    if (filters.family) count++;
    if (filters.min_speakers != null || filters.max_speakers != null) count++;
    if (filters.has_preservation) count++;
    return count;
  }, [filters]);

  const hasAnyFilter = useMemo(
    () => !!filters.search || activeFilterCount > 0 || !!filters.sort,
    [filters.search, activeFilterCount, filters.sort]
  );

  const clearAll = useCallback(() => {
    setSearchValue("");
    setFamilySearch("");
    setMinSpeakers("");
    setMaxSpeakers("");
    onFiltersChange({});
  }, [onFiltersChange]);

  // ── Debounced handlers ──────────────────────────────────────────────────

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        update({ search: value || undefined });
      }, 300);
    },
    [update]
  );

  const handleFamilyChange = useCallback(
    (value: string) => {
      setFamilySearch(value);
      clearTimeout(familyTimerRef.current);
      familyTimerRef.current = setTimeout(() => {
        update({ family: value || undefined });
      }, 300);
    },
    [update]
  );

  const handleSpeakersChange = useCallback(
    (field: "min" | "max", value: string) => {
      if (field === "min") setMinSpeakers(value);
      else setMaxSpeakers(value);
      clearTimeout(speakerTimerRef.current);
      speakerTimerRef.current = setTimeout(() => {
        const min = field === "min" ? value : minSpeakers;
        const max = field === "max" ? value : maxSpeakers;
        update({
          min_speakers: min ? Number(min) : undefined,
          max_speakers: max ? Number(max) : undefined,
        });
      }, 500);
    },
    [update, minSpeakers, maxSpeakers]
  );

  // ── Toggle array filter ─────────────────────────────────────────────────

  const toggleArrayFilter = useCallback(
    <K extends "endangerment" | "macroarea">(
      key: K,
      value: string
    ) => {
      const current = (filters[key] as string[] | undefined) || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      update({ [key]: next.length ? next : undefined } as Partial<LanguageFilters>);
    },
    [filters, update]
  );

  // ── Cleanup timers ──────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearTimeout(searchTimerRef.current);
      clearTimeout(familyTimerRef.current);
      clearTimeout(speakerTimerRef.current);
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={cn("border-b border-border/40", className)}>
      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 py-2">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search languages, ISO codes, families\u2026"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-background pl-8 pr-8 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-colors"
          />
          {searchValue && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setPanelOpen((p) => !p)}
          className={cn(
            "relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            panelOpen
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-150",
              panelOpen && "rotate-180"
            )}
          />
        </button>

        {/* Sort */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen((p) => !p)}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            {SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ||
              "Sort by"}
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-150",
                sortOpen && "rotate-180"
              )}
            />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-border/60 bg-background shadow-lg py-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    update({
                      sort:
                        filters.sort === option.value
                          ? undefined
                          : option.value,
                    });
                    setSortOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left",
                    filters.sort === option.value
                      ? "text-primary font-medium bg-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Check
                    className={cn(
                      "h-3 w-3 shrink-0",
                      filters.sort === option.value
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear all */}
        {hasAnyFilter && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors whitespace-nowrap"
          >
            Clear all
          </button>
        )}

        {/* Results count */}
        <span className="text-xs text-muted-foreground/70 font-mono tabular-nums shrink-0 ml-auto">
          {totalResults === totalLanguages
            ? `${totalLanguages.toLocaleString()} languages`
            : `${totalResults.toLocaleString()} of ${totalLanguages.toLocaleString()}`}
        </span>
      </div>

      {/* ── Collapsible filter panel ───────────────────────────── */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          panelOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-3 pt-1 space-y-3">
            {/* Endangerment */}
            <FilterSection label="Endangerment">
              <div className="flex flex-wrap gap-1.5">
                {ENDANGERMENT_OPTIONS.map((status) => {
                  const active = filters.endangerment?.includes(status);
                  const color = ENDANGERMENT_COLORS[status];
                  return (
                    <button
                      key={status}
                      onClick={() => toggleArrayFilter("endangerment", status)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border",
                        active
                          ? "border-transparent"
                          : "border-border/40 text-muted-foreground hover:border-border"
                      )}
                      style={
                        active
                          ? {
                              backgroundColor: `${color}18`,
                              color: color,
                              borderColor: `${color}30`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      {ENDANGERMENT_LABELS[status]}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            {/* Region */}
            <FilterSection label="Region">
              <div className="flex flex-wrap gap-1.5">
                {MACROAREAS.map((area) => {
                  const active = filters.macroarea?.includes(area);
                  return (
                    <button
                      key={area}
                      onClick={() => toggleArrayFilter("macroarea", area)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border",
                        active
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            {/* Bottom row: Family + Speakers + Preserved toggle */}
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              {/* Language family */}
              <FilterSection label="Language Family" inline>
                <input
                  type="text"
                  placeholder="e.g. Austronesian, Uralic\u2026"
                  value={familySearch}
                  onChange={(e) => handleFamilyChange(e.target.value)}
                  className="w-48 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-colors"
                />
                {familySearch && (
                  <button
                    onClick={() => handleFamilyChange("")}
                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </FilterSection>

              {/* Speaker count */}
              <FilterSection label="Speakers" inline>
                <input
                  type="number"
                  placeholder="Min"
                  value={minSpeakers}
                  onChange={(e) =>
                    handleSpeakersChange("min", e.target.value)
                  }
                  min={0}
                  className="w-20 rounded-md border border-border/60 bg-background px-2 py-1 text-xs font-mono tabular-nums placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-colors"
                />
                <span className="text-muted-foreground/40 text-xs">\u2014</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxSpeakers}
                  onChange={(e) =>
                    handleSpeakersChange("max", e.target.value)
                  }
                  min={0}
                  className="w-20 rounded-md border border-border/60 bg-background px-2 py-1 text-xs font-mono tabular-nums placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-colors"
                />
              </FilterSection>

              {/* Has preservation data */}
              <FilterSection label="Preserved" inline>
                <button
                  onClick={() =>
                    update({
                      has_preservation: filters.has_preservation
                        ? undefined
                        : true,
                    })
                  }
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors duration-200",
                    filters.has_preservation
                      ? "bg-primary"
                      : "bg-border"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                      filters.has_preservation && "translate-x-4"
                    )}
                  />
                </button>
                <span className="text-[11px] text-muted-foreground">
                  Only preserved
                </span>
              </FilterSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FilterSection ─────────────────────────────────────────────────────────

function FilterSection({
  label,
  inline = false,
  children,
}: {
  label: string;
  inline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        inline ? "flex items-center gap-2" : "space-y-1.5"
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 shrink-0">
        {label}
      </span>
      <div className={cn("flex items-center gap-1.5", inline && "flex-wrap")}>
        {children}
      </div>
    </div>
  );
}
