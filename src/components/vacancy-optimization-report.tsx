import { useState } from "react";
import {
  CheckCircle, XCircle, TrendingUp, Target, DollarSign, Lightbulb,
  ClipboardList, Users, BarChart2, ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VacancyOptimizationReport } from "@/lib/vacancy-optimization";
import {
  getReadinessConfig, getAttractionConfig, getHiringSuccessConfig,
} from "@/lib/vacancy-optimization";

// ─── helpers ─────────────────────────────────

function SectionCard({ icon, title, children, accent = false }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-card p-6 shadow-sm ${accent ? "border-primary/20" : "border-border"}`}>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-primary">{icon}</span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ScoreBar({ label, score, explanation, suggestions }: {
  label: string; score: number; explanation: string; suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const color = score >= 75 ? "bg-[var(--success)]" : score >= 50 ? "bg-primary" : "bg-[#F97316]";
  const textColor = score >= 75 ? "text-[var(--success)]" : score >= 50 ? "text-primary" : "text-[#F97316]";

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div
        className="flex items-center justify-between cursor-pointer gap-3"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className={`text-sm font-bold tabular-nums ml-3 ${textColor}`}>{score}/100</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary">
            <div className={`h-1.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${score}%` }} />
          </div>
        </div>
        <span className="text-muted-foreground shrink-0">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{explanation}</p>
          {suggestions.length > 0 && (
            <ul className="space-y-1 mt-2">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SkillChip({ label, variant = "default" }: { label: string; variant?: "default" | "soft" | "industry" | "govt" | "emerging" | "missing" }) {
  const styles: Record<typeof variant, string> = {
    default: "bg-primary/8 border-primary/20 text-primary",
    soft: "bg-[var(--success)]/8 border-[var(--success)]/20 text-[var(--success)]",
    industry: "bg-[#F97316]/8 border-[#F97316]/20 text-[#F97316]",
    govt: "bg-secondary border-border text-foreground",
    emerging: "bg-purple-50 border-purple-200 text-purple-700",
    missing: "bg-destructive/8 border-destructive/20 text-destructive",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles[variant]}`}>
      {label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

// ─── main component ──────────────────────────

export function VacancyOptimizationReportView({ report }: { report: VacancyOptimizationReport }) {
  const readinessCfg = getReadinessConfig(report.publishingReadiness);
  const attractCfg = getAttractionConfig(report.attractionLevel);
  const hiringCfg = getHiringSuccessConfig(report.hiringSuccessPrediction);

  const qualityColor = report.vacancyQualityScore >= 75 ? "text-[var(--success)]"
    : report.vacancyQualityScore >= 55 ? "text-primary"
    : "text-[#F97316]";

  return (
    <div className="space-y-5">

      {/* Overall score + readiness */}
      <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vacancy Quality Assessment</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">Optimization Report</h2>
          </div>
          <div className="text-right">
            <p className={`text-5xl font-extrabold tabular-nums ${qualityColor}`}>{report.vacancyQualityScore}</p>
            <p className="text-xs text-muted-foreground">/ 100</p>
          </div>
        </div>
        <div className="mt-4 w-full h-2 rounded-full bg-secondary">
          <div
            className={`h-2 rounded-full transition-all duration-700 ${report.vacancyQualityScore >= 75 ? "bg-[var(--success)]" : report.vacancyQualityScore >= 55 ? "bg-primary" : "bg-[#F97316]"}`}
            style={{ width: `${report.vacancyQualityScore}%` }}
          />
        </div>
        <div className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 ${readinessCfg.bg}`}>
          <span className={`size-2 rounded-full ${readinessCfg.dot}`} />
          <span className={`text-sm font-semibold ${readinessCfg.text}`}>{report.publishingReadiness}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{report.publishingReasoning}</p>
      </div>

      {/* Score categories */}
      <SectionCard icon={<BarChart2 className="size-5" />} title="Quality Score Breakdown">
        <div className="space-y-3">
          {report.scoreCategories.map((cat) => (
            <ScoreBar
              key={cat.name}
              label={cat.name}
              score={cat.score}
              explanation={cat.explanation}
              suggestions={cat.suggestions}
            />
          ))}
        </div>
      </SectionCard>

      {/* MASCO alignment */}
      <SectionCard icon={<Target className="size-5" />} title="MASCO Alignment Intelligence">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl bg-secondary/40 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Current Match</p>
            <p className="text-2xl font-extrabold text-[#F97316] tabular-nums">{report.mascoAlignmentBefore}%</p>
          </div>
          <div className="rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">After Optimization</p>
            <p className="text-2xl font-extrabold text-[var(--success)] tabular-nums">{report.mascoAlignmentAfter}%</p>
          </div>
          <div className="rounded-xl bg-secondary/40 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">MASCO Code</p>
            <p className="text-sm font-bold text-primary">{report.mascoProfile.mascoCode}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{report.mascoProfile.jobFamily}</p>
          </div>
        </div>
        {report.missingOccupationSkills.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Missing Occupation Skills</p>
            <div className="flex flex-wrap gap-2">
              {report.missingOccupationSkills.map(s => <SkillChip key={s} label={s} variant="missing" />)}
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Suggested Keywords</p>
          <div className="flex flex-wrap gap-2">
            {report.suggestedOccupationKeywords.map(s => <SkillChip key={s} label={s} variant="default" />)}
          </div>
        </div>
      </SectionCard>

      {/* Skills intelligence */}
      <SectionCard icon={<ClipboardList className="size-5" />} title="Skills Intelligence">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Required Skills</p>
            <div className="flex flex-wrap gap-2">
              {report.requiredSkillsList.map(s => <SkillChip key={s} label={s} variant="default" />)}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preferred Skills</p>
            <div className="flex flex-wrap gap-2">
              {report.preferredSkillsList.map(s => <SkillChip key={s} label={s} variant="soft" />)}
            </div>
          </div>
          {report.missingSkills.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Missing Skills</p>
              <div className="flex flex-wrap gap-2">
                {report.missingSkills.map(s => <SkillChip key={s} label={s} variant="missing" />)}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Industry Skills</p>
            <div className="flex flex-wrap gap-2">
              {report.industrySkills.map(s => <SkillChip key={s} label={s} variant="industry" />)}
            </div>
          </div>
          {report.emergingSkills.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Emerging Skills (2025–2026)</p>
              <div className="flex flex-wrap gap-2">
                {report.emergingSkills.map(s => <SkillChip key={s} label={s} variant="emerging" />)}
              </div>
            </div>
          )}
          {report.govtSkills.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Government / Public Sector Skills</p>
              <div className="flex flex-wrap gap-2">
                {report.govtSkills.map(s => <SkillChip key={s} label={s} variant="govt" />)}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Salary benchmark */}
      <div className="grid gap-5 sm:grid-cols-2">
        <SectionCard icon={<DollarSign className="size-5" />} title="Salary Benchmark Intelligence">
          <div className="space-y-2.5 mb-4">
            {[
              { label: "Market Entry", value: report.salaryMarketMin },
              { label: "Market Mid", value: report.salaryMarketMid },
              { label: "Market Senior", value: report.salaryMarketMax },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="text-sm font-bold text-primary">{value}</span>
              </div>
            ))}
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold mb-3
            ${report.salaryCompetitiveness === "Above Market" ? "bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]"
            : report.salaryCompetitiveness === "At Market" ? "bg-primary/10 border-primary/20 text-primary"
            : report.salaryCompetitiveness === "Below Market" ? "bg-destructive/10 border-destructive/20 text-destructive"
            : "bg-secondary border-border text-muted-foreground"}`}>
            {report.salaryCompetitiveness}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{report.salaryRecommendation}</p>
        </SectionCard>

        {/* Candidate attraction */}
        <SectionCard icon={<Users className="size-5" />} title="Candidate Attraction Score">
          <div className="text-center mb-4">
            <p className={`text-4xl font-extrabold tabular-nums ${attractCfg.text}`}>{report.attractionScore}</p>
            <p className="text-xs text-muted-foreground">/100</p>
            <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${attractCfg.bg} ${attractCfg.text}`}>
              {report.attractionLevel}
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary mb-4">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${
              report.attractionLevel === "Excellent" ? "bg-[var(--success)]"
              : report.attractionLevel === "Strong" ? "bg-primary"
              : "bg-[#F97316]"}`}
              style={{ width: `${report.attractionScore}%` }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Attraction Factors</p>
          <ul className="space-y-1">
            {report.attractionFactors.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                <CheckCircle className="size-3.5 text-[var(--success)] shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Completeness check */}
      <SectionCard icon={<ClipboardList className="size-5" />} title="Vacancy Completeness Check">
        <div className="grid gap-2 sm:grid-cols-2">
          {report.completenessItems.map((item) => (
            <div key={item.label} className="flex items-start gap-2.5 rounded-xl bg-secondary/30 px-3 py-2.5">
              {item.passed
                ? <CheckCircle className="size-4 text-[var(--success)] shrink-0 mt-0.5" />
                : <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />}
              <div>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                {!item.passed && item.action && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.action}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Hiring success + candidate pool */}
      <div className="grid gap-5 sm:grid-cols-2">
        <SectionCard icon={<TrendingUp className="size-5" />} title="Hiring Success Prediction">
          <div className={`inline-flex items-center rounded-xl px-4 py-2 mb-4 ${hiringCfg.bg}`}>
            <span className={`text-base font-bold ${hiringCfg.text}`}>{report.hiringSuccessPrediction}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{report.hiringSuccessExplanation}</p>
        </SectionCard>

        <SectionCard icon={<Users className="size-5" />} title="Candidate Match Forecast">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
              <span className="text-xs text-muted-foreground">Pool Forecast</span>
              <span className="text-sm font-bold text-primary">{report.candidatePoolForecast}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
              <span className="text-xs text-muted-foreground">Est. Match Rate</span>
              <span className="text-sm font-bold text-primary">{report.estimatedMatchRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground">{report.expectedApplicantQuality}</p>
            {report.potentialSkillShortages.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Potential Skill Shortages</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.potentialSkillShortages.map(s => <SkillChip key={s} label={s} variant="missing" />)}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Improvement checklist */}
      <SectionCard icon={<CheckCircle className="size-5" />} title="Vacancy Improvement Checklist">
        <div className="grid gap-2 sm:grid-cols-2">
          {report.improvementChecklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 rounded-xl bg-secondary/30 px-3 py-2.5">
              {item.passed
                ? <CheckCircle className="size-4 text-[var(--success)] shrink-0" />
                : <XCircle className="size-4 text-muted-foreground shrink-0" />}
              <span className={`text-xs font-medium ${item.passed ? "text-foreground" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* AI rewrite */}
      <SectionCard icon={<Lightbulb className="size-5" />} title="AI Vacancy Rewrite" accent>
        <p className="text-xs text-muted-foreground mb-4">
          AI-improved version — professionally rewritten with added responsibilities, improved clarity, ATS-optimized keywords, and occupation-standard language.
        </p>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Improved Description</p>
              <CopyButton text={report.improvedDescription} />
            </div>
            <pre className="whitespace-pre-wrap rounded-xl bg-secondary/40 border border-border p-4 text-xs text-foreground leading-relaxed font-sans">
              {report.improvedDescription}
            </pre>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Improved Requirements</p>
              <CopyButton text={report.improvedRequirements} />
            </div>
            <pre className="whitespace-pre-wrap rounded-xl bg-secondary/40 border border-border p-4 text-xs text-foreground leading-relaxed font-sans">
              {report.improvedRequirements}
            </pre>
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
