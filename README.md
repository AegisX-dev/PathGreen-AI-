# 🌿 PathGreen-AI

> Real-time Fleet Emissions Intelligence Platform powered by AI

![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash--Lite-4285F4)

PathGreen-AI is a real-time logistics intelligence system for monitoring fleet carbon emissions. It combines live vehicle tracking, emission analytics, and an AI-powered chat interface to help fleet operators reduce their environmental footprint.

---

## ✨ Features

| Feature                    | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| 🗺️ **Live Fleet Map**      | Dark-themed Leaflet map with color-coded vehicle markers   |
| 📊 **Emission Gauges**     | Real-time CO₂ tracking with quota progress bars            |
| 🚛 **Vehicle Status**      | Live status updates (MOVING, IDLE, WARNING, CRITICAL)      |
| 💬 **AI Chat (RAG)**       | Ask questions about your fleet using Gemini 2.5 Flash-Lite |
| ⚡ **WebSocket Streaming** | 500ms update intervals for real-time data                  |
| 🎨 **Brutalist UI**        | High-contrast design with character-rich typography        |

---

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket (ws://8080/ws)    ┌─────────────────┐
│                 │ ◄──────────────────────────────►│                 │
│  Next.js        │                                 │  FastAPI        │
│  Frontend       │     HTTP POST (/chat)           │  Backend        │
│  (Port 3000)    │ ───────────────────────────────►│  (Port 8080)    │
│                 │                                 │                 │
└─────────────────┘                                 └────────┬────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │  Gemini 2.5     │
                                                    │  Flash-Lite     │
                                                    └─────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Mapping**: Leaflet + react-leaflet
- **Styling**: CSS Variables (Brutalist Design System)
- **Fonts**: Space Grotesk, JetBrains Mono

### Backend

- **Framework**: FastAPI
- **Server**: Uvicorn (ASGI)
- **AI**: Google Gemini 2.5 Flash-Lite
- **Protocol**: WebSocket + REST

### Infrastructure

- **Containerization**: Docker + Docker Compose
- **Hot Reload**: Volume mounts with dev mode

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/pathgreen-ai.git
cd pathgreen-ai
```

### 2. Set Environment Variables

```bash
# Create .env file in project root
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### 3. Start the Platform

```bash
docker compose up --build
```

### 4. Open the Dashboard

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend Health**: [http://localhost:8080/health](http://localhost:8080/health)
- **API Docs**: [http://localhost:8080/docs](http://localhost:8080/docs)

---

## 📁 Project Structure

```
pathgreen-ai/
├── backend/
│   ├── main.py              # FastAPI app with WebSocket & chat
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # Backend container
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── FleetMap.tsx        # Leaflet map component
│   │   │   ├── VehicleList.tsx     # Truck status list
│   │   │   ├── EmissionGauges.tsx  # CO₂ gauges
│   │   │   └── ChatSidebar.tsx     # AI chat interface
│   │   ├── page.tsx         # Main dashboard
│   │   ├── layout.tsx       # Root layout with fonts
│   │   └── globals.css      # Brutalist design system
│   ├── package.json
│   └── Dockerfile           # Frontend container
├── docker-compose.yml       # Dev mode with hot reload
└── README.md
```

---

## 🔧 Development

### Hot Reload Mode

The default `docker-compose.yml` enables hot reloading:

- **Backend**: `uvicorn --reload` auto-restarts on Python file changes
- **Frontend**: `pnpm dev` provides instant HMR for React components

### Local Development (Without Docker)

**Backend:**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

**Frontend:**

```bash
cd frontend
pnpm install
pnpm dev
```

---

## 💬 AI Chat Examples

Ask the AI about your fleet:

| Query                         | What You Get                                   |
| ----------------------------- | ---------------------------------------------- |
| "Why is TRK-104 flagged?"     | Analysis of the critical truck's status        |
| "Which trucks have high CO2?" | List of vehicles exceeding emission thresholds |
| "What is the fleet status?"   | Summary of all vehicles with status breakdown  |

---

## 🎨 Design System

The UI follows a **Brutalist** design philosophy:

```css
--bg-void: #000000;
--bg-primary: #0a0a0a;
--accent-green: #00ff66;
--accent-red: #ff3333;
--accent-amber: #ffb800;
--border-brutal: 2px solid #333;
```

Typography uses **Space Grotesk** for headings and **JetBrains Mono** for data.

---

## 📡 API Reference

### WebSocket: `/ws`

Streams fleet updates every 500ms:

```json
{
  "type": "FLEET_UPDATE",
  "data": [
    {
      "id": "TRK-101",
      "lat": 28.7,
      "lng": 77.1,
      "status": "MOVING",
      "co2": 450
    }
  ],
  "alerts": ["[ALERT] WARNING: EMISSION_SPIKE - TRK-102"]
}
```

### POST: `/chat`

Send a query, receive AI response:

```bash
curl -X POST http://localhost:8080/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Why is TRK-104 flagged?"}'
```

### GET: `/health`

Health check endpoint:

```json
{ "status": "ok" }
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Leaflet](https://leafletjs.com/) for the mapping library
- [CARTO](https://carto.com/) for the dark map tiles
- [Google Gemini](https://ai.google.dev/) for the AI backbone
- [FastAPI](https://fastapi.tiangolo.com/) for the blazing-fast backend

---

<p align="center">
  Built with 💚 for a greener future
</p>
