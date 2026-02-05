"""
PathGreen-AI: Streaming Transformations

Emission calculations, anomaly detection, and temporal windows using Pathway.
"""

import pathway as pw
from datetime import timedelta
import math
from typing import Optional


# ============================================================================
# EMISSION CONSTANTS (BS-VI Based)
# ============================================================================

# Base emission factor for BS-VI compliant diesel truck (g CO2 per km)
BASE_EMISSION_FACTOR = 650.0  # g/km for unloaded truck at optimal speed

# Load penalty: additional emissions per 1000kg of cargo
LOAD_PENALTY_PER_1000KG = 25.0  # g/km per 1000kg

# Speed penalties: inefficiency at very low or very high speeds
OPTIMAL_SPEED_MIN = 40.0  # km/h
OPTIMAL_SPEED_MAX = 70.0  # km/h
SPEED_PENALTY_FACTOR = 2.5  # multiplier for deviation from optimal range

# Idle emission rate (stationary engine running)
IDLE_EMISSION_RATE = 8.5  # g CO2 per second of idling

# Alert thresholds
IDLE_WARNING_SECONDS = 60
IDLE_CRITICAL_SECONDS = 120
EMISSION_SPIKE_THRESHOLD = 35.0  # g/km (above this triggers alert)
ROUTE_DEVIATION_KM = 5.0  # km off expected route


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def calculate_speed_penalty(speed_kmh: float) -> float:
    """
    Calculate emission penalty based on deviation from optimal speed range.
    Returns a multiplier (1.0 = no penalty, >1.0 = penalty).
    """
    if OPTIMAL_SPEED_MIN <= speed_kmh <= OPTIMAL_SPEED_MAX:
        return 1.0
    
    if speed_kmh < OPTIMAL_SPEED_MIN:
        # Low speed penalty (stop-and-go traffic)
        deviation = OPTIMAL_SPEED_MIN - speed_kmh
        return 1.0 + (deviation / OPTIMAL_SPEED_MIN) * SPEED_PENALTY_FACTOR
    else:
        # High speed penalty (aerodynamic drag)
        deviation = speed_kmh - OPTIMAL_SPEED_MAX
        return 1.0 + (deviation / 50.0) * SPEED_PENALTY_FACTOR


def calculate_co2_emission(
    speed_kmh: float,
    load_kg: float,
    idle_seconds: int,
    distance_km: float = 0.1  # Assume 100m between readings
) -> tuple[float, float]:
    """
    Calculate CO2 emissions based on vehicle state.
    
    Returns:
        (co2_grams, co2_rate_g_per_km)
    """
    if speed_kmh < 1.0:  # Effectively stationary/idling
        # Idle emissions based on duration
        co2_grams = IDLE_EMISSION_RATE * min(idle_seconds, 10)  # Cap at 10s worth per reading
        co2_rate = 0.0  # No per-km rate when stationary
    else:
        # Moving emissions
        load_penalty = (load_kg / 1000.0) * LOAD_PENALTY_PER_1000KG
        speed_multiplier = calculate_speed_penalty(speed_kmh)
        
        co2_rate = (BASE_EMISSION_FACTOR + load_penalty) * speed_multiplier
        co2_grams = co2_rate * distance_km
    
    return co2_grams, co2_rate


def determine_alert(
    speed_kmh: float,
    idle_seconds: int,
    co2_rate: float,
    vehicle_id: str
) -> tuple[Optional[str], str, Optional[str]]:
    """
    Determine if current state triggers an alert.
    
    Returns:
        (alert_type, severity, message)
    """
    # Check idle alert (highest priority for green compliance)
    if idle_seconds >= IDLE_CRITICAL_SECONDS:
        return (
            "HIGH_IDLE",
            "CRITICAL",
            f"{vehicle_id} has been idling for {idle_seconds}s. "
            f"BS-VI Section 4.2.1 limits metro zone idling to 90s. "
            f"Estimated waste: {idle_seconds * IDLE_EMISSION_RATE:.1f}g CO₂"
        )
    elif idle_seconds >= IDLE_WARNING_SECONDS:
        return (
            "HIGH_IDLE",
            "WARNING",
            f"{vehicle_id} idling for {idle_seconds}s. Approaching BS-VI idle limit."
        )
    
    # Check emission spike
    if co2_rate > EMISSION_SPIKE_THRESHOLD and speed_kmh > 5.0:
        return (
            "EMISSION_SPIKE",
            "WARNING",
            f"{vehicle_id} emission rate {co2_rate:.1f}g/km exceeds optimal threshold. "
            f"Consider reducing speed or load."
        )
    
    # No alert
    return (None, "INFO", None)


# ============================================================================
# PATHWAY TRANSFORMATIONS
# ============================================================================

@pw.udf
def compute_emissions_udf(
    vehicle_id: str,
    speed_kmh: float,
    load_kg: float,
    idle_seconds: int
) -> tuple[float, float]:
    """UDF wrapper for emission calculation."""
    return calculate_co2_emission(speed_kmh, load_kg, idle_seconds)


@pw.udf
def compute_alert_udf(
    vehicle_id: str,
    speed_kmh: float,
    idle_seconds: int,
    co2_rate: float
) -> tuple[Optional[str], str, Optional[str]]:
    """UDF wrapper for alert determination."""
    return determine_alert(speed_kmh, idle_seconds, co2_rate, vehicle_id)


def join_gps_and_telemetry(
    gps_table: pw.Table,
    telemetry_table: pw.Table
) -> pw.Table:
    """
    Perform incremental join of GPS and telemetry streams on (vehicle_id, timestamp).
    Uses Pathway's temporal join for near-timestamp matching.
    """
    # Use asof_join for temporal alignment (telemetry may lag GPS slightly)
    joined = gps_table.asof_join(
        telemetry_table,
        gps_table.vehicle_id == telemetry_table.vehicle_id,
        gps_table.timestamp,
        telemetry_table.timestamp,
        how=pw.JoinMode.LEFT,
        direction=pw.temporal.Direction.BACKWARD,
    ).select(
        vehicle_id=gps_table.vehicle_id,
        timestamp=gps_table.timestamp,
        latitude=gps_table.latitude,
        longitude=gps_table.longitude,
        speed_kmh=gps_table.speed_kmh,
        heading=gps_table.heading,
        fuel_level_pct=pw.coalesce(telemetry_table.fuel_level_pct, 100.0),
        engine_temp_c=pw.coalesce(telemetry_table.engine_temp_c, 85.0),
        load_kg=pw.coalesce(telemetry_table.load_kg, 0.0),
        idle_seconds=pw.coalesce(telemetry_table.idle_seconds, 0),
    )
    return joined


def compute_emissions(vehicle_state: pw.Table) -> pw.Table:
    """
    Compute emission metrics and alerts for each vehicle state record.
    """
    # Calculate emissions
    emissions = vehicle_state.select(
        vehicle_id=pw.this.vehicle_id,
        timestamp=pw.this.timestamp,
        latitude=pw.this.latitude,
        longitude=pw.this.longitude,
        speed_kmh=pw.this.speed_kmh,
        load_kg=pw.this.load_kg,
        idle_seconds=pw.this.idle_seconds,
    )
    
    # Add emission calculations using Python logic
    # Note: In production, these would be Pathway UDFs
    result = emissions.select(
        pw.this.vehicle_id,
        pw.this.timestamp,
        pw.this.latitude,
        pw.this.longitude,
        pw.this.speed_kmh,
        # Emission calculation (simplified inline)
        co2_grams=pw.if_else(
            pw.this.speed_kmh < 1.0,
            IDLE_EMISSION_RATE * pw.cast(float, pw.this.idle_seconds.clip(0, 10)),
            (BASE_EMISSION_FACTOR + pw.this.load_kg / 1000.0 * LOAD_PENALTY_PER_1000KG) * 0.1
        ),
        co2_rate_g_per_km=pw.if_else(
            pw.this.speed_kmh < 1.0,
            0.0,
            BASE_EMISSION_FACTOR + pw.this.load_kg / 1000.0 * LOAD_PENALTY_PER_1000KG
        ),
        # Alert determination
        alert_type=pw.if_else(
            pw.this.idle_seconds >= IDLE_CRITICAL_SECONDS,
            "HIGH_IDLE",
            pw.if_else(
                pw.this.idle_seconds >= IDLE_WARNING_SECONDS,
                "HIGH_IDLE",
                pw.cast(str | None, None)
            )
        ),
        alert_severity=pw.if_else(
            pw.this.idle_seconds >= IDLE_CRITICAL_SECONDS,
            "CRITICAL",
            pw.if_else(
                pw.this.idle_seconds >= IDLE_WARNING_SECONDS,
                "WARNING",
                "INFO"
            )
        ),
    )
    
    return result


def compute_rolling_efficiency(
    emissions: pw.Table,
    window_duration: timedelta = timedelta(minutes=5)
) -> pw.Table:
    """
    Compute 5-minute rolling averages for fuel efficiency metrics.
    """
    # Create temporal window
    windowed = emissions.windowby(
        emissions.timestamp,
        window=pw.temporal.tumbling(duration=window_duration),
        behavior=pw.temporal.common_behavior(
            cutoff=timedelta(seconds=30),
            keep_results=True,
        ),
    ).reduce(
        vehicle_id=pw.reducers.any(pw.this.vehicle_id),
        window_start=pw.reducers.min(pw.this.timestamp),
        window_end=pw.reducers.max(pw.this.timestamp),
        avg_co2_rate=pw.reducers.avg(pw.this.co2_rate_g_per_km),
        total_co2_grams=pw.reducers.sum(pw.this.co2_grams),
        avg_speed=pw.reducers.avg(pw.this.speed_kmh),
        max_idle=pw.reducers.max(pw.this.idle_seconds),
        reading_count=pw.reducers.count(),
    )
    
    return windowed
