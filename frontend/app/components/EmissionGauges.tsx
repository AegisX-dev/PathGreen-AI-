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
    <div className="p-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="mono text-xs uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>
          Fleet CO₂
        </span>
        <span 
          className="mono font-bold text-lg"
          style={{ color: gaugeColor }}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div 
        className="w-full h-4 mb-2 relative"
        style={{ 
          background: "var(--bg-primary)", 
          border: "1px solid var(--border-color)" 
        }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background: gaugeColor,
            boxShadow: totalCo2 >= WARNING_THRESHOLD ? `0 0 10px ${gaugeColor}` : "none",
          }}
        />
        {/* Threshold marker at 80% */}
        <div 
          className="absolute top-0 bottom-0 w-0.5"
          style={{ left: "80%", background: "var(--accent-amber)", opacity: 0.5 }}
        />
      </div>

      {/* Stats Row - Horizontal */}
      <div className="flex justify-between items-center">
        <span className="mono text-xs" style={{ color: gaugeColor }}>
          {totalCo2.toLocaleString()}g / {MAX_FLEET_QUOTA.toLocaleString()}g
        </span>
        
        {/* Status Pills */}
        <div className="flex gap-2">
          <span className="mono text-xs px-2 py-0.5" style={{ background: "var(--accent-green)", color: "#000" }}>
            {movingCount}
          </span>
          <span className="mono text-xs px-2 py-0.5" style={{ background: "var(--accent-amber)", color: "#000" }}>
            {warningCount}
          </span>
          {criticalCount > 0 && (
            <span 
              className="mono text-xs px-2 py-0.5" 
              style={{ background: "var(--accent-red)", color: "#fff", animation: "pulse 1s infinite" }}
            >
              {criticalCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

