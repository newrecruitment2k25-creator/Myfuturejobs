import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users, Briefcase, Activity, BarChart3, ArrowRight, Brain, Search, FileText, TrendingUp,
} from "lucide-react";
import { getPocStats } from "@/lib/poc-matching.functions";

export const Route = createFileRoute("/poc/dashboard")({
  ssr: false,
  component: PocDashboardPage,
  head: () => ({
    meta: [
      { title: "PERKESO POC Dashboard — PerksoPrax AI" },
      { name: "description", content: "PERKESO AI Job Matching POC — semantic matching engine demo." },
    ],
  }),
});

type Stats = {
  vacancies: number;
  candidates: number;
  activityLogs: number;
  behaviourRows: number;
  eduDistribution: [string, number][];
  stateDistribution: [string, number][];
};

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 flex items-start gap-4">
      <div className="rounded-lg bg-primary/10 p-3 text-primary">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function ActionCard({ href, icon, title, description, badge }: { href: string; icon: React.ReactNode; title: string; description: string; badge?: string }) {
  return (
    <Link
      to={href as "/poc/recommendations"}
      className="group rounded-xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {icon}
        </div>
        {badge && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {badge}
          </span>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium text-primary mt-auto">
        Launch <ArrowRight className="size-3" />
      </div>
    </Link>
  );
}

function PocDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPocStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              PERKESO POC
            </span>
            <span className="text-xs text-muted-foreground">Proof of Concept</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            AI-Powered Job Matching Engine
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Semantic job matching with explainable AI recommendations. Demonstrates PERKESO's next-generation employment facilitation capability — matching 1,449 jobseekers against 5,828 vacancies using skills taxonomy, behavioural signals, and the PerksoPrax AI AI reasoning engine.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            icon={<Briefcase className="size-5" />}
            label="Job Vacancies"
            value={loading ? "—" : stats!.vacancies.toLocaleString()}
            sub="Across all Malaysian states"
          />
          <StatCard
            icon={<Users className="size-5" />}
            label="Candidates"
            value={loading ? "—" : stats!.candidates.toLocaleString()}
            sub="With full skills profiles"
          />
          <StatCard
            icon={<Activity className="size-5" />}
            label="Activity Logs"
            value={loading ? "—" : stats!.activityLogs.toLocaleString()}
            sub="Behavioural signals"
          />
          <StatCard
            icon={<BarChart3 className="size-5" />}
            label="Behaviour Profiles"
            value={loading ? "—" : stats!.behaviourRows.toLocaleString()}
            sub="Application + interview signals"
          />
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-semibold text-foreground mb-4">Matching Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <ActionCard
            href="/poc/recommendations"
            icon={<Brain className="size-5" />}
            title="Match Candidate to Jobs"
            description="Select a jobseeker — AI finds the best-fit vacancies with skill gap analysis and career pathway."
            badge="Live AI"
          />
          <ActionCard
            href="/poc/employer-matching"
            icon={<Search className="size-5" />}
            title="Find Candidates for Vacancy"
            description="Select a job vacancy — AI ranks the most qualified candidates with engagement scores."
            badge="Live AI"
          />
          <ActionCard
            href="/poc/vacancy-parser"
            icon={<FileText className="size-5" />}
            title="Parse Vacancy Document"
            description="Upload a JD and AI extracts structured vacancy data ready for matching."
          />
          <ActionCard
            href="/employer/labour-market-intelligence"
            icon={<TrendingUp className="size-5" />}
            title="Labour Market Intelligence"
            description="Explore occupation demand, salary benchmarks, and skills trends across Malaysia."
          />
        </div>

        {/* Distribution Charts */}
        {!loading && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Education distribution */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Candidate Education Distribution</h3>
              <div className="space-y-3">
                {stats.eduDistribution.map(([edu, count]) => {
                  const pct = Math.round((count / stats.candidates) * 100);
                  const label = edu.length > 35 ? edu.slice(0, 35) + "…" : edu;
                  return (
                    <div key={edu}>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span title={edu}>{label}</span>
                        <span className="font-medium text-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* State distribution */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Candidate Preferred State</h3>
              <div className="space-y-3">
                {stats.stateDistribution.map(([state, count]) => {
                  const pct = Math.round((count / stats.candidates) * 100);
                  return (
                    <div key={state}>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{state}</span>
                        <span className="font-medium text-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
