import type { HourlyForecast } from "./types";
import { getWeatherIconEmoji } from "./weatherUtils";

interface Props {
  hourly: HourlyForecast[];
  isDemo: boolean;
}

export function HourlyForecastSection({ hourly, isDemo }: Props) {
  if (hourly.length === 0) return null;

  return (
    <section className="glass-card hourly-section fade-in fade-in-delayed-1">
      <span className="hourly-title">Next 8 Hours</span>
      <div className="hourly-row">
        {hourly.map((h, i) => (
          <div key={i} className={`hourly-card ${i === 0 ? "now" : ""}`}>
            <span className="hourly-time">{h.time}</span>
            {isDemo ? (
              <span className="hourly-icon-emoji">{getWeatherIconEmoji(h.icon)}</span>
            ) : (
              <img
                className="hourly-icon"
                src={h.iconUrl}
                alt={h.condition}
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  target.parentElement!.textContent = getWeatherIconEmoji(h.icon);
                }}
              />
            )}
            <span className="hourly-temp">{Math.round(h.temperature)}°</span>
          </div>
        ))}
      </div>
    </section>
  );
}
