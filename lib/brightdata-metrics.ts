import type { BrightDataMetrics } from "./types";

let latestMetrics: BrightDataMetrics | null = null;

export function setBrightDataMetrics(metrics: BrightDataMetrics): void {
  latestMetrics = metrics;
}

export function getBrightDataMetrics(): BrightDataMetrics | null {
  return latestMetrics;
}
