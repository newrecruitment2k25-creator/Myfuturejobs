import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { generateCoverLetter } from "@/lib/cover-letter.functions";
import type { AnalysisResult } from "@/lib/analyze.functions";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  analysis: AnalysisResult;
  companyType: string;
};

export function CoverLetterDialog({ open, onOpenChange, analysis, companyType }: Props) {
  const generate = useServerFn(generateCoverLetter);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);

  const reset = () => {
    setFullName("");
    setJobTitle("");
    setCompanyName("");
    setLetter(null);
    setLoading(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleGenerate = async () => {
    if (!jobTitle.trim() || !companyName.trim()) {
      toast.error("Please fill in job title and company name");
      return;
    }
    setLoading(true);
    try {
      const res = await generate({
        data: {
          full_name: fullName.trim() || undefined,
          job_title: jobTitle.trim(),
          company_name: companyName.trim(),
          company_type: companyType,
          analysis,
        },
      });
      setLetter(res.letter);
    } catch (e) {
      toast.error("Couldn't generate cover letter", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const handleDownload = () => {
    if (!letter) return;
    try {
      const safe = (s: string) =>
        s
          .trim()
          .replace(/[^a-zA-Z0-9-_]+/g, "_")
          .replace(/^_+|_+$/g, "") || "Untitled";
      const filename = `CoverLetter_${safe(jobTitle)}_${safe(companyName)}.txt`;
      const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      toast.success("Download started");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Couldn't download. Try copying instead.");
    }
  };

  const handleWhatsApp = () => {
    if (!letter) return;
    const text = encodeURIComponent(letter);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {!letter ? (
          <>
            <DialogHeader>
              <DialogTitle>Generate AI Cover Letter</DialogTitle>
              <DialogDescription>
                Tailored for the Malaysian job market using your CV analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="full-name">Your Full Name</Label>
                <Input
                  id="full-name"
                  placeholder="e.g. Ahmad bin Razak (optional)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-title">Job Title you are applying for</Label>
                <Input
                  id="job-title"
                  placeholder="e.g. Marketing Executive"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="e.g. Maybank"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate Cover Letter"
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Your Cover Letter</DialogTitle>
              <DialogDescription>
                {jobTitle} — {companyName}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              className="min-h-[300px] font-serif text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Customize this letter before sending — personalization matters.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="size-4" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="size-4" /> Download TXT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsApp}
                className="border-[#25D366] text-[#128C7E] hover:bg-[#25D366]/10"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
                Generate another
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}