import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, MapPin, Loader2, Search, CheckCircle2, Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/public-layout";

const TRENDING = [
  "Software Engineer KL", "Fresh Grad IT", "Admin Selangor",
  "Data Analyst Remote", "Mechanical Engineer Penang", "Customer Service",
];

const STAT_TARGETS = [
  { target: 5828, suffix: "+", label: "Active Jobs" },
  { target: 1449, suffix: "+", label: "Candidates" },
  { target: 50,   suffix: "+", label: "AI Modules" },
  { target: 0,    suffix: "",  label: "AI Engine", display: "Praxo AI" },
];

const CATEGORIES = [
  { title: "Technology",  subtitle: "Software, IT, Data",           count: 890, bg: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=200&fit=crop&crop=faces", color: "#6366F1", key: "software" },
  { title: "Finance",     subtitle: "Banking, Accounting",          count: 620, bg: "https://images.unsplash.com/photo-1573497019236-61e7a0081f95?w=400&h=200&fit=crop&crop=faces", color: "#10B981", key: "accountant" },
  { title: "Engineering", subtitle: "Mechanical, Civil, Electrical",count: 450, bg: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=200&fit=crop&crop=faces", color: "#F59E0B", key: "engineer" },
  { title: "Marketing",   subtitle: "Digital, Brand, Growth",       count: 380, bg: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=200&fit=crop&crop=faces", color: "#EC4899", key: "marketing" },
  { title: "Healthcare",  subtitle: "Medical, Pharma, Nursing",     count: 290, bg: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=200&fit=crop&crop=faces", color: "#EF4444", key: "nurse" },
  { title: "Admin & HR",  subtitle: "Office, HR, Operations",       count: 520, bg: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=200&fit=crop&crop=faces", color: "#8B5CF6", key: "admin" },
  { title: "Education",   subtitle: "Teaching, Training",           count: 180, bg: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=400&h=200&fit=crop&crop=faces", color: "#06B6D4", key: "teacher" },
  { title: "Government",  subtitle: "Public Sector, GLC",           count: 340, bg: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop&crop=faces", color: "#64748B", key: "government" },
];

const JOBSEEKER_BULLETS = [
  "AI scores every job against your skills, location, and salary",
  "Skill gap analysis identifies exactly what you need to level up",
  "Career Pathways: Junior → Senior → Lead with salary benchmarks",
  "Taxonomy intelligence matches your occupation to real vacancies",
];

const EMPLOYER_BULLETS = [
  "AI ranks candidates by skills, occupation taxonomy, and fit — not just keywords",
  "Explainable match reports: see exactly why each candidate scores high",
  "Labour market intelligence shows if your salary is competitive",
];

const AI_ENGINES = [
  { n: 1, title: "Semantic Job Matching",     desc: "Understands 'programmer' = 'software developer' — finds jobs by meaning, not keywords" },
  { n: 2, title: "Candidate Scoring",         desc: "Scores candidates across skills, education, experience, and occupation taxonomy" },
  { n: 3, title: "Skill Gap Analysis",        desc: "Identifies exactly which skills a candidate needs for a target role" },
  { n: 4, title: "Career Pathway Engine",     desc: "Junior → Senior → Lead with skill requirements and salary benchmarks at each step" },
  { n: 5, title: "Taxonomy Intelligence",     desc: "Maps occupations to MASCO/O*NET taxonomy for accurate matching and reporting" },
  { n: 6, title: "Labour Market Insights",    desc: "Salary benchmarks, skill demand trends, and supply-demand analysis from 5,828 real vacancies" },
];

const BROWSE_TABS = {
  "Job Title": ["Software Engineer","Data Analyst","Accountant","Project Manager","HR Executive","Marketing Manager","System Admin","Web Developer","Business Analyst","Civil Engineer"],
  "Skills":    ["Python","JavaScript","SQL","Excel","Java","React","Financial Analysis","AutoCAD","SAP","Communication"],
  "Location":  ["Kuala Lumpur","Selangor","Johor","Penang","Perak","Sabah","Sarawak","Melaka","Kedah","Pahang"],
  "Companies": ["PETRONAS","Maybank","TNB","TM","CIMB","Axiata","Maxis","AirAsia","Grab","Shopee"],
};

const TESTIMONIALS = [
  { quote: "I uploaded my CV and within 24 hours I had 3 interview invitations matched to my skills. The AI knew exactly what I was looking for.", name: "Ahmad Faris", role: "Software Engineer", company: "Kuala Lumpur", initials: "AF" },
  { quote: "As an employer, the AI shortlisting saved us 40+ hours of manual screening. The interview scores were spot on.", name: "Puan Siti Rahimah", role: "HR Manager", company: "Selangor", initials: "SR" },
  { quote: "The career pathway tool showed me exactly what skills I needed to move from junior to senior. I got a 35% salary bump in 8 months.", name: "Rajesh Kumar", role: "Data Analyst", company: "Penang", initials: "RK" },
];

const COMPANIES = [
  { name: "PETRONAS",   logo: "https://logo.clearbit.com/petronas.com" },
  { name: "Maybank",    logo: "https://logo.clearbit.com/maybank2u.com.my" },
  { name: "CIMB",       logo: "https://logo.clearbit.com/cimb.com" },
  { name: "AirAsia",    logo: "https://logo.clearbit.com/airasia.com" },
  { name: "Grab",       logo: "https://logo.clearbit.com/grab.com" },
  { name: "Shopee",     logo: "https://logo.clearbit.com/shopee.com.my" },
  { name: "Axiata",     logo: "https://logo.clearbit.com/axiata.com" },
  { name: "Maxis",      logo: "https://logo.clearbit.com/maxis.com.my" },
  { name: "Lazada",     logo: "https://logo.clearbit.com/lazada.com" },
  { name: "Proton",     logo: "https://logo.clearbit.com/proton.com" },
  { name: "Celcom",     logo: "https://logo.clearbit.com/celcom.com.my" },
  { name: "Digi",       logo: "https://logo.clearbit.com/digi.com.my" },
  { name: "RHB",        logo: "https://logo.clearbit.com/rhbgroup.com" },
  { name: "Hong Leong", logo: "https://logo.clearbit.com/hongleong.com.my" },
  { name: "TNB",        logo: "https://logo.clearbit.com/tnb.com.my" },
  { name: "TM",         logo: "https://logo.clearbit.com/tm.com.my" },
];

export const Route = createFileRoute("/")({
  ssr: false,
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Praxo AI — PERKESO Employment Intelligence" },
      { name: "description", content: "Semantic job matching, candidate scoring, skill gap analysis, and labour market intelligence for Malaysia's workforce. A PERKESO initiative." },
      { name: "keywords", content: "Malaysia jobs, PERKESO, Praxo AI, AI job matching, career portal, Kuala Lumpur jobs, employment intelligence Malaysia, semantic search" },
      { property: "og:title", content: "Praxo AI — PERKESO Employment Intelligence" },
      { property: "og:description", content: "Semantic job matching, candidate scoring, skill gap analysis, and labour market insights for Malaysia." },
      { property: "og:type", content: "website" },
    ],
  }),
});

// ── Scroll-triggered fade-in hook ────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; obs.disconnect(); }
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ── Animated counter ─────────────────────────────────────────────────────────
function CountUp({ target, suffix, display }: { target: number; suffix: string; display?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (display) return;
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const steps = 60; const inc = target / steps; let cur = 0;
        const timer = setInterval(() => {
          cur = Math.min(cur + inc, target); setVal(Math.round(cur));
          if (cur >= target) clearInterval(timer);
        }, 1500 / steps);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, display]);
  if (display) return <span ref={ref}>{display}</span>;
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

function LandingPage() {
  const [query, setQuery] = useState("");
  const [jobs, setJobs]           = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<keyof typeof BROWSE_TABS>("Job Title");
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  useEffect(() => {
    (supabase as any)
      .from("poc_vacancies")
      .select("id, job_title, occupation_name, state, salary, salary_min, salary_max, skills")
      .order("id", { ascending: false })
      .limit(6)
      .then(({ data }: any) => { setJobs(data ?? []); setJobsLoading(false); });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const goSearch = (q: string, loc?: string) => {
    const term = [q.trim(), loc?.trim()].filter(Boolean).join(" ");
    if (!term) return;
    window.location.href = "/jobs?search=" + encodeURIComponent(term);
  };

  const s3 = useFadeIn(), s4 = useFadeIn(), s5 = useFadeIn(),
        s6 = useFadeIn(), s7 = useFadeIn(), s8 = useFadeIn(),
        s9 = useFadeIn(), s10 = useFadeIn();

  return (
    <PublicLayout>
      {/* ── Keyframes + responsive ── */}
      <style>{`
        @keyframes lpfloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes lpblob  { 0%,100%{transform:scale(1) translate(0,0)} 50%{transform:scale(1.08) translate(6px,-8px)} }
        .lp-float-1{animation:lpfloat 4s ease-in-out infinite}
        .lp-float-2{animation:lpfloat 4s ease-in-out infinite 1.4s}
        .lp-float-3{animation:lpfloat 4s ease-in-out infinite 2.8s}
        .lp-blob-1{animation:lpblob 8s ease-in-out infinite}
        .lp-blob-2{animation:lpblob 10s ease-in-out infinite 2s}
        @media(max-width:768px){
          .hero-grid{grid-template-columns:1fr!important}
          .split-grid{grid-template-columns:1fr!important}
          .cat-grid{grid-template-columns:repeat(2,1fr)!important}
          .job-grid{grid-template-columns:1fr!important}
          .ai-grid{grid-template-columns:1fr!important}
          .hero-right{display:none!important}
          .hero-search-row{flex-direction:column!important}
          .hero-search-row > *{border-right:none!important;border-bottom:1px solid var(--line)}
        }
      `}</style>

      {/* ══ HERO — premium split with real photo + blobs ════════════════ */}
      <section style={{ background: "linear-gradient(135deg,#f5f3ff 0%,#fff8f3 60%,#f0f9ff 100%)", overflow: "hidden", position: "relative" }}>

        {/* Decorative background blobs */}
        <div className="lp-blob-1" style={{ position: "absolute", top: -120, left: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.13) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div className="lp-blob-2" style={{ position: "absolute", bottom: -80, right: 200, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(243,108,33,0.10) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "55fr 45fr", minHeight: 580, position: "relative", zIndex: 1 }} className="hero-grid">

          {/* ── Left: headline + search ── */}
          <div style={{ padding: "72px 56px 56px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

            {/* Eyebrow badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(33,31,96,0.07)", borderRadius: 999, padding: "6px 16px", fontSize: 12, fontWeight: 700, color: "var(--brand)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 24, width: "fit-content" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              PERKESO · Employment Intelligence
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: "clamp(32px,4.5vw,52px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 12px", color: "var(--ink)" }}>
              Get Hired Faster<br />
              <span style={{ color: "var(--accent)" }}>in Malaysia.</span>
            </h1>
            <p style={{ fontSize: 17, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 36px", maxWidth: 460 }}>
              Browse 5,828 real jobs across Malaysia — from Kuala Lumpur to Sabah. We match you by skills and experience, not just keywords.
            </p>

            {/* Embedded search bar — single input */}
            <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(33,31,96,0.10)", display: "flex", maxWidth: 540, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", flex: 1, padding: "0 18px", gap: 10 }}>
                <Search size={17} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Job title, skill, company or location…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && goSearch(query)}
                  style={{ flex: 1, border: "none", outline: "none", fontSize: 15, color: "var(--ink)", background: "transparent", padding: "17px 0" }}
                />
              </div>
              <button
                onClick={() => goSearch(query)}
                style={{ flexShrink: 0, background: "var(--accent)", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", padding: "17px 32px", whiteSpace: "nowrap", transition: "background 0.15s", letterSpacing: "0.01em" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#d9580d"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
              >
                Search Jobs
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, marginLeft: 2 }}>
              Search by role, skill, occupation, or related terms. Semantic AI matching runs on the Jobs page.
            </p>

            {/* Trending chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 32 }}>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Trending:</span>
              {TRENDING.map(tag => (
                <button key={tag} onClick={() => goSearch(tag)}
                  style={{ background: "rgba(255,255,255,0.8)", border: "1px solid var(--line)", borderRadius: 999, fontSize: 12, fontWeight: 500, color: "var(--brand)", padding: "4px 14px", cursor: "pointer", transition: "all 0.15s", backdropFilter: "blur(4px)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--brand)"; (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.8)"; (e.currentTarget as HTMLElement).style.color = "var(--brand)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; }}
                >{tag}</button>
              ))}
            </div>

            {/* Inline stat row */}
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              {[
                { val: "5,828+", label: "Live Jobs" },
                { val: "1,449+", label: "Candidates" },
                { val: "50+",    label: "AI Modules" },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: real photo + decorative shapes ── */}
          <div className="hero-right" style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingTop: 40 }}>

            {/* Orange blob shape behind person */}
            <div style={{ position: "absolute", bottom: 0, right: "5%", width: "72%", height: "82%", borderRadius: "50% 50% 0 0", background: "linear-gradient(160deg,rgba(243,108,33,0.18) 0%,rgba(243,108,33,0.06) 100%)", zIndex: 0 }} />
            {/* Purple circle accent */}
            <div style={{ position: "absolute", top: "18%", right: "8%", width: 56, height: 56, borderRadius: "50%", background: "var(--brand)", opacity: 0.12, zIndex: 0 }} />
            <div style={{ position: "absolute", top: "34%", left: "6%", width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", opacity: 0.25, zIndex: 0 }} />

            {/* Real photo — Malaysian professionals working together */}
            <img
              src="/landing-hero.jpg"
              alt="Malaysian professionals working together"
              loading="eager"
              style={{ position: "relative", zIndex: 1, width: "88%", maxWidth: 380, objectFit: "cover", objectPosition: "top center", borderRadius: "24px 24px 0 0", display: "block" }}
              onError={e => {
                const img = e.currentTarget as HTMLImageElement;
                img.src = "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=700&fit=crop&crop=top";
              }}
            />

            {/* Floating stat card — top left */}
            <div className="lp-float-1" style={{ position: "absolute", top: "10%", left: "2%", background: "#fff", borderRadius: 14, padding: "14px 18px", boxShadow: "0 8px 28px rgba(33,31,96,0.13)", zIndex: 2, minWidth: 140 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}><CountUp target={5828} suffix="+" /></div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>Active Jobs</div>
            </div>

            {/* Floating stat card — middle right */}
            <div className="lp-float-2" style={{ position: "absolute", top: "44%", right: "-2%", background: "#fff", borderRadius: 14, padding: "14px 18px", boxShadow: "0 8px 28px rgba(33,31,96,0.13)", zIndex: 2, minWidth: 140 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", lineHeight: 1 }}><CountUp target={1449} suffix="+" /></div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>Candidates</div>
            </div>

            {/* Floating badge — AI Engine */}
            <div className="lp-float-3" style={{ position: "absolute", bottom: "14%", left: "0%", background: "var(--brand)", borderRadius: 12, padding: "10px 16px", boxShadow: "0 8px 24px rgba(33,31,96,0.22)", zIndex: 2, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🤖</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1 }}>Praxo AI Engine</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>Powered Engine</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ══ COMPANY LOGOS — infinite scroll marquee ══════════════════════ */}
      <section style={{ overflow: "hidden", position: "relative", padding: "30px 0", background: "var(--base)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginBottom: 20, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Trusted by Malaysia's Leading Employers
        </p>
        <div style={{ overflow: "hidden", position: "relative", maskImage: "linear-gradient(to right,transparent 0%,black 8%,black 92%,transparent 100%)", WebkitMaskImage: "linear-gradient(to right,transparent 0%,black 8%,black 92%,transparent 100%)" }}>
          <div style={{ display: "flex", animation: "marquee 30s linear infinite", width: "max-content" }}>
            {[...COMPANIES, ...COMPANIES].map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 32px", flexShrink: 0 }}>
                <img
                  src={c.logo}
                  alt={c.name}
                  loading="lazy"
                  style={{ height: 36, objectFit: "contain", filter: "grayscale(100%)", opacity: 0.5, transition: "all 0.3s" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLImageElement; el.style.filter = "grayscale(0%)"; el.style.opacity = "1"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLImageElement; el.style.filter = "grayscale(100%)"; el.style.opacity = "0.5"; }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ EXPLORE BY CATEGORY — image cards ════════════════════════════ */}
      <section style={{ background: "#fff", padding: "50px 24px" }}>
        <div ref={s3} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Explore by Category</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>Browse opportunities by industry</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }} className="cat-grid">
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => goSearch(cat.key)}
                style={{ height: 160, borderRadius: 16, overflow: "hidden", position: "relative", cursor: "pointer", border: "none", padding: 0, transition: "all 0.2s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "scale(1.02)"; el.style.boxShadow = "0 10px 32px rgba(0,0,0,0.18)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "none"; }}
              >
                <img src={cat.bg} alt={cat.title} loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.background = cat.color; (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                {/* dark overlay */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.22) 100%)" }} />
                {/* text */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px", textAlign: "left" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{cat.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2, marginBottom: 6 }}>{cat.subtitle}</div>
                  <span style={{ background: cat.color + "CC", color: "#fff", fontSize: 11, fontWeight: 600, borderRadius: 5, padding: "2px 8px" }}>{cat.count}+ jobs</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOR JOBSEEKERS — stock image split ════════════════════════════ */}
      <section style={{ background: "#F8FAFC", padding: "60px 24px" }}>
        <div ref={s4} style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "55fr 45fr", gap: 56, alignItems: "center" }} className="split-grid">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>FOR JOBSEEKERS</div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", margin: "0 0 18px", letterSpacing: "-0.02em", lineHeight: 1.25 }}>Find the right job,<br />on your terms</h2>
            <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 24px" }}>
              Praxo AI matches your skills, occupation, and career goals to real vacancies — using semantic AI, not just keywords. Discover roles you'd never find by searching manually.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {JOBSEEKER_BULLETS.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <CheckCircle2 size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>{b}</span>
                </div>
              ))}
            </div>
            <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--accent)", color: "#fff", textDecoration: "none", borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 700 }}>
              Create your profile <ArrowRight size={14} />
            </Link>
          </div>
          {/* Right: stock photo with floating badge */}
          <div style={{ position: "relative" }}>
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}>
              <img src="/landing-professional.jpg" alt="Professional jobseeker in Malaysia"
                loading="lazy" style={{ width: "100%", height: 340, objectFit: "cover", display: "block" }}
                onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?w=600&h=500&fit=crop&crop=faces"; }}
              />
            </div>
            {/* floating stat card */}
            <div style={{ position: "absolute", bottom: -16, left: -16, background: "#fff", borderRadius: 12, padding: "12px 18px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>92%</div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, lineHeight: 1.3 }}>Match Rate<br />from CV Upload</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOR EMPLOYERS — stock image split reversed ════════════════════ */}
      <section style={{ background: "#fff", padding: "60px 24px" }}>
        <div ref={s5} style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "45fr 55fr", gap: 56, alignItems: "center" }} className="split-grid">
          {/* Left: Malaysian hiring team photo */}
          <div style={{ position: "relative" }}>
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}>
              <img src="/landing-team.jpg" alt="Malaysian hiring team collaboration"
                loading="lazy" style={{ width: "100%", height: 340, objectFit: "cover", display: "block" }}
                onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=500&fit=crop&crop=faces"; }}
              />
            </div>
            <div style={{ position: "absolute", top: -16, right: -16, background: "#fff", borderRadius: 12, padding: "12px 18px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>1,449</div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, lineHeight: 1.3 }}>Candidate<br />Profiles</div>
            </div>
          </div>
          {/* Right: text */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>FOR EMPLOYERS</div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", margin: "0 0 16px", letterSpacing: "-0.02em", lineHeight: 1.25 }}>Hire smarter,<br />not harder</h2>
            <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 24px" }}>
              With access to 1,449+ candidate profiles and AI matching, filling your open roles has never been faster.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {EMPLOYER_BULLETS.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <CheckCircle2 size={16} style={{ color: "#15803d", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.55 }}>{b}</span>
                </div>
              ))}
            </div>
            <Link to="/employer/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--brand)", color: "#fff", textDecoration: "none", borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 700 }}>
              Start hiring <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══ LIVE JOBS SHOWCASE ════════════════════════════════════════════ */}
      <section style={{ background: "#F8FAFC", padding: "50px 24px" }}>
        <div ref={s6} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", margin: 0, letterSpacing: "-0.02em" }}>Jobs hiring right now</h2>
            <Link to="/jobs" style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View all 5,828 jobs <ArrowRight size={14} />
            </Link>
          </div>
          {jobsLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <Loader2 size={22} className="animate-spin" style={{ color: "var(--muted)" }} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }} className="job-grid">
              {jobs.map(job => {
                const salary = job.salary ?? (job.salary_min && job.salary_max ? `RM${Number(job.salary_min).toLocaleString()}–RM${Number(job.salary_max).toLocaleString()}` : null);
                const skills = (job.skills ?? "").split(/[,;|]+/).map((s: string) => s.trim()).filter(Boolean).slice(0, 2);
                return (
                  <button key={job.id} onClick={() => goSearch(job.job_title ?? "")}
                    style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 18, textAlign: "left", display: "flex", flexDirection: "column", gap: 10, transition: "all 0.15s", cursor: "pointer" }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; el.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "none"; el.style.borderColor = "var(--line)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ width: 40, height: 40, background: "var(--brand)", color: "#fff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                        {(job.job_title ?? "J")[0].toUpperCase()}
                      </div>
                      {salary && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "rgba(243,108,33,0.08)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>{salary.startsWith("RM") ? salary : `RM ${salary}`}</span>}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.35, margin: "0 0 3px" }}>{job.job_title ?? "Untitled Role"}</p>
                      {job.state && <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} />{job.state}</p>}
                    </div>
                    {skills.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {skills.map((sk: string, idx: number) => (
                          <span key={idx} style={{ fontSize: 11, color: "var(--brand)", background: "rgba(33,31,96,0.06)", borderRadius: 4, padding: "2px 8px" }}>{sk}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: "auto", textAlign: "right" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>Apply →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══ AI ENGINES — dark section ═════════════════════════════════════ */}
      <section style={{ background: "var(--brand)", padding: "60px 24px" }}>
        <div ref={s7} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Powered by 6 AI engines</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", margin: 0 }}>Every interaction is intelligent. Every recommendation is explainable.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }} className="ai-grid">
            {AI_ENGINES.map(e => (
              <div key={e.n}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, transition: "all 0.15s" }}
                onMouseEnter={el => { const t = el.currentTarget as HTMLElement; t.style.background = "rgba(255,255,255,0.1)"; t.style.boxShadow = "0 0 40px rgba(99,102,241,0.15)"; t.style.transform = "translateY(-2px)"; }}
                onMouseLeave={el => { const t = el.currentTarget as HTMLElement; t.style.background = "rgba(255,255,255,0.06)"; t.style.boxShadow = "none"; t.style.transform = "none"; }}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{e.n}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 }}>{e.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{e.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BROWSE JOBS & COMPANIES — tabs ════════════════════════════════ */}
      <section style={{ background: "#F8FAFC", padding: "50px 24px" }}>
        <div ref={s8} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", margin: "0 0 28px", letterSpacing: "-0.02em", textAlign: "center" }}>Browse Jobs &amp; Companies</h2>
          <div style={{ display: "flex", justifyContent: "center", gap: 0, borderBottom: "2px solid var(--line)", marginBottom: 28, overflowX: "auto" }}>
            {(Object.keys(BROWSE_TABS) as (keyof typeof BROWSE_TABS)[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: "10px 22px", fontSize: 14, fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? "var(--accent)" : "var(--muted)", background: "none", border: "none", cursor: "pointer", borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -2, transition: "all 0.15s", whiteSpace: "nowrap" }}
              >{tab}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 24px", marginBottom: 28, justifyContent: "center" }}>
            {BROWSE_TABS[activeTab].map(term => (
              <button key={term} onClick={() => goSearch(term)}
                style={{ fontSize: 14, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", padding: "4px 0", transition: "color 0.12s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
              >{term}</button>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <Link to="/jobs" style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 22px", textDecoration: "none", display: "inline-block" }}>
              Browse all jobs →
            </Link>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS — carousel ════════════════════════════════════════ */}
      <section style={{ background: "#fff", padding: "50px 24px" }}>
        <div ref={s9} style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", margin: "0 0 40px", letterSpacing: "-0.02em" }}>What our users say</h2>
          <div style={{ minHeight: 200, transition: "all 0.3s" }}>
            <span style={{ fontSize: 52, lineHeight: 1, color: "var(--accent)", fontFamily: "Georgia, serif" }}>&ldquo;</span>
            <p style={{ fontSize: 19, color: "var(--ink)", fontStyle: "italic", lineHeight: 1.7, margin: "-10px 0 28px" }}>
              {TESTIMONIALS[testimonialIdx].quote}
            </p>
            <div style={{ display: "flex", gap: 2, justifyContent: "center", marginBottom: 20 }}>
              {[1,2,3,4,5].map(s => <Star key={s} size={15} fill="#f59e0b" style={{ color: "#f59e0b" }} />)}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                {TESTIMONIALS[testimonialIdx].initials}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{TESTIMONIALS[testimonialIdx].name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{TESTIMONIALS[testimonialIdx].role} · {TESTIMONIALS[testimonialIdx].company}</div>
              </div>
            </div>
          </div>
          {/* Dots */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 28 }}>
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setTestimonialIdx(i)}
                style={{ width: i === testimonialIdx ? 24 : 8, height: 8, borderRadius: 999, background: i === testimonialIdx ? "var(--accent)" : "var(--line)", border: "none", cursor: "pointer", transition: "all 0.3s", padding: 0 }} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA — background image ══════════════════════════════════ */}
      <section style={{ padding: "0 32px 50px" }}>
        <div ref={s10} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ position: "relative", borderRadius: 24, overflow: "hidden" }}>
            <img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1400&h=400&fit=crop&crop=faces"
              alt="" loading="lazy" style={{ width: "100%", height: 320, objectFit: "cover", display: "block" }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(15,23,42,0.92), rgba(15,23,42,0.72))" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 24px" }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: "#fff", margin: "0 0 14px", letterSpacing: "-0.02em" }}>
                Your next opportunity is one search away
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", margin: "0 0 32px", maxWidth: 500, lineHeight: 1.65 }}>
                Join thousands of Malaysians using AI to advance their careers. Find jobs, discover companies, get advice, and more.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", background: "var(--accent)", color: "#fff", textDecoration: "none", borderRadius: 10, fontSize: 15, fontWeight: 700 }}>
                  Create your free profile <ArrowRight size={15} />
                </Link>
                <Link to="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", background: "transparent", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", textDecoration: "none", borderRadius: 10, fontSize: 15, fontWeight: 600 }}>
                  Browse Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
