import { Brain, TrendingUp, ShieldCheck, AlertTriangle, Zap, ClipboardList } from "lucide-react";
import type { AnalysisResult } from "@/lib/analyze.functions";

type Meta = {
  companyType: string;
  industry: string;
  experience: string;
  language: string;
};

type Props = {
  result: AnalysisResult;
  meta: Meta;
};

function calcEmployabilityScore(result: AnalysisResult): number {
  const overall = result.overall_score ?? 0;
  const structure = result.structure?.score ?? overall;
  const keywords = result.keywords?.score ?? overall;
  const langBalance = result.language_balance?.score ?? overall;
  const marketFit = result.malaysia_market_fit?.score ?? overall;

  return Math.round(
    overall * 0.4 +
    structure * 0.15 +
    keywords * 0.2 +
    langBalance * 0.1 +
    marketFit * 0.15,
  );
}

function getReadinessLabel(score: number): string {
  if (score >= 90) return "High Potential";
  if (score >= 80) return "Competitive";
  if (score >= 65) return "Market Ready";
  if (score >= 50) return "Developing";
  return "Needs Foundation";
}

function getLabelColor(score: number): string {
  if (score >= 80) return "bg-[var(--success)]/15 text-[var(--success)]";
  if (score >= 65) return "bg-primary/10 text-primary";
  if (score >= 50) return "bg-[var(--warning)]/15 text-[var(--warning)]";
  return "bg-destructive/10 text-destructive";
}

function getCareerReadiness(score: number, companyType: string): string {
  const label = getReadinessLabel(score);
  const type = companyType || "the target employer type";

  if (score >= 80) {
    return `${label} — Your CV is well-positioned for ${type} roles. You demonstrate strong alignment with Malaysian employer expectations and should apply with confidence.`;
  }
  if (score >= 65) {
    return `${label} — Your CV meets the baseline requirements for ${type} roles. A few targeted improvements to keywords and achievements will increase your chances significantly.`;
  }
  if (score >= 50) {
    return `${label} — Your CV has relevant foundations but needs stronger alignment with ${type} expectations, particularly around keywords, structure, and role-specific achievements before it becomes competitive.`;
  }
  return `${label} — Your CV needs foundational improvements in structure, keyword alignment, and market-specific content before applying to ${type} roles. Focus on the priority improvements listed above.`;
}

function getHiringStrengths(result: AnalysisResult): string[] {
  const strengths: string[] = [];

  if (result.keywords?.present_keywords?.length > 0) {
    strengths.push(...result.keywords.present_keywords.slice(0, 3));
  }

  if (result.structure?.score >= 60) {
    strengths.push("Clear and readable CV structure");
  }
  if (result.language_balance?.score >= 65) {
    strengths.push("Appropriate language balance for Malaysian employers");
  }
  if (result.malaysia_market_fit?.score >= 65) {
    strengths.push("Good alignment with Malaysia's job market expectations");
  }
  if (result.overall_score >= 60) {
    strengths.push("Clear willingness to improve for Malaysian employers");
  }

  if (strengths.length === 0) {
    strengths.push("Shows initiative through the application process");
  }

  return strengths.slice(0, 4);
}

function getHiringRisks(result: AnalysisResult): string[] {
  const risks: string[] = [];

  if (result.keywords?.missing_keywords?.length > 0) {
    const missing = result.keywords.missing_keywords.slice(0, 2);
    risks.push(`Missing important keywords: ${missing.join(", ")}`);
  }
  if (result.structure?.score < 60) {
    risks.push("CV structure needs clearer formatting and section organisation");
  }
  if (result.keywords?.score < 55) {
    risks.push("Limited role-specific keywords reduce ATS visibility");
  }
  if (result.malaysia_market_fit?.score < 55) {
    risks.push("Low alignment with Malaysian market expectations for target sector");
  }
  if (result.language_balance?.score < 55) {
    risks.push("Language balance may not meet target employer preferences");
  }

  const lowestScore = Math.min(
    result.structure?.score ?? 100,
    result.keywords?.score ?? 100,
    result.language_balance?.score ?? 100,
    result.malaysia_market_fit?.score ?? 100,
  );
  if (lowestScore < 50 && risks.length < 4) {
    risks.push("Limited role-specific achievements make it harder to stand out");
  }

  if (risks.length === 0) {
    risks.push("Continue strengthening keyword alignment for better results");
  }

  return risks.slice(0, 4);
}

function getNextBestAction(result: AnalysisResult): string {
  if (result.priority_improvements?.length > 0) {
    return result.priority_improvements[0];
  }
  if (result.keywords?.missing_keywords?.length > 0) {
    return `Add missing keywords such as ${result.keywords.missing_keywords.slice(0, 2).join(" and ")} to strengthen your CV's visibility.`;
  }
  return "Review your CV structure and ensure each section is clearly labelled and consistently formatted.";
}

function getPlacementSummary(score: number, result: AnalysisResult): string {
  if (score >= 80) {
    return "Your CV is competitive and ready for active applications to your target roles in Malaysia. Continue refining keyword alignment as each application may have different requirements. Your overall profile is well-positioned for the current job market.";
  }
  if (score >= 65) {
    return "You are ready to apply for suitable roles, and your CV shows good market awareness. Before applying to highly competitive positions, address the priority improvements above to increase your shortlisting rate. A few focused edits can move you into the top tier of applicants.";
  }
  if (score >= 50) {
    return "You can apply for entry-level or junior roles now, but your CV should be strengthened before targeting competitive positions. Focus first on structure, keyword alignment, and adding clearer achievements. Improving these areas will noticeably increase your response rate from Malaysian employers.";
  }
  return "We recommend working through the priority improvements before submitting applications. Your CV has the foundational content, but it needs better presentation, stronger keywords, and clearer achievements to compete effectively in Malaysia's job market.";
}

function ScoreMeter({ score }: { score: number }) {
  const label = getReadinessLabel(score);
  const labelColor = getLabelColor(score);
  const clamped = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 40;
  const arc = (clamped / 100) * circumference;

  let strokeColor = "var(--destructive)";
  if (score >= 80) strokeColor = "var(--success)";
  else if (score >= 65) strokeColor = "var(--primary)";
  else if (score >= 50) strokeColor = "var(--warning)";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-28">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--secondary)" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            style={{ transition: "stroke-dasharray 800ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-primary">{clamped}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${labelColor}`}>{label}</span>
    </div>
  );
}

function IntelCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function EmployabilityIntelligence({ result, meta }: Props) {
  const score = calcEmployabilityScore(result);
  const label = getReadinessLabel(score);
  const careerReadiness = getCareerReadiness(score, meta.companyType);
  const strengths = getHiringStrengths(result);
  const risks = getHiringRisks(result);
  const nextAction = getNextBestAction(result);
  const placementSummary = getPlacementSummary(score, result);

  return (
    <div className="mt-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary">Employability Intelligence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A Malaysia-focused readiness view based on your CV, target employer type, keywords, and market fit.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Employability Score */}
        <IntelCard icon={<Brain className="size-5" />} title="Employability Score">
          <div className="flex flex-col items-center gap-2 py-2">
            <ScoreMeter score={score} />
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Weighted from your CV Structure, Keywords, Language Balance, Market Fit, and Overall Score.
            </p>
          </div>
        </IntelCard>

        {/* Card 2: Career Readiness Level */}
        <IntelCard icon={<TrendingUp className="size-5" />} title="Career Readiness Level">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
              <span className="text-sm font-semibold text-primary">{label}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{meta.companyType || "General"}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{careerReadiness}</p>
          </div>
        </IntelCard>

        {/* Card 3: Hiring Strengths */}
        <IntelCard icon={<ShieldCheck className="size-5" />} title="Hiring Strengths">
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-0.5 shrink-0 text-[var(--success)]">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </IntelCard>

        {/* Card 4: Hiring Risk Areas */}
        <IntelCard icon={<AlertTriangle className="size-5" />} title="Hiring Risk Areas">
          <ul className="space-y-2">
            {risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-0.5 shrink-0 text-[var(--warning)]">⚠</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </IntelCard>

        {/* Card 5: Next Best Action */}
        <IntelCard icon={<Zap className="size-5" />} title="Next Best Action">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm leading-relaxed text-foreground">{nextAction}</p>
          </div>
        </IntelCard>

        {/* Card 6: Placement Readiness Summary */}
        <IntelCard icon={<ClipboardList className="size-5" />} title="Placement Readiness Summary">
          <p className="text-sm leading-relaxed text-muted-foreground">{placementSummary}</p>
        </IntelCard>
      </div>
    </div>
  );
}
