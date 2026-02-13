'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ChatSidebar } from './components/ChatSidebar';
import { VehicleList } from './components/VehicleList';
import { EmissionGauges } from './components/EmissionGauges';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

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

// Define Alert Data Type
export interface AlertData {
  vehicle_id: string;
  type: string;
  severity: string;
  message: string;
  lat: number;
  lng: number;
  timestamp: string;
}

// Tab types
type TabType = 'fleet' | 'analytics' | 'chat';

export default function Home() {
  const [fleetData, setFleetData] = useState<TruckData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('fleet');
  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default w-96 = 384px
  const isResizing = useRef(false);
  const MIN_WIDTH = 320;
  const MAX_WIDTH = 600;

  // Handle mouse move for resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
  }, []);

  // Handle mouse up to stop resize
  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Add/remove resize listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Start resize
  const startResize = () => {
    isResizing.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

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

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'fleet', label: 'Fleet', icon: '🚛' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'chat', label: 'Chat', icon: '💬' },
  ];

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
              <strong>{alerts[0].vehicle_id}</strong>: {alerts[0].message}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Resizable Tabbed Sidebar */}
      <aside 
        className="flex flex-col overflow-hidden relative"
        style={{ 
          width: `${sidebarWidth}px`,
          minWidth: `${MIN_WIDTH}px`,
          maxWidth: `${MAX_WIDTH}px`,
          background: 'var(--bg-primary)', 
          borderLeft: 'var(--border-brutal)',
        }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={startResize}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-green-500/50 transition-colors"
          style={{ background: 'transparent' }}
          title="Drag to resize"
        />
        {/* Header */}
        <div 
          className="p-4 flex items-center justify-between shrink-0"
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

        {/* Tab Bar */}
        <div 
          className="flex shrink-0"
          style={{ borderBottom: 'var(--border-brutal)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-3 px-2 mono text-xs transition-all"
              style={{
                background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-green)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-green)' : '2px solid transparent',
              }}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          
          {/* Fleet Tab */}
          {activeTab === 'fleet' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Compact Emission Summary */}
              <div 
                className="shrink-0 p-3"
                style={{ borderBottom: 'var(--border-brutal)' }}
              >
                <EmissionGauges fleetData={fleetData} />
              </div>
              
              {/* Vehicle List - Full Space */}
              <div className="flex-1 overflow-y-auto">
                <VehicleList 
                  fleetData={fleetData} 
                  selectedVehicle={selectedVehicle}
                  onVehicleSelect={setSelectedVehicle}
                />
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="flex-1 overflow-hidden">
              <AnalyticsDashboard fleetData={fleetData} />
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex-1 overflow-hidden">
              <ChatSidebar isConnected={isConnected} />
            </div>
          )}
        </div>
      </aside>
    </main>
  );
}

