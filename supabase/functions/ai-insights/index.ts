/*
 * AI Insights Edge Function
 * --------------------------
 * Securely calls Google Gemini to generate practical weather advice.
 *
 * The GEMINI_API_KEY is read from server-side secrets (Deno.env.get)
 * and is NEVER sent to the browser. The frontend sends the current
 * weather data as context; this function builds a strict JSON-only
 * prompt, calls Gemini, parses the six insight sections, and returns
 * them. If Gemini is unavailable (no key, quota, network) it falls
 * back to a deterministic rule-based briefing — same logic as the
 * Python ai.py _fallback() method.
 *
 * Endpoint: POST /functions/v1/ai-insights
 * Body:     { "weather": { ... WeatherData fields ... } }
 * Returns:  { "insights": { summary, clothing, travel, health, activity, alert, offline } }
 *           { "error": "..." } on bad request
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL_DEFAULT = "gemini-1.5-flash";
const REQUEST_TIMEOUT_MS = 15_000;

const INSIGHT_KEYS = ["summary", "clothing", "travel", "health", "activity", "alert"] as const;
type InsightKey = (typeof INSIGHT_KEYS)[number];

interface WeatherInput {
  location?: string;
  condition?: string;
  description?: string;
  temperature?: number;
  feelsLike?: number;
  tempMin?: number;
  tempMax?: number;
  humidity?: number;
  windSpeed?: number;
  pressure?: number;
  visibilityText?: string;
  clouds?: number;
  tempUnit?: string;
  speedUnit?: string;
  city?: string;
}

interface Insights {
  summary: string;
  clothing: string;
  travel: string;
  health: string;
  activity: string;
  alert: string;
  offline: boolean;
}

function buildPrompt(w: WeatherInput): string {
  const readings = [
    `- City: ${w.location ?? w.city ?? "Unknown"}`,
    `- Condition: ${w.condition ?? "Unknown"}${w.description ? ` (${w.description})` : ""}`,
    `- Temperature: ${Math.round(w.temperature ?? 0)}${w.tempUnit ?? "°C"}`,
    `- Feels Like: ${Math.round(w.feelsLike ?? 0)}${w.tempUnit ?? "°C"}`,
    `- Min/Max: ${Math.round(w.tempMin ?? 0)}/${Math.round(w.tempMax ?? 0)}${w.tempUnit ?? "°C"}`,
    `- Humidity: ${w.humidity ?? 0}%`,
    `- Wind: ${w.windSpeed ?? 0} ${w.speedUnit ?? "m/s"}`,
    `- Pressure: ${w.pressure ?? 0} hPa`,
    `- Visibility: ${w.visibilityText ?? "N/A"}`,
    `- Cloudiness: ${w.clouds ?? 0}%`,
  ].join("\n");

  return (
    "You are a friendly weather assistant for everyday users.\n" +
    "Analyse the current weather readings below and reply with JSON ONLY " +
    "(no markdown fences, no extra text) using exactly these keys:\n" +
    '{"summary","clothing","travel","health","activity","alert"}\n' +
    "Each value must be one or two short, practical sentences in simple English.\n" +
    'If there is no rain or heat risk, set "alert" to a calm reassurance.\n\n' +
    `Current readings:\n${readings}\n`
  );
}

function parseGeminiResponse(text: string): Partial<Insights> | null {
  if (!text) return null;

  // Strip markdown code fences
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();

  // Extract the JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(match[0]);
  } catch {
    return null;
  }

  if (typeof data !== "object" || data === null) return null;

  const result: Partial<Insights> = {};
  for (const key of INSIGHT_KEYS) {
    const val = data[key];
    if (typeof val === "string" && val.trim()) {
      result[key] = val.trim();
    }
  }

  // Must have at least the summary to be considered valid
  if (!result.summary) return null;
  return result;
}

function fallbackInsights(w: WeatherInput): Insights {
  const temp = w.temperature ?? 0;
  const condition = (w.condition ?? "").toLowerCase();
  const humid = w.humidity ?? 0;
  const wind = w.windSpeed ?? 0;
  const tempUnit = w.tempUnit ?? "°C";
  const location = w.location ?? w.city ?? "Unknown";
  const description = (w.description ?? "").toLowerCase() || condition;

  let clothing: string;
  let health: string;

  if (temp >= 35) {
    clothing = "Wear light cotton clothes, a cap and sunglasses. Avoid dark colours.";
    health = "Drink water every hour and avoid direct sun between 12pm and 4pm.";
  } else if (temp >= 25) {
    clothing = "Light, breathable clothing is comfortable today.";
    health = "Stay hydrated and use sunscreen if you'll be outdoors.";
  } else if (temp >= 15) {
    clothing = "A light jacket or full sleeves will keep you comfortable.";
    health = "Pleasant conditions — a good day for a walk.";
  } else {
    clothing = "Dress in warm layers; add a jacket, and cover your head if it's windy.";
    health = "Keep warm and take care if you have asthma or joint pain.";
  }

  const rainy = ["rain", "drizzle", "thunder"].some((word) => condition.includes(word));

  const travel = rainy
    ? "Roads may be slippery — start early and drive slowly."
    : "Travel conditions look normal. Plan your trip as usual.";

  const activity =
    rainy || temp >= 38
      ? "Prefer indoor activities, or carry an umbrella if you must step out."
      : "A good time for a walk, cycling or outdoor sports.";

  let alert: string;
  if (rainy) {
    alert = "Rain alert: carry an umbrella or raincoat today.";
  } else if (temp >= 38) {
    alert = "Heat alert: high temperature — limit outdoor exposure.";
  } else {
    alert = "No rain or heat warnings right now.";
  }

  const summary = `${location} is currently ${description} at ${Math.round(temp)}${tempUnit}, feeling like ${Math.round(w.feelsLike ?? temp)}${tempUnit}. Humidity is ${humid}% with ${wind} wind speed.`;

  return { summary, clothing, travel, health, activity, alert, offline: true };
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
    if (!body || typeof body.weather !== "object" || body.weather === null) {
      return errorResponse(400, "Please provide weather data for analysis.");
    }

    const w = body.weather as WeatherInput;
    if (typeof w.temperature !== "number") {
      return errorResponse(400, "Weather data is missing the temperature field.");
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      // Graceful fallback — same as the Python app
      const insights = fallbackInsights(w);
      return new Response(
        JSON.stringify({ insights }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const modelName = (Deno.env.get("GEMINI_MODEL") ?? GEMINI_MODEL_DEFAULT).trim() || GEMINI_MODEL_DEFAULT;
    const prompt = buildPrompt(w);

    // Call Gemini REST API directly (no SDK needed in Deno)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let geminiRes: Response;
    try {
      geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeoutId);
      // Network failure or timeout — use fallback
      const insights = fallbackInsights(w);
      return new Response(
        JSON.stringify({ insights }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    clearTimeout(timeoutId);

    if (geminiRes.status === 429) {
      // Rate limited — use fallback
      const insights = fallbackInsights(w);
      return new Response(
        JSON.stringify({ insights }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!geminiRes.ok) {
      // Other API errors — use fallback
      const insights = fallbackInsights(w);
      return new Response(
        JSON.stringify({ insights }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json().catch(() => null);
    if (!geminiData) {
      const insights = fallbackInsights(w);
      return new Response(
        JSON.stringify({ insights }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text from the Gemini response
    const candidates = geminiData.candidates ?? [];
    const parts = candidates[0]?.content?.parts ?? [];
    const text = parts.map((p: { text?: string }) => p.text ?? "").join("").trim();

    const parsed = parseGeminiResponse(text);
    if (!parsed) {
      const insights = fallbackInsights(w);
      return new Response(
        JSON.stringify({ insights }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fill any missing keys with fallback values
    const fb = fallbackInsights(w);
    const insights: Insights = {
      summary: parsed.summary ?? fb.summary,
      clothing: parsed.clothing ?? fb.clothing,
      travel: parsed.travel ?? fb.travel,
      health: parsed.health ?? fb.health,
      activity: parsed.activity ?? fb.activity,
      alert: parsed.alert ?? fb.alert,
      offline: false,
    };

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return errorResponse(500, message);
  }
});
