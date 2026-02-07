"""
PathGreen-AI: LLM Handler

Gemini integration for conversational fleet queries with RAG context.
"""

import os
from typing import Optional
from dotenv import load_dotenv

from rag import rag_handler

load_dotenv()

# Check for Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_AVAILABLE = bool(GEMINI_API_KEY) and GEMINI_API_KEY != "your_gemini_api_key_here"

if GEMINI_AVAILABLE:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        print("[LLM] Gemini API configured successfully")
    except Exception as e:
        print(f"[LLM] Gemini initialization failed: {e}")
        GEMINI_AVAILABLE = False
else:
    print("[LLM] Gemini API key not configured, using mock responses")


SYSTEM_PROMPT = """You are PathGreen-AI, a real-time fleet emissions monitoring assistant for Indian logistics companies.

Your role is to:
1. Explain emission alerts and violations to fleet managers
2. Reference BS-VI emission standards when explaining violations
3. Provide actionable recommendations to reduce emissions
4. Answer questions about fleet carbon performance

When explaining violations, always:
- Cite the specific BS-VI section that was violated
- Quantify the emission impact (grams or kg of CO₂)
- Suggest corrective actions

Keep responses concise and data-driven. Use markdown formatting for clarity.
Format tables when comparing multiple vehicles.
"""


async def generate_response(
    query: str,
    vehicle_context: Optional[dict] = None,
    alert_context: Optional[dict] = None,
) -> tuple[str, list[str]]:
    """
    Generate LLM response to a fleet manager query.
    
    Args:
        query: User's natural language question
        vehicle_context: Optional current vehicle state data
        alert_context: Optional recent alert data
    
    Returns:
        Tuple of (response_text, citation_list)
    """
    # Get RAG context
    rag_context = rag_handler.get_context(query)
    citations = rag_handler.get_citations(query)
    
    # Build prompt
    prompt_parts = [
        SYSTEM_PROMPT,
        "\n## Regulatory Context (from BS-VI standards):\n",
        rag_context,
    ]
    
    if vehicle_context:
        prompt_parts.append("\n## Current Vehicle Data:\n")
        prompt_parts.append(str(vehicle_context))
    
    if alert_context:
        prompt_parts.append("\n## Recent Alerts:\n")
        prompt_parts.append(str(alert_context))
    
    prompt_parts.append(f"\n## User Question:\n{query}")
    prompt_parts.append("\n## Your Response:")
    
    full_prompt = "\n".join(prompt_parts)
    
    if GEMINI_AVAILABLE:
        try:
            response = await model.generate_content_async(full_prompt)
            return response.text, citations
        except Exception as e:
            print(f"[LLM] Gemini error: {e}")
            return generate_mock_response(query, rag_context), citations
    else:
        return generate_mock_response(query, rag_context), citations


def generate_mock_response(query: str, context: str = "") -> str:
    """
    Generate a mock response when Gemini is not available.
    Uses pattern matching to provide relevant responses.
    """
    query_lower = query.lower()
    
    # TRK-102 specific queries (our demo alert vehicle)
    if "trk-102" in query_lower or "102" in query_lower:
        return (
            "**TRK-102 Alert Analysis:**\n\n"
            "TRK-102 was flagged with a **HIGH_IDLE** critical alert. "
            "The vehicle has been stationary with the engine running for approximately 145 seconds "
            "at coordinates (28.614°N, 77.209°E) near Gurgaon.\n\n"
            "**BS-VI Violation:**\n"
            "According to BS-VI Emission Standards Section 4.2.1, commercial vehicles "
            "are limited to 90 seconds of continuous idling in metropolitan zones. "
            "This 145-second idle event resulted in approximately **1,232g of unnecessary CO₂ emissions**.\n\n"
            "**Recommended Action:**\n"
            "Contact the driver to switch off the engine if stationary for extended periods."
        )
    
    # Carbon quota queries
    if "carbon" in query_lower or "quota" in query_lower:
        return (
            "**Fleet Carbon Quota Status:**\n\n"
            "| Vehicle | Today's CO₂ (kg) | Daily Quota | Status |\n"
            "|---------|------------------|-------------|--------|\n"
            "| TRK-101 | 45.2 | 80 kg | ✅ On Track |\n"
            "| TRK-102 | 67.8 | 80 kg | ⚠️ 85% Used |\n"
            "| TRK-103 | 38.1 | 80 kg | ✅ On Track |\n"
            "| TRK-104 | 52.4 | 80 kg | ✅ On Track |\n"
            "| TRK-105 | 71.2 | 80 kg | ⚠️ 89% Used |\n\n"
            "TRK-102 and TRK-105 are approaching their daily carbon quota limits."
        )
    
    # Idle limit queries
    if "idle" in query_lower or "idling" in query_lower:
        return (
            "**BS-VI Idle Emission Limits:**\n\n"
            "According to BS-VI Section 4.2.1:\n\n"
            "| Zone Type | Max Idle Duration |\n"
            "|-----------|------------------|\n"
            "| Metro Zone | 90 seconds |\n"
            "| Green Zone | 60 seconds |\n"
            "| Highway Rest Area | 180 seconds |\n"
            "| Loading Zone | 300 seconds |\n\n"
            "**Emission Rate:** ~8.5g CO₂/second during idle\n\n"
            "Exceeding these limits triggers automatic alerts in PathGreen-AI."
        )
    
    # BS-VI queries
    if "bs-vi" in query_lower or "bs6" in query_lower or "standard" in query_lower:
        return (
            "**BS-VI Emission Standards Summary:**\n\n"
            "The Bharat Stage VI (BS-VI) emission standards apply to all commercial vehicles:\n\n"
            "**Key Limits for HCVs (>12 tonnes):**\n"
            "- Max CO₂: 650 g/km (unloaded) to 850 g/km (loaded)\n"
            "- Max NOx: 0.46 g/kWh\n"
            "- Max PM: 0.01 g/kWh\n\n"
            "**Fleet Operator Requirements:**\n"
            "- GPS tracking with 5-second updates\n"
            "- Real-time emission monitoring\n"
            "- Automated violation alerts\n"
            "- Monthly reports to transport authority"
        )
    
    # Green zone queries
    if "green zone" in query_lower or "zone" in query_lower:
        return (
            "**Green Zone Regulations:**\n\n"
            "Green Zones are urban areas with enhanced emission restrictions:\n\n"
            "**Restricted Areas Include:**\n"
            "- Central Business Districts\n"
            "- Hospital Zones (500m radius)\n"
            "- School Zones (300m radius)\n"
            "- Heritage Sites\n\n"
            "**Additional Restrictions:**\n"
            "- Max idle: 60 seconds (vs 90s standard)\n"
            "- Speed limit: 30 km/h\n"
            "- Operating hours: 6AM-10PM only\n"
            "- Horn usage: Prohibited"
        )
    
    # Default help response
    return (
        "I can help you with fleet emission monitoring. Try asking:\n\n"
        "- \"Why is TRK-102 flagged for an alert?\"\n"
        "- \"Which trucks exceeded their carbon quota?\"\n"
        "- \"What are the BS-VI idle limits?\"\n"
        "- \"Explain Green Zone regulations\"\n"
        "- \"Show me the emission summary for today\""
    )


class LLMHandler:
    """Handler for LLM-based query processing."""
    
    def __init__(self):
        # Initialize RAG
        rag_handler.initialize()
    
    async def process_query(
        self,
        query: str,
        vehicles: Optional[dict] = None,
        alerts: Optional[list] = None,
    ) -> dict:
        """
        Process a user query and return structured response.
        
        Args:
            query: User's question
            vehicles: Current vehicle emission states
            alerts: Recent alert history
        
        Returns:
            Dict with response, citations, and metadata
        """
        response_text, citations = await generate_response(
            query,
            vehicle_context=vehicles,
            alert_context=alerts,
        )
        
        return {
            "response": response_text,
            "citations": citations,
            "model": "gemini-1.5-flash" if GEMINI_AVAILABLE else "mock",
        }


# Global instance
llm_handler = LLMHandler()
