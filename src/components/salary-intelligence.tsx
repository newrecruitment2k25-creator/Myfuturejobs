import { TrendingUp, DollarSign, Target, Clock, AlertCircle, CheckCircle, Award, ArrowRight } from "lucide-react";
import type { AnalysisResult } from "@/lib/analyze.functions";

type Meta = { companyType: string; industry: string; experience: string; language: string };

interface SalaryIntelligenceProps {
  result: AnalysisResult;
  meta: Meta;
}

function getMarketPosition(score: number): string {
  if (score >= 80) return "Highly Competitive";
  if (score >= 65) return "Competitive";
  if (score >= 50) return "Developing";
  return "Entry Level";
}

function getMarketPositionColor(position: string): string {
  if (position === "Highly Competitive") return "text-[var(--success)]";
  if (position === "Competitive") return "text-primary";
  if (position === "Developing") return "text-[#F97316]";
  return "text-destructive";
}

function inferCurrentProfile(presentKeywords: string[]): string {
  const lowerKeywords = presentKeywords.map(k => k.toLowerCase());
  
  if (lowerKeywords.some(k => k.includes('shopify') || k.includes('e-commerce') || k.includes('ecommerce') || k.includes('digital')) ||
      lowerKeywords.some(k => k.includes('ux') || k.includes('development') || k.includes('optimization'))) {
    return "Digital / E-commerce Profile";
  }
  
  if (lowerKeywords.some(k => k.includes('finance') || k.includes('banking') || k.includes('accounting') || k.includes('audit'))) {
    return "Finance-Aligned Profile";
  }
  
  if (lowerKeywords.some(k => k.includes('software') || k.includes('programming') || k.includes('coding') || k.includes('development'))) {
    return "Technical / Software Profile";
  }
  
  if (lowerKeywords.some(k => k.includes('medical') || k.includes('healthcare') || k.includes('nursing') || k.includes('clinical'))) {
    return "Healthcare Professional Profile";
  }
  
  if (lowerKeywords.some(k => k.includes('teaching') || k.includes('education') || k.includes('training') || k.includes('academic'))) {
    return "Education Professional Profile";
  }
  
  if (lowerKeywords.some(k => k.includes('marketing') || k.includes('sales') || k.includes('advertising') || k.includes('social media'))) {
    return "Marketing & Sales Profile";
  }
  
  return "General Entry-Level Profile";
}

function getSalaryRange(profile: string, position: string): { min: number; max: number } {
  const positionMultiplier = position === "Highly Competitive" ? 1.3 : 
                           position === "Competitive" ? 1.1 : 
                           position === "Developing" ? 0.9 : 0.7;
  
  const baseRanges: Record<string, { min: number; max: number }> = {
    "Digital / E-commerce Profile": { min: 2800, max: 4500 },
    "Finance-Aligned Profile": { min: 3000, max: 5000 },
    "Technical / Software Profile": { min: 3200, max: 5500 },
    "Healthcare Professional Profile": { min: 2500, max: 4000 },
    "Education Professional Profile": { min: 2200, max: 3500 },
    "Marketing & Sales Profile": { min: 2600, max: 4200 },
    "General Entry-Level Profile": { min: 2000, max: 3500 }
  };
  
  const base = baseRanges[profile] || baseRanges["General Entry-Level Profile"];
  
  return {
    min: Math.round(base.min * positionMultiplier),
    max: Math.round(base.max * positionMultiplier)
  };
}

function getBridgeRoleSalary(bridgeRole: string, targetEmployer: string): { min: number; max: number } {
  const baseRanges: Record<string, { min: number; max: number }> = {
    "Administrative / Operations Assistant": { min: 2500, max: 4000 },
    "Technical Support / IT Assistant": { min: 2800, max: 4200 },
    "Administrative Assistant": { min: 2200, max: 3500 },
    "Junior Finance Associate": { min: 3000, max: 4500 },
    "Entry-Level Associate": { min: 2600, max: 3800 },
    "Management Trainee": { min: 3200, max: 4800 },
    "Junior Executive": { min: 2800, max: 4200 }
  };
  
  const base = baseRanges[bridgeRole] || baseRanges["Administrative Assistant"];
  
  // Government roles typically have slightly different ranges
  if (targetEmployer.toLowerCase().includes('government') || targetEmployer.toLowerCase().includes('civil service')) {
    return {
      min: Math.round(base.min * 1.1),
      max: Math.round(base.max * 1.1)
    };
  }
  
  return base;
}

function getTargetRoleSalary(targetRole: string, targetEmployer: string, targetIndustry: string): { min: number; max: number } {
  const industryMultiplier = targetIndustry.toLowerCase().includes('finance') || targetIndustry.toLowerCase().includes('banking') ? 1.2 :
                            targetIndustry.toLowerCase().includes('technology') || targetIndustry.toLowerCase().includes('it') ? 1.15 :
                            targetIndustry.toLowerCase().includes('healthcare') ? 1.1 : 1.0;
  
  const baseRanges: Record<string, { min: number; max: number }> = {
    "Finance & Government Services": { min: 4000, max: 6500 },
    "Government Technology Services": { min: 4200, max: 6800 },
    "Government Services Officer": { min: 3500, max: 5500 },
    "MNC Finance Professional": { min: 4500, max: 7000 },
    "MNC Professional": { min: 3800, max: 6000 },
    "Finance Professional": { min: 4200, max: 6800 },
    "Technology Professional": { min: 4000, max: 6500 },
    "GLC Professional": { min: 3800, max: 6000 }
  };
  
  const base = baseRanges[targetRole] || baseRanges["Government Services Officer"];
  
  return {
    min: Math.round(base.min * industryMultiplier),
    max: Math.round(base.max * industryMultiplier)
  };
}

function getGrowthProjection(currentSalary: { min: number; max: number }, targetSalary: { min: number; max: number }): {
  current: { min: number; max: number };
  oneYear: { min: number; max: number };
  threeYears: { min: number; max: number };
} {
  const avgCurrent = (currentSalary.min + currentSalary.max) / 2;
  const avgTarget = (targetSalary.min + targetSalary.max) / 2;
  const growthPotential = (avgTarget - avgCurrent) / avgCurrent;
  
  return {
    current: currentSalary,
    oneYear: {
      min: Math.round(currentSalary.min * (1 + growthPotential * 0.4)),
      max: Math.round(currentSalary.max * (1 + growthPotential * 0.4))
    },
    threeYears: {
      min: Math.round(currentSalary.min * (1 + growthPotential * 0.8)),
      max: Math.round(currentSalary.max * (1 + growthPotential * 0.8))
    }
  };
}

function getMarketCompetitiveness(score: number, targetEmployer: string, targetIndustry: string): {
  status: string;
  color: string;
  explanation: string;
} {
  if (score >= 80) {
    return {
      status: "Strong",
      color: "text-[var(--success)]",
      explanation: `Your profile demonstrates strong competitiveness for ${targetEmployer} roles in ${targetIndustry}. You're well-positioned for salary negotiations.`
    };
  }
  
  if (score >= 65) {
    return {
      status: "Competitive",
      color: "text-primary",
      explanation: `Your profile shows good competitiveness for ${targetEmployer} roles in ${targetIndustry}. Minor improvements could further increase salary potential.`
    };
  }
  
  if (score >= 50) {
    return {
      status: "Developing",
      color: "text-[#F97316]",
      explanation: `Your current profile is developing for ${targetEmployer} roles in ${targetIndustry}. Focusing on key skills and certifications can boost your market position.`
    };
  }
  
  return {
    status: "Needs Improvement",
    color: "text-destructive",
    explanation: `Your current profile is below the average competitiveness expected for ${targetEmployer} ${targetIndustry} roles. Improving skills, certifications and keyword alignment can significantly increase salary potential.`
  };
}

function generateSalaryBoosters(missingKeywords: string[], priorityImprovements: string[], targetIndustry: string): string[] {
  const boosters: string[] = [];
  
  // Add missing keywords as boosters
  missingKeywords.slice(0, 3).forEach(keyword => {
    boosters.push(`Add ${keyword} keywords`);
  });
  
  // Add industry-specific boosters
  if (targetIndustry.toLowerCase().includes('finance') || targetIndustry.toLowerCase().includes('banking')) {
    boosters.push("Earn Finance/Accounting certification");
    boosters.push("Gain Compliance knowledge");
  }
  
  if (targetIndustry.toLowerCase().includes('technology') || targetIndustry.toLowerCase().includes('it')) {
    boosters.push("Obtain technical certifications");
    boosters.push("Build project portfolio");
  }
  
  if (targetIndustry.toLowerCase().includes('government') || targetIndustry.toLowerCase().includes('civil service')) {
    boosters.push("Understand public sector processes");
    boosters.push("Strengthen Bahasa Malaysia skills");
  }
  
  // Add general boosters from priority improvements
  priorityImprovements.slice(0, 2).forEach(improvement => {
    if (improvement.toLowerCase().includes('certification')) {
      boosters.push("Earn industry certification");
    } else if (improvement.toLowerCase().includes('skill') || improvement.toLowerCase().includes('keyword')) {
      boosters.push("Improve ATS score with keywords");
    } else if (improvement.toLowerCase().includes('malaysia') || improvement.toLowerCase().includes('market')) {
      boosters.push("Strengthen Malaysia market alignment");
    }
  });
  
  // Remove duplicates and limit to 5
  const uniqueBoosters = [...new Set(boosters)];
  return uniqueBoosters.slice(0, 5);
}

function formatCurrency(amount: number): string {
  return `RM ${amount.toLocaleString()}`;
}

export function SalaryIntelligence({ result, meta }: SalaryIntelligenceProps) {
  const marketPosition = getMarketPosition(result.overall_score);
  const marketPositionColor = getMarketPositionColor(marketPosition);
  const currentProfile = inferCurrentProfile(result.keywords.present_keywords);
  const currentSalary = getSalaryRange(currentProfile, marketPosition);
  
  // Get career pathway info (simplified version)
  const bridgeRole = "Administrative / Operations Assistant"; // This would come from Career Pathway component
  const targetRole = "Finance & Government Services"; // This would come from Career Pathway component
  
  const bridgeSalary = getBridgeRoleSalary(bridgeRole, meta.companyType);
  const targetSalary = getTargetRoleSalary(targetRole, meta.companyType, meta.industry);
  const growthProjection = getGrowthProjection(currentSalary, targetSalary);
  const competitiveness = getMarketCompetitiveness(result.overall_score, meta.companyType, meta.industry);
  const salaryBoosters = generateSalaryBoosters(result.keywords.missing_keywords, result.priority_improvements, meta.industry);
  
  const monthlyIncrease = targetSalary.min - currentSalary.max;
  const annualIncrease = monthlyIncrease * 12;
  
  return (
    <div className="mt-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary">Salary Intelligence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Understand your potential earning path in Malaysia based on your current profile and target career direction.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Market Position */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Current Market Position</h3>
          </div>
          <p className={`text-lg font-medium ${marketPositionColor}`}>{marketPosition}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Based on your overall CV score of {result.overall_score}/100
          </p>
        </div>

        {/* Current Salary Range */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Current Salary Range</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{currentProfile}</p>
          <p className="text-lg font-medium text-primary">
            {formatCurrency(currentSalary.min)} – {formatCurrency(currentSalary.max)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Estimated monthly salary in Malaysia</p>
        </div>

        {/* Bridge Role Salary */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight className="size-5 text-[#F97316]" />
            <h3 className="font-semibold text-foreground">Bridge Role Salary</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{bridgeRole}</p>
          <p className="text-lg font-medium text-primary">
            {formatCurrency(bridgeSalary.min)} – {formatCurrency(bridgeSalary.max)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Expected salary for transition role</p>
        </div>

        {/* Target Role Salary */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Award className="size-5 text-[var(--success)]" />
            <h3 className="font-semibold text-foreground">Target Role Salary</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{targetRole}</p>
          <p className="text-lg font-medium text-primary">
            {formatCurrency(targetSalary.min)} – {formatCurrency(targetSalary.max)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Potential salary at target position</p>
        </div>

        {/* Salary Growth Projection */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Salary Growth Projection</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-secondary/40 p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">Current</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(growthProjection.current.min)}–{formatCurrency(growthProjection.current.max)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">1 Year</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(growthProjection.oneYear.min)}–{formatCurrency(growthProjection.oneYear.max)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/40 p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">3 Years</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(growthProjection.threeYears.min)}+
              </p>
            </div>
          </div>
        </div>

        {/* Salary Gap Opportunity */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-5 text-[var(--success)]" />
            <h3 className="font-semibold text-foreground">Salary Gap Opportunity</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Potential Increase:</p>
              <p className="text-lg font-bold text-[var(--success)]">
                +{formatCurrency(Math.max(0, monthlyIncrease))}/month
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Potential Annual Increase:</p>
              <p className="text-lg font-bold text-[var(--success)]">
                +{formatCurrency(Math.max(0, annualIncrease))}/year
              </p>
            </div>
          </div>
        </div>

        {/* Market Competitiveness */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Market Competitiveness</h3>
          </div>
          <p className={`text-lg font-medium mb-2 ${competitiveness.color}`}>{competitiveness.status}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {competitiveness.explanation}
          </p>
        </div>

        {/* Recommended Salary Boosters */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Recommended Salary Boosters</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {salaryBoosters.map((booster, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-foreground">{booster}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-2xl border border-border bg-secondary/40 p-4 md:col-span-2">
          <p className="text-xs text-muted-foreground text-center">
            Salary estimates are based on Malaysian market trends and profile readiness indicators.
          </p>
        </div>
      </div>
    </div>
  );
}
