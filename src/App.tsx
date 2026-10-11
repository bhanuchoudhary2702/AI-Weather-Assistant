import { useState, useEffect, useCallback } from "react";
import { AtmosphereBackground } from "./AtmosphereBackground";
import { CitySearch } from "./CitySearch";
import { StatusMessage } from "./StatusMessage";
import { WeatherPanel } from "./WeatherPanel";
import { HourlyForecastSection } from "./HourlyForecastSection";
import { AIInsightsPanel } from "./AIInsightsPanel";
import { EmptyState } from "./EmptyState";
import { WeatherSkeleton, HourlySkeleton, AISkeleton } from "./Skeletons";
import { DemoBadge } from "./DemoBadge";
import { Icon } from "./Icon";
import { fetchWeather, WeatherApiError } from "./weatherApi";
import { fetchInsights, AiApiError } from "./aiApi";
import type {
  WeatherData, HourlyForecast, AIInsights,
  StatusType, WeatherCondition, TimeOfDay,
} from "./types";
import { DEMO_LABEL, getConditionFromCode, getTimeOfDay } from "./mockData";

const HISTORY_KEY = "ai-weather-history";
const MAX_HISTORY = 8;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveHistory(cities: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(cities));
  } catch {
    // ignore — localStorage may be unavailable in private mode
  }
}

export function App() {
  const [weather, setWeather]                   = useState<WeatherData | null>(null);
  const [hourly, setHourly]                     = useState<HourlyForecast[]>([]);
  const [insights, setInsights]                 = useState<AIInsights | null>(null);
  const [insightsError, setInsightsError]       = useState(false);
  const [status, setStatus]                     = useState<StatusType>("idle");
  const [statusMessage, setStatusMessage]       = useState("Enter a city to get started.");
  const [isLoading, setIsLoading]               = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [history, setHistory]                   = useState<string[]>(loadHistory);
  const [isDemo, setIsDemo]                     = useState(false);
  const [currentCity, setCurrentCity]           = useState<string | null>(null);

  // Sync history to localStorage whenever it changes
  useEffect(() => { saveHistory(history); }, [history]);

  const addToHistory = useCallback((city: string) => {
    const formatted = city.trim().replace(/\b\w/g, (c) => c.toUpperCase());
    if (!formatted) return;
    setHistory((prev) => {
      const deduped = prev.filter((c) => c.toLowerCase() !== formatted.toLowerCase());
      return [formatted, ...deduped].slice(0, MAX_HISTORY);
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const handleSearch = useCallback(async (city: string) => {
    if (isLoading) return;

    const trimmed = city.trim();
    if (!trimmed) return;

    setIsDemo(false);
    setIsLoading(true);
    setIsLoadingInsights(true);
    setInsightsError(false);
    setStatus("loading");
    setStatusMessage(`Fetching weather for ${trimmed}…`);
    setInsights(null);

    // ── Step 1: Weather ───────────────────────────────
    let weatherData: WeatherData;
    let hourlyData: HourlyForecast[];
    try {
      const result = await fetchWeather(trimmed);
      weatherData = result.weather;
      hourlyData  = result.hourly;
    } catch (err) {
      const msg = err instanceof WeatherApiError
        ? err.message
        : "An unexpected error occurred. Please try again.";
      setStatus("error");
      setStatusMessage(msg);
      setIsLoading(false);
      setIsLoadingInsights(false);
      return;
    }

    setWeather(weatherData);
    setHourly(hourlyData);
    setCurrentCity(weatherData.city);
    addToHistory(weatherData.city);
    setIsLoading(false);
    setStatus("loading");
    setStatusMessage("Weather loaded. Asking Gemini for insights…");

    // ── Step 2: AI Insights ───────────────────────────
    try {
      const aiInsights = await fetchInsights(weatherData);
      setInsights(aiInsights);
      setInsightsError(false);
      if (aiInsights.offline) {
        setStatus("warning");
        setStatusMessage(`${weatherData.city} — Gemini unavailable, showing built-in advice.`);
      } else {
        setStatus("success");
        setStatusMessage(`${weatherData.city} — live weather and Gemini insights ready.`);
      }
    } catch (err) {
      setInsightsError(true);
      const aiMsg = err instanceof AiApiError ? err.message : "AI insights unavailable.";
      setStatus("warning");
      setStatusMessage(`${weatherData.city} — weather loaded. ${aiMsg}`);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [isLoading, addToHistory]);

  const handleRefresh = useCallback(() => {
    if (currentCity && !isLoading) handleSearch(currentCity);
  }, [currentCity, isLoading, handleSearch]);

  const handleSampleSearch = useCallback(() => handleSearch("San Francisco"), [handleSearch]);

  const condition: WeatherCondition = weather ? getConditionFromCode(weather.condition) : "clouds";
  const timeOfDay: TimeOfDay        = weather ? getTimeOfDay(weather.icon) : "day";

  return (
    <div className="app">
      <AtmosphereBackground condition={condition} timeOfDay={timeOfDay} />

      <div className="app-content">
        {/* ── Header ─────────────────────────────────── */}
        <header className="app-header">
          <div className="header-left">
            <h1 className="app-title">AI Weather Assistant</h1>
            <p className="app-subtitle">Live conditions, explained by Gemini AI</p>
          </div>
          <div className="header-actions">
            {isDemo && <DemoBadge text={DEMO_LABEL} />}
            <button
              className="btn btn-ghost"
              onClick={handleRefresh}
              disabled={!currentCity || isLoading}
              aria-label={`Refresh weather for ${currentCity ?? "current city"}`}
              title="Refresh"
            >
              <Icon name="refresh" size={15} />
              Refresh
            </button>
          </div>
        </header>

        {/* ── Search ─────────────────────────────────── */}
        <CitySearch
          onSearch={handleSearch}
          history={history}
          onClearHistory={handleClearHistory}
          disabled={isLoading}
        />

        {/* ── Status ─────────────────────────────────── */}
        <StatusMessage
          status={status}
          message={statusMessage}
          showLoadingBar={isLoading || isLoadingInsights}
        />

        {/* ── Empty state ─────────────────────────────── */}
        {!weather && !isLoading && (
          <div className="content-grid">
            <EmptyState onSearch={handleSampleSearch} />
          </div>
        )}

        {/* ── Skeleton loaders ────────────────────────── */}
        {isLoading && !weather && (
          <div className="content-grid">
            <div className="left-col">
              <WeatherSkeleton />
              <HourlySkeleton />
            </div>
            <AISkeleton />
          </div>
        )}

        {/* ── Live data ───────────────────────────────── */}
        {weather && (
          <div className="content-grid">
            <div className="left-col">
              <WeatherPanel weather={weather} isDemo={isDemo} />
              <HourlyForecastSection hourly={hourly} isDemo={isDemo} />
            </div>
            <AIInsightsPanel
              insights={insights}
              isLoading={isLoadingInsights}
              hasError={insightsError}
            />
          </div>
        )}

        {/* ── Footer ──────────────────────────────────── */}
        <footer
          style={{
            textAlign: "center",
            padding: "20px 0 28px",
            color: "var(--text-dim)",
            fontSize: ".75rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="cloud" size={13} />
            AI Weather Assistant · Powered by OpenWeatherMap + Gemini AI
          </span>
          <span style={{ fontSize: ".7rem", color: "var(--text-dim)", opacity: .6 }}>
            API keys are server-side only and never sent to your browser
          </span>
        </footer>
      </div>
    </div>
  );
}
