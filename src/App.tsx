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
import { Icon as RefreshIcon } from "./Icon";
import type { WeatherData, HourlyForecast, AIInsights, StatusType, WeatherCondition, TimeOfDay } from "./types";
import {
  MOCK_WEATHER,
  MOCK_HOURLY,
  MOCK_INSIGHTS,
  DEMO_LABEL,
  getConditionFromCode,
  getTimeOfDay,
} from "./mockData";

const HISTORY_KEY = "ai-weather-history";
const MAX_HISTORY = 8;

export function App() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [status, setStatus] = useState<StatusType>("idle");
  const [statusMessage, setStatusMessage] = useState("Enter a city to get started.");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, MAX_HISTORY));
        }
      }
    } catch {
      // localStorage might be unavailable
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((cities: string[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(cities));
    } catch {
      // ignore
    }
  }, []);

  const addToHistory = useCallback(
    (city: string) => {
      const formatted = city.trim().replace(/\b\w/g, (c) => c.toUpperCase());
      if (!formatted) return;
      setHistory((prev) => {
        const filtered = prev.filter((c) => c.toLowerCase() !== formatted.toLowerCase());
        const updated = [formatted, ...filtered].slice(0, MAX_HISTORY);
        saveHistory(updated);
        return updated;
      });
    },
    [saveHistory]
  );

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, [saveHistory]);

  const handleSearch = useCallback(
    async (city: string) => {
      if (isLoading) return;

      setIsDemo(false);
      setIsLoading(true);
      setIsLoadingInsights(true);
      setStatus("loading");
      setStatusMessage(`Fetching weather for ${city}…`);
      setInsights(null);

      // Phase 1: Use mock data with a simulated network delay
      // Phase 2 will replace this with a real Edge Function call
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setWeather(MOCK_WEATHER);
      setHourly(MOCK_HOURLY);
      setCurrentCity(MOCK_WEATHER.city);
      addToHistory(MOCK_WEATHER.city);
      setStatus("loading");
      setStatusMessage("Weather loaded. Asking Gemini for insights…");

      // Simulate AI loading delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      setInsights(MOCK_INSIGHTS);
      setIsLoadingInsights(false);
      setIsDemo(true);
      setStatus("warning");
      setStatusMessage("Demo data shown — backend integration pending.");
      setIsLoading(false);
    },
    [isLoading, addToHistory]
  );

  const handleRefresh = useCallback(() => {
    if (currentCity) {
      handleSearch(currentCity);
    }
  }, [currentCity, handleSearch]);

  const handleSampleSearch = useCallback(() => {
    handleSearch("San Francisco");
  }, [handleSearch]);

  // Compute atmosphere props
  const condition: WeatherCondition = weather
    ? getConditionFromCode(weather.condition)
    : "clouds";
  const timeOfDay: TimeOfDay = weather ? getTimeOfDay(weather.icon) : "day";

  return (
    <div className="app">
      <AtmosphereBackground condition={condition} timeOfDay={timeOfDay} />

      <div className="app-content">
        <header className="app-header">
          <div className="header-left">
            <h1 className="app-title">AI Weather Assistant</h1>
            <p className="app-subtitle">Live conditions, explained by Gemini AI</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isDemo && <DemoBadge text={DEMO_LABEL} />}
            <button
              className="btn btn-ghost"
              onClick={handleRefresh}
              disabled={!currentCity || isLoading}
            >
              <RefreshIcon name="refresh" size={15} />
              Refresh
            </button>
          </div>
        </header>

        <CitySearch
          onSearch={handleSearch}
          history={history}
          onClearHistory={handleClearHistory}
          disabled={isLoading}
        />

        <StatusMessage
          status={status}
          message={statusMessage}
          showLoadingBar={isLoading}
        />

        {!weather && !isLoading && (
          <EmptyState onSearch={handleSampleSearch} />
        )}

        {isLoading && !weather && (
          <div className="content-grid">
            <WeatherSkeleton />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <HourlySkeleton />
              <AISkeleton />
            </div>
          </div>
        )}

        {weather && (
          <div className="content-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <WeatherPanel weather={weather} isDemo={isDemo} />
              <HourlyForecastSection hourly={hourly} isDemo={isDemo} />
            </div>
            <AIInsightsPanel insights={insights} isLoading={isLoadingInsights} />
          </div>
        )}

        <footer style={{ textAlign: "center", padding: "24px 0", color: "var(--text-dim)", fontSize: "0.75rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="cloud" size={14} />
            AI Weather Assistant · Phase 1 — Cinematic UI Preview
          </span>
        </footer>
      </div>
    </div>
  );
}
