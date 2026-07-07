import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Loader2, MapPin, DollarSign, Briefcase, ArrowRight, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/recommended-jobs")({
  ssr: false,
  component: RecommendedJobsPage,
  head: () => ({
    meta: [
      { title: "Recommended Jobs — PerksoPrax AI" },
      { name: "description", content: "Personalised AI job recommendations matched to your skills and career profile." },
    ],
  }),
});

type Job = {
  id: string;
  job_title: string | null;
  occupation_name: string | null;
  state: string | null;
  city: string | null;
  salary: string | null;
  skills: string | null;
  score?: number;
};

function RecommendedJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [user]);

  async function loadRecommendations() {
    setLoading(true);
    try {
      if (user) {
        // Try semantic recommendations via API
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_recommended_jobs", user_id: user.id, limit: 20 }),
        });
        const data = await res.json();
        if (data.ok && data.jobs?.length) {
          setJobs(data.jobs);
          setLoaded(true);
          setLoading(false);
          return;
        }
      }
      // Fallback: load latest vacancies
      const { data } = await supabase
        .from("poc_vacancies")
        .select("id, job_title, occupation_name, state, city, salary, skills")
        .order("id", { ascending: false })
        .limit(20);
      setJobs((data as Job[]) ?? []);
    } catch {
      // silent fallback
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }

  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: "1.25rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--base-alt)" }}>
      {/* Page header */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--line)", padding: "1.5rem 2rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-blue)", background: "rgba(32,82,149,0.08)", borderRadius: 6, padding: "3px 10px" }}>Intelligence</span>
            <Link to="/jobs" style={{ fontSize: "0.75rem", color: "var(--muted)", textDecoration: "none" }}>← Job Search</Link>
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.25rem,3vw,1.75rem)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.025em", margin: 0 }}>
            Recommended Jobs
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--muted)", marginTop: 6, maxWidth: 560, lineHeight: 1.6 }}>
            {user
              ? "AI-matched vacancies based on your skills and career profile."
              : "Top vacancies from the POC dataset. Sign in for personalised recommendations."}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "1.5rem 2rem" }}>
        {/* Not signed in banner */}
        {!user && (
          <div style={{ ...card, marginBottom: "1.25rem", borderLeft: "3px solid var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Brain size={18} style={{ color: "var(--accent-blue)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.9375rem", color: "var(--ink)" }}>
                <strong>Sign in</strong> to get personalised AI recommendations matched to your skills.
              </span>
            </div>
            <Link to="/login"
              style={{ flexShrink: 0, background: "var(--accent-blue)", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: "0.875rem", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Sign In <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", padding: "2rem 0" }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading recommendations…
          </div>
        )}

        {loaded && !loading && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
              <Sparkles size={14} style={{ color: "var(--accent-blue)" }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)" }}>
                {jobs.length} job{jobs.length !== 1 ? "s" : ""} {user ? "matched for you" : "from POC dataset"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
              {jobs.map((job, idx) => (
                <div key={job.id} style={{
                  ...card,
                  borderLeft: "3px solid var(--accent-blue)",
                  transition: "box-shadow 0.15s, transform 0.15s",
                  cursor: "pointer",
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "var(--shadow-lift)"; el.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
                >
                  {/* Rank badge */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <span style={{ background: "rgba(32,82,149,0.08)", color: "var(--accent-blue)", borderRadius: 6, fontSize: "0.6875rem", fontWeight: 800, padding: "2px 8px" }}>
                      #{idx + 1}
                    </span>
                    {job.score !== undefined && (
                      <span style={{ background: "rgba(13,124,102,0.09)", color: "#0d7c66", borderRadius: 6, fontSize: "0.6875rem", fontWeight: 700, padding: "2px 8px" }}>
                        {Math.round(job.score * 100)}% match
                      </span>
                    )}
                  </div>

                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                    {job.job_title || job.occupation_name || "Untitled Role"}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "0.75rem" }}>
                    {(job.state || job.city) && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8125rem", color: "var(--muted)" }}>
                        <MapPin size={12} />{job.city || job.state}{job.city && job.state ? `, ${job.state}` : ""}
                      </span>
                    )}
                    {job.salary && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8125rem", color: "var(--muted)" }}>
                        <DollarSign size={12} />{job.salary}
                      </span>
                    )}
                  </div>

                  {job.skills && (
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5, marginBottom: "0.875rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
                      {job.skills}
                    </div>
                  )}

                  <Link to="/jobs" search={{ search: job.job_title || job.occupation_name || "" } as any}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.8125rem", fontWeight: 600, color: "var(--accent-blue)", textDecoration: "none" }}>
                    <Briefcase size={12} /> View similar jobs <ArrowRight size={11} />
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
