import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AiBadge } from "./AiBadge";
import { PlatformBadge, SentimentBadge, SeverityBadge, Stars } from "./badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { draftResponse } from "@/lib/reviews.functions";
import type { Review, Tone } from "@/lib/reviews";

interface Props {
  review: Review | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Review>) => void;
}

/** Detail drawer: full review, editable AI draft, tone selector, resolve/send actions. */
export function ReviewDetail({ review, onClose, onUpdate }: Props) {
  const draftFn = useServerFn(draftResponse);
  const [text, setText] = useState("");
  const [tone, setTone] = useState<Tone>("friendly");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setText(review?.draft ?? "");
  }, [review?.id, review?.draft]);

  if (!review) return null;

  const regenerate = async () => {
    setLoading(true);
    try {
      const res = await draftFn({
        data: {
          reviewer: review.reviewer,
          platform: review.platform,
          rating: review.rating,
          text: review.text,
          issue: review.issue,
          severity: review.severity,
          tone,
          businessName: "Harbour & Vine",
        },
      });
      setText(res.draft);
      onUpdate(review.id, { draft: res.draft, fallback: res.fallback });
      toast[res.fallback ? "warning" : "success"](
        res.fallback ? "AI unavailable — used a fallback template" : "New draft ready",
      );
    } catch {
      toast.error("Could not regenerate the draft");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{review.reviewer}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <PlatformBadge value={review.platform} />
          <Stars rating={review.rating} />
          <SentimentBadge value={review.sentiment} />
          <SeverityBadge value={review.severity} />
          <span className="text-xs text-muted-foreground">{review.date}</span>
        </div>

        <p className="rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">{review.text}</p>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Detected issue:</span>
          <span className="font-medium">{review.issue}</span>
          <AiBadge />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Draft response</span>
              <AiBadge label="AI-drafted" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="concise">Concise</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="secondary" onClick={regenerate} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate
              </Button>
            </div>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            className="text-sm leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">
            Review and edit before sending — AI drafts are suggestions, not final copy.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              onUpdate(review.id, {
                draft: text,
                sentAt: new Date().toISOString(),
                resolved: true,
              });
              toast.success(`Response sent to ${review.platform} (simulated)`);
              onClose();
            }}
          >
            <Send className="h-4 w-4" />
            Send response
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onUpdate(review.id, { draft: text, resolved: !review.resolved });
              toast.success(review.resolved ? "Reopened" : "Marked as resolved");
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            {review.resolved ? "Reopen" : "Mark as resolved"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
