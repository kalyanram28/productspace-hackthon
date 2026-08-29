import { Sparkles } from "lucide-react";

/** Transparency label required on every AI-generated value in the UI. */
export function AiBadge({ label = "AI-generated" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ai">
      <Sparkles className="h-3 w-3" />
      {label}
    </span>
  );
}
