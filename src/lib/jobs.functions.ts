import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  keywords: z.array(z.string()).max(10).default([]),
  industry: z.string().max(100).optional().default(""),
});

export type JobItem = {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string | null;
  job_country?: string | null;
  job_employment_type?: string | null;
  job_posted_at_datetime_utc?: string | null;
  job_apply_link: string;
};

export const searchJobs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.VITE_RAPIDAPI_KEY;
    const kws = data.keywords.map((k) => k.trim()).filter(Boolean);
    const top = kws.slice(0, 3);
    const industry = (data.industry || "").trim();

    const q1Parts = [top[0], top[1]].filter(Boolean).join(" ").trim();
    const query1 = `${q1Parts || industry || "jobs"} Malaysia`.trim();
    const query2 = `${industry || top[0] || "jobs"} jobs Kuala Lumpur Malaysia`.trim();

    async function call(q: string): Promise<JobItem[]> {
      if (!key) return [];
      const u = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q)}&page=1&num_pages=1&date_posted=all`;
      console.log("[jobs] GET", u);
      try {
        const r = await fetch(u, {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
          },
        });
        const t = await r.text();
        console.log("[jobs] status", r.status, "len", t.length);
        if (!r.ok) return [];
        const json: { data?: JobItem[] } = JSON.parse(t);
        return json.data ?? [];
      } catch (e) {
        console.error("[jobs] call failed", e);
        return [];
      }
    }

    const [a, b] = await Promise.all([call(query1), call(query2)]);
    const seen = new Set<string>();
    const merged: JobItem[] = [];
    for (const j of [...a, ...b]) {
      const id = j.job_id || `${j.job_title}-${j.employer_name}`;
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push({
        job_id: id,
        job_title: j.job_title,
        employer_name: j.employer_name,
        job_city: j.job_city ?? null,
        job_country: j.job_country ?? null,
        job_employment_type: j.job_employment_type ?? null,
        job_posted_at_datetime_utc: j.job_posted_at_datetime_utc ?? null,
        job_apply_link: j.job_apply_link,
      });
      if (merged.length >= 6) break;
    }

    let usedFallback = false;
    if (merged.length === 0) {
      usedFallback = true;
      const ind = industry || "Business";
      const fb: JobItem[] = [
        {
          job_id: "fb-1",
          job_title: `${ind} Executive`,
          employer_name: "Grab Malaysia",
          job_city: "Kuala Lumpur",
          job_country: "Malaysia",
          job_employment_type: "FULLTIME",
          job_posted_at_datetime_utc: null,
          job_apply_link: "https://www.jobstreet.com.my",
        },
        {
          job_id: "fb-2",
          job_title: `${ind} Specialist`,
          employer_name: "Axiata Group",
          job_city: "Kuala Lumpur",
          job_country: "Malaysia",
          job_employment_type: "FULLTIME",
          job_posted_at_datetime_utc: null,
          job_apply_link: "https://www.jobstreet.com.my",
        },
        {
          job_id: "fb-3",
          job_title: `Senior ${ind} Analyst`,
          employer_name: "Maybank",
          job_city: "Kuala Lumpur",
          job_country: "Malaysia",
          job_employment_type: "FULLTIME",
          job_posted_at_datetime_utc: null,
          job_apply_link: "https://www.jobstreet.com.my",
        },
      ];
      merged.push(...fb);
    }

    return { jobs: merged, matchedKeywords: top, usedFallback };
  });
