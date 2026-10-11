import { useState, useCallback, useId } from "react";
import { Icon } from "./Icon";
import { ConfirmModal } from "./ConfirmModal";

interface Props {
  onSearch: (city: string) => void;
  history: string[];
  onClearHistory: () => void;
  disabled: boolean;
}

export function CitySearch({ onSearch, history, onClearHistory, disabled }: Props) {
  const [value, setValue] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputId = useId();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) onSearch(trimmed);
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

  const handleClearRequest = useCallback(() => {
    if (history.length > 0) setConfirmOpen(true);
  }, [history.length]);

  const handleConfirmClear = useCallback(() => {
    setConfirmOpen(false);
    onClearHistory();
  }, [onClearHistory]);

  const handleCancelClear = useCallback(() => setConfirmOpen(false), []);

  // Handle Enter/Space on chip buttons for accessibility
  const handleChipKey = useCallback(
    (e: React.KeyboardEvent, city: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleChipClick(city);
      }
    },
    [handleChipClick]
  );

  return (
    <>
      <section className="glass-card search-section fade-in" aria-label="City search">
        <form className="search-row" onSubmit={handleSubmit} role="search">
          <label htmlFor={inputId} className="sr-only">
            City name
          </label>
          <input
            id={inputId}
            type="text"
            className="city-input"
            placeholder="Search any city — e.g. Tokyo, Paris, New York"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="City name"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={disabled || !value.trim()}
            aria-label="Search weather"
          >
            <Icon name="search" size={15} />
            Search
          </button>
        </form>

        {/* History chips */}
        <div className="history-row" role="navigation" aria-label="Recent searches">
          {history.length > 0 ? (
            <>
              <span className="history-label" id="recent-label">Recent</span>
              <div className="chips-wrap" aria-labelledby="recent-label">
                {history.map((city) => (
                  <button
                    key={city}
                    className="chip"
                    onClick={() => handleChipClick(city)}
                    onKeyDown={(e) => handleChipKey(e, city)}
                    disabled={disabled}
                    title={`Search ${city}`}
                    aria-label={`Search ${city}`}
                  >
                    {city}
                  </button>
                ))}
                <button
                  className="chip chip-clear"
                  onClick={handleClearRequest}
                  disabled={disabled}
                  aria-label="Clear all recent searches"
                >
                  <Icon name="x" size={11} />
                  Clear
                </button>
              </div>
            </>
          ) : (
            <span className="history-label" style={{ color: "var(--text-dim)", fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>
              Recent searches will appear here
            </span>
          )}
        </div>
      </section>

      {/* Screen-reader only utility class */}
      <style>{`.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}`}</style>

      {confirmOpen && (
        <ConfirmModal
          title="Clear search history?"
          body="This will remove all recent city searches. This action cannot be undone."
          confirmLabel="Clear history"
          onConfirm={handleConfirmClear}
          onCancel={handleCancelClear}
        />
      )}
    </>
  );
}
