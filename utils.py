"""
utils.py
--------
Small helper utilities shared by the rest of the application:

* custom exception type
* search-history persistence (JSON file)
* formatting helpers (time, wind direction, units)
* weather icon downloading with an in-memory cache
"""

import json
from datetime import datetime, timedelta, timezone
from io import BytesIO

import requests

from config import (
    HISTORY_FILE,
    MAX_HISTORY,
    OPENWEATHER_ICON_URL,
    REQUEST_TIMEOUT,
    UNITS,
)


class WeatherAppError(Exception):
    """Friendly, user-facing error raised by the services layer."""


# ---------------------------------------------------------------------------
# Search history
# ---------------------------------------------------------------------------


def load_history() -> list:
    """Read the list of recently searched cities from disk.

    Returns an empty list when the file is missing or corrupted, so the
    application never crashes because of a bad cache file.
    """
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
        if isinstance(data, list):
            return [str(city) for city in data][:MAX_HISTORY]
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        pass
    return []


def save_city(city: str) -> list:
    """Add `city` to the top of the history, de-duplicated, and persist it.

    Returns the updated history list.
    """
    city = city.strip().title()
    if not city:
        return load_history()

    history = [c for c in load_history() if c.lower() != city.lower()]
    history.insert(0, city)
    history = history[:MAX_HISTORY]

    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as file:
            json.dump(history, file, indent=2)
    except OSError:
        # Saving history is a nice-to-have; never break the app for it.
        pass
    return history


def clear_history() -> list:
    """Delete every stored city and return the (now empty) history."""
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as file:
            json.dump([], file)
    except OSError:
        pass
    return []


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------


def temp_unit() -> str:
    """Return the temperature symbol matching the configured unit system."""
    return "°C" if UNITS == "metric" else "°F"


def speed_unit() -> str:
    """Return the wind-speed unit matching the configured unit system."""
    return "m/s" if UNITS == "metric" else "mph"


def format_local_time(utc_timestamp: int, timezone_offset: int) -> str:
    """Convert a UTC unix timestamp into the city's local 'HH:MM' string."""
    try:
        moment = datetime.fromtimestamp(utc_timestamp, tz=timezone.utc)
        moment += timedelta(seconds=timezone_offset)
        return moment.strftime("%H:%M")
    except (OSError, OverflowError, ValueError):
        return "--:--"


def wind_direction(degrees) -> str:
    """Convert wind bearing in degrees to a compass label such as 'NE'."""
    if degrees is None:
        return ""
    points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    index = int((float(degrees) + 22.5) // 45) % 8
    return points[index]


def visibility_km(meters) -> str:
    """Render visibility in kilometres with one decimal place."""
    if meters is None:
        return "N/A"
    return f"{meters / 1000:.1f} km"


# ---------------------------------------------------------------------------
# Weather icon download
# ---------------------------------------------------------------------------

# Cache raw PNG bytes so the same icon is downloaded only once per session.
_ICON_CACHE = {}


def fetch_icon_bytes(icon_code: str):
    """Download the OpenWeatherMap icon PNG and return its raw bytes.

    Returns None on any network problem — the GUI then simply shows an
    emoji fallback instead of an image.
    """
    if not icon_code:
        return None
    if icon_code in _ICON_CACHE:
        return _ICON_CACHE[icon_code]

    try:
        response = requests.get(
            OPENWEATHER_ICON_URL.format(icon=icon_code),
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        _ICON_CACHE[icon_code] = response.content
        return response.content
    except requests.RequestException:
        return None


def bytes_to_stream(raw: bytes) -> BytesIO:
    """Wrap raw bytes in a file-like object for Pillow's Image.open()."""
    return BytesIO(raw)
