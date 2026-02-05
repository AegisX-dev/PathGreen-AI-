"use client";

type TruckData = {
  id: string;
  lat: number;
  lng: number;
  status: "MOVING" | "IDLE" | "WARNING" | "CRITICAL";
  co2: number;
};

type EmissionGaugesProps = {
  fleetData: TruckData[];
};

// Max CO2 quota for the entire fleet (g)
const MAX_FLEET_QUOTA = 5000;
const WARNING_THRESHOLD = 4000;

function getGaugeColor(totalCo2: number): string {
  if (totalCo2 >= WARNING_THRESHOLD) return "var(--accent-red)";
  if (totalCo2 >= WARNING_THRESHOLD * 0.7) return "var(--accent-amber)";
  return "var(--accent-green)";
}

export function EmissionGauges({ fleetData }: EmissionGaugesProps) {
  // Calculate fleet-wide stats
  const totalCo2 = fleetData.reduce((sum, truck) => sum + truck.co2, 0);
  const percentage = Math.min(100, (totalCo2 / MAX_FLEET_QUOTA) * 100);
  const gaugeColor = getGaugeColor(totalCo2);

  const criticalCount = fleetData.filter(t => t.status === "CRITICAL").length;
  const warningCount = fleetData.filter(t => t.status === "WARNING" || t.status === "IDLE").length;
  const movingCount = fleetData.filter(t => t.status === "MOVING").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div 
        className="p-3 flex items-center justify-between"
        style={{ borderBottom: "var(--border-brutal)" }}
      >
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          📊 EMISSION GAUGE
        </h3>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* Main Gauge */}
        <div className="card-surface">
          <div className="flex items-center justify-between mb-2">
            <span className="mono text-xs uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>
              Fleet Carbon Output
            </span>
            <span 
              className="mono font-bold"
              style={{ fontSize: "10px", color: totalCo2 >= WARNING_THRESHOLD ? "var(--accent-red)" : "var(--text-muted)" }}
            >
              {totalCo2 >= WARNING_THRESHOLD ? "⚠️ OVER LIMIT" : "OK"}
            </span>
          </div>

          {/* Progress Bar */}
          <div 
            className="w-full h-8 mb-3 relative"
            style={{ 
              background: "var(--bg-primary)", 
              border: "2px solid var(--border-color)" 
            }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${percentage}%`,
                background: gaugeColor,
                boxShadow: totalCo2 >= WARNING_THRESHOLD ? `0 0 15px ${gaugeColor}` : "none",
              }}
            />
            {/* Threshold marker at 80% */}
            <div 
              className="absolute top-0 bottom-0 w-0.5"
              style={{ 
                left: "80%", 
                background: "var(--accent-amber)",
                opacity: 0.5,
              }}
            />
          </div>

          {/* Stats */}
          <div className="flex justify-between mono" style={{ fontSize: "14px" }}>
            <span style={{ color: gaugeColor, fontWeight: 700 }}>
              {totalCo2.toLocaleString()}g
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              / {MAX_FLEET_QUOTA.toLocaleString()}g
            </span>
          </div>

          <div className="mono text-center mt-2" style={{ fontSize: "24px", fontWeight: 700, color: gaugeColor }}>
            {percentage.toFixed(1)}%
          </div>
        </div>

        {/* Status Summary */}
        <div className="card-surface">
          <div className="mono text-xs uppercase mb-3" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            Status Breakdown
          </div>

          <div className="flex flex-col gap-2">
            {/* Moving */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: "var(--accent-green)" }} />
                <span className="mono" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Moving
                </span>
              </div>
              <span className="mono font-bold" style={{ fontSize: "14px", color: "var(--accent-green)" }}>
                {movingCount}
              </span>
            </div>

            {/* Warning/Idle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: "var(--accent-amber)" }} />
                <span className="mono" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Warning/Idle
                </span>
              </div>
              <span className="mono font-bold" style={{ fontSize: "14px", color: "var(--accent-amber)" }}>
                {warningCount}
              </span>
            </div>

            {/* Critical */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ 
                    background: "var(--accent-red)",
                    boxShadow: criticalCount > 0 ? "0 0 8px var(--accent-red)" : "none",
                  }} 
                />
                <span className="mono" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Critical
                </span>
              </div>
              <span className="mono font-bold" style={{ fontSize: "14px", color: "var(--accent-red)" }}>
                {criticalCount}
              </span>
            </div>
          </div>
        </div>

        {/* Per-vehicle CO2 bars */}
        <div className="card-surface">
          <div className="mono text-xs uppercase mb-3" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            Per-Vehicle CO₂
          </div>

          <div className="flex flex-col gap-2">
            {fleetData.map((truck) => {
              const truckPercent = (truck.co2 / 1500) * 100; // 1500g max per truck
              const truckColor = truck.co2 > 800 
                ? "var(--accent-red)" 
                : truck.co2 > 600 
                  ? "var(--accent-amber)" 
                  : "var(--accent-green)";

              return (
                <div key={truck.id}>
                  <div className="flex justify-between mono mb-1" style={{ fontSize: "10px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{truck.id}</span>
                    <span style={{ color: truckColor }}>{truck.co2}g</span>
                  </div>
                  <div 
                    className="w-full h-2"
                    style={{ background: "var(--bg-primary)" }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min(100, truckPercent)}%`,
                        background: truckColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
