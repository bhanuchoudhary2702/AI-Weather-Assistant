import type { WeatherData, HourlyForecast, AIInsights, WeatherCondition, TimeOfDay } from "./types";

export const MOCK_WEATHER: WeatherData = {
  city: "San Francisco",
  country: "US",
  location: "San Francisco, US",
  temperature: 18,
  feelsLike: 16,
  tempMin: 15,
  tempMax: 21,
  humidity: 72,
  pressure: 1015,
  windSpeed: 4.2,
  windDeg: 270,
  windDirection: "W",
  visibility: 10000,
  visibilityText: "10.0 km",
  condition: "Clouds",
  description: "Scattered Clouds",
  icon: "03d",
  iconUrl: "https://openweathermap.org/img/wn/03d@4x.png",
  clouds: 40,
  sunrise: "06:42",
  sunset: "19:15",
  tempUnit: "°C",
  speedUnit: "m/s",
};

export const MOCK_HOURLY: HourlyForecast[] = [
  { time: "Now", temperature: 18, icon: "03d", iconUrl: "https://openweathermap.org/img/wn/03d@2x.png", condition: "Clouds" },
  { time: "14:00", temperature: 19, icon: "02d", iconUrl: "https://openweathermap.org/img/wn/02d@2x.png", condition: "Clouds" },
  { time: "15:00", temperature: 20, icon: "01d", iconUrl: "https://openweathermap.org/img/wn/01d@2x.png", condition: "Clear" },
  { time: "16:00", temperature: 21, icon: "01d", iconUrl: "https://openweathermap.org/img/wn/01d@2x.png", condition: "Clear" },
  { time: "17:00", temperature: 20, icon: "02d", iconUrl: "https://openweathermap.org/img/wn/02d@2x.png", condition: "Clouds" },
  { time: "18:00", temperature: 19, icon: "03d", iconUrl: "https://openweathermap.org/img/wn/03d@2x.png", condition: "Clouds" },
  { time: "19:00", temperature: 17, icon: "04d", iconUrl: "https://openweathermap.org/img/wn/04d@2x.png", condition: "Clouds" },
  { time: "20:00", temperature: 16, icon: "04n", iconUrl: "https://openweathermap.org/img/wn/04n@2x.png", condition: "Clouds" },
];

export const MOCK_INSIGHTS: AIInsights = {
  summary:
    "San Francisco is currently scattered clouds at 18°C, feeling like 16°C. Humidity is 72% with light westerly winds.",
  clothing: "A light jacket or full sleeves will keep you comfortable in this cool coastal weather.",
  travel: "Travel conditions look normal. Visibility is excellent, so plan your trip as usual.",
  health: "Pleasant conditions — a good day for a walk. Stay hydrated if you'll be outdoors for extended periods.",
  activity: "A good time for a walk, cycling or outdoor sports. The mild temperature and partial cloud cover make for comfortable conditions.",
  alert: "No rain or heat warnings right now. Enjoy the pleasant weather!",
  offline: false,
};

export const DEMO_LABEL = "Demo data — Phase 1 design preview. Real weather will appear after backend setup.";

export function getConditionFromCode(conditionText: string): WeatherCondition {
  const lower = conditionText.toLowerCase();
  if (lower.includes("thunder")) return "thunderstorm";
  if (lower.includes("drizzle")) return "drizzle";
  if (lower.includes("rain")) return "rain";
  if (lower.includes("snow")) return "snow";
  if (lower.includes("mist")) return "mist";
  if (lower.includes("haze")) return "haze";
  if (lower.includes("fog")) return "fog";
  if (lower.includes("dust") || lower.includes("sand")) return "dust";
  if (lower.includes("smoke") || lower.includes("ash")) return "smoke";
  if (lower.includes("tornado")) return "tornado";
  if (lower.includes("clear")) return "clear";
  if (lower.includes("cloud")) return "clouds";
  return "unknown";
}

export function getTimeOfDay(iconCode: string): TimeOfDay {
  return iconCode.endsWith("n") ? "night" : "day";
}
