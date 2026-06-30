import { TrendingUp, Target, ArrowRight, Clock, AlertTriangle, CheckCircle, Calendar, MapPin } from "lucide-react";
import type { AnalysisResult } from "@/lib/analyze.functions";

type Meta = { companyType: string; industry: string; experience: string; language: string };

interface CareerPathwayProps {
  result: AnalysisResult;
  meta: Meta;
}

function inferCurrentProfile(presentKeywords: string[], industry: string): string {
  const lowerKeywords = presentKeywords.map(k => k.toLowerCase());
  const lowerIndustry = industry.toLowerCase();
  
  // Check for digital/e-commerce profile
  if (lowerKeywords.some(k => k.includes('shopify') || k.includes('e-commerce') || k.includes('ecommerce') || k.includes('digital')) ||
      lowerKeywords.some(k => k.includes('ux') || k.includes('development') || k.includes('optimization'))) {
    return "Digital / E-commerce Profile";
  }
  
  // Check for finance profile
  if (lowerKeywords.some(k => k.includes('finance') || k.includes('banking') || k.includes('accounting') || k.includes('audit')) ||
      lowerIndustry.includes('finance') || lowerIndustry.includes('banking')) {
    return "Finance-Aligned Candidate";
  }
  
  // Check for technical profile
  if (lowerKeywords.some(k => k.includes('software') || k.includes('programming') || k.includes('coding') || k.includes('development')) ||
      lowerIndustry.includes('technology') || lowerIndustry.includes('it')) {
    return "Technical / Software Profile";
  }
  
  // Check for healthcare profile
  if (lowerKeywords.some(k => k.includes('medical') || k.includes('healthcare') || k.includes('nursing') || k.includes('clinical')) ||
      lowerIndustry.includes('healthcare') || lowerIndustry.includes('medical')) {
    return "Healthcare Professional Profile";
  }
  
  // Check for education profile
  if (lowerKeywords.some(k => k.includes('teaching') || k.includes('education') || k.includes('training') || k.includes('academic')) ||
      lowerIndustry.includes('education')) {
    return "Education Professional Profile";
  }
  
  // Check for marketing profile
  if (lowerKeywords.some(k => k.includes('marketing') || k.includes('sales') || k.includes('advertising') || k.includes('social media')) ||
      lowerIndustry.includes('marketing')) {
    return "Marketing & Sales Profile";
  }
  
  return "General Entry-Level Candidate";
}

function generateCareerPathway(currentProfile: string, targetEmployer: string, targetIndustry: string): {
  current: string;
  bridge: string;
  target: string;
} {
  const lowerEmployer = targetEmployer.toLowerCase();
  const lowerIndustry = targetIndustry.toLowerCase();
  
  // Government + Finance pathway
  if (lowerEmployer.includes('government') || lowerEmployer.includes('civil service')) {
    if (lowerIndustry.includes('finance') || lowerIndustry.includes('banking')) {
      return {
        current: currentProfile,
        bridge: "Administrative / Operations Assistant",
        target: "Finance & Government Services Candidate"
      };
    }
    if (lowerIndustry.includes('technology') || lowerIndustry.includes('it')) {
      return {
        current: currentProfile,
        bridge: "Technical Support / IT Assistant",
        target: "Government Technology Services"
      };
    }
    return {
      current: currentProfile,
      bridge: "Administrative Assistant",
      target: "Government Services Officer"
    };
  }
  
  // MNC pathway
  if (lowerEmployer.includes('mnc') || lowerEmployer.includes('multinational')) {
    if (lowerIndustry.includes('finance') || lowerIndustry.includes('banking')) {
      return {
        current: currentProfile,
        bridge: "Junior Finance Associate",
        target: "MNC Finance Professional"
      };
    }
    return {
      current: currentProfile,
      bridge: "Entry-Level Associate",
      target: "MNC Professional"
    };
  }
  
  // Local company pathway
  if (lowerEmployer.includes('local') || lowerEmployer.includes('private')) {
    return {
      current: currentProfile,
      bridge: "Junior Executive",
      target: `${targetIndustry} Professional`
    };
  }
  
  // GLC pathway
  if (lowerEmployer.includes('glc') || lowerEmployer.includes('petronas') || lowerEmployer.includes('maybank')) {
    return {
      current: currentProfile,
      bridge: "Management Trainee",
      target: "GLC Professional"
    };
  }
  
  // Default pathway
  return {
    current: currentProfile,
    bridge: "Entry-Level Position",
    target: `${targetIndustry} Professional`
  };
}

function categorizeGaps(missingKeywords: string[]): {
  critical: string[];
  important: string[];
  supporting: string[];
} {
  return {
    critical: missingKeywords.slice(0, 2),
    important: missingKeywords.slice(2, 4),
    supporting: missingKeywords.slice(4)
  };
}

function generateReadinessTimeline(score: number): string {
  if (score >= 80) return "Ready to apply now";
  if (score >= 65) return "Ready with minor improvements";
  if (score >= 50) return "2–4 weeks improvement recommended";
  return "4–8 weeks improvement recommended";
}

function generateActionPlan(priorityImprovements: string[], targetEmployer: string): {
  week1: string;
  week2: string;
  week3_4: string;
} {
  return {
    week1: "Fix CV structure and add target keywords for " + targetEmployer.toLowerCase() + " roles",
    week2: "Add role-specific evidence, projects, or certifications relevant to target industry",
    week3_4: "Apply to aligned entry-level roles and prepare interview answers for " + targetEmployer.toLowerCase() + " positions"
  };
}

export function CareerPathway({ result, meta }: CareerPathwayProps) {
  const currentProfile = inferCurrentProfile(result.keywords.present_keywords, meta.industry);
  const pathway = generateCareerPathway(currentProfile, meta.companyType, meta.industry);
  const gaps = categorizeGaps(result.keywords.missing_keywords);
  const readiness = generateReadinessTimeline(result.overall_score);
  const actionPlan = generateActionPlan(result.priority_improvements, meta.companyType);

  return (
    <div className="mt-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary">Career Pathway & Skills Gap</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          See where you are now, what role you are targeting, and what skills you need to close the gap.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Profile Position */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Current Profile Position</h3>
          </div>
          <p className="text-lg font-medium text-primary">{currentProfile}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Based on your present skills and CV content
          </p>
        </div>

        {/* Target Direction */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Target Direction</h3>
          </div>
          <p className="text-lg font-medium text-primary">{meta.companyType}</p>
          <p className="text-sm text-muted-foreground">— {meta.industry}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Your selected employer type and industry
          </p>
        </div>

        {/* Career Pathway */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Career Pathway</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
                <p className="text-sm font-medium text-primary">Current Profile</p>
                <p className="text-sm text-foreground mt-2">{pathway.current}</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="size-5 text-muted-foreground hidden md:block" />
              <div className="text-center md:hidden">
                <ArrowRight className="size-5 text-muted-foreground mx-auto" />
              </div>
            </div>
            <div className="text-center">
              <div className="rounded-xl bg-secondary/40 border border-border p-4">
                <p className="text-sm font-medium text-foreground">Bridge Role</p>
                <p className="text-sm text-foreground mt-2">{pathway.bridge}</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="size-5 text-muted-foreground hidden md:block" />
              <div className="text-center md:hidden">
                <ArrowRight className="size-5 text-muted-foreground mx-auto" />
              </div>
            </div>
            <div className="text-center">
              <div className="rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 p-4">
                <p className="text-sm font-medium text-[var(--success)]">Target Role</p>
                <p className="text-sm text-foreground mt-2">{pathway.target}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Gap */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="size-5 text-[#F97316]" />
            <h3 className="font-semibold text-foreground">Skills Gap</h3>
          </div>
          <div className="space-y-2">
            {result.keywords.missing_keywords.length > 0 ? (
              result.keywords.missing_keywords.map((gap, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                  <span className="text-sm text-foreground">{gap}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No major skills gaps identified</p>
            )}
          </div>
        </div>

        {/* Gap Priority */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Gap Priority</h3>
          </div>
          <div className="space-y-3">
            {gaps.critical.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-destructive mb-2">
                  Critical Gap
                </p>
                {gaps.critical.map((gap, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    <span className="text-sm text-foreground">{gap}</span>
                  </div>
                ))}
              </div>
            )}
            {gaps.important.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#F97316] mb-2">
                  Important Gap
                </p>
                {gaps.important.map((gap, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                    <span className="text-sm text-foreground">{gap}</span>
                  </div>
                ))}
              </div>
            )}
            {gaps.supporting.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--warning)] mb-2">
                  Supporting Gap
                </p>
                {gaps.supporting.map((gap, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                    <span className="text-sm text-foreground">{gap}</span>
                  </div>
                ))}
              </div>
            )}
            {gaps.critical.length === 0 && gaps.important.length === 0 && gaps.supporting.length === 0 && (
              <p className="text-sm text-muted-foreground">No priority gaps identified</p>
            )}
          </div>
        </div>

        {/* 30-Day Action Plan */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">30-Day Action Plan</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-secondary/40 p-4">
              <p className="text-sm font-medium text-primary mb-2">Week 1</p>
              <p className="text-sm text-muted-foreground">{actionPlan.week1}</p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-4">
              <p className="text-sm font-medium text-primary mb-2">Week 2</p>
              <p className="text-sm text-muted-foreground">{actionPlan.week2}</p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-4">
              <p className="text-sm font-medium text-primary mb-2">Week 3–4</p>
              <p className="text-sm text-muted-foreground">{actionPlan.week3_4}</p>
            </div>
          </div>
        </div>

        {/* Readiness Timeline */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Readiness Timeline</h3>
                <p className="text-sm text-muted-foreground">Based on your overall CV score of {result.overall_score}/100</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium text-primary">{readiness}</p>
              <p className="text-xs text-muted-foreground">
                {result.overall_score < 50 && `before applying to competitive ${meta.companyType} roles`}
                {result.overall_score >= 50 && result.overall_score < 65 && `to strengthen your application for ${meta.companyType} roles`}
                {result.overall_score >= 65 && `for ${meta.companyType} opportunities`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
