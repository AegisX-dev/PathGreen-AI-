'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChatSidebar } from './components/ChatSidebar';
import { VehicleList } from './components/VehicleList';
import { EmissionGauges } from './components/EmissionGauges';

// Dynamic import for FleetMap (requires window/Leaflet)
const FleetMap = dynamic(() => import('./components/FleetMap').then(mod => mod.FleetMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-void)' }}>
      <span className="mono" style={{ color: 'var(--text-muted)' }}>Loading map...</span>
    </div>
  ),
});

// Define Truck Data Type
export interface TruckData {
  id: string;
  lat: number;
  lng: number;
  status: 'MOVING' | 'IDLE' | 'WARNING' | 'CRITICAL';
  co2: number;
}

export default function Home() {
  const [fleetData, setFleetData] = useState<TruckData[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket Connection
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        console.log('✅ Connected to PathGreen Backend');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'FLEET_UPDATE') {
            setFleetData(message.data);
            if (message.alerts && message.alerts.length > 0) {
              setAlerts(prev => [...message.alerts, ...prev].slice(0, 20));
            }
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('❌ Disconnected. Reconnecting in 3s...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, []);

  return (
    <main className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-void)' }}>
      
      {/* LEFT: Full-screen Map */}
      <div className="flex-1 relative">
        <FleetMap trucks={fleetData} selectedVehicle={selectedVehicle} />
        
        {/* Connection Status Overlay */}
        <div 
          className="absolute top-4 left-4 px-3 py-2 flex items-center gap-2 z-[1000]"
          style={{ 
            background: 'var(--bg-elevated)', 
            border: 'var(--border-brutal)',
          }}
        >
          <span 
            className="w-2 h-2 rounded-full"
            style={{ 
              background: isConnected ? 'var(--accent-green)' : 'var(--accent-red)',
              boxShadow: isConnected ? '0 0 8px var(--accent-green)' : 'none',
            }}
          />
          <span className="mono text-xs" style={{ color: 'var(--text-primary)' }}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Alert Toast */}
        {alerts.length > 0 && (
          <div 
            className="absolute bottom-4 left-4 max-w-md z-[1000]"
            style={{ 
              background: 'var(--bg-elevated)', 
              border: '2px solid var(--accent-red)',
              padding: '12px',
            }}
          >
            <div className="mono text-xs" style={{ color: 'var(--accent-red)', marginBottom: '4px' }}>
              ⚠️ LATEST ALERT
            </div>
            <div className="mono text-sm" style={{ color: 'var(--text-primary)' }}>
              {alerts[0]}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Info Sidebar */}
      <aside 
        className="w-96 flex flex-col overflow-hidden"
        style={{ 
          background: 'var(--bg-primary)', 
          borderLeft: 'var(--border-brutal)',
        }}
      >
        {/* Header */}
        <div 
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: 'var(--border-brutal)' }}
        >
          <h1 
            className="text-xl font-bold"
            style={{ color: 'var(--accent-green)' }}
          >
            PATHGREEN<span style={{ color: 'var(--text-primary)' }}>-AI</span>
          </h1>
          <div className="flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ 
                background: isConnected ? 'var(--accent-green)' : 'var(--accent-amber)',
                animation: isConnected ? 'pulse 2s infinite' : 'none',
              }}
            />
            <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>
              {fleetData.length} trucks
            </span>
          </div>
        </div>

        {/* 1. Emission Gauges */}
        <div 
          className="shrink-0"
          style={{ 
            borderBottom: 'var(--border-brutal)',
            maxHeight: '320px',
            overflow: 'auto',
          }}
        >
          <EmissionGauges fleetData={fleetData} />
        </div>

        {/* 2. Vehicle List (Scrollable) */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <VehicleList 
            fleetData={fleetData} 
            selectedVehicle={selectedVehicle}
            onVehicleSelect={setSelectedVehicle}
          />
        </div>

        {/* 3. AI Chat (Fixed Bottom) */}
        <div 
          className="shrink-0"
          style={{ 
            height: '300px',
            borderTop: 'var(--border-brutal)',
          }}
        >
          <ChatSidebar isConnected={isConnected} />
        </div>
      </aside>
    </main>
  );
}
