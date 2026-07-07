import { createFileRoute } from "@tanstack/react-router";
import { InterviewPreparation } from "@/components/interview-preparation";

export const Route = createFileRoute("/interview-preparation")({
  ssr: false,
  component: InterviewPreparationPage,
  head: () => ({
    meta: [
      { title: "Interview Preparation — PerksoPrax AI" },
      { name: "description", content: "Personalized interview questions and preparation strategies for Malaysia's job market." },
    ],
  }),
});

function InterviewPreparationPage() {
  const raw = sessionStorage.getItem("PerksoPrax AI:lastResult");

  if (!raw) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-foreground mb-4">No CV Analysis Found</h2>
            <p className="text-muted-foreground mb-6">
              Please analyze your CV first to generate personalized interview preparation.
            </p>
            <a
              href="/analyze"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Analyze CV
            </a>
          </div>
        </div>
      </div>
    );
  }

  try {
    const { result, meta } = JSON.parse(raw);

    return (
      <div className="min-h-screen bg-background">
        <InterviewPreparation result={result} meta={meta} />
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-foreground mb-4">Error Loading Data</h2>
            <p className="text-muted-foreground mb-6">
              There was an error loading your CV analysis. Please try analyzing your CV again.
            </p>
            <a
              href="/analyze"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Analyze CV Again
            </a>
          </div>
        </div>
      </div>
    );
  }
}
