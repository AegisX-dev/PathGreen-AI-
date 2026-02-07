import asyncio
import json
import os
import random
import logging
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PathGreen")

# --- Configure Supabase ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Database Status: Online (Supabase)")
    except Exception as e:
        logger.error(f"Supabase Error: {e}")
        supabase = None
else:
    logger.warning("SUPABASE_URL/KEY not found. Running without database.")

# --- Configure Gemini 2.5 ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
model = None

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        logger.info("AI Status: Online (Gemini 2.5 Flash-Lite)")
    except Exception as e:
        logger.error(f"AI Config Error: {e}")
else:
    logger.warning("GEMINI_API_KEY not found. Chat will use mock responses.")


# --- Database Helper Functions ---
async def log_emission(vehicle_id: str, lat: float, lng: float, co2: int, status: str):
    """Log emission data to Supabase."""
    if not supabase:
        return
    try:
        supabase.table("emission_logs").insert({
            "vehicle_id": vehicle_id,
            "latitude": lat,
            "longitude": lng,
            "co2_grams": co2,
            "status": status,
        }).execute()
    except Exception as e:
        logger.error(f"DB emission log error: {e}")


async def log_alert(vehicle_id: str, alert_type: str, severity: str, message: str, lat: float, lng: float):
    """Log alert to Supabase."""
    if not supabase:
        return
    try:
        supabase.table("alerts").insert({
            "vehicle_id": vehicle_id,
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "latitude": lat,
            "longitude": lng,
        }).execute()
    except Exception as e:
        logger.error(f"DB alert log error: {e}")


async def log_chat(user_query: str, ai_response: str, fleet_context: list):
    """Log chat interaction to Supabase."""
    if not supabase:
        return
    try:
        supabase.table("chat_history").insert({
            "user_query": user_query,
            "ai_response": ai_response,
            "fleet_context": fleet_context,
        }).execute()
    except Exception as e:
        logger.error(f"DB chat log error: {e}")


# --- 1. Simulation Logic ---
class FleetSimulator:
    def __init__(self):
        self.routes = self._generate_routes()
        self.tick_count = 0
        
    def _generate_routes(self):
        return [
            {"id": "TRK-101", "lat": 28.7041, "lng": 77.1025, "status": "MOVING", "co2": 450},
            {"id": "TRK-102", "lat": 28.5355, "lng": 77.3910, "status": "IDLE", "co2": 800},
            {"id": "TRK-103", "lat": 28.4595, "lng": 77.0266, "status": "MOVING", "co2": 420},
            {"id": "TRK-104", "lat": 28.6139, "lng": 77.2090, "status": "CRITICAL", "co2": 1200},
            {"id": "TRK-105", "lat": 28.5244, "lng": 77.1855, "status": "MOVING", "co2": 410},
        ]

    def next_tick(self):
        self.tick_count += 1
        updates = []
        alerts = []
        
        for truck in self.routes:
            # Simulate slight movement
            truck["lat"] -= 0.001 + (random.random() * 0.0005)
            truck["lng"] -= 0.001 + (random.random() * 0.0005)
            
            # Dynamic status changes
            alert_info = None
            if random.random() > 0.95:
                truck["co2"] += 50
                truck["status"] = "WARNING"
                alert_info = {
                    "type": "EMISSION_SPIKE",
                    "severity": "WARNING",
                    "message": f"Emission spike detected on {truck['id']}"
                }
                alerts.append(f"[ALERT] WARNING: EMISSION_SPIKE - {truck['id']}")
            elif truck["co2"] > 1000:
                truck["status"] = "CRITICAL"
                alert_info = {
                    "type": "HIGH_IDLE",
                    "severity": "CRITICAL",
                    "message": f"Critical CO2 levels on {truck['id']} - {truck['co2']}g"
                }
                alerts.append(f"[ALERT] CRITICAL: HIGH_IDLE - {truck['id']}")
            else:
                truck["co2"] = max(400, truck["co2"] - 10)
                truck["status"] = "MOVING"
            
            updates.append(truck.copy())
            
            # Store alert to DB if exists
            if alert_info:
                asyncio.create_task(log_alert(
                    truck["id"], 
                    alert_info["type"], 
                    alert_info["severity"],
                    alert_info["message"],
                    truck["lat"],
                    truck["lng"]
                ))
        
        # Log emissions every 10 ticks (~5 seconds) to avoid flooding DB
        if self.tick_count % 10 == 0:
            for truck in updates:
                asyncio.create_task(log_emission(
                    truck["id"],
                    truck["lat"],
                    truck["lng"],
                    truck["co2"],
                    truck["status"]
                ))
        
        return updates, alerts

simulator = FleetSimulator()


# --- 2. FastAPI App ---
app = FastAPI(title="PathGreen-AI", version="2.0.0")

# CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 3. API Endpoints ---
@app.get("/health")
async def health_check():
    """Health check with service status."""
    return {
        "status": "ok",
        "database": "connected" if supabase else "offline",
        "ai": "connected" if model else "offline",
    }


@app.post("/chat")
async def chat_endpoint(request: Request):
    """RAG-powered chat with Gemini + live fleet context."""
    data = await request.json()
    user_query = data.get("message", "")
    
    # 1. Capture Live Context
    fleet_snapshot = simulator.routes.copy()
    fleet_json = json.dumps(fleet_snapshot)
    
    # 2. Generate Answer with RAG
    if model:
        try:
            prompt = (
                f"System: You are PathGreen AI, an advanced logistics assistant for fleet carbon management. "
                f"Here is the live fleet data: {fleet_json}. "
                f"User Question: {user_query}\n"
                f"Answer concisely based ONLY on the data provided. Use bullet points for clarity."
            )
            response = model.generate_content(prompt)
            ai_reply = response.text
            
            # Log to database
            asyncio.create_task(log_chat(user_query, ai_reply, fleet_snapshot))
            
            return {"reply": ai_reply}
        except Exception as e:
            logger.error(f"Gemini Error: {e}")
            return {"reply": f"AI Error: {str(e)}"}
    else:
        mock_reply = "AI is offline (No API Key). TRK-104 is critical (Mock Response)."
        return {"reply": mock_reply}


@app.get("/analytics/emissions")
async def get_emission_history():
    """Get historical emission data from Supabase."""
    if not supabase:
        return {"error": "Database not connected", "data": []}
    
    try:
        # Get last 100 emission logs
        result = supabase.table("emission_logs") \
            .select("*") \
            .order("recorded_at", desc=True) \
            .limit(100) \
            .execute()
        return {"data": result.data}
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        return {"error": str(e), "data": []}


@app.get("/analytics/alerts")
async def get_alert_history():
    """Get historical alerts from Supabase."""
    if not supabase:
        return {"error": "Database not connected", "data": []}
    
    try:
        # Get last 50 alerts
        result = supabase.table("alerts") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(50) \
            .execute()
        return {"data": result.data}
    except Exception as e:
        logger.error(f"Alerts history error: {e}")
        return {"error": str(e), "data": []}


@app.get("/analytics/chat-history")
async def get_chat_history():
    """Get chat history from Supabase."""
    if not supabase:
        return {"error": "Database not connected", "data": []}
    
    try:
        result = supabase.table("chat_history") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()
        return {"data": result.data}
    except Exception as e:
        logger.error(f"Chat history error: {e}")
        return {"error": str(e), "data": []}


@app.get("/fleet")
async def get_fleet():
    """Get current fleet status."""
    return {"data": simulator.routes}


# --- 4. WebSocket ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time fleet updates via WebSocket."""
    await websocket.accept()
    logger.info("WebSocket client connected")
    try:
        while True:
            fleet_data, alerts = simulator.next_tick()
            payload = {"type": "FLEET_UPDATE", "data": fleet_data, "alerts": alerts}
            await websocket.send_json(payload)
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
