interface Props {
  text: string;
}

export function DemoBadge({ text }: Props) {
  return (
    <span className="demo-badge" title={text}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 9v4M12 17h.01" />
        <circle cx="12" cy="12" r="10" />
      </svg>
      Demo Data
    </span>
  );
}
