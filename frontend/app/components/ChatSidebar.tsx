'use client';

import { useState } from 'react';

type ChatSidebarProps = {
  isConnected?: boolean;
};

export const ChatSidebar = ({ isConnected = true }: ChatSidebarProps) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user' as const, text: input };
    setHistory((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      console.log("Sending request to backend...");
      const response = await fetch('http://localhost:8080/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);

      setHistory((prev) => [...prev, { role: 'ai', text: data.reply || "No data returned." }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setHistory((prev) => [...prev, { role: 'ai', text: `Error: ${error instanceof Error ? error.message : "Connection failed"}` }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQueries = [
    "Why is TRK-104 flagged?",
    "Which trucks have high CO2?",
    "What is the fleet status?",
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-elevated)' }}>
      {/* Header */}
      <div 
        className="p-3 flex items-center justify-between"
        style={{ borderBottom: 'var(--border-brutal)' }}
      >
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          💬 ASK PATHGREEN
        </h3>
        <div 
          className="mono"
          style={{ 
            fontSize: '10px', 
            color: isConnected ? 'var(--accent-green)' : 'var(--text-muted)' 
          }}
        >
          {isConnected ? '● ONLINE' : '○ OFFLINE'}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-3"
        style={{ background: 'var(--bg-primary)' }}
      >
        {history.length === 0 ? (
          <div className="flex flex-col gap-4">
            <p 
              className="mono text-center"
              style={{ fontSize: '12px', color: 'var(--text-muted)' }}
            >
              Ask about fleet emissions, alerts, or BS-VI regulations.
            </p>
            
            {/* Suggested queries */}
            <div className="flex flex-col gap-2">
              {suggestedQueries.map((query) => (
                <button
                  key={query}
                  className="p-2 text-left transition-colors mono"
                  style={{
                    fontSize: '11px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setInput(query)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-blue)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 ${msg.role === 'user' ? 'ml-4' : 'mr-4'}`}
                style={{
                  background: msg.role === 'user' ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  border: msg.role === 'user' 
                    ? '1px solid var(--accent-blue)' 
                    : 'var(--border-brutal)',
                }}
              >
                {/* Message header */}
                <div 
                  className="flex items-center justify-between mb-2"
                  style={{ fontSize: '10px', color: 'var(--text-muted)' }}
                >
                  <span className="mono uppercase font-bold">
                    {msg.role === 'user' ? 'You' : 'PathGreen AI'}
                  </span>
                </div>
                
                {/* Message content */}
                <div 
                  className="mono"
                  style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: formatMarkdown(msg.text) 
                  }}
                />
              </div>
            ))}
            
            {/* Loading indicator */}
            {loading && (
              <div 
                className="p-3 mr-4"
                style={{ 
                  background: 'var(--bg-elevated)', 
                  border: 'var(--border-brutal)' 
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: 'var(--accent-green)', animationDelay: '0ms' }}
                    />
                    <span 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: 'var(--accent-green)', animationDelay: '150ms' }}
                    />
                    <span 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: 'var(--accent-green)', animationDelay: '300ms' }}
                    />
                  </div>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Analyzing with Gemini...
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="p-3"
        style={{ borderTop: 'var(--border-brutal)' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about fleet emissions..."
            disabled={loading}
            className="input flex-1"
            style={{ fontSize: '12px' }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn btn--primary"
            style={{ 
              padding: '8px 16px',
              opacity: (loading || !input.trim()) ? 0.5 : 1,
            }}
          >
            →
          </button>
        </div>
      </form>
    </div>
  );
};

// Simple markdown to HTML conversion
function formatMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Headers
    .replace(/^### (.*$)/gm, "<h4 style='margin: 8px 0 4px; font-size: 12px;'>$1</h4>")
    .replace(/^## (.*$)/gm, "<h3 style='margin: 8px 0 4px; font-size: 13px;'>$1</h3>")
    // Lists
    .replace(/^- (.*$)/gm, "<li style='margin-left: 16px;'>$1</li>")
    .replace(/^• (.*$)/gm, "<li style='margin-left: 16px;'>$1</li>")
    // Line breaks
    .replace(/\n/g, '<br />');
}
