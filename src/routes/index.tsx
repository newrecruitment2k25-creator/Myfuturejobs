import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, ArrowRight, Brain, GitBranch, BarChart2,
  FileSearch, TrendingUp, Sparkles, Zap,
} from "lucide-react";
import { SiteFooter } from "@/components/site-header";

/*  Static data  */
const SEARCH_CHIPS = [
  "Software Engineer", "Data Analyst", "HR Executive",
  "Jurutera Awam", "Pembantu Tadbir", "Fresh Graduate IT",
];

const TRUST_STATS = [
  { value: "5,828",  label: "Active Vacancies",  sub: "Real employer postings" },
  { value: "1,449",  label: "Candidate Profiles", sub: "Semantically scored" },
  { value: "50+",    label: "AI Modules",          sub: "Taxonomy  NLP  Scoring" },
  { value: "MASCO",  label: "Taxonomy Standard",   sub: "Malaysian classification" },
];

const CAPABILITIES = [
  {
    tag: "Semantic Matching",
    title: 'AI that understands meaning, not just keywords',
    body: '"Software Developer" = "Programmer" = "Pembantu IT"  our semantic engine finds matches by meaning, across English and Bahasa Malaysia.',
    cta: "Try AI Matching",
    ctaTo: "/poc/ai-matching",
    accentColor: "#205295",
    Icon: Zap,
    flip: false,
  },
  {
    tag: "Skill Intelligence",
    title: "Skill gap analysis and career pathway engine",
    body: "Know exactly which skills a candidate is missing. Map progression from Junior  Senior  Lead with salary benchmarks at each step.",
    cta: "View Skill Gap",
    ctaTo: "/skill-gap",
    accentColor: "#0d7c66",
    Icon: Brain,
    flip: true,
  },
  {
    tag: "Taxonomy Intelligence",
    title: "MASCO, MSIC, NOSS, NEC and MQA mapping",
    body: "Every occupation maps to the official Malaysian taxonomy stack  enabling accurate cross-system reporting and regulatory compliance.",
    cta: "Explore Taxonomy",
    ctaTo: "/taxonomy",
    accentColor: "#b97c0e",
    Icon: GitBranch,
    flip: false,
  },
  {
    tag: "Labour Intelligence",
    title: "Market salary benchmarks and demand signals",
    body: "Aggregated from 5,828 real vacancies  compare salary ranges, identify in-demand skills, and measure supply-demand gaps for any occupation.",
    cta: "View Labour Insights",
    ctaTo: "/labour-insights",
    accentColor: "#2c74b3",
    Icon: BarChart2,
    flip: true,
  },
];

const INTEL_MODULES = [
  { icon: Brain,      label: "Skill Gap Analysis",   desc: "Find missing skills vs target role",  to: "/skill-gap",             accent: "#205295" },
  { icon: TrendingUp, label: "Career Pathway",        desc: "Junior  Senior  Lead + salary",    to: "/career-pathway",        accent: "#0d7c66" },
  { icon: FileSearch, label: "Document Intelligence", desc: "Parse resumes and job descriptions", to: "/document-intelligence", accent: "#b97c0e" },
  { icon: GitBranch,  label: "Taxonomy Intelligence", desc: "MASCO  NOSS  MQA  NEC",          to: "/taxonomy",              accent: "#2c74b3" },
  { icon: BarChart2,  label: "Labour Insights",       desc: "Market data from 5,828 vacancies",  to: "/labour-insights",       accent: "#6b46c1" },
  { icon: Sparkles,   label: "Recommended Jobs",      desc: "Personalised AI recommendations",   to: "/recommended-jobs",      accent: "#205295" },
];

/*  Route  */
export const Route = createFileRoute("/")({
  ssr: false,
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Praxo AI  PERKESO Employment Intelligence" },
      { name: "description", content: "Semantic AI job matching, skill gap analysis, and labour market intelligence for Malaysia. A PERKESO initiative." },
    ],
  }),
});

/*  Page  */
function LandingPage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const goSearch = (q: string) => {
    const t = q.trim();
    if (!t) return;
    void navigate({ to: "/jobs", search: { search: t } as any });
  };

  return (
    <div>
      {/*  HERO  */}
      <section style={{
        background: "linear-gradient(135deg, #0f2447 0%, #1a3a6b 50%, #205295 100%)",
        padding: "80px 2rem 72px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* subtle geometric bg circles */}
        <div style={{ position:"absolute", top:-80, right:-80, width:320, height:320, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-60, left:60, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.03)", pointerEvents:"none" }} />

        <div style={{ maxWidth:1280, margin:"0 auto", position:"relative", zIndex:1 }}>
          {/* eyebrow */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, padding:"4px 14px", fontSize:"0.6875rem", fontWeight:700, color:"rgba(255,255,255,0.85)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:28 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#4ade80", display:"inline-block" }} />
            PERKESO Employment Intelligence Platform
          </div>

          {/* headline */}
          <h1 style={{ fontFamily:"var(--font-heading)", fontSize:"clamp(2rem,4.5vw,3.25rem)", fontWeight:800, lineHeight:1.08, letterSpacing:"-0.03em", color:"#ffffff", margin:"0 0 1rem", maxWidth:700 }}>
            AI-Powered Job Matching<br />
            <span style={{ color:"#7dd3fc" }}>for Malaysia's Workforce</span>
          </h1>
          <p style={{ fontSize:"1.0625rem", color:"rgba(255,255,255,0.7)", lineHeight:1.7, margin:"0 0 2.5rem", maxWidth:560 }}>
            Semantic intelligence that understands occupations, skills, and career progression  across Bahasa Malaysia and English. Powered by MASCO taxonomy and real employer data.
          </p>

          {/* search bar */}
          <div style={{ display:"flex", maxWidth:580, background:"#fff", borderRadius:8, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.25)", marginBottom:"1.25rem" }}>
            <div style={{ display:"flex", alignItems:"center", flex:1, padding:"0 1rem", gap:8 }}>
              <Search size={16} style={{ color:"var(--muted)", flexShrink:0 }} />
              <input
                type="text"
                placeholder="Job title, skill, or occupation"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && goSearch(query)}
                style={{ flex:1, border:"none", outline:"none", fontSize:"0.9375rem", color:"var(--ink)", background:"transparent", padding:"0.875rem 0" }}
              />
            </div>
            <button
              onClick={() => goSearch(query)}
              style={{ flexShrink:0, background:"#205295", color:"#fff", border:"none", fontSize:"0.875rem", fontWeight:700, cursor:"pointer", padding:"0 1.5rem", transition:"background 0.15s", display:"flex", alignItems:"center", gap:6 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1a3f73"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#205295"; }}
            >
              Search <ArrowRight size={14} />
            </button>
          </div>

          {/* example chips */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem", alignItems:"center" }}>
            <span style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.5)", fontWeight:500 }}>Try:</span>
            {SEARCH_CHIPS.map(chip => (
              <button key={chip} onClick={() => goSearch(chip)}
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, fontSize:"0.75rem", fontWeight:500, color:"rgba(255,255,255,0.8)", padding:"4px 12px", cursor:"pointer", transition:"all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.18)"; el.style.color="#fff"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.08)"; el.style.color="rgba(255,255,255,0.8)"; }}
              >{chip}</button>
            ))}
          </div>
        </div>
      </section>

      {/*  TRUST BAR  */}
      <section style={{ background:"var(--base-alt)", borderBottom:"1px solid var(--line)", padding:"0" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {TRUST_STATS.map((s, i) => (
            <div key={s.label} style={{
              padding:"1.75rem 2rem",
              borderRight: i < 3 ? "1px solid var(--line)" : "none",
              display:"flex", flexDirection:"column", gap:4,
            }}>
              <div style={{ fontFamily:"var(--font-heading)", fontSize:"1.875rem", fontWeight:800, color:"var(--brand)", lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:"0.875rem", fontWeight:700, color:"var(--ink)" }}>{s.label}</div>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/*  CAPABILITIES  alternating rows  */}
      <section style={{ background:"#fff", padding:"5rem 2rem" }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"3.5rem" }}>
            <div style={{ fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--accent-blue)", marginBottom:8 }}>Platform Capabilities</div>
            <h2 style={{ fontFamily:"var(--font-heading)", fontSize:"clamp(1.5rem,3vw,2.25rem)", fontWeight:800, color:"var(--ink)", letterSpacing:"-0.025em", margin:0 }}>
              Built for government-grade employment intelligence
            </h2>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:"4rem" }}>
            {CAPABILITIES.map((cap) => (
              <div key={cap.tag} style={{
                display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3rem", alignItems:"center",
              }}>
                {/* text side */}
                <div style={{ order: cap.flip ? 2 : 1 }}>
                  <div style={{ display:"inline-block", fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:cap.accentColor, background:`${cap.accentColor}14`, borderRadius:6, padding:"3px 10px", marginBottom:"1rem" }}>{cap.tag}</div>
                  <h3 style={{ fontFamily:"var(--font-heading)", fontSize:"clamp(1.25rem,2.5vw,1.625rem)", fontWeight:800, color:"var(--ink)", letterSpacing:"-0.02em", margin:"0 0 1rem", lineHeight:1.25 }}>{cap.title}</h3>
                  <p style={{ fontSize:"0.9375rem", color:"var(--muted)", lineHeight:1.75, margin:"0 0 1.5rem" }}>{cap.body}</p>
                  <Link to={cap.ctaTo as any}
                    style={{ display:"inline-flex", alignItems:"center", gap:6, background:cap.accentColor, color:"#fff", textDecoration:"none", borderRadius:8, padding:"10px 20px", fontSize:"0.875rem", fontWeight:700, transition:"opacity 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity="0.88"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity="1"; }}
                  >
                    {cap.cta} <ArrowRight size={13} />
                  </Link>
                </div>
                {/* visual side */}
                <div style={{ order: cap.flip ? 1 : 2 }}>
                  <div style={{
                    background:`${cap.accentColor}08`,
                    border:`1px solid ${cap.accentColor}20`,
                    borderLeft:`4px solid ${cap.accentColor}`,
                    borderRadius:12,
                    padding:"2.5rem",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    minHeight:200,
                  }}>
                    <cap.Icon size={72} style={{ color:`${cap.accentColor}30` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*  INTELLIGENCE MODULES  horizontal scroll  */}
      <section style={{ background:"var(--base-alt)", borderTop:"1px solid var(--line)", borderBottom:"1px solid var(--line)", padding:"4rem 0" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 2rem", marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--accent-blue)", marginBottom:6 }}>Intelligence Modules</div>
              <h2 style={{ fontFamily:"var(--font-heading)", fontSize:"1.375rem", fontWeight:800, color:"var(--ink)", margin:0, letterSpacing:"-0.02em" }}>
                Explore every capability
              </h2>
            </div>
            <Link to="/poc/ai-matching"
              style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.8125rem", fontWeight:600, color:"var(--accent-blue)", textDecoration:"none" }}>
              View AI Matching <ArrowRight size={13} />
            </Link>
          </div>
        </div>
        <div style={{ overflowX:"auto", paddingBottom:"0.5rem" }}>
          <div style={{ display:"flex", gap:"1rem", padding:"0 2rem", width:"max-content" }}>
            {INTEL_MODULES.map(mod => (
              <Link key={mod.to} to={mod.to as any}
                style={{ textDecoration:"none", display:"block", width:220, flexShrink:0 }}
              >
                <div style={{
                  background:"#fff",
                  border:"1px solid var(--line)",
                  borderLeft:`4px solid ${mod.accent}`,
                  borderRadius:12,
                  padding:"1.5rem",
                  transition:"box-shadow 0.15s, transform 0.15s",
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow="var(--shadow-lift)"; el.style.transform="translateY(-2px)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow="none"; el.style.transform="none"; }}
                >
                  <div style={{ width:36, height:36, borderRadius:8, background:`${mod.accent}12`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"0.875rem" }}>
                    <mod.icon size={18} style={{ color:mod.accent }} />
                  </div>
                  <div style={{ fontFamily:"var(--font-heading)", fontSize:"0.9375rem", fontWeight:700, color:"var(--ink)", marginBottom:4 }}>{mod.label}</div>
                  <div style={{ fontSize:"0.8125rem", color:"var(--muted)", lineHeight:1.5 }}>{mod.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/*  CTA BANNER  */}
      <section style={{ background:"var(--brand)", padding:"4rem 2rem" }}>
        <div style={{ maxWidth:700, margin:"0 auto", textAlign:"center" }}>
          <h2 style={{ fontFamily:"var(--font-heading)", fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:800, color:"#fff", letterSpacing:"-0.025em", margin:"0 0 1rem" }}>
            Ready to see Praxo AI in action?
          </h2>
          <p style={{ fontSize:"1rem", color:"rgba(255,255,255,0.7)", margin:"0 0 2rem", lineHeight:1.7 }}>
            Run the full guided demo  semantic search, AI matching, skill gap analysis, and taxonomy intelligence  all in one flow.
          </p>
          <div style={{ display:"flex", gap:"1rem", justifyContent:"center", flexWrap:"wrap" }}>
            <Link to="/demo"
              style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#fff", color:"var(--brand)", textDecoration:"none", borderRadius:8, padding:"12px 28px", fontSize:"0.9375rem", fontWeight:700 }}>
              Start Guided Demo <ArrowRight size={14} />
            </Link>
            <Link to="/jobs"
              style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.12)", color:"#fff", border:"1px solid rgba(255,255,255,0.25)", textDecoration:"none", borderRadius:8, padding:"12px 28px", fontSize:"0.9375rem", fontWeight:600 }}>
              Browse Jobs
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />

      <style>{`
        @media (max-width: 767px) {
          .trust-grid { grid-template-columns: repeat(2,1fr) !important; }
          .cap-grid { grid-template-columns: 1fr !important; }
          .cap-grid > div { order: unset !important; }
        }
      `}</style>
    </div>
  );
}
