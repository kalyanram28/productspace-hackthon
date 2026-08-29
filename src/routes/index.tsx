import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Bell,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  TrendingDown,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { AiBadge } from "@/components/reviews/AiBadge";
import { ImportDialog } from "@/components/reviews/ImportDialog";
import { ReviewDetail } from "@/components/reviews/ReviewDetail";
import { PlatformBadge, SentimentBadge, SeverityBadge, Stars } from "@/components/reviews/badges";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sampleReviews } from "@/data/sampleReviews";
import { analyzeReviews } from "@/lib/reviews.functions";
import {
  fallbackDraft,
  issueStats,
  sentimentTrend,
  urgentReviews,
  type Review,
  type Sentiment,
} from "@/lib/reviews";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Review Response Agent — AI Reputation Desk" },
      {
        name: "description",
        content:
          "An AI agent that triages customer reviews across Google, Yelp and Facebook, flags urgent complaints, drafts replies and surfaces recurring problems.",
      },
      { property: "og:title", content: "Review Response Agent — AI Reputation Desk" },
      {
        property: "og:description",
        content:
          "Triage reviews, flag urgent complaints and send AI-drafted replies from one dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

type TabKey = "all" | "urgent" | "insights";

function Dashboard() {
  const [reviews, setReviews] = useState<Review[]>(sampleReviews);
  const [tab, setTab] = useState<TabKey>("all");
  const [platform, setPlatform] = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyze = useServerFn(analyzeReviews);

  const update = useCallback((id: string, patch: Partial<Review>) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const urgent = useMemo(() => urgentReviews(reviews), [reviews]);
  const issues = useMemo(() => issueStats(reviews), [reviews]);
  const trend = useMemo(() => sentimentTrend(reviews), [reviews]);

  const counts = useMemo(() => {
    const c: Record<Sentiment, number> = { Positive: 0, Neutral: 0, Negative: 0 };
    reviews.forEach((r) => (c[r.sentiment] += 1));
    return c;
  }, [reviews]);

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / (reviews.length || 1)).toFixed(1);

  const filtered = useMemo(
    () =>
      reviews
        .filter((r) => platform === "all" || r.platform === platform)
        .filter((r) => sentiment === "all" || r.sentiment === sentiment)
        .filter((r) => severity === "all" || r.severity === severity)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [reviews, platform, sentiment, severity],
  );

  /** Run the real LLM pass over every review (sample data ships rule-based tags). */
  const runAiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await analyze({
        data: {
          reviews: reviews.map((r) => ({
            id: r.id,
            platform: r.platform,
            reviewer: r.reviewer,
            rating: r.rating,
            text: r.text,
            date: r.date,
          })),
        },
      });
      const byId = new Map(res.results.map((r) => [r.id, r]));
      setReviews((prev) =>
        prev.map((r) => {
          const hit = byId.get(r.id);
          return hit ? { ...r, ...hit, fallback: res.fallback } : r;
        }),
      );
      toast[res.fallback ? "warning" : "success"](
        res.fallback
          ? "AI unavailable — kept rule-based classification"
          : `AI re-analyzed ${res.results.length} reviews`,
      );
    } catch {
      toast.error("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  /** Import + classify new reviews (simulates a "new review just came in" event). */
  const handleImport = async (rows: ReturnType<typeof import("@/lib/reviews").parseImport>) => {
    const added: Review[] = rows.map((row, i) => ({
      id: `import-${Date.now()}-${i}`,
      ...row,
      sentiment: "Neutral",
      issue: "Analyzing…",
      severity: "Medium",
      draft: "",
      resolved: false,
      fallback: true,
    }));
    setReviews((prev) => [...added, ...prev]);
    toast.info(`${added.length} new review${added.length > 1 ? "s" : ""} received`);

    const res = await analyze({
      data: added.map ? { reviews: added.map(({ id, platform: p, reviewer, rating, text, date }) => ({ id, platform: p, reviewer, rating, text, date })) } : { reviews: [] },
    });
    const byId = new Map(res.results.map((r) => [r.id, r]));
    setReviews((prev) =>
      prev.map((r) => {
        const hit = byId.get(r.id);
        if (!hit) return r;
        return {
          ...r,
          ...hit,
          draft: fallbackDraft({ reviewer: r.reviewer, rating: r.rating, issue: hit.issue }),
          fallback: res.fallback,
        };
      }),
    );
  };

  const selectedReview = reviews.find((r) => r.id === selected) ?? null;
  const topIssues = issues.slice(0, 3);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="mr-auto">
            <h1 className="text-lg font-semibold">Review Response Agent</h1>
            <p className="text-xs text-muted-foreground">
              Harbour &amp; Vine · monitoring Google, Yelp &amp; Facebook
            </p>
          </div>
          <ImportDialog onImport={handleImport} />
          <Button onClick={runAiAnalysis} disabled={analyzing}>
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Re-analyze with AI
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* KPI row */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={<Star className="h-4 w-4" />} label="Average rating" value={avgRating} sub={`${reviews.length} reviews`} />
          <Kpi
            icon={<TrendingDown className="h-4 w-4" />}
            label="Negative"
            value={`${Math.round((counts.Negative / (reviews.length || 1)) * 100)}%`}
            sub={`${counts.Negative} of ${reviews.length}`}
            tone="destructive"
          />
          <Kpi
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Needs attention"
            value={String(urgent.length)}
            sub="unresolved & urgent"
            tone="warning"
          />
          <Kpi
            icon={<Bell className="h-4 w-4" />}
            label="Responses sent"
            value={String(reviews.filter((r) => r.sentAt).length)}
            sub="simulated for demo"
            tone="success"
          />
        </section>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="all">All reviews</TabsTrigger>
            <TabsTrigger value="urgent">Needs immediate attention ({urgent.length})</TabsTrigger>
            <TabsTrigger value="insights">Recurring issues</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "all" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Filter value={platform} onChange={setPlatform} label="Platform" options={["Google", "Yelp", "Facebook", "Other"]} />
              <Filter value={sentiment} onChange={setSentiment} label="Sentiment" options={["Positive", "Neutral", "Negative"]} />
              <Filter value={severity} onChange={setSeverity} label="Urgency" options={["High", "Medium", "Low"]} />
              <span className="text-xs text-muted-foreground">
                Showing {filtered.length} of {reviews.length}
              </span>
            </div>
            <ReviewList reviews={filtered} onSelect={setSelected} />
          </>
        )}

        {tab === "urgent" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Negative reviews tagged Medium or High urgency, newest first. Health, safety and
              hygiene complaints are escalated automatically. <AiBadge label="AI-prioritized" />
            </p>
            {urgent.length ? (
              <ReviewList reviews={urgent} onSelect={setSelected} />
            ) : (
              <p className="panel p-8 text-center text-sm text-muted-foreground">
                Nothing urgent left — every high-priority review is resolved.
              </p>
            )}
          </div>
        )}

        {tab === "insights" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="panel p-5">
                <h2 className="text-sm font-semibold">Issue frequency</h2>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={issues} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="issue"
                        width={130}
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="count" name="Reviews" fill="var(--color-chart-4)" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel p-5">
                <h2 className="text-sm font-semibold">Sentiment trend</h2>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid stroke="var(--color-border)" />
                      <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Line type="monotone" dataKey="Positive" stroke="var(--color-chart-1)" strokeWidth={2} />
                      <Line type="monotone" dataKey="Neutral" stroke="var(--color-chart-2)" strokeWidth={2} />
                      <Line type="monotone" dataKey="Negative" stroke="var(--color-chart-3)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="panel p-5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Top 3 recurring problems</h2>
                <AiBadge label="AI-derived" />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {topIssues.map((s, i) => (
                  <div key={s.issue} className="rounded-lg border border-border p-4">
                    <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                    <h3 className="mt-1 text-base font-semibold">{s.issue}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.count} reviews · mentioned in {s.share}% of negative reviews
                    </p>
                    <p className="mt-3 text-sm">
                      <span className="font-medium">Recommended action: </span>
                      {s.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ReviewDetail review={selectedReview} onClose={() => setSelected(null)} onUpdate={update} />
    </main>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "primary" | "destructive" | "warning" | "success";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/20 text-warning-foreground",
    success: "bg-success/12 text-success",
  } as const;
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${tones[tone]}`}>
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Filter({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[150px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ReviewList({
  reviews,
  onSelect,
}: {
  reviews: Review[];
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id}>
          <button
            onClick={() => onSelect(r.id)}
            className="panel w-full p-4 text-left transition-colors hover:bg-accent/40"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{r.reviewer}</span>
              <PlatformBadge value={r.platform} />
              <Stars rating={r.rating} />
              <span className="ml-auto text-xs text-muted-foreground">{r.date}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.text}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SentimentBadge value={r.sentiment} />
              <SeverityBadge value={r.severity} />
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.issue}</span>
              <AiBadge />
              {r.sentAt && (
                <span className="text-xs font-medium text-success">Response sent</span>
              )}
              {r.resolved && !r.sentAt && (
                <span className="text-xs font-medium text-success">Resolved</span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
