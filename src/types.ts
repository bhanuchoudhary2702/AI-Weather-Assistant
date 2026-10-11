export interface WeatherData {
  city: string;
  country: string;
  location: string;
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number | null;
  windDirection: string;
  visibility: number | null;
  visibilityText: string;
  condition: string;
  description: string;
  icon: string;
  iconUrl: string;
  clouds: number;
  sunrise: string;
  sunset: string;
  tempUnit: string;
  speedUnit: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  icon: string;
  iconUrl: string;
  condition: string;
}

export type InsightKey = "summary" | "clothing" | "travel" | "health" | "activity" | "alert";

export interface AIInsights {
  summary: string;
  clothing: string;
  travel: string;
  health: string;
  activity: string;
  alert: string;
  offline: boolean;
}

export interface AIInsightSection {
  key: InsightKey;
  title: string;
  icon: string;
}

export const INSIGHT_SECTIONS: AIInsightSection[] = [
  { key: "summary", title: "Weather Summary", icon: "clipboard" },
  { key: "clothing", title: "What To Wear", icon: "shirt" },
  { key: "travel", title: "Travel Advice", icon: "compass" },
  { key: "health", title: "Health Tips", icon: "droplet" },
  { key: "activity", title: "Outdoor Activity", icon: "running" },
  { key: "alert", title: "Rain / Heat Alert", icon: "alert" },
];

export interface WeatherMetrics {
  feels: string;
  humidity: string;
  wind: string;
  pressure: string;
  visibility: string;
  sun: string;
}

export type StatusType = "idle" | "loading" | "success" | "warning" | "error";

export type WeatherCondition =
  | "clear"
  | "clouds"
  | "rain"
  | "drizzle"
  | "thunderstorm"
  | "snow"
  | "mist"
  | "haze"
  | "fog"
  | "dust"
  | "smoke"
  | "tornado"
  | "unknown";

export type TimeOfDay = "day" | "night";
