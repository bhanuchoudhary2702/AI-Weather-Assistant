import type { WeatherData, HourlyForecast } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface WeatherResponse {
  weather: WeatherData;
  hourly: HourlyForecast[];
}

interface ErrorResponse {
  error: string;
}

export class WeatherApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherApiError";
  }
}

export async function fetchWeather(city: string): Promise<WeatherResponse> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new WeatherApiError("Server is not configured. Check your environment settings.");
  }

  const url = `${SUPABASE_URL}/functions/v1/weather`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ city }),
    });
  } catch {
    throw new WeatherApiError("Could not reach the weather service. Check your connection and try again.");
  }

  if (!response.ok) {
    let message = `Weather service error (HTTP ${response.status}).`;
    try {
      const body = (await response.json()) as ErrorResponse;
      if (body && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // response body wasn't JSON — use the default message
    }
    throw new WeatherApiError(message);
  }

  let body: WeatherResponse;
  try {
    body = (await response.json()) as WeatherResponse;
  } catch {
    throw new WeatherApiError("Received an unreadable response from the weather service.");
  }

  if (!body || !body.weather || typeof body.weather.temperature !== "number") {
    throw new WeatherApiError("The weather service returned incomplete data. Try again.");
  }

  return body;
}
