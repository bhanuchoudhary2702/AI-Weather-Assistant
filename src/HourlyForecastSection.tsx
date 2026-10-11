import type { HourlyForecast } from "./types";
import { getWeatherIconEmoji } from "./weatherUtils";

interface Props {
  hourly: HourlyForecast[];
  isDemo: boolean;
}

export function HourlyForecastSection({ hourly, isDemo }: Props) {
  if (hourly.length === 0) return null;

  return (
    <section className="glass-card hourly-section fade-in delay-1" aria-label="Hourly forecast">
      <span className="section-title">Next 8 Hours</span>
      <div className="hourly-row" role="list">
        {hourly.map((h, i) => (
          <div
            key={i}
            className={`hourly-card${i === 0 ? " now" : ""}`}
            role="listitem"
            aria-label={`${h.time}: ${Math.round(h.temperature)}° ${h.condition}`}
          >
            <span className="hourly-time">{h.time}</span>
            {isDemo ? (
              <span className="hourly-icon-emoji" role="img" aria-label={h.condition}>
                {getWeatherIconEmoji(h.icon)}
              </span>
            ) : (
              <img
                className="hourly-icon"
                src={h.iconUrl}
                alt={h.condition}
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = "none";
                  const parent = img.parentElement;
                  if (parent) parent.textContent = getWeatherIconEmoji(h.icon);
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
