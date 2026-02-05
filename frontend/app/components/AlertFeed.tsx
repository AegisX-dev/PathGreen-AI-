"use client";

import type { AlertData } from "../hooks/useWebSocket";

type AlertFeedProps = {
  alerts: AlertData[];
  onAlertClick?: (alert: AlertData) => void;
  maxItems?: number;
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "🔴";
    case "WARNING":
      return "🟡";
    default:
      return "🟢";
  }
}

function getSeverityClass(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "badge--critical";
    case "WARNING":
      return "badge--warning";
    default:
      return "badge--info";
  }
}

export function AlertFeed({ alerts, onAlertClick, maxItems = 20 }: AlertFeedProps) {
  const displayAlerts = alerts.slice(0, maxItems);
  
  if (displayAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-4xl mb-2">✓</div>
        <div className="mono text-center" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          No active alerts
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col overflow-y-auto" style={{ maxHeight: "100%" }}>
      {displayAlerts.map((alert, index) => (
        <div
          key={alert.alert_id || `${alert.vehicle_id}-${alert.timestamp}-${index}`}
          className="p-3 cursor-pointer transition-colors"
          style={{
            borderBottom: "1px solid var(--border-color)",
            background: index === 0 ? "var(--bg-surface)" : "transparent",
          }}
          onClick={() => onAlertClick?.(alert)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = index === 0 ? "var(--bg-surface)" : "transparent";
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span>{getSeverityIcon(alert.severity)}</span>
              <span 
                className="mono font-bold"
                style={{ 
                  fontSize: "13px",
                  color: alert.severity === "CRITICAL" ? "var(--accent-red)" : 
                         alert.severity === "WARNING" ? "var(--accent-amber)" : "var(--text-primary)"
                }}
              >
                {alert.vehicle_id}
              </span>
            </div>
            <span className={`badge ${getSeverityClass(alert.severity)}`}>
              {alert.alert_type}
            </span>
          </div>
          
          {/* Message */}
          <p 
            className="mono m-0 mb-1"
            style={{ 
              fontSize: "11px", 
              color: "var(--text-secondary)",
              lineHeight: 1.4,
            }}
          >
            {alert.message}
          </p>
          
          {/* Footer - time and coordinates */}
          <div 
            className="flex items-center justify-between mono"
            style={{ fontSize: "10px", color: "var(--text-muted)" }}
          >
            <span>{formatTime(alert.timestamp)}</span>
            <span>
              {alert.latitude.toFixed(4)}°N, {alert.longitude.toFixed(4)}°E
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
