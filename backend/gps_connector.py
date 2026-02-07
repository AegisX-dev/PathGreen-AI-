"""
PathGreen-AI: GPS & Telemetry Stream Connectors

Custom Pathway ConnectorSubjects for simulating real-time vehicle data streams.
Uses Pathway's streaming infrastructure for incremental processing.
"""

import pathway as pw
import time
import random
import math
from datetime import datetime
from typing import Optional


# =============================================================================
# ROUTE DATA - Simulated delivery routes in Bangalore
# =============================================================================

BANGALORE_ROUTES = {
    "route_a": {
        "name": "Electronic City Loop",
        "waypoints": [
            (12.8399, 77.6770),  # Electronic City
            (12.8506, 77.6593),  # Bommanahalli
            (12.8731, 77.6197),  # BTM Layout
            (12.9062, 77.5857),  # Jayanagar
            (12.9352, 77.6245),  # Koramangala
            (12.8399, 77.6770),  # Back to start
        ]
    },
    "route_b": {
        "name": "Whitefield Express",
        "waypoints": [
            (12.9698, 77.7500),  # Whitefield
            (12.9591, 77.7010),  # Marathahalli
            (12.9352, 77.6245),  # Koramangala
            (12.9279, 77.5806),  # Lalbagh
            (12.9719, 77.5942),  # MG Road
            (12.9698, 77.7500),  # Back to start
        ]
    },
    "route_c": {
        "name": "Airport Cargo",
        "waypoints": [
            (13.1986, 77.7066),  # Airport
            (13.0358, 77.5970),  # Hebbal
            (12.9719, 77.5942),  # MG Road
            (12.9352, 77.6245),  # Koramangala
            (12.9591, 77.7010),  # Marathahalli
            (13.1986, 77.7066),  # Back to airport
        ]
    },
    "route_d": {
        "name": "Peenya Industrial",
        "waypoints": [
            (13.0285, 77.5192),  # Peenya
            (12.9914, 77.5520),  # Rajajinagar
            (12.9716, 77.5946),  # Majestic
            (12.9279, 77.5806),  # Lalbagh
            (12.9062, 77.5857),  # Jayanagar
            (13.0285, 77.5192),  # Back to Peenya
        ]
    },
}


class GPSStreamSubject(pw.io.python.ConnectorSubject):
    """
    Simulates real-time GPS data from fleet vehicles.
    
    Each vehicle follows a predefined route, moving between waypoints
    with realistic speed variations and occasional stops.
    """
    
    def __init__(
        self, 
        vehicle_ids: list[str], 
        interval_seconds: float = 2.0,
        speed_range: tuple[float, float] = (20.0, 70.0)
    ):
        super().__init__()
        self.vehicle_ids = vehicle_ids
        self.interval = interval_seconds
        self.speed_range = speed_range
        self.vehicle_states = self._init_vehicle_states()
    
    def _init_vehicle_states(self) -> dict:
        """Initialize each vehicle on a random route position."""
        states = {}
        route_keys = list(BANGALORE_ROUTES.keys())
        
        for i, vid in enumerate(self.vehicle_ids):
            route_key = route_keys[i % len(route_keys)]
            route = BANGALORE_ROUTES[route_key]
            waypoints = route["waypoints"]
            
            states[vid] = {
                "route_key": route_key,
                "waypoints": waypoints,
                "current_wp_idx": 0,
                "progress": 0.0,  # 0.0 to 1.0 between waypoints
                "speed_kmh": random.uniform(*self.speed_range),
                "heading": 0.0,
                "is_idle": False,
                "idle_timer": 0,
            }
        
        return states
    
    def _interpolate_position(self, wp1: tuple, wp2: tuple, t: float) -> tuple:
        """Linear interpolation between two waypoints."""
        lat = wp1[0] + (wp2[0] - wp1[0]) * t
        lng = wp1[1] + (wp2[1] - wp1[1]) * t
        return (lat, lng)
    
    def _calculate_heading(self, wp1: tuple, wp2: tuple) -> float:
        """Calculate heading from wp1 to wp2 in degrees."""
        dlat = wp2[0] - wp1[0]
        dlng = wp2[1] - wp1[1]
        heading = math.degrees(math.atan2(dlng, dlat))
        return (heading + 360) % 360
    
    def _update_vehicle(self, vid: str) -> dict:
        """Update vehicle position along its route."""
        state = self.vehicle_states[vid]
        waypoints = state["waypoints"]
        
        # Random chance to start/stop idling
        if not state["is_idle"] and random.random() < 0.05:  # 5% chance to idle
            state["is_idle"] = True
            state["idle_timer"] = random.randint(30, 180)  # Idle 30-180 seconds
        
        if state["is_idle"]:
            state["idle_timer"] -= self.interval
            if state["idle_timer"] <= 0:
                state["is_idle"] = False
            state["speed_kmh"] = 0.0
        else:
            # Update speed with some randomness
            state["speed_kmh"] = max(
                self.speed_range[0],
                min(
                    self.speed_range[1],
                    state["speed_kmh"] + random.uniform(-5, 5)
                )
            )
            
            # Move along route
            state["progress"] += 0.02 * (state["speed_kmh"] / 50.0)
            
            if state["progress"] >= 1.0:
                state["progress"] = 0.0
                state["current_wp_idx"] = (state["current_wp_idx"] + 1) % len(waypoints)
        
        # Get current and next waypoint
        wp_idx = state["current_wp_idx"]
        next_wp_idx = (wp_idx + 1) % len(waypoints)
        wp1 = waypoints[wp_idx]
        wp2 = waypoints[next_wp_idx]
        
        # Interpolate position
        lat, lng = self._interpolate_position(wp1, wp2, state["progress"])
        
        # Calculate heading
        state["heading"] = self._calculate_heading(wp1, wp2)
        
        return {
            "latitude": lat,
            "longitude": lng,
            "speed_kmh": state["speed_kmh"],
            "heading": state["heading"],
        }
    
    def run(self):
        """Main loop - emit GPS events for all vehicles."""
        while True:
            for vid in self.vehicle_ids:
                position = self._update_vehicle(vid)
                
                self.next(
                    vehicle_id=vid,
                    timestamp=int(datetime.now().timestamp() * 1000),
                    latitude=position["latitude"],
                    longitude=position["longitude"],
                    speed_kmh=position["speed_kmh"],
                    heading=position["heading"],
                )
            
            time.sleep(self.interval)


class TelemetryStreamSubject(pw.io.python.ConnectorSubject):
    """
    Simulates engine and load telemetry from vehicle IoT sensors.
    
    Generates fuel level, engine temperature, cargo load, and idle duration
    that correlates with GPS speed data.
    """
    
    def __init__(
        self, 
        vehicle_ids: list[str], 
        interval_seconds: float = 2.0
    ):
        super().__init__()
        self.vehicle_ids = vehicle_ids
        self.interval = interval_seconds
        self.vehicle_telemetry = self._init_telemetry()
    
    def _init_telemetry(self) -> dict:
        """Initialize telemetry state for each vehicle."""
        return {
            vid: {
                "fuel_level_pct": random.uniform(50, 100),
                "engine_temp_c": random.uniform(75, 85),
                "load_kg": random.uniform(800, 2500),
                "idle_seconds": 0,
                "is_idle": False,
            }
            for vid in self.vehicle_ids
        }
    
    def _update_telemetry(self, vid: str, is_idle: bool) -> dict:
        """Update telemetry values with realistic patterns."""
        state = self.vehicle_telemetry[vid]
        
        # Update idle tracking
        if is_idle:
            state["idle_seconds"] += self.interval
        else:
            state["idle_seconds"] = 0
        state["is_idle"] = is_idle
        
        # Fuel consumption (faster when moving)
        fuel_burn = 0.01 if is_idle else 0.03
        state["fuel_level_pct"] = max(5, state["fuel_level_pct"] - fuel_burn)
        
        # Refuel when low (simulates depot stop)
        if state["fuel_level_pct"] < 10:
            state["fuel_level_pct"] = random.uniform(80, 100)
        
        # Engine temperature (higher when moving, lower when idle)
        target_temp = 75 if is_idle else 90
        state["engine_temp_c"] += (target_temp - state["engine_temp_c"]) * 0.1
        state["engine_temp_c"] += random.uniform(-1, 1)
        state["engine_temp_c"] = max(60, min(105, state["engine_temp_c"]))
        
        # Load varies slightly (simulates deliveries)
        if random.random() < 0.02:  # 2% chance per tick
            state["load_kg"] = random.uniform(500, 2500)
        
        return {
            "fuel_level_pct": round(state["fuel_level_pct"], 1),
            "engine_temp_c": round(state["engine_temp_c"], 1),
            "load_kg": round(state["load_kg"], 0),
            "idle_seconds": int(state["idle_seconds"]),
        }
    
    def run(self):
        """Main loop - emit telemetry events for all vehicles."""
        while True:
            for vid in self.vehicle_ids:
                # Simulate correlation with GPS idle state
                is_idle = random.random() < 0.1  # 10% chance of being idle
                
                telemetry = self._update_telemetry(vid, is_idle)
                
                self.next(
                    vehicle_id=vid,
                    timestamp=int(datetime.now().timestamp() * 1000),
                    fuel_level_pct=telemetry["fuel_level_pct"],
                    engine_temp_c=telemetry["engine_temp_c"],
                    load_kg=telemetry["load_kg"],
                    idle_seconds=telemetry["idle_seconds"],
                )
            
            time.sleep(self.interval)


# =============================================================================
# HELPER FUNCTIONS FOR CREATING TABLES
# =============================================================================

def create_gps_table(
    vehicle_ids: list[str],
    interval: float = 2.0,
    schema=None
) -> pw.Table:
    """
    Create a Pathway Table from GPS stream.
    
    Args:
        vehicle_ids: List of vehicle identifiers
        interval: Seconds between GPS readings
        schema: Pathway schema (defaults to GPSEvent from schema.py)
    
    Returns:
        Pathway Table with GPS data
    """
    from schema import GPSEvent
    
    subject = GPSStreamSubject(vehicle_ids, interval_seconds=interval)
    return pw.io.python.read(
        subject,
        schema=schema or GPSEvent,
        autocommit_duration_ms=int(interval * 500),
    )


def create_telemetry_table(
    vehicle_ids: list[str],
    interval: float = 2.0,
    schema=None
) -> pw.Table:
    """
    Create a Pathway Table from Telemetry stream.
    
    Args:
        vehicle_ids: List of vehicle identifiers
        interval: Seconds between telemetry readings
        schema: Pathway schema (defaults to TelemetryEvent from schema.py)
    
    Returns:
        Pathway Table with telemetry data
    """
    from schema import TelemetryEvent
    
    subject = TelemetryStreamSubject(vehicle_ids, interval_seconds=interval)
    return pw.io.python.read(
        subject,
        schema=schema or TelemetryEvent,
        autocommit_duration_ms=int(interval * 500),
    )
