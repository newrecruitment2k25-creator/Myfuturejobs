import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, ArrowRight, Brain, GitBranch, BarChart2,
  FileSearch, TrendingUp, Sparkles, Zap, Users, Building2, Shield, CheckCircle2, Play,
} from "lucide-react";
import { SiteFooter } from "@/components/site-header";
import { useLanguage } from "@/lib/language-context";

/*  Static data  */
const SEARCH_CHIPS = [
  "Software Engineer", "Data Analyst", "HR Executive",
  "Jurutera Awam", "Pembantu Tadbir", "Fresh Graduate IT",
];

/*  Route  */
export const Route = createFileRoute("/")({
  ssr: false,
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "MYFutureJobs  PERKESO Employment Intelligence" },
      { name: "description", content: "Semantic AI job matching, skill gap analysis, and labour market intelligence for Malaysia. A PERKESO initiative." },
    ],
  }),
});

/*  Page  */
function LandingPage() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const goSearch = (q: string) => {
    const t2 = q.trim();
    if (!t2) return;
    void navigate({ to: "/jobs", search: { search: t2 } as any });
  };

  const TRUST_STATS = [
    { value: "5,828",  label: t("landingTrustVacancies"),  sub: t("landingTrustVacanciesSub") },
    { value: "1,449",  label: t("landingTrustCandidates"), sub: t("landingTrustCandidatesSub") },
    { value: "50+",    label: t("landingTrustModules"),     sub: t("landingTrustModulesSub") },
    { value: "MASCO",  label: t("landingTrustTaxonomy"),    sub: t("landingTrustTaxonomySub") },
  ];

  const CAPABILITIES = [
    {
      tag: t("landingCap1Tag"),
      title: t("landingCap1Title"),
      body: t("landingCap1Body"),
      cta: t("landingCap1Cta"),
      ctaTo: "/poc/ai-matching",
      accentColor: "#205295",
      Icon: Zap,
      flip: false,
      image: "/landing-ai-matching.png",
    },
    {
      tag: t("landingCap2Tag"),
      title: t("landingCap2Title"),
      body: t("landingCap2Body"),
      cta: t("landingCap2Cta"),
      ctaTo: "/skill-gap",
      accentColor: "#0d7c66",
      Icon: Brain,
      flip: true,
      image: "/landing-skill-gap.png",
    },
    {
      tag: t("landingCap3Tag"),
      title: t("landingCap3Title"),
      body: t("landingCap3Body"),
      cta: t("landingCap3Cta"),
      ctaTo: "/taxonomy",
      accentColor: "#b97c0e",
      Icon: GitBranch,
      flip: false,
      image: "/landing-taxonomy.png",
    },
    {
      tag: t("landingCap4Tag"),
      title: t("landingCap4Title"),
      body: t("landingCap4Body"),
      cta: t("landingCap4Cta"),
      ctaTo: "/labour-insights",
      accentColor: "#2c74b3",
      Icon: BarChart2,
      flip: true,
      image: "/landing-labour-insights.png",
    },
  ];

  const INTEL_MODULES = [
    { icon: Brain,      label: t("landingCap2Tag"),   desc: t("landingCap2Title"),   to: "/skill-gap",             accent: "#205295" },
    { icon: TrendingUp, label: t("navCareerPathway"),     desc: t("landingIntelCareerDesc"),        to: "/career-pathway",        accent: "#0d7c66" },
    { icon: FileSearch, label: t("navDocumentIntel"), desc: t("landingIntelDocDesc"), to: "/document-intelligence", accent: "#b97c0e" },
    { icon: GitBranch,  label: t("landingCap3Tag"),   desc: t("landingCap3Title"),   to: "/taxonomy",              accent: "#2c74b3" },
    { icon: BarChart2,  label: t("landingCap4Tag"),   desc: t("landingCap4Title"),   to: "/labour-insights",       accent: "#6b46c1" },
    { icon: Sparkles,   label: t("navRecommendedJobs"),      desc: t("landingIntelRecDesc"),   to: "/recommended-jobs",      accent: "#205295" },
  ];


  return (
    <div>
      {/*  HERO  */}
      <section style={{
        background: "linear-gradient(135deg, #0A2647 0%, #144272 40%, #205295 100%)",
        padding: "90px 2rem 80px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative shapes */}
        <div style={{ position:"absolute", top:-100, right:-100, width:400, height:400, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-80, left:80, width:250, height:250, borderRadius:"50%", background:"rgba(255,255,255,0.03)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"30%", right:"15%", width:150, height:150, borderRadius:"50%", background:"rgba(125,211,252,0.05)", pointerEvents:"none" }} />

        <div style={{ maxWidth:1280, margin:"0 auto", position:"relative", zIndex:1 }}>
          {/* eyebrow */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, padding:"5px 16px", fontSize:"0.6875rem", fontWeight:700, color:"rgba(255,255,255,0.85)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:32 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", display:"inline-block", boxShadow:"0 0 8px rgba(74,222,128,0.5)" }} />
            {t("landingEyebrow")}
          </div>

          {/* headline */}
          <h1 style={{ fontFamily:"var(--font-heading)", fontSize:"clamp(2rem,4.5vw,3.5rem)", fontWeight:800, lineHeight:1.05, letterSpacing:"-0.035em", color:"#ffffff", margin:"0 0 1.25rem", maxWidth:720 }}>
            {t("landingHeroTitle")}<br />
            <span style={{ background:"linear-gradient(90deg, #7dd3fc 0%, #38bdf8 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>{t("landingHeroHighlight")}</span>
          </h1>
          <p style={{ fontSize:"1.0625rem", color:"rgba(255,255,255,0.65)", lineHeight:1.7, margin:"0 0 2.5rem", maxWidth:580 }}>
            {t("landingHeroSub")}
          </p>

          {/* search bar */}
          <div style={{ display:"flex", maxWidth:600, background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.2)", marginBottom:"1.25rem" }}>
            <div style={{ display:"flex", alignItems:"center", flex:1, padding:"0 1.25rem", gap:10 }}>
              <Search size={18} style={{ color:"var(--muted)", flexShrink:0 }} />
              <input
                type="text"
                placeholder={t("landingSearchPlaceholder")}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && goSearch(query)}
                style={{ flex:1, border:"none", outline:"none", fontSize:"0.9375rem", color:"var(--ink)", background:"transparent", padding:"1rem 0" }}
              />
            </div>
            <button
              onClick={() => goSearch(query)}
              style={{ flexShrink:0, background:"linear-gradient(135deg, #205295 0%, #144272 100%)", color:"#fff", border:"none", fontSize:"0.875rem", fontWeight:700, cursor:"pointer", padding:"0 1.75rem", transition:"all 0.15s", display:"flex", alignItems:"center", gap:6 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              {t("landingSearchBtn")} <ArrowRight size={14} />
            </button>
          </div>

          {/* example chips */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem", alignItems:"center" }}>
            <span style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.45)", fontWeight:500 }}>{t("landingTry")}</span>
            {SEARCH_CHIPS.map(chip => (
              <button key={chip} onClick={() => goSearch(chip)}
                style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:20, fontSize:"0.75rem", fontWeight:500, color:"rgba(255,255,255,0.75)", padding:"5px 14px", cursor:"pointer", transition:"all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.15)"; el.style.color="#fff"; el.style.borderColor="rgba(255,255,255,0.25)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.06)"; el.style.color="rgba(255,255,255,0.75)"; el.style.borderColor="rgba(255,255,255,0.12)"; }}
              >{chip}</button>
            ))}
          </div>

          {/* role quick-links */}
          <div style={{ display:"flex", gap:12, marginTop:36, flexWrap:"wrap" }}>
            <Link to="/signup" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:"8px 16px", fontSize:"0.8125rem", fontWeight:600, color:"rgba(255,255,255,0.9)", textDecoration:"none", transition:"all 0.15s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.18)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.1)"; }}
            >
              <Users size={14} /> {t("landingRoleJobSeeker")}
            </Link>
            <Link to="/signup" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:"8px 16px", fontSize:"0.8125rem", fontWeight:600, color:"rgba(255,255,255,0.9)", textDecoration:"none", transition:"all 0.15s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.18)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.1)"; }}
            >
              <Building2 size={14} /> {t("landingRoleEmployer")}
            </Link>
            <Link to="/login?tab=admin" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, padding:"8px 16px", fontSize:"0.8125rem", fontWeight:600, color:"rgba(255,255,255,0.9)", textDecoration:"none", transition:"all 0.15s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.18)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.1)"; }}
            >
              <Shield size={14} /> {t("landingRoleAdmin")}
            </Link>
          </div>
        </div>
      </section>

      {/*  TRUST BAR  */}
      <section style={{ background:"#fff", borderBottom:"1px solid var(--line)", padding:"0", boxShadow:"0 2px 12px rgba(10,38,71,0.04)" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {TRUST_STATS.map((s, i) => (
            <div key={s.label} style={{
              padding:"2rem 2rem",
              borderRight: i < 3 ? "1px solid var(--line)" : "none",
              display:"flex", flexDirection:"column", gap:4,
              transition:"background 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--base-alt)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{ fontFamily:"var(--font-heading)", fontSize:"2rem", fontWeight:800, background:"linear-gradient(135deg, var(--brand) 0%, var(--accent-blue) 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:"0.875rem", fontWeight:700, color:"var(--ink)" }}>{s.label}</div>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/*  CAPABILITIES  alternating rows  */}
      <section style={{ background:"var(--base-alt)", padding:"5rem 2rem" }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"3.5rem" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--accent-blue)", marginBottom:10, padding:"4px 14px", borderRadius:20, background:"var(--accent-glow)" }}>{t("landingCapEyebrow")}</div>
            <h2 style={{ fontFamily:"var(--font-heading)", fontSize:"clamp(1.5rem,3vw,2.25rem)", fontWeight:800, color:"var(--ink)", letterSpacing:"-0.025em", margin:0 }}>
              {t("landingCapTitle")}
            </h2>
            <p style={{ fontSize:"0.9375rem", color:"var(--muted)", lineHeight:1.7, margin:"1rem 0 0", maxWidth:560, marginLeft:"auto", marginRight:"auto" }}>
              {t("landingCapSub")}
            </p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:"3rem" }}>
            {CAPABILITIES.map((cap) => (
              <div key={cap.tag} style={{
                display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3rem", alignItems:"center",
              }}>
                {/* text side */}
                <div style={{ order: cap.flip ? 2 : 1 }}>
                  <div style={{ display:"inline-block", fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:cap.accentColor, background:`${cap.accentColor}14`, borderRadius:20, padding:"4px 12px", marginBottom:"1rem" }}>{cap.tag}</div>
                  <h3 style={{ fontFamily:"var(--font-heading)", fontSize:"clamp(1.25rem,2.5vw,1.625rem)", fontWeight:800, color:"var(--ink)", letterSpacing:"-0.02em", margin:"0 0 1rem", lineHeight:1.25 }}>{cap.title}</h3>
                  <p style={{ fontSize:"0.9375rem", color:"var(--muted)", lineHeight:1.75, margin:"0 0 1.5rem" }}>{cap.body}</p>
                  <Link to={cap.ctaTo as any}
                    style={{ display:"inline-flex", alignItems:"center", gap:6, background:`linear-gradient(135deg, ${cap.accentColor} 0%, ${cap.accentColor}dd 100%)`, color:"#fff", textDecoration:"none", borderRadius:10, padding:"11px 22px", fontSize:"0.875rem", fontWeight:700, transition:"all 0.15s", boxShadow:`0 4px 12px ${cap.accentColor}30` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
                  >
                    {cap.cta} <ArrowRight size={13} />
                  </Link>
                </div>
                {/* visual side */}
                <div style={{ order: cap.flip ? 1 : 2 }}>
                  {cap.image ? (
                    <div style={{
                      borderRadius:16,
                      overflow:"hidden",
                      border:`1px solid ${cap.accentColor}20`,
                      boxShadow:`0 8px 32px ${cap.accentColor}15`,
                      position:"relative",
                    }}>
                      <img src={cap.image} alt={cap.title} style={{ width:"100%", height:"auto", display:"block" }} />
                    </div>
                  ) : (
                    <div style={{
                      background:`linear-gradient(135deg, ${cap.accentColor}08 0%, ${cap.accentColor}03 100%)`,
                      border:`1px solid ${cap.accentColor}20`,
                      borderRadius:16,
                      padding:"2.5rem",
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      minHeight:220,
                      position:"relative",
                      overflow:"hidden",
                    }}>
                      <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:`${cap.accentColor}08`, pointerEvents:"none" }} />
                      <div style={{ width:80, height:80, borderRadius:20, background:`${cap.accentColor}12`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", zIndex:1 }}>
                        <cap.Icon size={40} style={{ color:cap.accentColor }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*  INTELLIGENCE MODULES  grid  */}
      <section style={{ background:"#fff", borderTop:"1px solid var(--line)", borderBottom:"1px solid var(--line)", padding:"4rem 2rem" }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"2rem" }}>
            <div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--accent-blue)", marginBottom:8, padding:"4px 14px", borderRadius:20, background:"var(--accent-glow)" }}>{t("landingIntelEyebrow")}</div>
              <h2 style={{ fontFamily:"var(--font-heading)", fontSize:"1.5rem", fontWeight:800, color:"var(--ink)", margin:0, letterSpacing:"-0.02em" }}>
                {t("landingIntelTitle")}
              </h2>
            </div>
            <Link to="/poc/ai-matching"
              style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.8125rem", fontWeight:600, color:"var(--accent-blue)", textDecoration:"none", padding:"8px 16px", borderRadius:8, border:"1px solid var(--line)", transition:"all 0.15s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="var(--accent-blue)"; el.style.background="var(--accent-glow)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="var(--line)"; el.style.background="transparent"; }}
            >
              {t("landingIntelViewAll")} <ArrowRight size={13} />
            </Link>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"1rem" }}>
            {INTEL_MODULES.map(mod => (
              <Link key={mod.to} to={mod.to as any}
                style={{ textDecoration:"none", display:"block" }}
              >
                <div style={{
                  background:"var(--base-alt)",
                  border:"1px solid var(--line)",
                  borderRadius:14,
                  padding:"1.5rem",
                  transition:"all 0.2s",
                  height:"100%",
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow="0 8px 24px rgba(10,38,71,0.08)"; el.style.transform="translateY(-3px)"; el.style.borderColor=`${mod.accent}40`; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow="none"; el.style.transform="none"; el.style.borderColor="var(--line)"; }}
                >
                  <div style={{ width:40, height:40, borderRadius:10, background:`${mod.accent}12`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"1rem" }}>
                    <mod.icon size={20} style={{ color:mod.accent }} />
                  </div>
                  <div style={{ fontFamily:"var(--font-heading)", fontSize:"0.9375rem", fontWeight:700, color:"var(--ink)", marginBottom:6 }}>{mod.label}</div>
                  <div style={{ fontSize:"0.8125rem", color:"var(--muted)", lineHeight:1.5 }}>{mod.desc}</div>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:"1rem", fontSize:"0.75rem", fontWeight:600, color:mod.accent }}>
                    {t("landingIntelExplore")} <ArrowRight size={12} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/*  CTA BANNER  */}
      <section style={{ background:"linear-gradient(135deg, #0A2647 0%, #144272 50%, #205295 100%)", padding:"4.5rem 2rem", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-80, right:-80, width:300, height:300, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-60, left:-40, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.03)", pointerEvents:"none" }} />
        <div style={{ maxWidth:720, margin:"0 auto", textAlign:"center", position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(255,255,255,0.6)", marginBottom:16, padding:"4px 14px", borderRadius:20, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)" }}>
            <Play size={11} /> {t("landingCtaEyebrow")}
          </div>
          <h2 style={{ fontFamily:"var(--font-heading)", fontSize:"clamp(1.5rem,3vw,2.25rem)", fontWeight:800, color:"#fff", letterSpacing:"-0.025em", margin:"0 0 1rem", lineHeight:1.2 }}>
            {t("landingCtaTitle")}
          </h2>
          <p style={{ fontSize:"1rem", color:"rgba(255,255,255,0.65)", margin:"0 0 2rem", lineHeight:1.7, maxWidth:520, marginLeft:"auto", marginRight:"auto" }}>
            {t("landingCtaSub")}
          </p>
          <div style={{ display:"flex", gap:"1rem", justifyContent:"center", flexWrap:"wrap" }}>
            <Link to="/demo"
              style={{ display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(135deg, #fff 0%, #f0f4f8 100%)", color:"var(--brand)", textDecoration:"none", borderRadius:10, padding:"13px 30px", fontSize:"0.9375rem", fontWeight:700, boxShadow:"0 4px 16px rgba(255,255,255,0.15)", transition:"all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              {t("landingCtaDemo")} <ArrowRight size={14} />
            </Link>
            <Link to="/jobs"
              style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", color:"#fff", border:"1px solid rgba(255,255,255,0.2)", textDecoration:"none", borderRadius:10, padding:"13px 30px", fontSize:"0.9375rem", fontWeight:600, transition:"all 0.15s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.18)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.1)"; }}
            >
              {t("landingCtaBrowse")}
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
