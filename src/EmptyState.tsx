import { Icon } from "./Icon";

interface Props {
  onSearch: () => void;
}

export function EmptyState({ onSearch }: Props) {
  return (
    <div className="glass-card empty-state fade-in" style={{ gridColumn: "1 / -1" }}>
      <div className="empty-state-icon">
        <Icon name="cloud" size={56} />
      </div>
      <div className="empty-state-title">No city selected</div>
      <div className="empty-state-text">
        Search for any city above to see live weather conditions and AI-powered insights.
      </div>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onSearch}>
        <Icon name="search" size={16} />
        Try a sample search
      </button>
    </div>
  );
}
