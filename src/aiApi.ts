import type { WeatherData, AIInsights } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface InsightsResponse {
  insights: AIInsights;
}

export class AiApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiApiError";
  }
}

export async function fetchInsights(weather: WeatherData): Promise<AIInsights> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new AiApiError("Server is not configured. Check your environment settings.");
  }

  const url = `${SUPABASE_URL}/functions/v1/ai-insights`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ weather }),
    });
  } catch {
    throw new AiApiError("Could not reach the AI service. Check your connection and try again.");
  }

  if (!response.ok) {
    let message = `AI service error (HTTP ${response.status}).`;
    try {
      const body = await response.json();
      if (body && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // response body wasn't JSON
    }
    throw new AiApiError(message);
  }

  let body: InsightsResponse;
  try {
    body = await response.json() as InsightsResponse;
  } catch {
    throw new AiApiError("Received an unreadable response from the AI service.");
  }

  if (!body || !body.insights || typeof body.insights.summary !== "string") {
    throw new AiApiError("The AI service returned incomplete data. Try again.");
  }

  return body.insights;
}
