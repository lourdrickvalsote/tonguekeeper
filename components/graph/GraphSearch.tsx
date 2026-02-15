"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { SimNode } from "./graph-types";
import type { GraphCanvasHandle } from "./GraphCanvas";

interface GraphSearchProps {
  query: string;
  onChange: (query: string) => void;
  nodes: SimNode[];
  graphRef: React.RefObject<GraphCanvasHandle | null>;
}

export function GraphSearch({
  query,
  onChange,
  nodes,
  graphRef,
}: GraphSearchProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return nodes
      .filter(
        (n) =>
          n.headword.toLowerCase().includes(q) ||
          (n.romanization?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 5);
  }, [query, nodes]);

  const navigateToNode = useCallback(
    (node: SimNode) => {
      if (graphRef.current && node.x != null && node.y != null) {
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(2, 500);
      }
    },
    [graphRef]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, matches.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && matches.length > 0) {
        e.preventDefault();
        navigateToNode(matches[selectedIndex]);
        setFocused(false);
        inputRef.current?.blur();
      } else if (e.key === "Escape") {
        onChange("");
        setFocused(false);
        inputRef.current?.blur();
      }
    },
    [matches, selectedIndex, navigateToNode, onChange]
  );

  // Reset selection index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        !e.target?.toString().includes("Input")
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="absolute right-3 top-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Search words... (/ or ⌘K)"
          className="h-8 w-48 rounded-lg border border-border/30 bg-card/80 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/40 backdrop-blur-sm focus:w-64 focus:border-primary/50 focus:outline-none transition-all"
        />
        {query && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {focused && matches.length > 0 && (
        <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-border/30 bg-card/95 py-1 shadow-xl backdrop-blur-sm">
          {matches.map((node, i) => (
            <button
              key={node.id}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                i === selectedIndex
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                navigateToNode(node);
                setFocused(false);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="font-medium">{node.headword}</span>
              {node.romanization && (
                <span className="text-muted-foreground/60 italic">
                  {node.romanization}
                </span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground/40">
                {node.cluster}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
