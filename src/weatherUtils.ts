import type { WeatherCondition, TimeOfDay } from "./types";

export function getWeatherTheme(condition: WeatherCondition, timeOfDay: TimeOfDay) {
  const isNight = timeOfDay === "night";

  const themes: Record<WeatherCondition, { gradient: string; accent: string; cloudColor: string; cloudOpacity: number; particleColor: string }> = {
    clear: {
      gradient: isNight
        ? "radial-gradient(ellipse at 30% 20%, #1a2150 0%, #0b1020 60%, #060916 100%)"
        : "radial-gradient(ellipse at 70% 15%, #1a2a5c 0%, #0b1020 55%, #060916 100%)",
      accent: "#4cc9f0",
      cloudColor: isNight ? "#2a3470" : "#3a5a8a",
      cloudOpacity: isNight ? 0.25 : 0.35,
      particleColor: isNight ? "rgba(180, 200, 255, 0.6)" : "rgba(255, 220, 150, 0.5)",
    },
    clouds: {
      gradient: "linear-gradient(180deg, #0d1530 0%, #0b1020 50%, #080d1c 100%)",
      accent: "#4cc9f0",
      cloudColor: "#3a4880",
      cloudOpacity: 0.55,
      particleColor: "rgba(160, 180, 230, 0.4)",
    },
    rain: {
      gradient: "linear-gradient(180deg, #0a1228 0%, #0b1020 50%, #050810 100%)",
      accent: "#4cc9f0",
      cloudColor: "#2a3460",
      cloudOpacity: 0.7,
      particleColor: "rgba(120, 180, 255, 0.6)",
    },
    drizzle: {
      gradient: "linear-gradient(180deg, #0b1530 0%, #0b1020 50%, #060916 100%)",
      accent: "#4cc9f0",
      cloudColor: "#334070",
      cloudOpacity: 0.6,
      particleColor: "rgba(140, 190, 255, 0.5)",
    },
    thunderstorm: {
      gradient: "linear-gradient(180deg, #08081a 0%, #0a0a20 50%, #04040e 100%)",
      accent: "#b89dff",
      cloudColor: "#1a1e3e",
      cloudOpacity: 0.8,
      particleColor: "rgba(200, 180, 255, 0.7)",
    },
    snow: {
      gradient: "linear-gradient(180deg, #101838 0%, #0b1020 50%, #080d20 100%)",
      accent: "#a0d8ff",
      cloudColor: "#4a5a90",
      cloudOpacity: 0.65,
      particleColor: "rgba(255, 255, 255, 0.8)",
    },
    mist: {
      gradient: "linear-gradient(180deg, #121a35 0%, #0b1020 50%, #080d1c 100%)",
      accent: "#8ec5e8",
      cloudColor: "#3a4870",
      cloudOpacity: 0.5,
      particleColor: "rgba(200, 210, 240, 0.3)",
    },
    haze: {
      gradient: "linear-gradient(180deg, #121a35 0%, #0b1020 50%, #080d1c 100%)",
      accent: "#8ec5e8",
      cloudColor: "#3a4870",
      cloudOpacity: 0.45,
      particleColor: "rgba(200, 210, 240, 0.3)",
    },
    fog: {
      gradient: "linear-gradient(180deg, #121a35 0%, #0b1020 50%, #080d1c 100%)",
      accent: "#8ec5e8",
      cloudColor: "#3a4870",
      cloudOpacity: 0.55,
      particleColor: "rgba(200, 210, 240, 0.35)",
    },
    dust: {
      gradient: "linear-gradient(180deg, #1a1810 0%, #0b1020 50%, #080c18 100%)",
      accent: "#e8b860",
      cloudColor: "#5a4a30",
      cloudOpacity: 0.5,
      particleColor: "rgba(220, 190, 120, 0.4)",
    },
    smoke: {
      gradient: "linear-gradient(180deg, #141410 0%, #0b1020 50%, #080c18 100%)",
      accent: "#c8a060",
      cloudColor: "#3a3428",
      cloudOpacity: 0.6,
      particleColor: "rgba(200, 180, 140, 0.4)",
    },
    tornado: {
      gradient: "linear-gradient(180deg, #0a0a18 0%, #0b1020 50%, #05060e 100%)",
      accent: "#ff5d73",
      cloudColor: "#2a2840",
      cloudOpacity: 0.75,
      particleColor: "rgba(180, 160, 200, 0.5)",
    },
    unknown: {
      gradient: "linear-gradient(180deg, #0d1530 0%, #0b1020 50%, #080d1c 100%)",
      accent: "#4cc9f0",
      cloudColor: "#3a4880",
      cloudOpacity: 0.5,
      particleColor: "rgba(160, 180, 230, 0.4)",
    },
  };

  return themes[condition] || themes.unknown;
}

export function getWeatherIconEmoji(iconCode: string): string {
  const map: Record<string, string> = {
    "01d": "☀️", "01n": "🌙",
    "02d": "⛅", "02n": "☁️",
    "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧️", "09n": "🌧️",
    "10d": "🌦️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️",
    "13d": "❄️", "13n": "❄️",
    "50d": "🌫️", "50n": "🌫️",
  };
  return map[iconCode] || "🌤️";
}
