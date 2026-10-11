import type { StatusType } from "./types";

interface Props {
  status: StatusType;
  message: string;
  showLoadingBar: boolean;
}

export function StatusMessage({ status, message, showLoadingBar }: Props) {
  return (
    <div>
      {showLoadingBar && <div className="loading-bar" style={{ marginBottom: 8 }} />}
      <div className={`status-bar ${status}`}>
        <span className="status-dot" />
        <span>{message}</span>
      </div>
    </div>
  );
}
