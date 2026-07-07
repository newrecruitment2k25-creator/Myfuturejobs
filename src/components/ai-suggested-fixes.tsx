import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateFixes, type AiFix } from "@/lib/fixes.functions";

type Props = {
  cvText: string;
  priorityImprovements: string[];
  companyType: string;
  industry: string;
};

export function AiSuggestedFixes({ cvText, priorityImprovements, companyType, industry }: Props) {
  const generate = useServerFn(generateFixes);
  const [loading, setLoading] = useState(false);
  const [fixes, setFixes] = useState<AiFix[] | null>(null);

  const onGenerate = async () => {
    setLoading(true);
    try {
      const { fixes } = await generate({
        data: { cv_text: cvText, priority_improvements: priorityImprovements, company_type: companyType, industry },
      });
      setFixes(fixes);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate fixes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, label = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Couldn't copy. Please copy manually.");
    }
  };

  const copyAll = async () => {
    if (!fixes) return;
    const date = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" });
    const body =
      `PerksoPrax AI AI Fixes — ${date}\n\n` +
      fixes
        .map((f, i) => `${i + 1}. ${f.issue_title}\nFixed text: ${f.fix}`)
        .join("\n\n");
    await copyText(body, "All fixes copied to clipboard");
  };

  return (
    <div className="mt-10 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#1B2B4B" }}>
            AI Suggested Fixes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ready-to-paste rewrites for each priority improvement.
          </p>
        </div>
        {!fixes && (
          <Button onClick={onGenerate} disabled={loading} variant="navy" size="lg">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Generate AI Fixes
              </>
            )}
          </Button>
        )}
      </div>

      {fixes && fixes.length > 0 && (
        <div className="mt-6 space-y-6">
          {fixes.map((f, i) => (
            <div key={i} className="rounded-xl border border-border p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Issue {i + 1}
              </p>
              <h3 className="mt-1 font-semibold" style={{ color: "#1B2B4B" }}>
                {f.issue_title}
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div
                  className="rounded-lg border p-4"
                  style={{ backgroundColor: "#FEF2F2", borderColor: "#DC2626" }}
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#DC2626" }}>
                    Original
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{f.original}</p>
                </div>
                <div
                  className="rounded-lg border p-4"
                  style={{ backgroundColor: "#F0FDF4", borderColor: "#16A34A" }}
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#16A34A" }}>
                    AI Fix
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{f.fix}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Paste this into your CV</span>
                <button
                  onClick={() => copyText(f.fix, "Fix copied to clipboard")}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                  style={{ backgroundColor: "#171717" }}
                >
                  <Copy className="size-4" /> Copy Fix
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              onClick={copyAll}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: "#171717" }}
            >
              <Copy className="size-4" /> Copy All Fixes
            </button>
          </div>
        </div>
      )}

      {fixes && fixes.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          No fixes returned. Please try again.
        </p>
      )}
    </div>
  );
}