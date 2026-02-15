import type { GraphNode, GraphEdge, GraphEdgeType } from "@/lib/api";

export interface SimNode extends GraphNode {
  x?: number;
  y?: number;
  fx?: number | undefined;
  fy?: number | undefined;
  __bckgDimensions?: [number, number];
}

export interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  weight: number;
  type: GraphEdgeType;
}

export interface GraphSettings {
  linkDistance: number;
  chargeStrength: number;
  showLabels: boolean;
  curvedEdges: boolean;
  showEdgeTypes: boolean;
}

export const DEFAULT_SETTINGS: GraphSettings = {
  linkDistance: 80,
  chargeStrength: -150,
  showLabels: true,
  curvedEdges: true,
  showEdgeTypes: true,
};

export interface ProcessedGraphData {
  nodes: SimNode[];
  links: SimLink[];
}
