"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMap,
} from "react-leaflet";
import { Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  color: string;
  languageName?: string;
}

function MapSetup() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);

  // Prevent scroll events on the map from scrolling the parent page
  useEffect(() => {
    const container = map.getContainer();
    const stopPropagation = (e: WheelEvent) => e.stopPropagation();
    container.addEventListener("wheel", stopPropagation, { passive: false });
    return () => container.removeEventListener("wheel", stopPropagation);
  }, [map]);

  return null;
}

function ModalMapSetup() {
  const map = useMap();
  useEffect(() => {
    // Leaflet needs a resize after the dialog animation completes
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapContent({
  latitude,
  longitude,
  color,
  radius,
}: {
  latitude: number;
  longitude: number;
  color: string;
  radius: number;
}) {
  return (
    <>
      <TileLayer url={TILE_URL} />
      <CircleMarker
        center={[latitude, longitude]}
        radius={radius}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: 0.9,
          weight: 2,
          opacity: 1,
        }}
      />
    </>
  );
}

export function MiniMap({ latitude, longitude, color, languageName }: MiniMapProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="h-40 w-56 rounded-lg overflow-hidden border border-border/30 relative z-10 group">
        <MapContainer
          center={[latitude, longitude]}
          zoom={4}
          minZoom={2}
          maxZoom={12}
          zoomControl={false}
          attributionControl={false}
          dragging={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          preferCanvas
          style={{ height: "100%", width: "100%", background: "#1a1a2e" }}
        >
          <MapSetup />
          <MapContent latitude={latitude} longitude={longitude} color={color} radius={6} />
        </MapContainer>

        {/* Expand button */}
        <button
          onClick={() => setOpen(true)}
          className="absolute top-2 right-2 z-[1000] flex h-7 w-7 items-center justify-center rounded-md bg-background/80 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background transition-colors backdrop-blur-sm cursor-pointer"
          title="Expand map"
        >
          <Expand className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded map modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {languageName ? `${languageName} — Location` : "Language Location"}
          </DialogTitle>
          <div className="h-[70vh] w-full">
            {open && (
              <MapContainer
                center={[latitude, longitude]}
                zoom={6}
                minZoom={2}
                maxZoom={16}
                zoomControl={true}
                attributionControl={false}
                dragging={true}
                scrollWheelZoom={true}
                doubleClickZoom={true}
                touchZoom={true}
                preferCanvas
                style={{ height: "100%", width: "100%", background: "#1a1a2e" }}
              >
                <ModalMapSetup />
                <MapContent latitude={latitude} longitude={longitude} color={color} radius={8} />
              </MapContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
