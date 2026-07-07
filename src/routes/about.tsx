import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Zap, BarChart2, Users, Brain, Building2, ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/site-header";
import { useLanguage } from "@/lib/language-context";

export const Route = createFileRoute("/about")({
  ssr: false,
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — PerksoPrax AI" },
      { name: "description", content: "Learn about PerksoPrax AI, Malaysia's AI-powered national employment portal built on the PERKESO ecosystem." },
    ],
  }),
});

function AboutPage() {
  const { t } = useLanguage();
  const jobSeekerPoints = [
    t("aboutSeekerP1"), t("aboutSeekerP2"), t("aboutSeekerP3"), t("aboutSeekerP4"), t("aboutSeekerP5"),
  ];
  const employerPoints = [
    t("aboutEmployerP1"), t("aboutEmployerP2"), t("aboutEmployerP3"), t("aboutEmployerP4"), t("aboutEmployerP5"),
  ];

  return (
    <>
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 0" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", color: "var(--muted)", textTransform: "uppercase" }}>
            {t("aboutEyebrow")}
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.03em", margin: "8px 0 12px" }}>
            {t("aboutTitle")} <span style={{ color: "var(--brand)" }}>{t("aboutTitleHighlight")}</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, maxWidth: 640 }}>
            {t("aboutSub")}
          </p>
        </div>

        {/* Mission */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-xl)", padding: "32px", marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, background: "var(--base)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)", marginBottom: 16 }}>
            <Brain size={20} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: "0 0 10px", letterSpacing: "-0.02em" }}>{t("aboutMissionTitle")}</h2>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
            {t("aboutMissionBody")}
          </p>
        </div>

        {/* Pillars */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }} className="feature-grid">
          {[
            { icon: Shield,    color: "var(--brand)", title: t("aboutPillar1Title"), desc: t("aboutPillar1Desc") },
            { icon: Zap,       color: "var(--accent)", title: t("aboutPillar2Title"),  desc: t("aboutPillar2Desc") },
            { icon: BarChart2, color: "#0369a1",       title: t("aboutPillar3Title"), desc: t("aboutPillar3Desc") },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "24px" }}>
              <div style={{ width: 40, height: 40, background: "var(--base)", borderRadius: "var(--radius-xs)", display: "flex", alignItems: "center", justifyContent: "center", color, marginBottom: 14 }}>
                <Icon size={18} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{title}</p>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Who we serve */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }} className="how-grid">
          {[
            {
              icon: Users, color: "var(--brand)", title: t("aboutJobSeekersTitle"),
              points: jobSeekerPoints,
            },
            {
              icon: Building2, color: "var(--accent)", title: t("aboutEmployersTitle"),
              points: employerPoints,
            },
          ].map(({ icon: Icon, color, title, points }) => (
            <div key={title} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: "var(--base)", borderRadius: "var(--radius-xs)", display: "flex", alignItems: "center", justifyContent: "center", color }}>
                  <Icon size={18} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{title}</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {points.map((p, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 7 }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: "var(--brand)", borderRadius: "var(--radius-xl)", padding: "40px 36px", textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            {t("aboutCtaTitle")}
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: "0 0 24px" }}>
            {t("aboutCtaSub")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", background: "var(--accent)", color: "#fff", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              {t("aboutCtaCreate")} <ArrowRight size={14} />
            </Link>
            <Link to="/jobs" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              {t("aboutCtaBrowse")}
            </Link>
            <Link to="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              {t("aboutCtaContact")}
            </Link>
          </div>
        </div>

      </main>
    </div>
    <SiteFooter />
    </>
  );
}
