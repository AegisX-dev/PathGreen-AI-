"""
PathGreen-AI: Pathway Table Schemas

Type-safe schemas for GPS telemetry, emissions, and alerts.
"""

import pathway as pw
from typing import Optional


class GPSEvent(pw.Schema):
    """Raw GPS coordinate event from vehicle tracker."""
    vehicle_id: str
    timestamp: int              # Unix epoch milliseconds
    latitude: float
    longitude: float
    speed_kmh: float
    heading: float              # Degrees from north


class TelemetryEvent(pw.Schema):
    """Engine and load telemetry from vehicle IoT sensors."""
    vehicle_id: str
    timestamp: int
    fuel_level_pct: float       # 0-100
    engine_temp_c: float
    load_kg: float
    idle_seconds: int           # Continuous idle duration


class VehicleState(pw.Schema):
    """Combined GPS + Telemetry state for a vehicle."""
    vehicle_id: str
    timestamp: int
    latitude: float
    longitude: float
    speed_kmh: float
    heading: float
    fuel_level_pct: float
    engine_temp_c: float
    load_kg: float
    idle_seconds: int


class EmissionRecord(pw.Schema):
    """Computed emission metrics with optional alert."""
    vehicle_id: str
    timestamp: int
    latitude: float
    longitude: float
    speed_kmh: float
    co2_grams: float            # Instantaneous CO2 emission (g)
    co2_rate_g_per_km: float    # Emission rate (g/km)
    cumulative_co2_kg: float    # Running total for the trip
    fuel_efficiency_km_l: float # Current fuel efficiency
    alert_type: Optional[str]   # "HIGH_IDLE", "EMISSION_SPIKE", "ROUTE_DEVIATION", None
    alert_severity: str         # "INFO", "WARNING", "CRITICAL"
    alert_message: Optional[str]


class AlertEvent(pw.Schema):
    """Standalone alert event for the alert feed."""
    alert_id: str
    vehicle_id: str
    timestamp: int
    alert_type: str
    severity: str               # "INFO", "WARNING", "CRITICAL"
    message: str
    latitude: float
    longitude: float


class ChatMessage(pw.Schema):
    """User query for the LLM chat interface."""
    message_id: str
    query: str
    timestamp: int


class ChatResponse(pw.Schema):
    """LLM response with citations."""
    message_id: str
    query: str
    response: str
    citations: list[str]        # List of document references
    timestamp: int
