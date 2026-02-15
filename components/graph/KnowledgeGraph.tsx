"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGraphData, useProcessedData } from "./useGraphData";
import { useGraphInteractions } from "./useGraphInteractions";
import { GraphCanvas, type GraphCanvasHandle } from "./GraphCanvas";
import { GraphEmptyState } from "./GraphEmptyState";
import { GraphTooltip } from "./GraphTooltip";
import { GraphLegend } from "./GraphLegend";
import { GraphSearch } from "./GraphSearch";
import { GraphContextMenu } from "./GraphContextMenu";
import { GraphControls } from "./GraphControls";
import { DEFAULT_SETTINGS } from "./graph-types";
import type { SimNode, SimLink, GraphSettings } from "./graph-types";

interface KnowledgeGraphProps {
  onNodeDoubleClick?: (headword: string) => void;
  languageCode?: string;
}

export function KnowledgeGraph({ onNodeDoubleClick, languageCode }: KnowledgeGraphProps) {
  const graphRef = useRef<GraphCanvasHandle>(null);
  const [neighborhoodWord, setNeighborhoodWord] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [settings, setSettings] = useState<GraphSettings>(DEFAULT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    node: SimNode;
    x: number;
    y: number;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const { rawData, loading, error, refetch, loadMore, total, hasMore } = useGraphData(neighborhoodWord, languageCode);
  const { processedData, clusters } = useProcessedData(rawData, activeCluster);
  const interactions = useGraphInteractions(processedData);

  // Tooltip positioning — update on hover
  const handleNodeHover = useCallback(
    (node: SimNode | null) => {
      interactions.handleNodeHover(node);
      if (node && graphRef.current && node.x != null && node.y != null) {
        const pos = graphRef.current.graph2ScreenCoords(node.x, node.y);
        setTooltipPos(pos);
      }
    },
    [interactions]
  );

  // Double-click via the single-click timer in GraphCanvas
  const handleNodeClick = useCallback(
    (node: SimNode) => {
      interactions.handleNodeClick(node);
      if (node && graphRef.current && node.x != null && node.y != null) {
        const pos = graphRef.current.graph2ScreenCoords(node.x, node.y);
        setTooltipPos(pos);
      }
    },
    [interactions]
  );

  const handleNodeRightClick = useCallback(
    (node: SimNode, event: MouseEvent) => {
      event.preventDefault();
      setContextMenu({ node, x: event.clientX, y: event.clientY });
    },
    []
  );

  const handleBackgroundClick = useCallback(() => {
    interactions.clearSelection();
    setContextMenu(null);
  }, [interactions]);

  // Connected links for tooltip edge-type breakdown
  const connectedLinks =
    interactions.hoveredNode && processedData
      ? processedData.links.filter((l: SimLink) => {
          const sId =
            typeof l.source === "string" ? l.source : l.source.id;
          const tId =
            typeof l.target === "string" ? l.target : l.target.id;
          return (
            sId === interactions.hoveredNode!.id ||
            tId === interactions.hoveredNode!.id
          );
        })
      : [];

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "Escape") {
        interactions.clearSelection();
        setContextMenu(null);
      } else if (e.key === "f" || e.key === "F") {
        graphRef.current?.zoomToFit(400, 50);
      } else if (
        (e.key === "p" || e.key === "P") &&
        interactions.selectedNode
      ) {
        interactions.togglePin(interactions.selectedNode.id);
      } else if (e.key === "Tab" && processedData) {
        e.preventDefault();
        const sorted = [...processedData.nodes].sort(
          (a, b) => (b.degree || 0) - (a.degree || 0)
        );
        if (sorted.length === 0) return;
        const currentIdx = interactions.selectedNode
          ? sorted.findIndex((n) => n.id === interactions.selectedNode!.id)
          : -1;
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + sorted.length) % sorted.length
          : (currentIdx + 1) % sorted.length;
        const next = sorted[nextIdx];
        interactions.handleNodeClick(next);
        if (graphRef.current && next.x != null && next.y != null) {
          graphRef.current.centerAt(next.x, next.y, 300);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [interactions, processedData]);

  if (loading) return <GraphEmptyState variant="loading" />;
  if (error)
    return (
      <GraphEmptyState variant="error" message={error} onRetry={refetch} />
    );
  if (!processedData || processedData.nodes.length === 0)
    return <GraphEmptyState variant="empty" />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-full w-full overflow-hidden bg-background"
    >
      <GraphCanvas
        ref={graphRef}
        data={processedData}
        settings={settings}
        highlightNodes={interactions.highlightNodes}
        highlightLinks={interactions.highlightLinks}
        selectedNode={interactions.selectedNode}
        hoveredNode={interactions.hoveredNode}
        pinnedNodes={interactions.pinnedNodes}
        pathHighlight={interactions.pathHighlight}
        searchMatch={searchQuery || null}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onNodeRightClick={handleNodeRightClick}
        onBackgroundClick={handleBackgroundClick}
      />

      {/* Tooltip */}
      <GraphTooltip
        node={interactions.hoveredNode}
        position={tooltipPos}
        connectedLinks={connectedLinks}
      />

      {/* Stats bar */}
      <div className="absolute left-3 top-3 rounded-lg border border-border/30 bg-card/80 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          {neighborhoodWord && (
            <button
              className="rounded bg-primary/20 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/30"
              onClick={(e) => {
                e.stopPropagation();
                setNeighborhoodWord(null);
              }}
            >
              &larr; Full graph
            </button>
          )}
          {neighborhoodWord && (
            <span className="font-medium text-primary">
              {neighborhoodWord}
            </span>
          )}
          {interactions.pathMode && (
            <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
              Click a node to find path
              <button
                className="ml-2 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  interactions.cancelPathMode();
                }}
              >
                &times;
              </button>
            </span>
          )}
          <span>
            {processedData.nodes.length}
            {total != null && total > processedData.nodes.length
              ? ` of ${total}`
              : ""}{" "}
            words
          </span>
          <span>{processedData.links.length} connections</span>
          <span>{clusters.length} clusters</span>
          {hasMore && !neighborhoodWord && (
            <button
              className="rounded bg-primary/20 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/30"
              onClick={(e) => {
                e.stopPropagation();
                loadMore();
              }}
            >
              Load more
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <GraphSearch
        query={searchQuery}
        onChange={setSearchQuery}
        nodes={processedData.nodes}
        graphRef={graphRef}
      />

      {/* Controls */}
      <GraphControls settings={settings} onChange={setSettings} />

      {/* Legend */}
      <GraphLegend
        clusters={clusters}
        activeCluster={activeCluster}
        onToggleCluster={setActiveCluster}
      />

      {/* Context menu */}
      {contextMenu && (
        <GraphContextMenu
          node={contextMenu.node}
          x={contextMenu.x}
          y={contextMenu.y}
          isPinned={interactions.pinnedNodes.has(contextMenu.node.id)}
          onClose={() => setContextMenu(null)}
          onViewDetails={() => {
            if (onNodeDoubleClick) {
              onNodeDoubleClick(contextMenu.node.headword);
            }
            setContextMenu(null);
          }}
          onExploreNeighborhood={() => {
            setNeighborhoodWord(contextMenu.node.headword);
            setContextMenu(null);
          }}
          onTogglePin={() => {
            interactions.togglePin(contextMenu.node.id);
            setContextMenu(null);
          }}
          onFindPath={() => {
            interactions.startPathMode(contextMenu.node.id);
            setContextMenu(null);
          }}
          onCopyHeadword={() => {
            navigator.clipboard.writeText(contextMenu.node.headword);
            setContextMenu(null);
          }}
        />
      )}

      {/* Zoom hint */}
      <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground/40">
        Scroll to zoom &middot; Drag to pan &middot; Right-click for options
      </div>
    </motion.div>
  );
}
