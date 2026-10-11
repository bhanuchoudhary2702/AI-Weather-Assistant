import { useState, useCallback } from "react";
import { Icon } from "./Icon";

interface Props {
  onSearch: (city: string) => void;
  history: string[];
  onClearHistory: () => void;
  disabled: boolean;
}

export function CitySearch({ onSearch, history, onClearHistory, disabled }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        onSearch(trimmed);
      }
    },
    [value, onSearch]
  );

  const handleChipClick = useCallback(
    (city: string) => {
      setValue(city);
      onSearch(city);
    },
    [onSearch]
  );

  return (
    <section className="glass-card search-section fade-in">
      <form className="search-row" onSubmit={handleSubmit}>
        <input
          type="text"
          className="city-input"
          placeholder="Search any city worldwide — e.g. Tokyo, Paris, Mumbai"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          aria-label="City name"
        />
        <button type="submit" className="btn btn-primary" disabled={disabled || !value.trim()}>
          <Icon name="search" size={16} />
          Search
        </button>
      </form>

      {history.length > 0 ? (
        <div className="history-chips">
          <span className="history-label">Recent:</span>
          {history.map((city) => (
            <button key={city} className="chip" onClick={() => handleChipClick(city)} disabled={disabled}>
              {city}
            </button>
          ))}
          <button className="chip chip-clear" onClick={onClearHistory} disabled={disabled}>
            <Icon name="x" size={12} /> Clear
          </button>
        </div>
      ) : (
        <div className="history-chips">
          <span className="history-label">Recent searches will appear here</span>
        </div>
      )}
    </section>
  );
}
