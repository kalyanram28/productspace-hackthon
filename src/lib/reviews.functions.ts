import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { chatJson } from "./ai-gateway.server";
import { fallbackAnalyze, fallbackDraft } from "./reviews";

const AnalyzeInput = z.object({
  reviews: z
    .array(
      z.object({
        id: z.string(),
        platform: z.string(),
        reviewer: z.string(),
        rating: z.number(),
        text: z.string(),
        date: z.string(),
      }),
    )
    .min(1)
    .max(50),
});

const ANALYZE_SYSTEM = `You are a reputation analyst for a small business.
For each review, classify sentiment, extract the single underlying issue/topic, and tag urgency.
Sentiment must be exactly one of: Positive, Neutral, Negative.
Severity must be exactly one of: Low, Medium, High. Use High for health, safety, allergy, hygiene,
discrimination, or legal-threat content, or any 1-star review describing a serious failure.
Issue must be a short human label (2-4 words) such as "Slow service", "Food quality",
"Billing error", "Staff behaviour", "Cleanliness", "Health & safety", "Positive feedback".
Return JSON only: {"results":[{"id":"...","sentiment":"...","issue":"...","severity":"..."}]}`;

/** Batch-classify reviews with the LLM; falls back to the rule-based classifier on failure. */
export const analyzeReviews = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const out = await chatJson<{
        results: Array<{ id: string; sentiment: string; issue: string; severity: string }>;
      }>(ANALYZE_SYSTEM, JSON.stringify(data.reviews));

      const byId = new Map(out.results.map((r) => [r.id, r]));
      return {
        fallback: false,
        results: data.reviews.map((r) => {
          const hit = byId.get(r.id);
          const safe = fallbackAnalyze(r);
          return {
            id: r.id,
            sentiment: (["Positive", "Neutral", "Negative"].includes(hit?.sentiment ?? "")
              ? hit!.sentiment
              : safe.sentiment) as "Positive" | "Neutral" | "Negative",
            issue: hit?.issue?.trim() || safe.issue,
            severity: (["Low", "Medium", "High"].includes(hit?.severity ?? "")
              ? hit!.severity
              : safe.severity) as "Low" | "Medium" | "High",
          };
        }),
      };
    } catch (error) {
      console.error("analyzeReviews failed, using rule-based fallback", error);
      return {
        fallback: true,
        results: data.reviews.map((r) => ({ id: r.id, ...fallbackAnalyze(r) })),
      };
    }
  });

const DraftInput = z.object({
  reviewer: z.string(),
  platform: z.string(),
  rating: z.number(),
  text: z.string(),
  issue: z.string(),
  severity: z.string(),
  tone: z.enum(["friendly", "formal", "concise"]),
  businessName: z.string().default("our team"),
});

/** Draft a public reply; falls back to a templated response on failure. */
export const draftResponse = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DraftInput.parse(d))
  .handler(async ({ data }) => {
    const system = `You write public replies to customer reviews on behalf of ${data.businessName}, a small local business.
Rules:
- Negative reviews: open with a sincere apology, acknowledge the specific issue, state one concrete corrective step, invite them to contact the business directly. Never argue, never make legal admissions.
- Positive reviews: warm, specific, appreciative, invite them back.
- Address the reviewer by first name. 40-90 words (about 35 for "concise").
- Tone: ${data.tone}.
Return JSON only: {"draft":"..."}`;

    try {
      const out = await chatJson<{ draft: string }>(
        system,
        JSON.stringify({
          reviewer: data.reviewer,
          platform: data.platform,
          rating: data.rating,
          issue: data.issue,
          severity: data.severity,
          review: data.text,
        }),
      );
      const draft = out.draft?.trim();
      if (!draft) throw new Error("empty draft");
      return { fallback: false, draft };
    } catch (error) {
      console.error("draftResponse failed, using template fallback", error);
      return {
        fallback: true,
        draft: fallbackDraft({
          reviewer: data.reviewer,
          rating: data.rating,
          issue: data.issue,
        }),
      };
    }
  });
