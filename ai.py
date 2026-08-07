"""
ai.py
-----
Google Gemini integration.

Given a WeatherData snapshot, the AI service asks Gemini for a short,
structured briefing and returns it as a dictionary of six sections:

    summary, clothing, travel, health, activity, alert

If the AI is unavailable (no key, no network, quota reached) the service
falls back to a rule-based offline briefing so the app still works.
"""

import json
import re

from config import GEMINI_API_KEY, GEMINI_MODEL
from utils import WeatherAppError

# google-generativeai is optional at import time so the GUI can still start
# and show a helpful message if the library is not installed yet.
try:
    import google.generativeai as genai

    GENAI_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on environment
    genai = None
    GENAI_AVAILABLE = False


# Keys the GUI expects, in display order, with friendly headings.
SECTIONS = [
    ("summary", "Weather Summary"),
    ("clothing", "What To Wear"),
    ("travel", "Travel Advice"),
    ("health", "Health Tips"),
    ("activity", "Outdoor Activity"),
    ("alert", "Rain / Heat Alert"),
]


class AIService:
    """Wrapper around the Gemini text model."""

    def __init__(self, api_key: str = GEMINI_API_KEY, model_name: str = GEMINI_MODEL):
        self.api_key = api_key
        self.model_name = model_name
        self._model = None

    # -- configuration ------------------------------------------------------

    def is_configured(self) -> bool:
        """True when the library is installed and an API key is present."""
        return bool(self.api_key) and GENAI_AVAILABLE

    def _get_model(self):
        """Lazily create (and cache) the Gemini model instance."""
        if self._model is None:
            genai.configure(api_key=self.api_key)
            self._model = genai.GenerativeModel(self.model_name)
        return self._model

    # -- public API ---------------------------------------------------------

    def analyze(self, weather) -> dict:
        """Return an AI briefing dict for the given WeatherData.

        Never raises: on any failure it returns the offline fallback with an
        extra "_offline" flag so the GUI can label it.
        """
        if not self.is_configured():
            result = self._fallback(weather)
            result["_offline"] = True
            return result

        try:
            response = self._get_model().generate_content(self._build_prompt(weather))
            text = (getattr(response, "text", "") or "").strip()
            parsed = self._parse_json(text)
            if parsed:
                parsed["_offline"] = False
                return parsed
            raise WeatherAppError("AI returned an unreadable response.")
        except Exception:  # noqa: BLE001 - any SDK/network failure degrades gracefully
            result = self._fallback(weather)
            result["_offline"] = True
            return result

    # -- prompt & parsing ---------------------------------------------------

    @staticmethod
    def _build_prompt(weather) -> str:
        """Build a strict, JSON-only prompt from the weather snapshot."""
        data = weather.to_prompt_dict()
        readings = "\n".join(f"- {key.replace('_', ' ').title()}: {value}"
                             for key, value in data.items())
        return (
            "You are a friendly weather assistant for everyday users.\n"
            "Analyse the current weather readings below and reply with JSON ONLY "
            "(no markdown fences, no extra text) using exactly these keys:\n"
            '{"summary","clothing","travel","health","activity","alert"}\n'
            "Each value must be one or two short, practical sentences in simple English.\n"
            'If there is no rain or heat risk, set "alert" to a calm reassurance.\n\n'
            f"Current readings:\n{readings}\n"
        )

    @staticmethod
    def _parse_json(text: str):
        """Extract the JSON object from the model reply, tolerating code fences."""
        if not text:
            return None
        cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
        if not isinstance(data, dict):
            return None
        return {key: str(data.get(key, "")).strip() for key, _ in SECTIONS}

    # -- offline rule-based fallback ---------------------------------------

    @staticmethod
    def _fallback(weather) -> dict:
        """Deterministic advice used when Gemini cannot be reached."""
        temp = weather.temperature
        condition = weather.condition.lower()
        humid = weather.humidity
        wind = weather.wind_speed

        if temp >= 35:
            clothing = "Wear light cotton clothes, a cap and sunglasses. Avoid dark colours."
            health = "Drink water every hour and avoid direct sun between 12pm and 4pm."
        elif temp >= 25:
            clothing = "Light, breathable clothing is comfortable today."
            health = "Stay hydrated and use sunscreen if you'll be outdoors."
        elif temp >= 15:
            clothing = "A light jacket or full sleeves will keep you comfortable."
            health = "Pleasant conditions — a good day for a walk."
        else:
            clothing = "Dress in warm layers; add a jacket, and cover your head if it's windy."
            health = "Keep warm and take care if you have asthma or joint pain."

        rainy = any(word in condition for word in ("rain", "drizzle", "thunder"))
        travel = (
            "Roads may be slippery — start early and drive slowly."
            if rainy
            else "Travel conditions look normal. Plan your trip as usual."
        )
        activity = (
            "Prefer indoor activities, or carry an umbrella if you must step out."
            if rainy or temp >= 38
            else "A good time for a walk, cycling or outdoor sports."
        )

        if rainy:
            alert = "Rain alert: carry an umbrella or raincoat today."
        elif temp >= 38:
            alert = "Heat alert: high temperature — limit outdoor exposure."
        else:
            alert = "No rain or heat warnings right now."

        summary = (
            f"{weather.location} is currently {weather.description.lower() or condition} "
            f"at {weather.temp_text}, feeling like {weather.feels_text}. "
            f"Humidity is {humid}% with {wind:g} wind speed."
        )

        return {
            "summary": summary,
            "clothing": clothing,
            "travel": travel,
            "health": health,
            "activity": activity,
            "alert": alert,
        }
