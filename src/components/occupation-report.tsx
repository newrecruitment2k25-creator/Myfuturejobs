import {
  CheckCircle, Briefcase, TrendingUp, GraduationCap, DollarSign,
  ArrowRight, Target, Lightbulb, Users, Shield, AlertTriangle, BarChart2,
} from "lucide-react";
import type { OccupationProfile } from "@/lib/masco-intelligence";
import { getDemandBadgeConfig } from "@/lib/masco-intelligence";

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SectionCard({ icon, title, accent = false, children }: {
  icon: React.ReactNode;
  title: string;
  accent?: boolean;
  children: React.ReactNode;
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

function SkillChip({ label, variant = "default" }: { label: string; variant?: "default" | "soft" | "industry" | "govt" }) {
  const styles: Record<typeof variant, string> = {
    default: "bg-primary/8 border-primary/20 text-primary",
    soft: "bg-[var(--success)]/8 border-[var(--success)]/20 text-[var(--success)]",
    industry: "bg-[#F97316]/8 border-[#F97316]/20 text-[#F97316]",
    govt: "bg-secondary border-border text-foreground",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles[variant]}`}>
      {label}
    </span>
  );
}

function SalaryBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-primary">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main OccupationReport component
// ─────────────────────────────────────────────

export function OccupationReport({ profile, jobTitle }: { profile: OccupationProfile; jobTitle: string }) {
  const demandCfg = getDemandBadgeConfig(profile.demandLevel);

  return (
    <div className="space-y-5">

      {/* A. Occupation Match Summary */}
      <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Occupation Classification</p>
            <h2 className="mt-1 text-2xl font-bold text-primary">{profile.occupationTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1">{profile.mascoCategory} · {profile.mascoCode}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-3xl font-extrabold text-primary tabular-nums">{profile.confidenceScore}%</p>
              <p className="text-xs text-muted-foreground">Classification Confidence</p>
            </div>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${demandCfg.bg} ${demandCfg.text}`}>
              {profile.demandLevel} Demand
            </span>
          </div>
        </div>

        <div className="mt-4 w-full h-1.5 rounded-full bg-secondary">
          <div className="h-1.5 rounded-full bg-primary transition-all duration-700" style={{ width: `${profile.confidenceScore}%` }} />
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-secondary/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Job Family</p>
            <p className="text-sm font-semibold text-foreground">{profile.jobFamily}</p>
          </div>
          <div className="rounded-xl bg-secondary/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Employer Alignment</p>
            <p className="text-sm font-semibold text-foreground">{profile.employerTypeAlignment}</p>
          </div>
          <div className="rounded-xl bg-secondary/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Experience Range</p>
            <p className="text-sm font-semibold text-foreground">{profile.experienceYears}</p>
          </div>
        </div>
      </div>

      {/* B. Related Occupations */}
      <SectionCard icon={<Users className="size-5" />} title="Related Occupations">
        <div className="flex flex-wrap gap-2">
          {profile.relatedOccupations.map((r) => (
            <span key={r} className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground">
              {r}
            </span>
          ))}
        </div>
      </SectionCard>

      {/* C. Skills Taxonomy */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Target className="size-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Skills Taxonomy</h2>
        </div>
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Hard Skills</p>
            <div className="flex flex-wrap gap-2">
              {profile.hardSkills.map((s) => <SkillChip key={s} label={s} variant="default" />)}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Soft Skills</p>
            <div className="flex flex-wrap gap-2">
              {profile.softSkills.map((s) => <SkillChip key={s} label={s} variant="soft" />)}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Industry Skills</p>
            <div className="flex flex-wrap gap-2">
              {profile.industrySkills.map((s) => <SkillChip key={s} label={s} variant="industry" />)}
            </div>
          </div>
          {profile.publicSectorSkills.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Government / Public Sector Skills</p>
              <div className="flex flex-wrap gap-2">
                {profile.publicSectorSkills.map((s) => <SkillChip key={s} label={s} variant="govt" />)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* D. Qualifications & Experience */}
      <div className="grid gap-5 sm:grid-cols-2">
        <SectionCard icon={<GraduationCap className="size-5" />} title="Qualification & Experience">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Minimum Qualification</p>
              <p className="text-sm text-foreground">{profile.minimumQualification}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Preferred Qualification</p>
              <p className="text-sm text-foreground">{profile.preferredQualification}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Experience Level</p>
              <p className="text-sm font-medium text-primary">{profile.experienceLevel} · {profile.experienceYears}</p>
            </div>
            {profile.certifications.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Relevant Certifications</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.certifications.map((c) => (
                    <span key={c} className="rounded-full bg-secondary border border-border px-2 py-0.5 text-xs text-muted-foreground">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* E. Salary Benchmark */}
        <SectionCard icon={<DollarSign className="size-5" />} title="Salary Benchmark">
          <div className="space-y-2.5 mb-4">
            <SalaryBar label="Entry" value={profile.salaryBand.entry} />
            <SalaryBar label="Mid" value={profile.salaryBand.mid} />
            <SalaryBar label="Senior" value={profile.salaryBand.senior} />
          </div>
          <p className="text-xs text-muted-foreground italic leading-relaxed">{profile.salaryNote}</p>
        </SectionCard>
      </div>

      {/* F. Career Progression */}
      <SectionCard icon={<TrendingUp className="size-5" />} title="Career Progression">
        <div className="flex flex-col gap-2">
          {profile.careerProgression.map((step, i) => (
            <div key={step} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                  ${i === 0 ? "bg-secondary border border-border text-muted-foreground" :
                    i === profile.careerProgression.length - 1 ? "bg-primary text-primary-foreground" :
                    "bg-primary/10 border border-primary/20 text-primary"}`}>
                  {i + 1}
                </div>
                {i < profile.careerProgression.length - 1 && (
                  <div className="mt-1 h-5 w-px bg-border" />
                )}
              </div>
              <p className={`mt-1 text-sm ${i === profile.careerProgression.length - 1 ? "font-semibold text-primary" : "text-foreground"}`}>
                {step}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Labour Market Relevance */}
      <SectionCard icon={<BarChart2 className="size-5" />} title="Labour Market Relevance">
        <p className="text-sm text-foreground leading-relaxed">{profile.labourMarketRelevance}</p>
      </SectionCard>

      {/* G. Vacancy Optimisation Advice */}
      <SectionCard icon={<Lightbulb className="size-5" />} title="Vacancy Optimisation Advice">
        <ul className="space-y-2.5">
          {profile.vacancyOptimizationAdvice.map((a, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-sm text-foreground">{a}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* H. Candidate Matching Criteria */}
      <SectionCard icon={<CheckCircle className="size-5" />} title="Candidate Matching Criteria">
        <ul className="space-y-2.5">
          {profile.candidateMatchingCriteria.map((c, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-sm text-foreground">{c}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Public sector note */}
      {profile.isPublicSector && (
        <div className="rounded-2xl border border-secondary bg-secondary/30 p-5 flex gap-3">
          <Shield className="size-5 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Public Sector / Government Role Detected</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This occupation profile includes additional public sector skills, integrity requirements, and Malaysian government-specific competencies aligned with JPA/SPA frameworks and Dasar Awam Malaysia.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
