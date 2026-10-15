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
const REQUEST_TIMEOUT_MS = 20_000;

const INSIGHT_KEYS = ["summary", "clothing", "travel", "health", "activity", "alert"] as const;

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

  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();

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

function insightsResponse(insights: Insights, _debugStatus: string): Response {
  return new Response(
    JSON.stringify({ insights }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Try calling Gemini with a given model name.
 * Returns { text, status } on success, or { text: null, status } on failure.
 */
async function callGemini(
  apiKey: string,
  modelName: string,
  prompt: string,
): Promise<{ text: string | null; status: string }> {
  // Use ?key= query parameter — this is the documented auth method
  // and is more reliable in Deno/Edge runtimes than the header approach.
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 429) {
      return { text: null, status: `rate_limited(model=${modelName})` };
    }
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const snippet = errBody.slice(0, 200).replace(/\n/g, " ");
      return { text: null, status: `api_error_${res.status}(model=${modelName} ${snippet})` };
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      return { text: null, status: `bad_json(model=${modelName})` };
    }

    const candidates = data.candidates ?? [];
    if (candidates.length === 0) {
      const blocked = data.promptFeedback?.blockReason ?? "no_candidates";
      return { text: null, status: `no_candidates(model=${modelName} reason=${blocked})` };
    }

    const parts = candidates[0]?.content?.parts ?? [];
    const text = parts.map((p: { text?: string }) => p.text ?? "").join("").trim();

    if (!text) {
      return { text: null, status: `empty_text(model=${modelName})` };
    }

    return { text, status: `ok(model=${modelName})` };
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : "unknown";
    return { text: null, status: `fetch_error(model=${modelName} ${msg})` };
  }
}

// Model fallback chain — try configured model first, then known-good alternatives
const MODEL_FALLBACKS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

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
      const insights = fallbackInsights(w);
      return insightsResponse(insights, "no_key");
    }

    const configuredModel = (Deno.env.get("GEMINI_MODEL") ?? "").trim();
    const prompt = buildPrompt(w);

    // Build model try-list: configured model first (if set), then fallbacks
    const modelsToTry = [
      ...(configuredModel && !MODEL_FALLBACKS.includes(configuredModel) ? [configuredModel] : []),
      ...MODEL_FALLBACKS,
    ];

    let lastStatus = "no_attempt";
    for (const modelName of modelsToTry) {
      const result = await callGemini(apiKey, modelName, prompt);
      lastStatus = result.status;

      if (result.text) {
        const parsed = parseGeminiResponse(result.text);
        if (parsed) {
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
          return insightsResponse(insights, lastStatus);
        }
        // Parsed failed — try next model
        lastStatus = `parse_failed(model=${modelName})`;
      }

      // If rate-limited, don't bother trying other models
      if (result.status.startsWith("rate_limited")) break;
    }

    // All models failed — use fallback
    const insights = fallbackInsights(w);
    return insightsResponse(insights, `all_models_failed(${lastStatus})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return errorResponse(500, message);
  }
});
