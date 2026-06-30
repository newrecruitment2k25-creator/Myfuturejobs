import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase } from "lucide-react";
import { searchJobs, type JobItem } from "@/lib/jobs.functions";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { keywords: string[]; industry?: string };

const FILTERS = ["All", "Full-time", "Part-time", "Remote"] as const;
type Filter = (typeof FILTERS)[number];

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function prettyType(t?: string | null) {
  if (!t) return "";
  return t
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function JobRecommendations({ keywords, industry = "" }: Props) {
  const fetchJobs = useServerFn(searchJobs);
  const [jobs, setJobs] = useState<JobItem[] | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");

  useEffect(() => {
    let cancelled = false;
    setJobs(null);
    setError(false);
    fetchJobs({ data: { keywords, industry } })
      .then((res) => {
        if (cancelled) return;
        console.log("[jobs] received", res);
        setJobs(res.jobs);
        setMatched(res.matchedKeywords ?? []);
      })
      .catch((e) => {
        console.error("Job fetch failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [keywords.join("|"), industry, fetchJobs]);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const f = jobs.filter((j) => {
      const type = (j.job_employment_type || "").toLowerCase();
      const title = j.job_title.toLowerCase();
      if (filter === "All") return true;
      if (filter === "Full-time") return type.includes("fulltime") || type.includes("full");
      if (filter === "Part-time") return type.includes("parttime") || type.includes("part");
      if (filter === "Remote") return title.includes("remote") || type.includes("remote");
      return true;
    });
    return f.slice(0, 6);
  }, [jobs, filter]);

  const isLoading = jobs === null && !error;
  const isEmpty = !isLoading && (error || (jobs && filtered.length === 0));

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Briefcase className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#1B2B4B" }}>
            Jobs Matching Your Profile in Malaysia
          </h2>
          <p className="text-sm text-muted-foreground">Based on your CV analysis</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {matched.length > 0 && (
          <p className="mb-2 w-full text-sm text-muted-foreground">
            Jobs matched to your CV keywords:{" "}
            <span className="font-medium text-foreground">{matched.join(", ")}</span>
          </p>
        )}
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border p-5"
              style={{ borderColor: "#E5E5E5" }}
            >
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-3 h-4 w-1/2" />
              <Skeleton className="mt-2 h-3 w-2/5" />
              <Skeleton className="mt-4 h-9 w-28" />
            </div>
          ))}

        {!isLoading &&
          !isEmpty &&
          filtered.map((j) => (
            <article
              key={j.job_id}
              className="flex flex-col rounded-xl border bg-card p-5"
              style={{ borderColor: "#E5E5E5" }}
            >
              <h3 className="text-base font-bold leading-snug" style={{ color: "#1B2B4B" }}>
                {j.job_title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{j.employer_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[j.job_city, j.job_country].filter(Boolean).join(", ") || "Malaysia"}
                {j.job_posted_at_datetime_utc
                  ? ` · ${formatDate(j.job_posted_at_datetime_utc)}`
                  : ""}
              </p>
              {j.job_employment_type && (
                <span className="mt-3 inline-flex w-fit items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                  {prettyType(j.job_employment_type)}
                </span>
              )}
              <a
                href={j.job_apply_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-fit items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#171717" }}
              >
                Apply Now
              </a>
            </article>
          ))}
      </div>

      {isEmpty && (
        <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No matching jobs found right now.
          <br />
          Try updating your CV keywords.
        </p>
      )}

      {!isLoading && !isEmpty && (
        <p className="mt-6 text-xs text-muted-foreground">
          Jobs sourced from Malaysian job boards. Click Apply Now to visit the official job
          listing.
        </p>
      )}
    </section>
  );
}