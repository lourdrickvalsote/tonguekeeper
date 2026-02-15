"use client";

import { useCallback, useMemo, useState } from "react";
import type { SimNode, SimLink, ProcessedGraphData } from "./graph-types";

export function useGraphInteractions(data: ProcessedGraphData | null) {
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [pinnedNodes, setPinnedNodes] = useState<Set<string>>(new Set());
  const [pathMode, setPathMode] = useState(false);
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathHighlight, setPathHighlight] = useState<string[]>([]);

  // Pre-compute adjacency list
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    if (!data) return adj;
    for (const link of data.links) {
      const sId = typeof link.source === "string" ? link.source : link.source.id;
      const tId = typeof link.target === "string" ? link.target : link.target.id;
      if (!adj.has(sId)) adj.set(sId, new Set());
      if (!adj.has(tId)) adj.set(tId, new Set());
      adj.get(sId)!.add(tId);
      adj.get(tId)!.add(sId);
    }
    return adj;
  }, [data]);

  // Compute highlighted nodes and links based on selection
  const { highlightNodes, highlightLinks } = useMemo(() => {
    const hNodes = new Set<string>();
    const hLinks = new Set<SimLink>();

    if (pathHighlight.length > 0 && data) {
      const pathSet = new Set(pathHighlight);
      for (const id of pathHighlight) hNodes.add(id);
      for (const link of data.links) {
        const sId = typeof link.source === "string" ? link.source : link.source.id;
        const tId = typeof link.target === "string" ? link.target : link.target.id;
        if (pathSet.has(sId) && pathSet.has(tId)) {
          const sIdx = pathHighlight.indexOf(sId);
          const tIdx = pathHighlight.indexOf(tId);
          if (Math.abs(sIdx - tIdx) === 1) hLinks.add(link);
        }
      }
      return { highlightNodes: hNodes, highlightLinks: hLinks };
    }

    const activeNode = hoveredNode || selectedNode;
    if (!activeNode || !data) return { highlightNodes: hNodes, highlightLinks: hLinks };

    hNodes.add(activeNode.id);
    for (const link of data.links) {
      const sId = typeof link.source === "string" ? link.source : link.source.id;
      const tId = typeof link.target === "string" ? link.target : link.target.id;
      if (sId === activeNode.id) {
        hNodes.add(tId);
        hLinks.add(link);
      }
      if (tId === activeNode.id) {
        hNodes.add(sId);
        hLinks.add(link);
      }
    }

    return { highlightNodes: hNodes, highlightLinks: hLinks };
  }, [selectedNode, hoveredNode, pathHighlight, data]);

  const handleNodeClick = useCallback(
    (node: SimNode) => {
      if (pathMode && pathSource) {
        // Second click in path mode - find shortest path
        const path = findShortestPath(pathSource, node.id, adjacency);
        setPathHighlight(path || []);
        setPathMode(false);
        setPathSource(null);
        return;
      }
      if (pathMode) {
        setPathSource(node.id);
        return;
      }
      setSelectedNode((prev) => (prev?.id === node.id ? null : node));
      setPathHighlight([]);
    },
    [pathMode, pathSource, adjacency]
  );

  const handleNodeHover = useCallback((node: SimNode | null) => {
    setHoveredNode(node);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    setHoveredNode(null);
    setPathHighlight([]);
    setPathMode(false);
    setPathSource(null);
  }, []);

  const togglePin = useCallback(
    (nodeId: string) => {
      setPinnedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });
    },
    []
  );

  const startPathMode = useCallback((fromNodeId: string) => {
    setPathMode(true);
    setPathSource(fromNodeId);
    setPathHighlight([]);
  }, []);

  const cancelPathMode = useCallback(() => {
    setPathMode(false);
    setPathSource(null);
    setPathHighlight([]);
  }, []);

  return {
    selectedNode,
    hoveredNode,
    highlightNodes,
    highlightLinks,
    pinnedNodes,
    pathMode,
    pathSource,
    pathHighlight,
    handleNodeClick,
    handleNodeHover,
    clearSelection,
    togglePin,
    startPathMode,
    cancelPathMode,
  };
}

function findShortestPath(
  from: string,
  to: string,
  adjacency: Map<string, Set<string>>
): string[] | null {
  if (from === to) return [from];
  const queue: string[][] = [[from]];
  const visited = new Set<string>([from]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    for (const neighbor of adjacency.get(current) || []) {
      if (neighbor === to) return [...path, neighbor];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}
