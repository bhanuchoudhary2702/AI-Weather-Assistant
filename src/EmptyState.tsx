import { Icon } from "./Icon";

interface Props {
  onSearch: () => void;
}

export function EmptyState({ onSearch }: Props) {
  return (
    <div className="glass-card empty-state fade-in" role="region" aria-label="No city selected">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon name="cloud" size={64} />
      </div>
      <h2 className="empty-state-title">No city selected</h2>
      <p className="empty-state-text">
        Search for any city above to see live weather conditions and AI-powered insights from Gemini.
      </p>
      <button
        className="btn btn-primary"
        style={{ marginTop: 20 }}
        onClick={onSearch}
      >
        <Icon name="search" size={15} />
        Try San Francisco
      </button>
    </div>
  );
}
