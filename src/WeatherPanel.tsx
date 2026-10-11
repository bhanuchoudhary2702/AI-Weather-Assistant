import type { WeatherData } from "./types";
import { MetricTile } from "./MetricTile";
import { TiltCard } from "./TiltCard";
import { getWeatherIconEmoji } from "./weatherUtils";

interface Props {
  weather: WeatherData;
  isDemo: boolean;
}

function TempRangeBar({ min, max, current, unit }: { min: number; max: number; current: number; unit: string }) {
  const range = max - min || 1;
  const pct = Math.min(100, Math.max(0, ((current - min) / range) * 100));
  return (
    <div className="weather-range">
      <span>{Math.round(min)}{unit}</span>
      <div className="range-bar-wrap" role="img" aria-label={`Temperature range ${Math.round(min)} to ${Math.round(max)} ${unit}`}>
        <div className="range-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span>{Math.round(max)}{unit}</span>
    </div>
  );
}

export function WeatherPanel({ weather, isDemo }: Props) {
  const metricConfigs = [
    { key: "feelsLike" as const, icon: "thermometer", label: "Feels Like", value: `${Math.round(weather.feelsLike)}${weather.tempUnit}` },
    { key: "humidity" as const, icon: "humidity",    label: "Humidity",    value: `${weather.humidity}%` },
    { key: "wind"     as const, icon: "wind",        label: "Wind Speed",  value: `${weather.windSpeed} ${weather.speedUnit}${weather.windDirection ? ` ${weather.windDirection}` : ""}` },
    { key: "pressure" as const, icon: "gauge",       label: "Pressure",    value: `${weather.pressure} hPa` },
    { key: "visibility" as const, icon: "eye",       label: "Visibility",  value: weather.visibilityText },
    { key: "sun"      as const, icon: "sunrise",     label: "Sunrise / Sunset", value: `${weather.sunrise} / ${weather.sunset}` },
  ];

  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <TiltCard className="glass-card weather-panel fade-in" maxTilt={3}>
      <div className="weather-top">
        <div className="weather-info">
          <span className="weather-location">{weather.location}</span>
          <span className="weather-datetime">{dateStr} · {timeStr}</span>
          <div className="weather-temp">
            {Math.round(weather.temperature)}
            <span className="temp-unit">{weather.tempUnit}</span>
          </div>
          <span className="weather-condition">{weather.description || weather.condition}</span>
          <TempRangeBar
            min={weather.tempMin}
            max={weather.tempMax}
            current={weather.temperature}
            unit={weather.tempUnit}
          />
        </div>

        <div className="weather-icon-wrap">
          {isDemo ? (
            <span className="weather-icon-emoji" role="img" aria-label={weather.condition}>
              {getWeatherIconEmoji(weather.icon)}
            </span>
          ) : (
            <img
              className="weather-icon"
              src={weather.iconUrl}
              alt={`${weather.description || weather.condition} icon`}
              loading="eager"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = "none";
                const wrap = img.parentElement;
                if (wrap) {
                  wrap.classList.add("weather-icon-emoji");
                  wrap.setAttribute("role", "img");
                  wrap.setAttribute("aria-label", weather.condition);
                  wrap.textContent = getWeatherIconEmoji(weather.icon);
                }
              }}
            />
          )}
        </div>
      </div>

      <div className="metrics-grid">
        {metricConfigs.map((m) => (
          <MetricTile key={m.key} icon={m.icon} label={m.label} value={m.value} />
        ))}
      </div>
    </TiltCard>
  );
}
