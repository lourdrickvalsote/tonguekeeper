"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import {
  LanguageEntry,
  ENDANGERMENT_COLORS,
  ENDANGERMENT_LABELS,
} from "@/lib/types";
import { EndangermentBadge } from "@/components/languages/EndangermentBadge";
import { ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function countryToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const COUNTRY_NAMES: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(cache, code: string) {
      if (code in cache) return cache[code];
      try {
        const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
        cache[code] = name;
        return name;
      } catch {
        cache[code] = code;
        return code;
      }
    },
  }
);

function formatSpeakers(count: number | null): string {
  if (count == null) return "Unknown";
  if (count === 0) return "\u2014";
  return `~${count.toLocaleString()}`;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 48;
const OVERSCAN = 8;

const columnHelper = createColumnHelper<LanguageEntry>();

// ── Props ────────────────────────────────────────────────────────────────────

interface LanguageTableProps {
  languages: LanguageEntry[];
  totalLanguages: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function LanguageTable({ languages, totalLanguages }: LanguageTableProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      // 1. Language name
      columnHelper.accessor("name", {
        header: "Language",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-foreground truncate">
                {row.name}
              </span>
              <span className="text-[11px] text-muted-foreground/60 font-mono truncate">
                {row.iso_code} · {row.glottocode}
              </span>
            </div>
          );
        },
        size: 180,
      }),

      // 2. Endangerment status
      columnHelper.accessor("endangerment_status", {
        header: "Status",
        cell: (info) => (
          <EndangermentBadge status={info.getValue()} size="sm" />
        ),
        sortingFn: (rowA, rowB) =>
          rowA.original.endangerment_level - rowB.original.endangerment_level,
        size: 150,
      }),

      // 3. Speakers
      columnHelper.accessor("speaker_count", {
        header: "Speakers",
        cell: (info) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            {formatSpeakers(info.getValue())}
          </span>
        ),
        sortUndefined: "last",
        size: 100,
        meta: { hideBelow: "md" },
      }),

      // 4. Region
      columnHelper.accessor("macroarea", {
        header: "Region",
        size: 110,
        meta: { hideBelow: "md" },
      }),

      // 5. Family
      columnHelper.accessor("language_family", {
        header: "Family",
        cell: (info) => (
          <span className="truncate block max-w-[140px]">{info.getValue()}</span>
        ),
        size: 140,
        meta: { hideBelow: "lg" },
      }),

      // 6. Countries
      columnHelper.accessor("countries", {
        header: "Country",
        cell: (info) => {
          const countries = info.getValue();
          if (!countries?.length) return <span className="text-muted-foreground/40">{"\u2014"}</span>;
          const shown = countries.slice(0, 2);
          const remaining = countries.length - shown.length;
          return (
            <div
              className="flex flex-col min-w-0"
              title={countries.map((c) => COUNTRY_NAMES[c]).join(", ")}
            >
              {shown.map((code) => (
                <span key={code} className="flex items-center gap-1.5 truncate">
                  <span className="text-xs leading-none">{countryToFlag(code)}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{COUNTRY_NAMES[code]}</span>
                </span>
              ))}
              {remaining > 0 && (
                <span className="text-[10px] text-muted-foreground/50">
                  +{remaining} more
                </span>
              )}
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.countries?.[0] ?? "";
          const b = rowB.original.countries?.[0] ?? "";
          return a.localeCompare(b);
        },
        size: 150,
        meta: { hideBelow: "lg" },
      }),

      // 7. Preservation
      columnHelper.accessor(
        (row) => row.preservation_status.vocabulary_entries,
        {
          id: "preservation",
          header: "Preserved",
          cell: (info) => {
            const entries = info.getValue();
            const coverage = info.row.original.preservation_status.coverage_percentage;
            if (entries === 0)
              return <span className="text-muted-foreground/40">{"\u2014"}</span>;
            return (
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-xs font-mono tabular-nums"
                  style={{ color: "#047857" }}
                >
                  {entries.toLocaleString()} entries
                </span>
                {coverage > 0 && (
                  <div className="h-1 w-16 rounded-full bg-border/60 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(coverage, 100)}%`,
                        backgroundColor: "#047857",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          },
          size: 120,
          meta: { hideBelow: "lg" },
        }
      ),

      // 8. Action
      columnHelper.display({
        id: "action",
        header: "",
        cell: (info) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/languages/${info.row.original.glottocode}`);
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
          >
            Preserve
            <ExternalLink className="h-3 w-3" />
          </button>
        ),
        size: 90,
        enableSorting: false,
      }),
    ],
    [router]
  );

  const table = useReactTable({
    data: languages,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const handleRowClick = useCallback(
    (glottocode: string) => {
      router.push(`/languages/${glottocode}`);
    },
    [router]
  );

  if (languages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground/60">
        <p className="text-sm">No languages match your filters.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Table container */}
      <div className="overflow-hidden flex flex-col min-h-0 flex-1">
        {/* Header */}
        <div className="border-b border-border/40 bg-muted/20 shrink-0">
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex">
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as
                  | { align?: string; hideBelow?: string }
                  | undefined;
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                return (
                  <div
                    key={header.id}
                    className={cn(
                      "px-4 py-2.5 text-[11px] font-medium font-serif uppercase tracking-wider text-muted-foreground min-w-0",
                      meta?.align === "right" && "text-right",
                      meta?.hideBelow === "md" && "hidden md:block",
                      meta?.hideBelow === "lg" && "hidden lg:block",
                      canSort &&
                        "cursor-pointer select-none hover:text-foreground transition-colors"
                    )}
                    style={{ flex: header.getSize() / 80 }}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <span className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {canSort && (
                        <span className="inline-flex">
                          {sorted === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Virtualized body */}
        <div ref={scrollRef} className="overflow-auto flex-1">
          <div
            style={{ height: virtualizer.getTotalSize(), position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const lang = row.original;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "flex items-center border-b border-border/20 hover:bg-secondary/20 transition-colors cursor-pointer",
                    virtualRow.index % 2 === 1 && "bg-muted/10"
                  )}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => handleRowClick(lang.glottocode)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | { align?: string; hideBelow?: string }
                      | undefined;
                    return (
                      <div
                        key={cell.id}
                        className={cn(
                          "px-4 flex items-center text-sm text-muted-foreground min-w-0",
                          meta?.align === "right" && "justify-end",
                          meta?.hideBelow === "md" && "hidden md:flex",
                          meta?.hideBelow === "lg" && "hidden lg:flex"
                        )}
                        style={{
                          flex: cell.column.getSize() / 80,
                          height: ROW_HEIGHT,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
