"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchGraph, type GraphEdge } from "@/lib/api";
import type { SimNode, SimLink, ProcessedGraphData } from "./graph-types";

const DEFAULT_MAX_NODES = 400;
const LOAD_MORE_INCREMENT = 200;

export function useGraphData(neighborhoodWord: string | null, languageCode?: string) {
  const [rawData, setRawData] = useState<{
    nodes: SimNode[];
    edges: GraphEdge[];
    total?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxNodes, setMaxNodes] = useState(DEFAULT_MAX_NODES);

  const loadGraph = useCallback((headword?: string, nodeLimit?: number) => {
    setLoading(true);
    setError(null);
    fetchGraph("all", headword, languageCode, nodeLimit)
      .then((data) => {
        const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
        setRawData({ nodes, edges: data.edges, total: data.total });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [languageCode]);

  useEffect(() => {
    loadGraph(neighborhoodWord ?? undefined, maxNodes);
  }, [loadGraph, neighborhoodWord, maxNodes]);

  const refetch = useCallback(() => {
    loadGraph(neighborhoodWord ?? undefined, maxNodes);
  }, [loadGraph, neighborhoodWord, maxNodes]);

  const loadMore = useCallback(() => {
    setMaxNodes((prev) => prev + LOAD_MORE_INCREMENT);
  }, []);

  const total = rawData?.total;
  const hasMore = total != null && rawData != null && rawData.nodes.length < total;

  return { rawData, loading, error, refetch, loadMore, total, hasMore };
}

export function useProcessedData(
  rawData: { nodes: SimNode[]; edges: GraphEdge[] } | null,
  activeCluster: string | null
) {
  const processedData = useMemo<ProcessedGraphData | null>(() => {
    if (!rawData || rawData.nodes.length === 0) return null;

    let nodes = rawData.nodes;
    if (activeCluster) {
      nodes = nodes.filter((n) => n.cluster === activeCluster);
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: SimLink[] = rawData.edges
      .filter(
        (e) =>
          nodeIds.has(e.source as string) && nodeIds.has(e.target as string)
      )
      .map((e) => ({
        source: nodeMap.get(e.source as string)!,
        target: nodeMap.get(e.target as string)!,
        weight: e.weight ?? 0.5,
        type: e.type,
      }));

    return { nodes, links };
  }, [rawData, activeCluster]);

  const clusters = useMemo(() => {
    if (!rawData) return [];
    return [...new Set(rawData.nodes.map((n) => n.cluster))];
  }, [rawData]);

  return { processedData, clusters };
}
