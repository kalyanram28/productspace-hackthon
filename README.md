# Review Response Agent — AI reputation desk for small businesses

## Pitch

- **Problem:** Small businesses collect reviews across Google, Yelp and Facebook, but owners have no time to read every one — angry, urgent complaints sit unanswered for days and quietly damage trust.
- **Solution:** An AI agent that ingests reviews, classifies sentiment + underlying issue, flags urgency, drafts an on-brand reply for every review, and rolls everything up into recurring-problem insights.
- **Impact:** Owners triage a week of reviews in minutes: urgent complaints surface first, a ready-to-send reply is one click away, and the dashboard names the top 3 problems worth actually fixing.
- **Demo-ready:** ~36 realistic reviews are pre-loaded, so the dashboard is populated the moment it loads — no upload or API call required.
- **Transparent:** every AI-produced value (sentiment, issue, urgency, draft reply) is labeled "AI-generated", and a rule-based fallback keeps the app working if the model call fails.

## Run it

```bash
npm install && npm run dev
```

The app opens on `/` with sample data already analyzed. No keys to configure — AI calls go through the built-in Lovable AI gateway (`LOVABLE_API_KEY` is injected server-side).

## What's in it

- **Ingestion** — paste or upload CSV/JSON (`platform, reviewer, rating, text, date`) via *Import reviews*. Imported reviews are classified by the LLM immediately and land at the top of the feed like a live notification.
- **Sentiment & issue categorization** — an LLM returns strict JSON: `sentiment` (Positive/Neutral/Negative), a short `issue` label ("Slow service", "Billing error", …) and `severity` (Low/Medium/High). Health, safety, allergy, hygiene and legal-threat language is escalated to High.
- **Urgent complaint detection** — the *Needs immediate attention* tab lists unresolved negative reviews with Medium/High severity, sorted by severity then recency.
- **AI-drafted responses** — the detail dialog shows an editable draft with a tone selector (friendly / formal / concise) and *Regenerate*. Negative reviews get apologetic + solution-oriented copy; positive reviews get warm + appreciative copy. "Send response" is simulated and marks the review resolved.
- **Recurring problem insights** — issue-frequency chart, monthly sentiment trend, and the top 3 recurring problems with a share of negative reviews and a recommended action.

## Code map

| Path | Purpose |
| --- | --- |
| `src/lib/reviews.ts` | Types, rule-based fallback classifier + draft templates, aggregation (issue stats, trend, urgency), CSV/JSON parser |
| `src/lib/ai-gateway.server.ts` | Server-only JSON chat wrapper around the AI gateway |
| `src/lib/reviews.functions.ts` | Server functions: `analyzeReviews` (batch classify), `draftResponse` (tone-aware reply). Both fall back to rule-based output on any failure |
| `src/data/sampleReviews.ts` | ~36 mock reviews across platforms, ratings and issue types |
| `src/routes/index.tsx` | Dashboard: KPIs, filters, tabs, charts, detail dialog |
| `src/components/reviews/*` | Review list badges, AI-generated label, detail dialog, import dialog |

State lives in memory on the client for the demo — swap `useState` for a persistence layer without touching the AI or aggregation code.

## Next steps (post-buildathon)

1. Real platform integrations (Google Business Profile, Yelp Fusion, Facebook Graph) with scheduled polling instead of manual import.
2. Auto-posting approved responses back to the source platform, with an approval queue and audit log.
3. Persistence + multi-location / multi-business support with per-business auth and row-level access control.
4. Alerting: Slack/email push the moment a High-severity review lands, plus SLA timers on unanswered complaints.
5. Brand voice profiles and learning from owner edits so drafts converge on the business's own tone.
6. Exportable recurring-issues report (PDF/markdown) for weekly management reviews.
