import type { Platform, Sentiment, Severity } from "@/lib/reviews";

const SENTIMENT_STYLES: Record<Sentiment, string> = {
  Positive: "bg-success/12 text-success",
  Neutral: "bg-muted text-muted-foreground",
  Negative: "bg-destructive/12 text-destructive",
};

const SEVERITY_STYLES: Record<Severity, string> = {
  High: "bg-destructive text-destructive-foreground",
  Medium: "bg-warning/25 text-warning-foreground",
  Low: "bg-secondary text-secondary-foreground",
};

const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

export function SentimentBadge({ value }: { value: Sentiment }) {
  return <span className={`${base} ${SENTIMENT_STYLES[value]}`}>{value}</span>;
}

export function SeverityBadge({ value }: { value: Severity }) {
  return (
    <span className={`${base} ${SEVERITY_STYLES[value]}`}>
      {value === "High" ? "Urgent" : value}
    </span>
  );
}

export function PlatformBadge({ value }: { value: Platform }) {
  return (
    <span className={`${base} border border-border bg-background text-muted-foreground`}>
      {value}
    </span>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm text-warning" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-muted-foreground/40">{"★".repeat(5 - rating)}</span>
    </span>
  );
}
