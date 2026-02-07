'use client';

import { useState } from 'react';

type Endpoint = {
  method: 'GET' | 'POST' | 'WS';
  path: string;
  title: string;
  description: string;
  requestBody?: string;
  responseExample: string;
};

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/health',
    title: 'Health Check',
    description: 'Check the status of all services (API, Database, AI).',
    responseExample: `{
  "status": "ok",
  "database": "connected",
  "ai": "connected"
}`,
  },
  {
    method: 'POST',
    path: '/chat',
    title: 'AI Chat (RAG)',
    description: 'Send a query to PathGreen AI. The AI uses live fleet data as context to answer questions about emissions, alerts, and vehicle status.',
    requestBody: `{
  "message": "Why is TRK-104 flagged?"
}`,
    responseExample: `{
  "reply": "TRK-104 is flagged as CRITICAL because its CO2 level is 1200g, which exceeds the 1000g threshold..."
}`,
  },
  {
    method: 'GET',
    path: '/fleet',
    title: 'Get Fleet Status',
    description: 'Returns the current status of all vehicles in the fleet.',
    responseExample: `{
  "data": [
    { "id": "TRK-101", "lat": 28.7041, "lng": 77.1025, "status": "MOVING", "co2": 450 },
    { "id": "TRK-102", "lat": 28.5355, "lng": 77.3910, "status": "IDLE", "co2": 800 },
    { "id": "TRK-103", "lat": 28.4595, "lng": 77.0266, "status": "MOVING", "co2": 420 },
    { "id": "TRK-104", "lat": 28.6139, "lng": 77.2090, "status": "CRITICAL", "co2": 1200 },
    { "id": "TRK-105", "lat": 28.5244, "lng": 77.1855, "status": "MOVING", "co2": 410 }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/analytics/emissions',
    title: 'Emission History',
    description: 'Get historical emission logs from the database (last 100 records).',
    responseExample: `{
  "data": [
    {
      "id": "uuid",
      "vehicle_id": "TRK-101",
      "latitude": 28.7041,
      "longitude": 77.1025,
      "co2_grams": 450,
      "status": "MOVING",
      "recorded_at": "2026-02-07T10:30:00Z"
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/analytics/alerts',
    title: 'Alert History',
    description: 'Get historical alerts from the database (last 50 records).',
    responseExample: `{
  "data": [
    {
      "id": "uuid",
      "vehicle_id": "TRK-104",
      "alert_type": "HIGH_IDLE",
      "severity": "CRITICAL",
      "message": "Critical CO2 levels on TRK-104 - 1200g",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "created_at": "2026-02-07T10:25:00Z"
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/analytics/chat-history',
    title: 'Chat History',
    description: 'Get the history of AI chat interactions (last 20 records).',
    responseExample: `{
  "data": [
    {
      "id": "uuid",
      "user_query": "Why is TRK-104 flagged?",
      "ai_response": "TRK-104 is flagged as CRITICAL...",
      "fleet_context": [...],
      "created_at": "2026-02-07T10:20:00Z"
    }
  ]
}`,
  },
  {
    method: 'WS',
    path: '/ws',
    title: 'Real-time Fleet Updates',
    description: 'WebSocket endpoint that streams fleet updates every 500ms. Connect to receive live vehicle positions, CO2 levels, and alerts.',
    responseExample: `{
  "type": "FLEET_UPDATE",
  "data": [
    { "id": "TRK-101", "lat": 28.7041, "lng": 77.1025, "status": "MOVING", "co2": 450 }
  ],
  "alerts": [
    "[ALERT] WARNING: EMISSION_SPIKE - TRK-102"
  ]
}`,
  },
];

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'WS' }) {
  const colors = {
    GET: { bg: 'var(--accent-green)', text: '#000' },
    POST: { bg: 'var(--accent-blue)', text: '#000' },
    WS: { bg: 'var(--accent-amber)', text: '#000' },
  };

  return (
    <span
      className="mono font-bold px-3 py-1"
      style={{
        background: colors[method].bg,
        color: colors[method].text,
        fontSize: '12px',
      }}
    >
      {method}
    </span>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="mb-4"
      style={{
        border: 'var(--border-brutal)',
        background: 'var(--bg-elevated)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left"
        style={{ background: isOpen ? 'var(--bg-surface)' : 'transparent' }}
      >
        <div className="flex items-center gap-4">
          <MethodBadge method={endpoint.method} />
          <span className="mono font-bold" style={{ color: 'var(--text-primary)' }}>
            {endpoint.path}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {endpoint.title}
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '20px' }}>
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
            {endpoint.description}
          </p>

          {endpoint.requestBody && (
            <div className="mb-4">
              <h4 className="mono text-xs uppercase mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                Request Body
              </h4>
              <pre
                className="p-4 overflow-x-auto mono"
                style={{
                  background: 'var(--bg-void)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  color: 'var(--accent-green)',
                }}
              >
                {endpoint.requestBody}
              </pre>
            </div>
          )}

          <div>
            <h4 className="mono text-xs uppercase mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              Response Example
            </h4>
            <pre
              className="p-4 overflow-x-auto mono"
              style={{
                background: 'var(--bg-void)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
            >
              {endpoint.responseExample}
            </pre>
          </div>

          {/* Try It (cURL) */}
          {endpoint.method !== 'WS' && (
            <div className="mt-4">
              <h4 className="mono text-xs uppercase mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                cURL Example
              </h4>
              <pre
                className="p-4 overflow-x-auto mono"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--accent-amber)',
                  fontSize: '11px',
                  color: 'var(--accent-amber)',
                }}
              >
                {endpoint.method === 'GET'
                  ? `curl http://localhost:8080${endpoint.path}`
                  : `curl -X POST http://localhost:8080${endpoint.path} \\
  -H "Content-Type: application/json" \\
  -d '${endpoint.requestBody?.replace(/\n/g, '').replace(/\s+/g, ' ')}'`}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <main
      className="min-h-screen p-8"
      style={{ background: 'var(--bg-void)' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <h1
              className="text-3xl font-bold"
              style={{ color: 'var(--accent-green)' }}
            >
              PathGreen<span style={{ color: 'var(--text-primary)' }}>-AI</span>
            </h1>
            <span
              className="mono px-2 py-1"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              v2.0.0
            </span>
            <span
              className="mono px-2 py-1"
              style={{
                background: 'var(--accent-blue)',
                color: '#000',
                fontSize: '10px',
              }}
            >
              OAS 3.1
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: 1.6 }}>
            Real-time Fleet Emissions Intelligence Platform. Use these endpoints to access
            live fleet data, historical analytics, and AI-powered insights.
          </p>
        </header>

        {/* Base URL */}
        <div
          className="p-4 mb-8"
          style={{
            background: 'var(--bg-elevated)',
            border: 'var(--border-brutal)',
          }}
        >
          <span className="mono text-xs uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            Base URL
          </span>
          <div className="mono mt-2" style={{ color: 'var(--accent-green)', fontSize: '16px' }}>
            http://localhost:8080
          </div>
        </div>

        {/* Endpoints */}
        <section>
          <h2
            className="text-lg font-bold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Endpoints
          </h2>
          
          {endpoints.map((endpoint) => (
            <EndpointCard key={endpoint.path} endpoint={endpoint} />
          ))}
        </section>

        {/* Back to Dashboard */}
        <footer className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
          <a
            href="/"
            className="mono inline-flex items-center gap-2"
            style={{
              color: 'var(--accent-blue)',
              textDecoration: 'none',
            }}
          >
            ← Back to Dashboard
          </a>
        </footer>
      </div>
    </main>
  );
}
