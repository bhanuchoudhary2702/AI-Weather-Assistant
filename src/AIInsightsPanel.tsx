import type { AIInsights } from "./types";
import { INSIGHT_SECTIONS } from "./types";
import { Icon } from "./Icon";

interface Props {
  insights: AIInsights | null;
  isLoading: boolean;
}

export function AIInsightsPanel({ insights, isLoading }: Props) {
  return (
    <section className="glass-card ai-panel fade-in fade-in-delayed-2">
      <div className="ai-header">
        <span className="ai-title">
          <Icon name="sparkles" size={18} className="ai-sparkle" />
          AI Insights
        </span>
        {insights && (
          <span className={`ai-badge ${insights.offline ? "offline" : ""}`}>
            {insights.offline ? "Fallback Mode" : "Gemini"}
          </span>
        )}
      </div>

      <div className="ai-cards">
        {INSIGHT_SECTIONS.map((section, i) => {
          const text = insights?.[section.key] ?? null;
          return (
            <div
              key={section.key}
              className="ai-card"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <span className="ai-card-title">
                <Icon name={section.icon} size={14} />
                {section.title}
              </span>
              <span className={`ai-card-text ${!text ? "muted" : ""}`}>
                {text || (isLoading ? "Analysing…" : "Search a city to see AI guidance here.")}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
