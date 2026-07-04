import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ChevronRight, AlertTriangle, Users, Building2, Brain, Ban, BookOpen, AlertCircle, Scale } from "lucide-react";
import { SiteFooter } from "@/components/site-header";
import { useLanguage } from "@/lib/language-context";

export const Route = createFileRoute("/terms")({
  ssr: false,
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — MYFutureJobs" },
      { name: "description", content: "Terms and conditions for using the MYFutureJobs employment platform." },
    ],
  }),
});

const TERMS_SECTIONS = [
  { id: "acceptance", icon: FileText,      title: "Acceptance of Terms",      body: `By accessing or using the MYFutureJobs platform, a PERKESO initiative, you agree to be bound by these Terms of Service. These terms constitute a legally binding agreement between you and MYFutureJobs. If you do not agree to these terms, you must immediately cease all use of our services.` },
  { id: "eligibility",icon: Users,         title: "Eligibility",              body: `To use MYFutureJobs, you must be at least 18 years of age. By creating an account, you represent and warrant that:\n• You have the legal capacity to enter into a binding contract.\n• You are a legal resident of Malaysia or have the necessary permits to seek employment within the territory.\n• All information provided during registration is accurate and truthful.` },
  { id: "account",    icon: AlertCircle,   title: "Account Responsibilities",  body: `You are solely responsible for maintaining the confidentiality of your account credentials. Any activities occurring under your account are your responsibility. You agree to notify MYFutureJobs immediately of any unauthorised access or security breaches.` },
  { id: "jobseeker",  icon: Users,         title: "Jobseeker Terms",           body: `Jobseekers agree that their profile data, including resumes and skills, will be processed by our AI to facilitate employer matching. You grant MYFutureJobs a license to use it for platform optimisation.\n\n• AI Resume Scoring\n• Skills-based Shortlisting\n• Career Pathway Suggestions` },
  { id: "employer",   icon: Building2,     title: "Employer Terms",            body: `Employers must provide accurate job descriptions and comply with the Malaysian Employment Act. Discriminatory practices are strictly prohibited. AI-generated shortlists are suggestions and require human verification.\n\n• Verified Candidate Profiles\n• Position Comparison\n• Verified Candidate Profiles` },
  { id: "ai",         icon: Brain,         title: "AI Features & Advisory",    body: `MYFutureJobs employs proprietary machine learning algorithms to analyse career trajectories and market trends. While we strive for 100% accuracy, our AI outputs are advisory in nature.\n\nBias Monitoring: We actively monitor algorithms to reduce systemic bias in hiring.` },
  { id: "prohibited", icon: Ban,           title: "Prohibited Use",            body: `You may not use MYFutureJobs for:\n× Scraping or automated data harvesting\n× Impersonating other individuals\n× Posting fraudulent job listings\n× Transmitting malware or harmful code` },
  { id: "ip",         icon: BookOpen,      title: "Intellectual Property",     body: `All platform software, design, and AI models are the exclusive property of MYFutureJobs and PERKESO. You are granted a limited, non-transferable license to use the platform for its intended purpose only.` },
  { id: "liability",  icon: AlertTriangle, title: "Limitation of Liability",   body: `To the maximum extent permitted by Malaysian law, MYFutureJobs shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the platform.` },
  { id: "governing",  icon: Scale,         title: "Governing Law",             body: `These terms are governed by and construed in accordance with the laws of Malaysia. Any disputes shall be subject to the exclusive jurisdiction of the Malaysian courts.` },
];

function TermsPage() {
  const { t } = useLanguage();
  return (
    <>
    <div style={{ minHeight: '100vh', background: 'var(--base)' }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px 0" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
          <Link to="/" style={{ color: "var(--muted)", textDecoration: "none" }}>Home</Link>
          <ChevronRight size={13} />
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{t("termsTitle")}</span>
        </div>

        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.03em", margin: "0 0 4px" }}>{t("termsTitle")}</h1>
          <div style={{ width: 40, height: 3, background: "var(--accent)", borderRadius: 2, marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: "var(--muted)" }}>{t("termsUpdated")}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32, alignItems: "start", marginTop: 32 }} className="privacy-grid">

          {/* TOC sidebar */}
          <div style={{ position: "sticky", top: 72, background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "16px 0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--muted)", padding: "0 16px 10px" }}>{t("termsOnPage")}</div>
            {TERMS_SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{ display: "block", padding: "7px 16px", fontSize: 13, color: "var(--muted)", textDecoration: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--brand)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
              >
                {s.title}
              </a>
            ))}
          </div>

          {/* Sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {TERMS_SECTIONS.map(s => {
              const Icon = s.icon;
              const isDark = s.id === "ai";
              return (
                <div key={s.id} id={s.id} style={{ background: isDark ? "var(--brand)" : "#fff", border: `1px solid ${isDark ? "transparent" : "var(--line)"}`, borderRadius: "var(--radius-lg)", padding: "24px 28px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, background: isDark ? "rgba(255,255,255,0.12)" : "var(--base)", borderRadius: "var(--radius-xs)", display: "flex", alignItems: "center", justifyContent: "center", color: isDark ? "#fff" : "var(--brand)", flexShrink: 0 }}>
                      <Icon size={15} />
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "var(--ink)", margin: 0 }}>{s.title}</h2>
                  </div>
                  {s.body.split("\n\n").map((para, i) => (
                    <div key={i} style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.75)" : "var(--muted)", lineHeight: 1.75, marginBottom: 8, whiteSpace: "pre-line" }}>{para}</div>
                  ))}
                </div>
              );
            })}
            <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "8px 0 0" }}>
              © 2025 MYFutureJobs. A PERKESO Initiative. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
    <SiteFooter />
    </>
  );
}
