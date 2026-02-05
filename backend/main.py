import asyncio
import json
import os
import random
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PathGreen")

# --- Configure Gemini 2.5 (Stable 2026 Model) ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        logger.info("AI Status: Online (Gemini 2.5 Flash-Lite)")
    except Exception as e:
        logger.error(f"AI Config Error: {e}")
        model = None
else:
    logger.warning("GEMINI_API_KEY not found. Chat will use mock responses.")
    model = None

# --- 1. Simulation Logic ---
class FleetSimulator:
    def __init__(self):
        self.routes = self._generate_routes()
        
    def _generate_routes(self):
        return [
            {"id": "TRK-101", "lat": 28.7041, "lng": 77.1025, "status": "MOVING", "co2": 450},
            {"id": "TRK-102", "lat": 28.5355, "lng": 77.3910, "status": "IDLE", "co2": 800},
            {"id": "TRK-103", "lat": 28.4595, "lng": 77.0266, "status": "MOVING", "co2": 420},
            {"id": "TRK-104", "lat": 28.6139, "lng": 77.2090, "status": "CRITICAL", "co2": 1200},
            {"id": "TRK-105", "lat": 28.5244, "lng": 77.1855, "status": "MOVING", "co2": 410},
        ]

    def next_tick(self):
        updates = []
        alerts = []
        for truck in self.routes:
            # Simulate slight movement
            truck["lat"] -= 0.001 + (random.random() * 0.0005)
            truck["lng"] -= 0.001 + (random.random() * 0.0005)
            
            # Dynamic status changes
            if random.random() > 0.95:
                truck["co2"] += 50
                truck["status"] = "WARNING"
                alerts.append(f"[ALERT] WARNING: EMISSION_SPIKE - {truck['id']}")
            elif truck["co2"] > 1000:
                truck["status"] = "CRITICAL"
                alerts.append(f"[ALERT] CRITICAL: HIGH_IDLE - {truck['id']}")
            else:
                truck["co2"] = max(400, truck["co2"] - 10)
                truck["status"] = "MOVING"
                
            updates.append(truck)
        return updates, alerts

simulator = FleetSimulator()

# --- 2. FastAPI App ---
app = FastAPI()

# Allow Frontend to talk to Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    user_query = data.get("message", "")
    
    # 1. Capture Live Context
    fleet_snapshot = json.dumps(simulator.routes)
    
    # 2. Generate Answer with RAG
    if model:
        try:
            prompt = (
                f"System: You are PathGreen AI, an advanced logistics assistant. "
                f"Here is the live fleet data: {fleet_snapshot}. "
                f"User Question: {user_query}\n"
                f"Answer concisely based ONLY on the data provided."
            )
            response = model.generate_content(prompt)
            return {"reply": response.text}
        except Exception as e:
            logger.error(f"Gemini Error: {e}")
            return {"reply": f"AI Error: {str(e)}"}
    else:
        return {"reply": "AI is offline (No API Key). TRK-104 is critical (Mock Response)."}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            fleet_data, alerts = simulator.next_tick()
            payload = {"type": "FLEET_UPDATE", "data": fleet_data, "alerts": alerts}
            await websocket.send_json(payload)
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
