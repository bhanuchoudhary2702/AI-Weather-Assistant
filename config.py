"""
config.py
---------
Central configuration for the AI Weather Assistant.

Loads secrets from a local .env file and exposes constants used across
the application (API endpoints, theme colours, file paths, etc.).
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

# Absolute path to the folder containing this file (weather_ai/)
BASE_DIR = Path(__file__).resolve().parent

# Load variables from weather_ai/.env into os.environ
load_dotenv(BASE_DIR / ".env")

# API keys (never hard-code these; keep them in .env)
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Gemini model name (can be overridden in .env)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

# Units: "metric" (Celsius) or "imperial" (Fahrenheit)
UNITS = os.getenv("UNITS", "metric").strip()

# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
OPENWEATHER_ICON_URL = "https://openweathermap.org/img/wn/{icon}@4x.png"

# Network timeout in seconds for every outgoing HTTP request
REQUEST_TIMEOUT = 10

# ---------------------------------------------------------------------------
# Local storage
# ---------------------------------------------------------------------------

# JSON file that remembers the last searched cities
HISTORY_FILE = BASE_DIR / "search_history.json"

# How many recent cities to keep
MAX_HISTORY = 8

# ---------------------------------------------------------------------------
# UI theme (dark, glassmorphism-inspired)
# ---------------------------------------------------------------------------

APP_TITLE = "AI Weather Assistant"
APP_SIZE = "1040x720"
APP_MIN_SIZE = (900, 640)

THEME = {
    # Deep midnight backdrop
    "bg": "#0b1020",
    "bg_alt": "#101733",
    # Frosted "glass" panels (simulated with light-on-dark flat colours,
    # because Tkinter cannot blur what is behind a widget)
    "glass": "#161f3d",
    "glass_light": "#1e2950",
    "border": "#2c3a6b",
    # Text
    "text": "#eaf0ff",
    "text_muted": "#98a5cc",
    # Accents
    "accent": "#4cc9f0",
    "accent_2": "#7b61ff",
    "success": "#3ddc97",
    "warning": "#ffb703",
    "danger": "#ff5d73",
}

# Fonts used throughout the GUI
FONTS = {
    "title": ("Segoe UI Semibold", 22),
    "subtitle": ("Segoe UI", 12),
    "temp": ("Segoe UI Light", 62),
    "card_value": ("Segoe UI Semibold", 15),
    "card_label": ("Segoe UI", 9),
    "body": ("Segoe UI", 11),
    "small": ("Segoe UI", 9),
    "button": ("Segoe UI Semibold", 10),
}


def missing_keys() -> list:
    """Return a list of API keys that are not configured yet."""
    missing = []
    if not OPENWEATHER_API_KEY:
        missing.append("OPENWEATHER_API_KEY")
    if not GEMINI_API_KEY:
        missing.append("GEMINI_API_KEY")
    return missing
