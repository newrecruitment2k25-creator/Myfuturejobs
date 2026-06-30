import { Award, TrendingUp, AlertCircle, Globe2, Target, BadgeCheck } from "lucide-react";
import type { AnalysisResult } from "@/lib/analyze.functions";

type Meta = { companyType: string; industry: string; experience: string; language: string };

interface SkillsPassportProps {
  result: AnalysisResult;
  meta: Meta;
}

function getPassportReadiness(keywordScore: number, missingCount: number): {
  level: string;
  color: string;
  bgColor: string;
} {
  if (missingCount > 3 && keywordScore < 60) {
    return {
      level: "Needs Development",
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    };
  }
  if (keywordScore >= 50 && keywordScore <= 64) {
    return {
      level: "Developing",
      color: "text-[#F97316]",
      bgColor: "bg-[#F97316]/10"
    };
  }
  if (keywordScore >= 65 && keywordScore <= 79) {
    return {
      level: "Market Ready",
      color: "text-[var(--warning)]",
      bgColor: "bg-[var(--warning)]/10"
    };
  }
  return {
    level: "Strong",
    color: "text-[var(--success)]",
    bgColor: "bg-[var(--success)]/10"
  };
}

function classifySkills(keywords: string[]): {
  technical: string[];
  soft: string[];
} {
  const technicalKeywords = [
    'javascript', 'python', 'java', 'react', 'node', 'sql', 'aws', 'azure', 'docker',
    'kubernetes', 'git', 'html', 'css', 'typescript', 'mongodb', 'postgresql', 'mysql',
    'linux', 'windows', 'mac', 'office', 'excel', 'powerpoint', 'word', 'sap', 'salesforce',
    'finance', 'banking', 'accounting', 'tax', 'audit', 'budget', 'financial', 'investment',
    'engineering', 'mechanical', 'electrical', 'civil', 'chemical', 'software', 'hardware',
    'healthcare', 'medical', 'nursing', 'pharmacy', 'doctor', 'clinical', 'research',
    'education', 'teaching', 'training', 'curriculum', 'academic', 'university', 'school',
    'marketing', 'digital', 'social', 'media', 'content', 'seo', 'sem', 'analytics', 'crm'
  ];

  const technical: string[] = [];
  const soft: string[] = [];

  keywords.forEach(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    if (technicalKeywords.some(tech => lowerKeyword.includes(tech))) {
      technical.push(keyword);
    } else {
      soft.push(keyword);
    }
  });

  return { technical, soft };
}

function inferTransferableSkills(present: string[], improvements: string[]): string[] {
  const transferablePatterns = [
    'team', 'collaboration', 'communication', 'leadership', 'management',
    'time', 'organization', 'planning', 'problem', 'analytical', 'critical',
    'attention', 'detail', 'creativity', 'innovation', 'adaptability', 'flexible',
    'project', 'coordination', 'presentation', 'negotiation', 'customer', 'service'
  ];

  const transferable: string[] = [];
  
  // Check present keywords
  present.forEach(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    if (transferablePatterns.some(pattern => lowerKeyword.includes(pattern))) {
      transferable.push(keyword);
    }
  });

  // Check improvements for transferable skills
  improvements.forEach(improvement => {
    const lowerImprovement = improvement.toLowerCase();
    transferablePatterns.forEach(pattern => {
      if (lowerImprovement.includes(pattern) && !transferable.some(skill => skill.toLowerCase().includes(pattern))) {
        // Extract the skill from the improvement text
        const words = improvement.split(' ');
        words.forEach(word => {
          if (word.toLowerCase().includes(pattern) && word.length > 3) {
            const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
            if (!transferable.includes(capitalized)) {
              transferable.push(capitalized);
            }
          }
        });
      }
    });
  });

  return transferable.slice(0, 6); // Limit to 6 skills
}

export function SkillsPassport({ result, meta }: SkillsPassportProps) {
  const { technical, soft } = classifySkills(result.keywords.present_keywords);
  const transferable = inferTransferableSkills(result.keywords.present_keywords, result.priority_improvements);
  const readiness = getPassportReadiness(result.keywords.score, result.keywords.missing_keywords.length);

  // Generate summary
  const summary = `This candidate shows useful transferable workplace skills${
    result.keywords.missing_keywords.length > 0 
      ? ` but needs stronger ${result.keywords.missing_keywords.slice(0, 3).join(', ')} keywords to become more competitive for ${meta.companyType} roles`
      : ` and is well-positioned for ${meta.companyType} roles`
  }. Improving role-specific evidence${
    result.malaysia_market_fit.score < 70 ? ' and Malaysian market alignment' : ''
  } should be the next priority.`;

  return (
    <div className="mt-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary">Skills Passport</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A structured view of your current skills profile based on your CV analysis.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Technical / Role Skills */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Technical / Role Skills</h3>
          </div>
          <div className="space-y-3">
            {technical.length > 0 ? (
              <>
                {technical.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Technical Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {technical.map((skill, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {soft.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Professional Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {soft.map((skill, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-secondary/40 px-3 py-1.5 text-sm font-medium text-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {result.keywords.present_keywords.length > 0 
                  ? "Skills identified but not yet classified"
                  : "No specific skills identified in CV"}
              </p>
            )}
          </div>
        </div>

        {/* Missing Target Skills */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="size-5 text-[#F97316]" />
            <h3 className="font-semibold text-foreground">Missing Target Skills</h3>
          </div>
          <div className="space-y-3">
            {result.keywords.missing_keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.keywords.missing_keywords.map((skill, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No major missing skills detected</p>
            )}
            <p className="text-xs text-muted-foreground">
              Important for {meta.companyType} roles in {meta.industry}
            </p>
          </div>
        </div>

        {/* Transferable Skills */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-5 text-[var(--success)]" />
            <h3 className="font-semibold text-foreground">Transferable Skills</h3>
          </div>
          <div className="space-y-3">
            {transferable.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {transferable.map((skill, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-[var(--success)]/15 px-3 py-1.5 text-sm font-medium text-[var(--success)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Transferable skills inferred from existing strengths
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Valuable across different roles and industries
            </p>
          </div>
        </div>

        {/* Language & Market Readiness */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Language & Market Readiness</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">BM/English Balance</span>
                <span className="text-sm font-bold text-primary">{result.language_balance.score}/100</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, result.language_balance.score)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {result.language_balance.score >= 70 ? "Strong bilingual readiness" : 
                 result.language_balance.score >= 50 ? "Developing language balance" : 
                 "Language skills need improvement"}
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Malaysia Market Fit</span>
                <span className="text-sm font-bold text-primary">{result.malaysia_market_fit.score}/100</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, result.malaysia_market_fit.score)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {result.malaysia_market_fit.score >= 70 ? "Strong Malaysian employer alignment" : 
                 result.malaysia_market_fit.score >= 50 ? "Moderate market fit" : 
                 "Needs Malaysian market optimization"}
              </p>
            </div>
          </div>
        </div>

        {/* Skills Passport Summary */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Award className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Skills Passport Summary</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {summary}
          </p>
        </div>

        {/* Passport Readiness Badge */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BadgeCheck className="size-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Passport Readiness</h3>
                <p className="text-sm text-muted-foreground">Overall skills completeness assessment</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full ${readiness.bgColor} ${readiness.color} font-medium`}>
              {readiness.level}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
