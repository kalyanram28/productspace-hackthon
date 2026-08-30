/**
 * Shared review domain types + rule-based helpers.
 *
 * This module is browser-safe (no server-only imports) so both the dashboard UI
 * and the server functions can share types, the fallback classifier and the
 * aggregation logic.
 */

export type Platform = "Google" | "Yelp" | "Facebook" | "Other";
export type Sentiment = "Positive" | "Neutral" | "Negative";
export type Severity = "Low" | "Medium" | "High";

export interface Review {
  id: string;
  platform: Platform;
  reviewer: string;
  rating: number; // 1..5
  text: string;
  date: string; // ISO date
  /** AI (or fallback) analysis — always labeled as AI-generated in the UI. */
  sentiment: Sentiment;
  issue: string;
  severity: Severity;
  /** AI-drafted reply, editable by the owner. */
  draft: string;
  /** Set once the owner "sends" the reply (mocked for the demo). */
  sentAt?: string;
  resolved: boolean;
  /** True when analysis came from the rule-based fallback (LLM unavailable). */
  fallback?: boolean;
}

export type Tone = "friendly" | "formal" | "concise";

/** Keyword map used by the rule-based fallback classifier. */
const ISSUE_KEYWORDS: Array<[string, string[]]> = [
  ["Slow service", ["slow", "wait", "waiting", "late", "took forever", "delay"]],
  ["Food quality", ["cold", "stale", "undercooked", "bland", "raw", "food", "taste", "soggy"]],
  ["Staff behaviour", ["rude", "unfriendly", "ignored", "attitude", "manager", "staff"]],
  ["Cleanliness", ["dirty", "filthy", "hair", "smell", "unhygienic", "bathroom", "roach", "clean"]],
  ["Billing error", ["charged", "bill", "refund", "overcharge", "price", "receipt"]],
  ["Health & safety", ["sick", "allergy", "food poisoning", "injury", "unsafe", "burn"]],
  ["Booking / order issue", ["reservation", "booking", "order", "missing item", "cancelled"]],
  ["Noise / ambience", ["loud", "noisy", "music", "cramped", "parking"]],
];

const HIGH_RISK = [
  "food poisoning",
  "sick",
  "allergy",
  "hospital",
  "unsafe",
  "roach",
  "mold",
  "lawyer",
  "injury",
  "discriminat",
  "harass",
];

/** Deterministic, offline classifier used when the LLM call fails. */
export function fallbackAnalyze(input: {
  rating: number;
  text: string;
}): Pick<Review, "sentiment" | "issue" | "severity"> {
  const t = input.text.toLowerCase();
  const sentiment: Sentiment =
    input.rating >= 4 ? "Positive" : input.rating === 3 ? "Neutral" : "Negative";

  let issue = sentiment === "Positive" ? "Positive feedback" : "General dissatisfaction";
  // 5-star reviews are praise, not a complaint topic — keyword matching would
  // mislabel them ("remembered my order" -> booking issue).
  if (input.rating < 5) {
    for (const [label, words] of ISSUE_KEYWORDS) {
      if (words.some((w) => t.includes(w))) {
        issue = label;
        break;
      }
    }
  }

  const risky = HIGH_RISK.some((w) => t.includes(w));
  const severity: Severity =
    risky || (input.rating <= 2 && issue === "Health & safety")
      ? "High"
      : input.rating <= 2
        ? "High"
        : input.rating === 3
          ? "Medium"
          : "Low";

  return { sentiment, issue, severity };
}

/** Simple templated reply used when the LLM is unavailable. */
export function fallbackDraft(review: Pick<Review, "reviewer" | "rating" | "issue">): string {
  const name = review.reviewer.split(" ")[0] ?? "there";
  if (review.rating >= 4) {
    return `Hi ${name}, thank you so much for the kind words — we're thrilled you had a great experience. We'll pass your feedback on to the team and hope to welcome you back soon!`;
  }
  return `Hi ${name}, thank you for taking the time to share this, and I'm sorry your experience fell short. What you describe (${review.issue.toLowerCase()}) isn't the standard we hold ourselves to. I'd love to make this right — please reach out to us directly and we'll follow up personally.`;
}

export const SEVERITY_RANK: Record<Severity, number> = { High: 3, Medium: 2, Low: 1 };

/** Urgent = negative + high/medium severity, unresolved. Sorted by severity then recency. */
export function urgentReviews(reviews: Review[]): Review[] {
  return reviews
    .filter((r) => !r.resolved && r.sentiment === "Negative" && r.severity !== "Low")
    .sort(
      (a, b) =>
        SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
        +new Date(b.date) - +new Date(a.date),
    );
}

export interface IssueStat {
  issue: string;
  count: number;
  negative: number;
  share: number; // share of negative reviews mentioning this issue
  action: string;
}

const ACTIONS: Record<string, string> = {
  "Slow service": "Add a peak-hour floor lead and publish target ticket times.",
  "Food quality": "Re-run kitchen QA checks and re-train on hold times.",
  "Staff behaviour": "Run a service-recovery refresher and review shift coverage.",
  Cleanliness: "Move to hourly cleaning checklists with sign-off.",
  "Billing error": "Audit POS modifiers and require manager sign-off on adjustments.",
  "Health & safety": "Escalate to ownership today and document a corrective action.",
  "Booking / order issue": "Reconfirm bookings by SMS and reconcile orders at handoff.",
  "Noise / ambience": "Adjust music levels and revisit table spacing at peak.",
};

export function issueStats(reviews: Review[]): IssueStat[] {
  const negTotal = reviews.filter((r) => r.sentiment === "Negative").length || 1;
  const map = new Map<string, { count: number; negative: number }>();
  for (const r of reviews) {
    if (r.issue === "Positive feedback") continue;
    const e = map.get(r.issue) ?? { count: 0, negative: 0 };
    e.count += 1;
    if (r.sentiment === "Negative") e.negative += 1;
    map.set(r.issue, e);
  }
  return [...map.entries()]
    .map(([issue, e]) => ({
      issue,
      count: e.count,
      negative: e.negative,
      share: Math.round((e.negative / negTotal) * 100),
      action: ACTIONS[issue] ?? "Assign an owner and review in the next team huddle.",
    }))
    .sort((a, b) => b.count - a.count);
}

/** Monthly sentiment trend, oldest first. */
export function sentimentTrend(reviews: Review[]) {
  const map = new Map<string, { month: string; Positive: number; Neutral: number; Negative: number }>();
  for (const r of reviews) {
    const key = r.date.slice(0, 7);
    const e = map.get(key) ?? { month: key, Positive: 0, Neutral: 0, Negative: 0 };
    e[r.sentiment] += 1;
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Parse pasted CSV or JSON into raw review rows. */
export function parseImport(raw: string): Array<{
  platform: Platform;
  reviewer: string;
  rating: number;
  text: string;
  date: string;
}> {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const norm = (o: Record<string, unknown>) => ({
    platform: (["Google", "Yelp", "Facebook"].includes(String(o["platform"]))
      ? String(o["platform"])
      : "Other") as Platform,
    reviewer: String(o["reviewer"] ?? o["name"] ?? "Anonymous"),
    rating: Math.min(5, Math.max(1, Number(o["rating"] ?? 3) || 3)),
    text: String(o["text"] ?? o["review"] ?? "").trim(),
    date: String(o["date"] ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
  });

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed: unknown = JSON.parse(trimmed);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map((o) => norm(o as Record<string, unknown>)).filter((r) => r.text);
  }

  // CSV: header row required, quoted fields supported.
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  const splitRow = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (c === "," && !q) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = splitRow(lines[0]!).map((h) => h.toLowerCase());
  return lines
    .slice(1)
    .map((line) => {
      const cells = splitRow(line);
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => (obj[h] = cells[i]));
      return norm(obj);
    })
    .filter((r) => r.text);
}
