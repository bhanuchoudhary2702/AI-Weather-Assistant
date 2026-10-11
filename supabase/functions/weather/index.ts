/*
 * Weather Edge Function
 * ----------------------
 * Securely proxies OpenWeatherMap current-weather API.
 *
 * The OPENWEATHER_API_KEY is read from server-side secrets (Deno.env.get)
 * and is NEVER sent to the browser. The frontend calls this function,
 * which calls OpenWeatherMap and returns a normalised JSON response.
 *
 * Endpoint: POST /functions/v1/weather
 * Body:     { "city": "London" }
 * Returns:  { "weather": { ... } } on success
 *           { "error": "..." }        on failure
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_HOURLY = 8;

interface ParsedWeather {
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

interface HourlyItem {
  time: string;
  temperature: number;
  icon: string;
  iconUrl: string;
  condition: string;
}

function windDirection(deg: number | null): string {
  if (deg === null || deg === undefined) return "";
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.floor((deg + 22.5) / 45) % 8;
  return points[index];
}

function formatLocalTime(utcTimestamp: number, timezoneOffset: number): string {
  try {
    const date = new Date(utcTimestamp * 1000);
    const local = new Date(date.getTime() + timezoneOffset * 1000);
    const hours = local.getUTCHours().toString().padStart(2, "0");
    const mins = local.getUTCMinutes().toString().padStart(2, "0");
    return `${hours}:${mins}`;
  } catch {
    return "--:--";
  }
}

function visibilityKm(meters: number | null): string {
  if (meters === null || meters === undefined) return "N/A";
  return `${(meters / 1000).toFixed(1)} km`;
}

function parseCurrentWeather(payload: Record<string, unknown>, units: string): ParsedWeather {
  const main = (payload.main ?? {}) as Record<string, number>;
  const weatherArr = (payload.weather ?? []) as Array<Record<string, string>>;
  const weather = weatherArr[0] ?? {};
  const wind = (payload.wind ?? {}) as Record<string, number | null>;
  const sys = (payload.sys ?? {}) as Record<string, number | string>;
  const clouds = (payload.clouds ?? {}) as Record<string, number>;
  const offset = (payload.timezone as number) ?? 0;
  const tempUnit = units === "metric" ? "°C" : "°F";
  const speedUnit = units === "metric" ? "m/s" : "mph";

  const city = (payload.name as string) ?? "Unknown";
  const country = (sys.country as string) ?? "";
  const icon = (weather.icon as string) ?? "";

  return {
    city,
    country,
    location: country ? `${city}, ${country}` : city,
    temperature: main.temp ?? 0,
    feelsLike: main.feels_like ?? main.temp ?? 0,
    tempMin: main.temp_min ?? main.temp ?? 0,
    tempMax: main.temp_max ?? main.temp ?? 0,
    humidity: main.humidity ?? 0,
    pressure: main.pressure ?? 0,
    windSpeed: wind.speed ?? 0,
    windDeg: wind.deg ?? null,
    windDirection: windDirection(wind.deg ?? null),
    visibility: (payload.visibility as number) ?? null,
    visibilityText: visibilityKm((payload.visibility as number) ?? null),
    condition: (weather.main as string) ?? "Unknown",
    description: ((weather.description as string) ?? "").replace(/\b\w/g, (c) => c.toUpperCase()),
    icon,
    iconUrl: icon ? `https://openweathermap.org/img/wn/${icon}@4x.png` : "",
    clouds: clouds.all ?? 0,
    sunrise: formatLocalTime((sys.sunrise as number) ?? 0, offset),
    sunset: formatLocalTime((sys.sunset as number) ?? 0, offset),
    tempUnit,
    speedUnit,
  };
}

function parseHourlyForecast(payload: Record<string, unknown>, units: string): HourlyItem[] {
  const list = (payload.list ?? []) as Array<Record<string, unknown>>;
  const tempUnit = units === "metric" ? "°C" : "°F";
  void tempUnit;

  const items: HourlyItem[] = [];
  for (let i = 0; i < Math.min(list.length, MAX_HOURLY); i++) {
    const entry = list[i];
    const weatherArr = (entry.weather ?? []) as Array<Record<string, string>>;
    const w = weatherArr[0] ?? {};
    const dt = (entry.dt as number) ?? 0;
    const date = new Date(dt * 1000);
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    const icon = (w.icon as string) ?? "";

    items.push({
      time: i === 0 ? "Now" : `${hours}:${mins}`,
      temperature: ((entry.main as Record<string, number>) ?? {}).temp ?? 0,
      icon,
      iconUrl: icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : "",
      condition: (w.main as string) ?? "",
    });
  }
  return items;
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed. Use POST.");
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.city !== "string") {
      return errorResponse(400, "Please provide a city name.");
    }

    const city = body.city.trim();
    if (!city) {
      return errorResponse(400, "Please enter a city name.");
    }
    if (city.length > 100) {
      return errorResponse(400, "City name is too long.");
    }

    const apiKey = Deno.env.get("OPENWEATHER_API_KEY");
    if (!apiKey) {
      return errorResponse(500, "Weather service is not configured. The server is missing the API key.");
    }

    const units = (Deno.env.get("UNITS") ?? "metric").trim() || "metric";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // Fetch current weather
    const currentUrl = new URL(OPENWEATHER_BASE_URL);
    currentUrl.searchParams.set("q", city);
    currentUrl.searchParams.set("appid", apiKey);
    currentUrl.searchParams.set("units", units);

    const currentRes = await fetch(currentUrl, { signal: controller.signal }).catch(() => null);
    clearTimeout(timeoutId);

    if (!currentRes) {
      return errorResponse(504, "The weather service took too long to respond. Try again.");
    }

    if (currentRes.status === 401) {
      return errorResponse(502, "Invalid OpenWeatherMap API key. Contact the administrator.");
    }
    if (currentRes.status === 404) {
      return errorResponse(404, `City "${city}" was not found. Check the spelling and try again.`);
    }
    if (currentRes.status === 429) {
      return errorResponse(429, "API rate limit reached. Please wait a minute and retry.");
    }
    if (!currentRes.ok) {
      return errorResponse(502, `Weather service error (HTTP ${currentRes.status}).`);
    }

    const currentData = await currentRes.json().catch(() => null);
    if (!currentData) {
      return errorResponse(502, "Received an unreadable response from the weather service.");
    }

    const weather = parseCurrentWeather(currentData, units);

    // Fetch hourly forecast (3-hour intervals, up to 8 entries)
    const forecastUrl = new URL(OPENWEATHER_FORECAST_URL);
    forecastUrl.searchParams.set("q", city);
    forecastUrl.searchParams.set("appid", apiKey);
    forecastUrl.searchParams.set("units", units);
    forecastUrl.searchParams.set("cnt", "8");

    const forecastController = new AbortController();
    const forecastTimeoutId = setTimeout(() => forecastController.abort(), REQUEST_TIMEOUT_MS);

    const forecastRes = await fetch(forecastUrl, { signal: forecastController.signal }).catch(() => null);
    clearTimeout(forecastTimeoutId);

    let hourly: HourlyItem[] = [];
    if (forecastRes && forecastRes.ok) {
      const forecastData = await forecastRes.json().catch(() => null);
      if (forecastData) {
        hourly = parseHourlyForecast(forecastData, units);
      }
    }

    return new Response(
      JSON.stringify({ weather, hourly }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return errorResponse(500, message);
  }
});
