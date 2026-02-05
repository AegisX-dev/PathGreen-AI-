"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export type EmissionData = {
  vehicle_id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  co2_grams: number;
  co2_rate_g_per_km: number;
  cumulative_co2_kg: number;
  fuel_efficiency_km_l: number;
  alert_type: string | null;
  alert_severity: string;
  alert_message: string | null;
};

export type AlertData = {
  alert_id: string;
  vehicle_id: string;
  timestamp: number;
  alert_type: string;
  severity: string;
  message: string;
  latitude: number;
  longitude: number;
};

export type ChatResponse = {
  type: "chat_response";
  message_id: string;
  query: string;
  response: string;
  citations: string[];
  model?: string;
  timestamp: number;
};

type WebSocketMessage =
  | { type: "initial_state"; vehicles: EmissionData[]; alerts: AlertData[] }
  | { type: "emission_update"; data: EmissionData }
  | { type: "alert"; data: AlertData }
  | { type: "pong" }
  | ChatResponse;

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [vehicles, setVehicles] = useState<Map<string, EmissionData>>(new Map());
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [lastChatResponse, setLastChatResponse] = useState<ChatResponse | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    setStatus("connecting");
    
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log("[WS] Connected to PathGreen-AI");
        setStatus("connected");
        reconnectAttempts.current = 0;
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case "initial_state":
              // Initialize vehicle map from array
              const vehicleMap = new Map<string, EmissionData>();
              message.vehicles.forEach((v) => vehicleMap.set(v.vehicle_id, v));
              setVehicles(vehicleMap);
              setAlerts(message.alerts);
              break;
              
            case "emission_update":
              setVehicles((prev) => {
                const next = new Map(prev);
                next.set(message.data.vehicle_id, message.data);
                return next;
              });
              break;
              
            case "alert":
              setAlerts((prev) => [message.data, ...prev].slice(0, 50));
              break;
              
            case "chat_response":
              setLastChatResponse(message);
              break;
              
            case "pong":
              // Heartbeat response, ignore
              break;
          }
        } catch (err) {
          console.error("[WS] Parse error:", err);
        }
      };
      
      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
        setStatus("error");
      };
      
      ws.onclose = () => {
        console.log("[WS] Disconnected");
        setStatus("disconnected");
        wsRef.current = null;
        
        // Attempt reconnection
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts.current - 1);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (err) {
      console.error("[WS] Connection failed:", err);
      setStatus("error");
    }
  }, []);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);
  
  const sendChatMessage = useCallback((query: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "chat", query }));
      setLastChatResponse(null); // Clear previous response
    }
  }, []);
  
  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }));
    }
  }, []);
  
  // Connect on mount
  useEffect(() => {
    connect();
    
    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      sendPing();
    }, 30000);
    
    return () => {
      clearInterval(heartbeat);
      disconnect();
    };
  }, [connect, disconnect, sendPing]);
  
  return {
    status,
    vehicles: Array.from(vehicles.values()),
    vehicleMap: vehicles,
    alerts,
    lastChatResponse,
    sendChatMessage,
    connect,
    disconnect,
  };
}
