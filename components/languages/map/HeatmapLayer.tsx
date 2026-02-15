"use client";

import {
  createElementObject,
  createLayerComponent,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import L from "leaflet";
import "leaflet.heat";
import { HEATMAP_GRADIENT } from "@/lib/map-utils";
import type { LayerProps } from "@react-leaflet/core";

// ── Props ───────────────────────────────────────────────────────────────────

interface HeatmapLayerProps extends LayerProps {
  points: [number, number, number][];
  options?: L.HeatLayerOptions;
}

// ── Factory functions for createLayerComponent ──────────────────────────────

function createElement(
  props: HeatmapLayerProps,
  context: LeafletContextInterface
) {
  const instance = L.heatLayer(props.points, {
    radius: 20,
    blur: 15,
    maxZoom: 10,
    max: 1.0,
    minOpacity: 0.3,
    gradient: HEATMAP_GRADIENT,
    ...props.options,
  });

  return createElementObject(instance, context);
}

function updateElement(
  instance: L.HeatLayer,
  props: HeatmapLayerProps,
  prevProps: HeatmapLayerProps
) {
  if (props.points !== prevProps.points) {
    instance.setLatLngs(props.points);
  }
  if (props.options !== prevProps.options) {
    instance.setOptions({ ...props.options });
    instance.redraw();
  }
}

// ── Export ───────────────────────────────────────────────────────────────────

export const HeatmapLayer = createLayerComponent<
  L.HeatLayer,
  HeatmapLayerProps
>(createElement, updateElement);
