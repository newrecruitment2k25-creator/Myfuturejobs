import { useState, useEffect } from "react";
import { 
  User, 
  Briefcase, 
  Target, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Star, 
  BookOpen, 
  Award,
  Building,
  TrendingUp,
  Loader2,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateInterviewPreparation } from "@/lib/interview.functions";
import { useServerFn } from "@tanstack/react-start";
import type { AnalysisResult } from "@/lib/analyze.functions";

type Meta = { companyType: string; industry: string; experience: string; language: string };

interface InterviewPreparationProps {
  result: AnalysisResult;
  meta: Meta;
}

interface InterviewData {
  overview: {
    targetRole: string;
    industry: string;
    employerType: string;
    readinessScore: number;
    readinessLevel: string;
  };
  technicalQuestions: Array<{
    question: string;
    category: string;
    difficulty: string;
    whyImportant: string;
    suggestedApproach: string;
  }>;
  behavioralQuestions: Array<{
    question: string;
    category: string;
    difficulty: string;
    whyImportant: string;
    suggestedApproach: string;
  }>;
  situationalQuestions: Array<{
    question: string;
    category: string;
    difficulty: string;
    whyImportant: string;
    suggestedApproach: string;
  }>;
  governmentQuestions?: Array<{
    question: string;
    category: string;
    difficulty: string;
    whyImportant: string;
    suggestedApproach: string;
  }>;
  answerFramework: {
    format: string;
    explanation: string;
    example: string;
  };
  readiness: {
    score: number;
    level: string;
    strengths: string[];
    areasToImprove: string[];
    preparationTips: string[];
  };
  topQuestionsToPractice: Array<{
    question: string;
    category: string;
    difficulty: string;
    whyImportant: string;
    suggestedApproach: string;
  }>;
}

function getReadinessColor(level: string): string {
  switch (level.toLowerCase()) {
    case "interview ready":
      return "text-[var(--success)]";
    case "ready":
      return "text-primary";
    case "developing":
      return "text-[#F97316]";
    case "needs preparation":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function getReadinessBgColor(level: string): string {
  switch (level.toLowerCase()) {
    case "interview ready":
      return "bg-[var(--success)]/10";
    case "ready":
      return "bg-primary/10";
    case "developing":
      return "bg-[#F97316]/10";
    case "needs preparation":
      return "bg-destructive/10";
    default:
      return "bg-secondary/40";
  }
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "beginner":
      return "text-[var(--success)]";
    case "intermediate":
      return "text-[#F97316]";
    case "advanced":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function InterviewPreparation({ result, meta }: InterviewPreparationProps) {
  const generateInterview = useServerFn(generateInterviewPreparation);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInterviewPreparation();
  }, []);

  const loadInterviewPreparation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await generateInterview({
        data: {
          cvAnalysis: {
            overall_score: result.overall_score,
            keywords: {
              present_keywords: result.keywords.present_keywords,
              missing_keywords: result.keywords.missing_keywords
            },
            priority_improvements: result.priority_improvements,
            malaysia_market_fit: result.malaysia_market_fit,
            keyword_optimization_score: result.keyword_optimization_score
          },
          targetRole: `${meta.companyType} - ${meta.industry}`,
          industry: meta.industry,
          employerType: meta.companyType,
          experienceLevel: meta.experience
        }
      });

      setInterviewData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate interview preparation";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center space-y-4 py-20">
            <Loader2 className="size-12 text-primary animate-spin" />
            <h2 className="text-2xl font-bold text-foreground">Generating Your Interview Preparation</h2>
            <p className="text-muted-foreground">Creating personalized questions and strategies based on your CV analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center space-y-4 py-20">
            <AlertTriangle className="size-12 text-destructive" />
            <h2 className="text-2xl font-bold text-foreground">Interview Preparation Unavailable</h2>
            <p className="text-muted-foreground text-center max-w-md">{error}</p>
            <Button onClick={loadInterviewPreparation}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!interviewData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-primary mb-4">Interview Preparation</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Personalized interview questions and preparation strategies based on your CV analysis and target role
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Interview Overview */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Interview Overview</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Briefcase className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Target Role</p>
                  <p className="font-medium text-foreground">{interviewData.overview.targetRole}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Industry</p>
                  <p className="font-medium text-foreground">{interviewData.overview.industry}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Employer Type</p>
                  <p className="font-medium text-foreground">{interviewData.overview.employerType}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Readiness Score</span>
                  <span className="text-2xl font-bold text-primary">{interviewData.overview.readinessScore}</span>
                </div>
                <div className={`mt-2 px-3 py-1 rounded-full text-sm font-medium ${getReadinessBgColor(interviewData.overview.readinessLevel)} ${getReadinessColor(interviewData.overview.readinessLevel)}`}>
                  {interviewData.overview.readinessLevel}
                </div>
              </div>
            </div>
          </div>

          {/* Interview Readiness Score */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Readiness Assessment</h3>
            </div>
            <div className="space-y-4">
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getReadinessBgColor(interviewData.readiness.level)} ${getReadinessColor(interviewData.readiness.level)} font-medium`}>
                  <Star className="size-4" />
                  {interviewData.readiness.level}
                </div>
                <p className="text-3xl font-bold text-primary mt-2">{interviewData.readiness.score}/100</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Strengths</p>
                <ul className="space-y-1">
                  {interviewData.readiness.strengths.map((strength, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="size-3 text-[var(--success)]" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Areas to Improve</p>
                <ul className="space-y-1">
                  {interviewData.readiness.areasToImprove.map((area, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="size-3 text-[#F97316]" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Top 5 Questions To Practice */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Target className="size-5 text-[#F97316]" />
              <h3 className="font-semibold text-foreground">Top 5 Questions To Practice First</h3>
            </div>
            <div className="space-y-4">
              {interviewData.topQuestionsToPractice.map((item, i) => (
                <div key={i} className="rounded-lg bg-secondary/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-foreground">{item.question}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(item.difficulty)}`}>
                          {item.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.whyImportant}</p>
                      <div className="bg-background rounded p-3">
                        <p className="text-sm font-medium text-foreground mb-1">Suggested Approach:</p>
                        <p className="text-sm text-muted-foreground">{item.suggestedApproach}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Questions */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Technical Questions</h3>
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {interviewData.technicalQuestions.length} Questions
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {interviewData.technicalQuestions.map((item, i) => (
                <div key={i} className="rounded-lg border border-border bg-secondary/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(item.difficulty)}`}>
                      {item.difficulty}
                    </span>
                  </div>
                  <h4 className="font-medium text-foreground mb-2">{item.question}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{item.whyImportant}</p>
                  <div className="bg-background rounded p-3">
                    <p className="text-sm font-medium text-foreground mb-1">Approach:</p>
                    <p className="text-sm text-muted-foreground">{item.suggestedApproach}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Behavioral Questions */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <User className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Behavioral Questions</h3>
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {interviewData.behavioralQuestions.length} Questions
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {interviewData.behavioralQuestions.map((item, i) => (
                <div key={i} className="rounded-lg border border-border bg-secondary/40 p-4">
                  <h4 className="font-medium text-foreground mb-2">{item.question}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{item.whyImportant}</p>
                  <div className="bg-background rounded p-3">
                    <p className="text-sm font-medium text-foreground mb-1">Approach:</p>
                    <p className="text-sm text-muted-foreground">{item.suggestedApproach}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Situational Questions */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Situational Questions</h3>
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {interviewData.situationalQuestions.length} Questions
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {interviewData.situationalQuestions.map((item, i) => (
                <div key={i} className="rounded-lg border border-border bg-secondary/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(item.difficulty)}`}>
                      {item.difficulty}
                    </span>
                  </div>
                  <h4 className="font-medium text-foreground mb-2">{item.question}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{item.whyImportant}</p>
                  <div className="bg-background rounded p-3">
                    <p className="text-sm font-medium text-foreground mb-1">Approach:</p>
                    <p className="text-sm text-muted-foreground">{item.suggestedApproach}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Government Questions (conditional) */}
          {interviewData.governmentQuestions && interviewData.governmentQuestions.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Building className="size-5 text-primary" />
                <h3 className="font-semibold text-foreground">Government & Public Sector Questions</h3>
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  {interviewData.governmentQuestions.length} Questions
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {interviewData.governmentQuestions.map((item, i) => (
                  <div key={i} className="rounded-lg border border-border bg-secondary/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(item.difficulty)}`}>
                        {item.difficulty}
                      </span>
                    </div>
                    <h4 className="font-medium text-foreground mb-2">{item.question}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{item.whyImportant}</p>
                    <div className="bg-background rounded p-3">
                      <p className="text-sm font-medium text-foreground mb-1">Approach:</p>
                      <p className="text-sm text-muted-foreground">{item.suggestedApproach}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAR Answer Framework */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Award className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">STAR Answer Framework</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-secondary/40 rounded-lg p-4">
                <h4 className="font-medium text-primary mb-2">{interviewData.answerFramework.format}</h4>
                <p className="text-sm text-muted-foreground mb-4">{interviewData.answerFramework.explanation}</p>
                
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold mx-auto mb-2">
                      S
                    </div>
                    <p className="text-sm font-medium text-foreground">Situation</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold mx-auto mb-2">
                      T
                    </div>
                    <p className="text-sm font-medium text-foreground">Task</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold mx-auto mb-2">
                      A
                    </div>
                    <p className="text-sm font-medium text-foreground">Action</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold mx-auto mb-2">
                      R
                    </div>
                    <p className="text-sm font-medium text-foreground">Result</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-background rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">Example</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{interviewData.answerFramework.example}</p>
              </div>
            </div>
          </div>

          {/* Preparation Tips */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Preparation Tips</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {interviewData.readiness.preparationTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="size-5 text-[var(--success)] mt-0.5" />
                  <p className="text-sm text-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
