"use client";

import { useEffect, useState } from "react";

type TruckData = {
  id: string;
  lat: number;
  lng: number;
  status: "MOVING" | "IDLE" | "WARNING" | "CRITICAL";
  co2: number;
};

type AnalyticsDashboardProps = {
  fleetData: TruckData[];
};

type HistoryPoint = {
  timestamp: number;
  totalCo2: number;
};

export function AnalyticsDashboard({ fleetData }: AnalyticsDashboardProps) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  
  // Update history when fleet data changes
  useEffect(() => {
    if (fleetData.length === 0) return;
    
    const totalCo2 = fleetData.reduce((sum, truck) => sum + truck.co2, 0);
    const now = Date.now();
    
    setHistory(prev => {
      const newHistory = [...prev, { timestamp: now, totalCo2 }];
      // Keep last 30 points (15 seconds at 500ms intervals)
      return newHistory.slice(-30);
    });
  }, [fleetData]);

  // Calculate stats
  const totalCo2 = fleetData.reduce((sum, truck) => sum + truck.co2, 0);
  const avgCo2 = fleetData.length > 0 ? Math.round(totalCo2 / fleetData.length) : 0;
  
  const movingCount = fleetData.filter(t => t.status === "MOVING").length;
  const idleCount = fleetData.filter(t => t.status === "IDLE").length;
  const warningCount = fleetData.filter(t => t.status === "WARNING").length;
  const criticalCount = fleetData.filter(t => t.status === "CRITICAL").length;
  
  // Efficiency score: % of trucks that are moving and not critical
  const healthyTrucks = fleetData.filter(t => t.status === "MOVING" || t.status === "IDLE").length;
  const efficiencyScore = fleetData.length > 0 
    ? Math.round((healthyTrucks / fleetData.length) * 100) 
    : 0;
  
  // Top emitters (sorted by CO2 desc)
  const topEmitters = [...fleetData].sort((a, b) => b.co2 - a.co2).slice(0, 3);
  
  // Chart calculations
  const maxCo2 = Math.max(...history.map(h => h.totalCo2), 1);
  const minCo2 = Math.min(...history.map(h => h.totalCo2), 0);
  const chartHeight = 100;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      
      {/* Efficiency Score Card */}
      <div 
        className="p-4"
        style={{ 
          background: "var(--bg-surface)", 
          border: "var(--border-brutal)" 
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="mono text-xs uppercase" style={{ color: "var(--text-muted)" }}>
            Fleet Efficiency
          </span>
          <span 
            className="mono text-2xl font-bold"
            style={{ 
              color: efficiencyScore >= 80 ? "var(--accent-green)" 
                   : efficiencyScore >= 50 ? "var(--accent-amber)" 
                   : "var(--accent-red)" 
            }}
          >
            {efficiencyScore}%
          </span>
        </div>
        <div 
          className="w-full h-2"
          style={{ background: "var(--bg-primary)" }}
        >
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${efficiencyScore}%`,
              background: efficiencyScore >= 80 ? "var(--accent-green)" 
                        : efficiencyScore >= 50 ? "var(--accent-amber)" 
                        : "var(--accent-red)"
            }}
          />
        </div>
      </div>

      {/* CO2 Trend Chart */}
      <div 
        className="p-4"
        style={{ 
          background: "var(--bg-surface)", 
          border: "var(--border-brutal)" 
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="mono text-xs uppercase" style={{ color: "var(--text-muted)" }}>
            CO₂ Trend (Last 15s)
          </span>
          <span className="mono text-sm" style={{ color: "var(--accent-green)" }}>
            {totalCo2.toLocaleString()}g
          </span>
        </div>
        
        {/* Simple Line Chart */}
        <div 
          className="relative w-full"
          style={{ height: `${chartHeight}px`, background: "var(--bg-primary)" }}
        >
          {history.length > 1 && (
            <svg 
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
              viewBox={`0 0 ${history.length - 1} ${chartHeight}`}
            >
              {/* Grid lines */}
              <line x1="0" y1={chartHeight * 0.25} x2={history.length - 1} y2={chartHeight * 0.25} 
                stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
              <line x1="0" y1={chartHeight * 0.5} x2={history.length - 1} y2={chartHeight * 0.5} 
                stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
              <line x1="0" y1={chartHeight * 0.75} x2={history.length - 1} y2={chartHeight * 0.75} 
                stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2" />
              
              {/* Line path */}
              <polyline
                fill="none"
                stroke="var(--accent-green)"
                strokeWidth="2"
                points={history.map((point, i) => {
                  const x = i;
                  const y = chartHeight - ((point.totalCo2 - minCo2) / (maxCo2 - minCo2 || 1)) * chartHeight * 0.8 - chartHeight * 0.1;
                  return `${x},${y}`;
                }).join(" ")}
              />
              
              {/* Area fill */}
              <polygon
                fill="var(--accent-green)"
                fillOpacity="0.1"
                points={`0,${chartHeight} ${history.map((point, i) => {
                  const x = i;
                  const y = chartHeight - ((point.totalCo2 - minCo2) / (maxCo2 - minCo2 || 1)) * chartHeight * 0.8 - chartHeight * 0.1;
                  return `${x},${y}`;
                }).join(" ")} ${history.length - 1},${chartHeight}`}
              />
            </svg>
          )}
          
          {history.length <= 1 && (
            <div className="flex items-center justify-center h-full">
              <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>
                Collecting data...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status Distribution */}
      <div 
        className="p-4"
        style={{ 
          background: "var(--bg-surface)", 
          border: "var(--border-brutal)" 
        }}
      >
        <span className="mono text-xs uppercase block mb-3" style={{ color: "var(--text-muted)" }}>
          Status Distribution
        </span>
        
        <div className="flex gap-2">
          {/* Moving */}
          <div 
            className="flex-1 p-2 text-center"
            style={{ background: "var(--accent-green)", color: "#000" }}
          >
            <div className="mono text-lg font-bold">{movingCount}</div>
            <div className="mono text-xs">Moving</div>
          </div>
          
          {/* Idle */}
          <div 
            className="flex-1 p-2 text-center"
            style={{ background: "var(--accent-amber)", color: "#000" }}
          >
            <div className="mono text-lg font-bold">{idleCount}</div>
            <div className="mono text-xs">Idle</div>
          </div>
          
          {/* Warning */}
          <div 
            className="flex-1 p-2 text-center"
            style={{ background: "#ff9500", color: "#000" }}
          >
            <div className="mono text-lg font-bold">{warningCount}</div>
            <div className="mono text-xs">Warning</div>
          </div>
          
          {/* Critical */}
          <div 
            className="flex-1 p-2 text-center"
            style={{ 
              background: criticalCount > 0 ? "var(--accent-red)" : "var(--bg-primary)", 
              color: criticalCount > 0 ? "#fff" : "var(--text-muted)" 
            }}
          >
            <div className="mono text-lg font-bold">{criticalCount}</div>
            <div className="mono text-xs">Critical</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div 
          className="p-3"
          style={{ 
            background: "var(--bg-surface)", 
            border: "var(--border-brutal)" 
          }}
        >
          <div className="mono text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            Total Fleet CO₂
          </div>
          <div className="mono text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {totalCo2.toLocaleString()}g
          </div>
        </div>
        <div 
          className="p-3"
          style={{ 
            background: "var(--bg-surface)", 
            border: "var(--border-brutal)" 
          }}
        >
          <div className="mono text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            Avg per Vehicle
          </div>
          <div className="mono text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {avgCo2.toLocaleString()}g
          </div>
        </div>
      </div>

      {/* Top Emitters */}
      <div 
        className="p-4"
        style={{ 
          background: "var(--bg-surface)", 
          border: "var(--border-brutal)" 
        }}
      >
        <span className="mono text-xs uppercase block mb-3" style={{ color: "var(--text-muted)" }}>
          🔥 Top Emitters
        </span>
        
        <div className="flex flex-col gap-2">
          {topEmitters.map((truck, index) => {
            const barWidth = (truck.co2 / (topEmitters[0]?.co2 || 1)) * 100;
            const color = truck.status === "CRITICAL" ? "var(--accent-red)"
                        : truck.status === "WARNING" ? "var(--accent-amber)"
                        : "var(--accent-green)";
            
            return (
              <div key={truck.id} className="flex items-center gap-2">
                <span className="mono text-xs w-4" style={{ color: "var(--text-muted)" }}>
                  {index + 1}.
                </span>
                <span className="mono text-xs w-16" style={{ color: "var(--text-secondary)" }}>
                  {truck.id}
                </span>
                <div className="flex-1 h-4" style={{ background: "var(--bg-primary)" }}>
                  <div 
                    className="h-full transition-all"
                    style={{ width: `${barWidth}%`, background: color }}
                  />
                </div>
                <span className="mono text-xs w-12 text-right" style={{ color }}>
                  {truck.co2}g
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
