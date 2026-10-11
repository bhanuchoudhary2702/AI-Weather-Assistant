import type { AIInsights } from "./types";
import { INSIGHT_SECTIONS } from "./types";
import { Icon } from "./Icon";

interface Props {
  insights: AIInsights | null;
  isLoading: boolean;
  hasError: boolean;
}

export function AIInsightsPanel({ insights, isLoading, hasError }: Props) {
  let badge: { label: string; cls: string } | null = null;
  if (insights) {
    badge = insights.offline
      ? { label: "Fallback Mode", cls: "ai-badge offline" }
      : { label: "Gemini AI", cls: "ai-badge" };
  } else if (hasError) {
    badge = { label: "Unavailable", cls: "ai-badge error" };
  }

  return (
    <section className="glass-card ai-panel fade-in delay-2" aria-label="AI weather insights">
      <div className="ai-header">
        <h2 className="ai-title">
          <Icon name="sparkles" size={18} className="ai-sparkle" aria-hidden="true" />
          AI Insights
        </h2>
        {badge && <span className={badge.cls}>{badge.label}</span>}
      </div>

      <div className="ai-cards">
        {INSIGHT_SECTIONS.map((section, i) => {
          const text = insights?.[section.key] ?? null;
          const placeholder = isLoading
            ? "Analysing with Gemini…"
            : hasError
            ? "AI insights could not be loaded."
            : "Search a city to see AI guidance here.";

          return (
            <article
              key={section.key}
              className="ai-card"
              style={{ animationDelay: `${0.06 * i}s` }}
              aria-labelledby={`insight-title-${section.key}`}
            >
              <div id={`insight-title-${section.key}`} className="ai-card-title">
                <Icon name={section.icon} size={13} aria-hidden="true" />
                {section.title}
              </div>
              <p className={`ai-card-text${!text ? " muted" : ""}`}>
                {text ?? placeholder}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
