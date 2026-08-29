import { Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { parseImport } from "@/lib/reviews";

const SAMPLE = `platform,reviewer,rating,text,date
Google,Jane Doe,2,"Waited 40 minutes and the order was wrong",2026-08-27`;

/** Paste or upload CSV/JSON reviews; parsed rows are handed off for AI analysis. */
export function ImportDialog({
  onImport,
}: {
  onImport: (rows: ReturnType<typeof parseImport>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");

  const submit = () => {
    try {
      const rows = parseImport(raw);
      if (!rows.length) {
        toast.error("No reviews found in that input");
        return;
      }
      onImport(rows);
      setRaw("");
      setOpen(false);
    } catch {
      toast.error("Could not parse that — check the CSV header or JSON syntax");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Upload className="h-4 w-4" />
          Import reviews
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import reviews</DialogTitle>
          <DialogDescription>
            Paste CSV (with a header row) or JSON with platform, reviewer, rating, text, date. New
            reviews are classified by AI on import.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={9}
          placeholder={SAMPLE}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="font-mono text-xs"
        />
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="text-xs text-muted-foreground"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setRaw(await file.text());
            }}
          />
          <Button className="ml-auto" onClick={submit}>
            Analyze &amp; add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
