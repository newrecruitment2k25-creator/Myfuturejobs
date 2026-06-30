import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/poc/vacancy-parser")({
  ssr: false,
  component: PocVacancyParserPage,
  head: () => ({
    meta: [{ title: "Vacancy Parser — PERKESO POC" }],
  }),
});

function PocVacancyParserPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-20 flex flex-col items-center justify-center text-center">
        <div className="rounded-xl border border-dashed border-border p-12 max-w-md">
          <div className="rounded-lg bg-muted inline-flex p-4 mb-4">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Vacancy Document Parser</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Upload a job description document and AI will extract structured vacancy data — job title, required skills, education, salary, and location — ready for the matching engine.
          </p>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            Coming Soon
          </span>
          <div className="mt-8">
            <Link to="/poc/dashboard" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <ArrowLeft className="size-3.5" /> Back to POC Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
