"use client";

type TruckData = {
  id: string;
  lat: number;
  lng: number;
  status: "MOVING" | "IDLE" | "WARNING" | "CRITICAL";
  co2: number;
};

type VehicleListProps = {
  fleetData: TruckData[];
  selectedVehicle?: string | null;
  onVehicleSelect?: (vehicleId: string) => void;
};

function getStatusColor(status: string): string {
  switch (status) {
    case "CRITICAL":
      return "var(--accent-red)";
    case "WARNING":
      return "var(--accent-amber)";
    case "IDLE":
      return "var(--accent-amber)";
    default:
      return "var(--accent-green)";
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case "CRITICAL":
      return "🔴";
    case "WARNING":
      return "🟡";
    case "IDLE":
      return "🟡";
    default:
      return "🟢";
  }
}

export function VehicleList({ fleetData, selectedVehicle, onVehicleSelect }: VehicleListProps) {
  if (!fleetData || fleetData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <span className="mono" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          Waiting for fleet data...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div 
        className="p-3 flex items-center justify-between"
        style={{ borderBottom: "var(--border-brutal)" }}
      >
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          🚛 FLEET STATUS
        </h3>
        <span className="mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
          {fleetData.length} vehicles
        </span>
      </div>

      {/* Vehicle List */}
      <div className="flex-1 overflow-y-auto">
        {fleetData.map((truck) => {
          const isSelected = truck.id === selectedVehicle;
          const statusColor = getStatusColor(truck.status);

          return (
            <div
              key={truck.id}
              className="p-3 cursor-pointer transition-all"
              style={{
                borderBottom: "1px solid var(--border-color)",
                background: isSelected ? "var(--bg-surface)" : "transparent",
              }}
              onClick={() => onVehicleSelect?.(truck.id)}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = isSelected ? "var(--bg-surface)" : "transparent";
              }}
            >
              {/* Row 1: ID and Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: statusColor,
                      boxShadow: truck.status === "CRITICAL" ? `0 0 10px ${statusColor}` : "none",
                    }}
                  />
                  <span className="mono font-bold" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                    {truck.id}
                  </span>
                </div>
                <span 
                  className="mono font-bold text-xs px-2 py-1"
                  style={{ 
                    background: statusColor,
                    color: "var(--bg-primary)",
                  }}
                >
                  {truck.status}
                </span>
              </div>

              {/* Row 2: CO2 and Location */}
              <div className="flex items-center justify-between mono" style={{ fontSize: "11px" }}>
                <span style={{ color: truck.co2 > 800 ? "var(--accent-red)" : "var(--text-secondary)" }}>
                  CO₂: {truck.co2}g
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {truck.lat.toFixed(3)}°N, {truck.lng.toFixed(3)}°E
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
