"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import Leaflet components (they require window)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Truck data type matching backend output
type TruckData = {
  id: string;
  lat: number;
  lng: number;
  status: "MOVING" | "IDLE" | "WARNING" | "CRITICAL";
  co2: number;
};

type FleetMapProps = {
  trucks: TruckData[];
  selectedVehicle?: string | null;
  onVehicleSelect?: (vehicleId: string) => void;
};

// India center (Delhi area for demo)
const INDIA_CENTER: [number, number] = [28.5, 77.2];
const DEFAULT_ZOOM = 10;

function getTruckColor(truck: TruckData): string {
  switch (truck.status) {
    case "CRITICAL":
      return "#FF3333";
    case "WARNING":
      return "#FFB800";
    case "IDLE":
      return "#FFB800";
    default:
      return "#00FF66";
  }
}

function createTruckIcon(color: string, isSelected: boolean) {
  if (typeof window === "undefined") return null;
  
  const L = require("leaflet");
  
  const size = isSelected ? 18 : 14;
  const borderWidth = isSelected ? 3 : 2;
  
  return L.divIcon({
    className: "truck-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: ${borderWidth}px solid #0A0A0A;
        border-radius: 50%;
        box-shadow: 0 0 ${isSelected ? 20 : 10}px ${color};
        transform: translate(-50%, -50%);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function FleetMap({ trucks, selectedVehicle, onVehicleSelect }: FleetMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  
  useEffect(() => {
    setIsClient(true);
    // Import Leaflet CSS
    import("leaflet/dist/leaflet.css");
    // Import Leaflet
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);
  
  if (!isClient || !L) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--bg-void)" }}>
        <div className="mono" style={{ color: "var(--text-muted)" }}>
          Loading map...
        </div>
      </div>
    );
  }
  
  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: "100%", height: "100%", background: "var(--bg-void)" }}
      zoomControl={true}
    >
      {/* Dark map tiles - CartoDB Dark Matter */}
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      {/* Truck markers */}
      {trucks.map((truck) => {
        const color = getTruckColor(truck);
        const isSelected = truck.id === selectedVehicle;
        const icon = createTruckIcon(color, isSelected);
        
        if (!icon) return null;
        
        return (
          <Marker
            key={truck.id}
            position={[truck.lat, truck.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onVehicleSelect?.(truck.id),
            }}
          >
            <Popup>
              <div style={{ 
                fontFamily: "monospace", 
                fontSize: "12px",
                minWidth: "180px",
                background: "#1a1a1a",
                color: "#f0f0f0",
                padding: "8px",
                margin: "-13px -20px",
              }}>
                <div style={{ 
                  fontWeight: 700, 
                  fontSize: "14px",
                  marginBottom: "8px",
                  color: color,
                }}>
                  {truck.id}
                </div>
                
                <div style={{ display: "grid", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888" }}>Status</span>
                    <span style={{ color }}>{truck.status}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888" }}>CO₂</span>
                    <span style={{ color: truck.co2 > 800 ? "#FF3333" : "#00FF66" }}>
                      {truck.co2}g
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888" }}>Location</span>
                    <span>{truck.lat.toFixed(3)}°N</span>
                  </div>
                </div>
                
                {truck.status === "CRITICAL" && (
                  <div style={{
                    marginTop: "8px",
                    padding: "4px 8px",
                    background: "#FF3333",
                    color: "#0a0a0a",
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    textAlign: "center",
                  }}>
                    ⚠️ CRITICAL ALERT
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
