"""
weather.py
----------
Everything related to fetching real-time weather from OpenWeatherMap.

The service returns a plain dictionary (`WeatherData`) so the GUI never
has to know anything about the shape of the raw API response.
"""

from dataclasses import dataclass, field
from typing import Optional

import requests

from config import OPENWEATHER_API_KEY, OPENWEATHER_BASE_URL, REQUEST_TIMEOUT, UNITS
from utils import (
    WeatherAppError,
    format_local_time,
    speed_unit,
    temp_unit,
    visibility_km,
    wind_direction,
)


@dataclass
class WeatherData:
    """Normalised weather snapshot for a single city."""

    city: str
    country: str
    temperature: float
    feels_like: float
    temp_min: float
    temp_max: float
    humidity: int
    pressure: int
    wind_speed: float
    wind_deg: Optional[float]
    visibility: Optional[int]
    condition: str
    description: str
    icon: str
    clouds: int
    sunrise: str
    sunset: str
    raw: dict = field(default_factory=dict, repr=False)

    # -- convenience formatters used by the GUI -----------------------------

    @property
    def location(self) -> str:
        """'Delhi, IN' style label."""
        return f"{self.city}, {self.country}" if self.country else self.city

    @property
    def temp_text(self) -> str:
        return f"{round(self.temperature)}{temp_unit()}"

    @property
    def feels_text(self) -> str:
        return f"{round(self.feels_like)}{temp_unit()}"

    @property
    def wind_text(self) -> str:
        arrow = wind_direction(self.wind_deg)
        return f"{self.wind_speed:g} {speed_unit()} {arrow}".strip()

    @property
    def visibility_text(self) -> str:
        return visibility_km(self.visibility)

    def to_prompt_dict(self) -> dict:
        """Compact dictionary handed to the AI service."""
        return {
            "city": self.location,
            "condition": f"{self.condition} ({self.description})",
            "temperature": self.temp_text,
            "feels_like": self.feels_text,
            "min_max": f"{round(self.temp_min)}/{round(self.temp_max)}{temp_unit()}",
            "humidity": f"{self.humidity}%",
            "wind": self.wind_text,
            "pressure": f"{self.pressure} hPa",
            "visibility": self.visibility_text,
            "cloudiness": f"{self.clouds}%",
        }


class WeatherService:
    """Thin, well-behaved wrapper around the OpenWeatherMap current-weather API."""

    def __init__(self, api_key: str = OPENWEATHER_API_KEY, units: str = UNITS):
        self.api_key = api_key
        self.units = units

    def is_configured(self) -> bool:
        """True when an API key is present."""
        return bool(self.api_key)

    def get_weather(self, city: str) -> WeatherData:
        """Fetch current weather for `city`.

        Raises WeatherAppError with a human-readable message for every
        failure mode (bad key, unknown city, timeout, offline, ...).
        """
        city = (city or "").strip()
        if not city:
            raise WeatherAppError("Please enter a city name.")
        if not self.is_configured():
            raise WeatherAppError(
                "OpenWeatherMap API key is missing. Add OPENWEATHER_API_KEY to your .env file."
            )

        params = {"q": city, "appid": self.api_key, "units": self.units}

        try:
            response = requests.get(
                OPENWEATHER_BASE_URL, params=params, timeout=REQUEST_TIMEOUT
            )
        except requests.Timeout:
            raise WeatherAppError("The weather service took too long to respond. Try again.")
        except requests.ConnectionError:
            raise WeatherAppError("No internet connection. Check your network and retry.")
        except requests.RequestException as exc:  # any other requests failure
            raise WeatherAppError(f"Network error: {exc}")

        # -- HTTP status handling -------------------------------------------
        if response.status_code == 401:
            raise WeatherAppError("Invalid OpenWeatherMap API key. Please verify your .env file.")
        if response.status_code == 404:
            raise WeatherAppError(f"City '{city}' was not found. Check the spelling and try again.")
        if response.status_code == 429:
            raise WeatherAppError("API rate limit reached. Please wait a minute and retry.")
        if not response.ok:
            raise WeatherAppError(f"Weather service error (HTTP {response.status_code}).")

        try:
            payload = response.json()
        except ValueError:
            raise WeatherAppError("Received an unreadable response from the weather service.")

        return self._parse(payload)

    # -- internal helpers ---------------------------------------------------

    @staticmethod
    def _parse(payload: dict) -> WeatherData:
        """Convert the raw JSON payload into a WeatherData object."""
        try:
            main = payload["main"]
            weather = (payload.get("weather") or [{}])[0]
            wind = payload.get("wind") or {}
            sys_block = payload.get("sys") or {}
            offset = payload.get("timezone", 0)

            return WeatherData(
                city=payload.get("name", "Unknown"),
                country=sys_block.get("country", ""),
                temperature=main["temp"],
                feels_like=main.get("feels_like", main["temp"]),
                temp_min=main.get("temp_min", main["temp"]),
                temp_max=main.get("temp_max", main["temp"]),
                humidity=main.get("humidity", 0),
                pressure=main.get("pressure", 0),
                wind_speed=wind.get("speed", 0.0),
                wind_deg=wind.get("deg"),
                visibility=payload.get("visibility"),
                condition=weather.get("main", "Unknown"),
                description=(weather.get("description") or "").title(),
                icon=weather.get("icon", ""),
                clouds=(payload.get("clouds") or {}).get("all", 0),
                sunrise=format_local_time(sys_block.get("sunrise", 0), offset),
                sunset=format_local_time(sys_block.get("sunset", 0), offset),
                raw=payload,
            )
        except (KeyError, TypeError) as exc:
            raise WeatherAppError(f"Unexpected weather data format ({exc}).")
