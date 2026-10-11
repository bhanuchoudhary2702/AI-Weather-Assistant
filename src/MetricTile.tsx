import { Icon } from "./Icon";

interface Props {
  icon: string;
  label: string;
  value: string;
}

export function MetricTile({ icon, label, value }: Props) {
  return (
    <div className="metric-tile">
      <span className="metric-label">
        <Icon name={icon} size={14} className="metric-icon" />
        {label}
      </span>
      <span className="metric-value">{value}</span>
    </div>
  );
}
