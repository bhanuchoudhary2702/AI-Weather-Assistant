export function WeatherSkeleton() {
  return (
    <div className="glass-card weather-panel" aria-busy="true" aria-label="Loading weather">
      <div className="weather-top">
        <div className="weather-info" style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 16, width: "55%", marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 12, width: "35%", marginBottom: 14 }} />
          <div className="skeleton" style={{ height: 64, width: 140, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 14, width: "45%", marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 10, width: "65%" }} />
        </div>
        <div className="skeleton" style={{ width: 100, height: 100, borderRadius: "50%", flexShrink: 0 }} />
      </div>
      <div className="metrics-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 70, borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}

export function HourlySkeleton() {
  return (
    <section className="glass-card hourly-section" aria-busy="true" aria-label="Loading forecast">
      <div className="skeleton" style={{ height: 12, width: 110, marginBottom: 4 }} />
      <div className="hourly-row">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="hourly-card">
            <div className="skeleton" style={{ height: 11, width: 34, marginBottom: 4 }} />
            <div className="skeleton" style={{ height: 38, width: 38, borderRadius: "50%", marginBottom: 4 }} />
            <div className="skeleton" style={{ height: 13, width: 26 }} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function AISkeleton() {
  return (
    <section className="glass-card ai-panel" aria-busy="true" aria-label="Loading AI insights">
      <div className="ai-header">
        <div className="skeleton" style={{ height: 18, width: 130 }} />
        <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 100 }} />
      </div>
      <div className="ai-cards">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="ai-card">
            <div className="skeleton" style={{ height: 11, width: "40%" }} />
            <div className="skeleton" style={{ height: 13, width: "100%", marginTop: 2 }} />
            <div className="skeleton" style={{ height: 13, width: "75%" }} />
          </div>
        ))}
      </div>
    </section>
  );
}
