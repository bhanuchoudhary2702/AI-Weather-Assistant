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
import type { WeatherData, HourlyForecast, AIInsights, StatusType, WeatherCondition, TimeOfDay } from "./types";
import { DEMO_LABEL, getConditionFromCode, getTimeOfDay } from "./mockData";

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

      try {
        const data = await fetchWeather(city);

        setWeather(data.weather);
        setHourly(data.hourly);
        setCurrentCity(data.weather.city);
        addToHistory(data.weather.city);
        setStatus("success");
        setStatusMessage("Weather loaded. AI insights available in Phase 3.");
        setIsLoadingInsights(false);
        setIsDemo(false);
      } catch (err) {
        if (err instanceof WeatherApiError) {
          setStatus("error");
          setStatusMessage(err.message);
        } else {
          setStatus("error");
          setStatusMessage("An unexpected error occurred. Please try again.");
        }
        setIsLoadingInsights(false);
      } finally {
        setIsLoading(false);
      }
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
              <Icon name="refresh" size={15} />
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
            AI Weather Assistant · Live Weather + AI Insights (Phase 3 pending)
          </span>
        </footer>
      </div>
    </div>
  );
}
