import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequest } from "@tanstack/react-start/server";
import { analyzeWithGpt5, AI_MODELS } from "./ai-gateway";
import { insertNotification } from "./notifications";

const InputSchema = z.object({
  cv_text: z.string().min(50).max(60000),
  company_type: z.string().min(1).max(100),
  industry: z.string().min(1).max(100),
  experience_level: z.string().min(1).max(100),
  language_preference: z.string().min(1).max(100),
});

export type AnalysisResult = {
  overall_score: number;
  structure: {
    score: number;
    rating: "Strong" | "Needs Work" | "Weak";
    feedback: string[];
  };
  keywords: {
    score: number;
    rating: "Strong" | "Needs Work" | "Weak";
    missing_keywords: string[];
    present_keywords: string[];
  };
  language_balance: {
    score: number;
    rating: "Strong" | "Needs Work" | "Weak";
    feedback: string[];
  };
  malaysia_market_fit: {
    score: number;
    rating: "Strong" | "Needs Work" | "Weak";
    feedback: string[];
  };
  priority_improvements: string[];
};

const SYSTEM_PROMPT = `You are a Senior Recruitment Consultant and Workforce Intelligence Analyst specializing in the Malaysian employment market. You work with PERKESO, HRD Corp, and major employers (GLCs, MNCs, Government) to evaluate candidate readiness. Your assessments are recruiter-grade and government-ready.

## Document Type Validation

First, determine if the provided text is actually a CV/resume. A CV/resume must contain:
- Personal information (name, contact details)
- Work experience or employment history
- Education or qualifications
- Skills or competencies

If the document is NOT a CV/resume (e.g., a research paper, book chapter, news article, contract, etc.), return an error with is_cv=false and explanation.

## Analysis Framework

Evaluate the CV across 5 dimensions with detailed reasoning:

1. **Structure & Presentation** (0-100)
   - ATS compatibility and parsing-friendliness
   - Logical section ordering and formatting
   - Contact information completeness (include LinkedIn for professional roles)
   - Professional summary quality (if present)
   - Quantified achievements vs. generic descriptions
   - Fresh graduates: CGPA presentation, co-curricular activities, internships

2. **Keywords & Skills Alignment** (0-100)
   - Hard skills presence and specificity (e.g., "Python" not just "programming")
   - Soft skills with evidence (e.g., "led team of 5" for leadership)
   - Industry-specific terminology for the target sector
   - Missing critical keywords for the role
   - Keyword density and ATS optimization

3. **Language Balance** (0-100)
   - Professional English quality
   - Bahasa Malaysia proficiency indicators (critical for government/GLC)
   - Industry-appropriate terminology
   - Grammar, spelling, and professional tone
   - Action verbs and impact statements

4. **Malaysia Market Fit** (0-100)
   - Experience level alignment with Malaysian market norms
   - Industry relevance to current demand (refer to MASCO classifications)
   - Transferable skills for target sector
   - GLC readiness: Bumiputera policy understanding, government liaison experience
   - MNC readiness: Global mindset, cross-cultural competency
   - Government readiness: Proper BM formatting, public service values, JPA/SPA requirements
   - Salary expectation realism for Malaysian market

5. **Priority Improvements** (5 actionable items)
   - Most impactful changes ranked by effort vs. outcome
   - Specific, measurable, and time-bound recommendations
   - Context-aware (e.g., fresh grad vs. experienced professional)

## Output Quality Standards

Provide reasoning for each score and recommendation:
- AVOID: "Candidate needs better formatting"
- PREFER: "The CV uses a 3-column layout that ATS systems often misparse. Single-column format with clear H1/H2 headings will improve parsing accuracy by 40%+"

- AVOID: "Add more skills"
- PREFER: "Missing 3 critical skills for Data Analyst roles in Malaysia: SQL (mentioned in 87% of vacancies), Power BI (required by 62% of employers), and Statistical Analysis. Adding these with proficiency levels will increase match rate from 45% to 78%"

- AVOID: "Good candidate"
- PREFER: "Candidate demonstrates strong alignment with technical requirements (Python, SQL, 3 years experience). However, limited exposure to Malaysian financial regulations (BNM guidelines, PDPA) may reduce readiness for banking sector roles. Compliance training recommended before placement."

## Response Format

Return ONLY valid JSON matching the ANALYSIS_TOOL schema. Include detailed reasoning in your assessment.`;

const ANALYSIS_TOOL = {
  type: "function" as const,
  function: {
    name: "return_cv_analysis",
    description: "Return a comprehensive recruiter-grade CV analysis with reasoning for PERKESO/Malaysian workforce intelligence",
    parameters: {
      type: "object",
      properties: {
        is_cv: {
          type: "boolean",
          description: "Whether the provided document is actually a CV/resume. Set to false if document is not a CV (e.g., research paper, article, contract)",
        },
        document_type_error: {
          type: "string",
          description: "If is_cv is false, explain what type of document this is and why it's not suitable for CV analysis",
        },
        overall_score: {
          type: "number",
          description: "Overall employability score 0-100 based on recruiter assessment criteria",
        },
        overall_assessment: {
          type: "string",
          description: "2-3 sentence recruiter-grade summary explaining the overall score with specific evidence",
        },
        structure: {
          type: "object",
          properties: {
            score: { type: "number", description: "Structure score 0-100" },
            rating: { type: "string", enum: ["Strong", "Needs Work", "Weak"], description: "Overall structure rating" },
            reasoning: { type: "string", description: "Detailed reasoning for structure score with specific examples from CV" },
            feedback: {
              type: "array",
              items: { type: "string" },
              description: "3-4 specific, actionable feedback items with impact estimates",
            },
          },
          required: ["score", "rating", "reasoning", "feedback"],
        },
        keywords: {
          type: "object",
          properties: {
            score: { type: "number", description: "Keywords alignment score 0-100" },
            rating: { type: "string", enum: ["Strong", "Needs Work", "Weak"], description: "Overall keywords rating" },
            reasoning: { type: "string", description: "Detailed reasoning for keyword score with market context" },
            missing_keywords: {
              type: "array",
              items: { type: "string" },
              description: "Critical missing keywords for the target role/industry with frequency stats if available",
            },
            present_keywords: {
              type: "array",
              items: { type: "string" },
              description: "Strong keywords present with evidence of proficiency",
            },
            skills_gap_analysis: {
              type: "string",
              description: "Analysis of skills gap vs market requirements with percentage impact on employability",
            },
          },
          required: ["score", "rating", "reasoning", "missing_keywords", "present_keywords", "skills_gap_analysis"],
        },
        language_balance: {
          type: "object",
          properties: {
            score: { type: "number", description: "Language quality score 0-100" },
            rating: { type: "string", enum: ["Strong", "Needs Work", "Weak"], description: "Overall language rating" },
            reasoning: { type: "string", description: "Detailed reasoning for language score with specific examples" },
            feedback: {
              type: "array",
              items: { type: "string" },
              description: "3-4 specific language improvement recommendations",
            },
            bm_proficiency_indicator: {
              type: "string",
              description: "Assessment of Bahasa Malaysia proficiency indicators (important for government/GLC)",
            },
          },
          required: ["score", "rating", "reasoning", "feedback", "bm_proficiency_indicator"],
        },
        malaysia_market_fit: {
          type: "object",
          properties: {
            score: { type: "number", description: "Malaysia market fit score 0-100" },
            rating: { type: "string", enum: ["Strong", "Needs Work", "Weak"], description: "Overall market fit rating" },
            reasoning: { type: "string", description: "Detailed reasoning for market fit with MASCO/industry context" },
            feedback: {
              type: "array",
              items: { type: "string" },
              description: "3-4 specific recommendations for Malaysian market readiness",
            },
            sector_specific_readiness: {
              type: "object",
              properties: {
                glc_ready: { type: "string", description: "Assessment of GLC readiness with specific gaps" },
                mnc_ready: { type: "string", description: "Assessment of MNC readiness with specific gaps" },
                government_ready: { type: "string", description: "Assessment of government sector readiness with specific gaps" },
              },
              required: ["glc_ready", "mnc_ready", "government_ready"],
            },
          },
          required: ["score", "rating", "reasoning", "feedback", "sector_specific_readiness"],
        },
        priority_improvements: {
          type: "array",
          items: { type: "string" },
          description: "5 ranked, actionable improvements with estimated impact on employability score",
        },
        recruiter_recommendation: {
          type: "string",
          description: "Final recruiter-grade recommendation (1-2 sentences) suitable for employer/government reporting",
        },
      },
      required: [
        "is_cv",
        "overall_score",
        "overall_assessment",
        "structure",
        "keywords",
        "language_balance",
        "malaysia_market_fit",
        "priority_improvements",
        "recruiter_recommendation",
      ],
    },
  },
};

export const analyzeCv = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const userPrompt = `## CV Analysis Request

**Target Context:**
- Employer Type: ${data.company_type}
- Industry: ${data.industry}
- Experience Level: ${data.experience_level}
- Language Preference: ${data.language_preference}

**CV Content to Analyze:**
"""
${data.cv_text}
"""

## Analysis Instructions

1. Evaluate the CV as a senior recruiter would for the specified industry and experience level
2. Consider Malaysian workforce market conditions and MASCO occupation standards
3. Provide specific, evidence-based reasoning for each score
4. Include quantified impact estimates where possible (e.g., "Adding SQL skills would increase match rate by 35%")
5. Assess readiness for GLC, MNC, and Government sectors separately
6. Return recruiter-grade recommendations suitable for employer decision-making

Generate the comprehensive analysis now.`;

    // Upgrade to GPT-5 for recruiter-grade analysis
    const { toolArgs, modelUsed, reasoning } = await analyzeWithGpt5(
      SYSTEM_PROMPT,
      userPrompt,
      ANALYSIS_TOOL,
      "We're handling lots of CV analyses right now. Please try again in a minute."
    );

    console.log(`[CV Analysis] Completed with ${modelUsed}${reasoning ? ' (with reasoning)' : ''}`);

    const parsed = toolArgs as AnalysisResult & {
      overall_assessment?: string;
      recruiter_recommendation?: string;
      is_cv?: boolean;
      document_type_error?: string;
    };

    // Check if document is not a CV/resume
    if (parsed.is_cv === false) {
      console.log("[CV Analysis] Document rejected as non-CV:", parsed.document_type_error);
      return {
        error: "invalid_document_type",
        message: parsed.document_type_error || "The uploaded document does not appear to be a CV or resume. Please upload a CV/resume for analysis.",
      };
    }

    // Persist (best-effort, don’t block returning result on failure)
    try {
      let userId: string | null = null;
      let userEmail: string | null = null;
      try {
        const req = getRequest();
        const authHeader = req?.headers.get("authorization");
        const token = authHeader?.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7)
          : null;
        if (token) {
          const { data: u } = await supabaseAdmin.auth.getUser(token);
          if (u.user) {
            userId = u.user.id;
            userEmail = u.user.email ?? null;
          }
        }
      } catch (e) {
        console.error("Auth lookup failed:", e);
      }
      const { data: inserted } = await supabaseAdmin.from("analyses").insert({
        company_type: data.company_type,
        industry: data.industry,
        experience_level: data.experience_level,
        language_preference: data.language_preference,
        overall_score: Math.round(parsed.overall_score),
        full_results: parsed as unknown as never,
        user_id: userId,
        email: userEmail,
      }).select("id").single();
      if (inserted?.id) {
        if (userId) {
          await insertNotification({
            user_id: userId,
            title: "CV Analysis Ready",
            message: `Your CV analysis is complete. Overall score: ${Math.round(parsed.overall_score)}/100.`,
            type: parsed.overall_score >= 70 ? "success" : parsed.overall_score >= 50 ? "info" : "warning",
            link: `/results/${inserted.id}`,
            metadata: { analysis_id: inserted.id, score: Math.round(parsed.overall_score) },
          });
        }
        return { result: parsed, analysis_id: inserted.id as string };
      }
    } catch (e) {
      console.error("Failed to save analysis:", e);
    }

    // Validate and log quality metrics
    const qualityMetrics = {
      overall_score: parsed.overall_score,
      has_detailed_reasoning: !!parsed.overall_assessment && parsed.overall_assessment.length > 50,
      has_recruiter_recommendation: !!parsed.recruiter_recommendation,
      has_sector_readiness: !!(parsed as any).malaysia_market_fit?.sector_specific_readiness,
      model_used: modelUsed,
    };
    console.log("[CV Analysis] Quality metrics:", qualityMetrics);

    return { result: parsed, analysis_id: null as string | null };
  });