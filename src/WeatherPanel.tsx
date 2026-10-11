import type { WeatherData } from "./types";
import type { WeatherMetrics } from "./types";
import { MetricTile } from "./MetricTile";
import { TiltCard } from "./TiltCard";
import { getWeatherIconEmoji } from "./weatherUtils";

interface Props {
  weather: WeatherData;
  isDemo: boolean;
}

export function WeatherPanel({ weather, isDemo }: Props) {
  const metrics: WeatherMetrics = {
    feels: `${Math.round(weather.feelsLike)}${weather.tempUnit}`,
    humidity: `${weather.humidity}%`,
    wind: `${weather.windSpeed} ${weather.speedUnit} ${weather.windDirection}`.trim(),
    pressure: `${weather.pressure} hPa`,
    visibility: weather.visibilityText,
    sun: `${weather.sunrise} / ${weather.sunset}`,
  };

  const metricConfigs = [
    { key: "feels" as const, icon: "thermometer", label: "Feels Like" },
    { key: "humidity" as const, icon: "humidity", label: "Humidity" },
    { key: "wind" as const, icon: "wind", label: "Wind Speed" },
    { key: "pressure" as const, icon: "gauge", label: "Pressure" },
    { key: "visibility" as const, icon: "eye", label: "Visibility" },
    { key: "sun" as const, icon: "sunrise", label: "Sunrise / Sunset" },
  ];

  return (
    <TiltCard className="glass-card weather-panel fade-in" maxTilt={3}>
      <div className="weather-top">
        <div className="weather-info">
          <span className="weather-location">{weather.location}</span>
          <div className="weather-temp">
            {Math.round(weather.temperature)}
            <span className="temp-unit">{weather.tempUnit}</span>
          </div>
          <span className="weather-condition">
            {weather.condition} · {weather.description}
          </span>
        </div>
        {isDemo ? (
          <div className="weather-icon-emoji">{getWeatherIconEmoji(weather.icon)}</div>
        ) : (
          <img
            className="weather-icon"
            src={weather.iconUrl}
            alt={`${weather.condition} weather icon`}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.classList.add("weather-icon-emoji");
                parent.textContent = getWeatherIconEmoji(weather.icon);
              }
            }}
          />
        )}
      </div>

      <div className="metrics-grid">
        {metricConfigs.map((m) => (
          <MetricTile key={m.key} icon={m.icon} label={m.label} value={metrics[m.key]} />
        ))}
      </div>
    </TiltCard>
  );
}
