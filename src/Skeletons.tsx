export function WeatherSkeleton() {
  return (
    <div className="glass-card weather-panel">
      <div className="weather-top">
        <div className="weather-info">
          <div className="skeleton skeleton-line short" style={{ height: 20, marginBottom: 12 }} />
          <div className="skeleton skeleton-temp" />
          <div className="skeleton skeleton-line medium" style={{ height: 16 }} />
        </div>
        <div className="skeleton skeleton-icon" />
      </div>
      <div className="metrics-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-tile" />
        ))}
      </div>
    </div>
  );
}

export function HourlySkeleton() {
  return (
    <section className="glass-card hourly-section">
      <div className="skeleton skeleton-line" style={{ height: 14, width: 120, marginBottom: 16 }} />
      <div className="hourly-row">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="hourly-card">
            <div className="skeleton" style={{ height: 14, width: 36, marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 40, width: 40, borderRadius: "50%", marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 16, width: 28 }} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function AISkeleton() {
  return (
    <section className="glass-card ai-panel">
      <div className="ai-header">
        <div className="skeleton" style={{ height: 20, width: 120 }} />
        <div className="skeleton" style={{ height: 24, width: 70, borderRadius: 100 }} />
      </div>
      <div className="ai-cards">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="ai-card">
            <div className="skeleton skeleton-line short" style={{ height: 14 }} />
            <div className="skeleton skeleton-line" style={{ height: 14 }} />
            <div className="skeleton skeleton-line medium" style={{ height: 14 }} />
          </div>
        ))}
      </div>
    </section>
  );
}
