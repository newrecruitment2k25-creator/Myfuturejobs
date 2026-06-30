import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { interviewWithGpt5, AI_MODELS } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const CreateSessionSchema = z.object({
  user_id: z.string().uuid(),
  role_title: z.string().min(1).max(200),
  company_type: z.string().min(1).max(100),
  industry: z.string().min(1).max(100),
  experience_level: z.string().min(1).max(100),
  interview_type: z.string().min(1).max(100),
  total_questions: z.number().int().min(1).max(20),
});

const GenerateQuestionSchema = z.object({
  user_id: z.string().uuid(),
  session_id: z.string().uuid(),
  question_number: z.number().int().min(1),
  previous_answers: z.array(z.string()).optional(),
});

const SubmitAnswerSchema = z.object({
  user_id: z.string().uuid(),
  response_id: z.string().uuid(),
  answer_text: z.string().min(1).max(10000),
});

const CompleteInterviewSchema = z.object({
  user_id: z.string().uuid(),
  session_id: z.string().uuid(),
});

const GenerateSpeechSchema = z.object({
  text: z.string().min(1).max(4096),
  voice: z.enum(["nova", "onyx", "alloy", "echo", "fable", "shimmer"]).optional(),
});

const GetSessionSchema = z.object({
  user_id: z.string().uuid(),
  session_id: z.string().uuid(),
});

// ─── Exported types ────────────────────────────────────────────────────────────
export type InterviewSummary = {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  competency_scores: { name: string; score: number; evidence: string }[];
  hiring_recommendation: "strong_hire" | "hire" | "maybe" | "no_hire";
  summary: string;
  improvement_areas: string[];
};

// ─── 0. getInterviewSession ──────────────────────────────────────────────────
export const getInterviewSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GetSessionSchema.parse(input))
  .handler(async ({ data }) => {
    console.log("[getInterviewSession] querying session_id:", data.session_id, "user_id:", data.user_id);
    try {
      const { data: session, error } = await supabaseAdmin
        .from("interview_sessions")
        .select("id, status, current_question, total_questions, role_title")
        .eq("id", data.session_id)
        .eq("user_id", data.user_id)
        .single();
      console.log("[getInterviewSession] result:", session ? `found id=${session.id}` : "null", "error:", error ? JSON.stringify(error) : "none");
      if (error || !session) return { session: null, error: error?.message ?? "not found" };
      return { session, error: null };
    } catch (e) {
      console.error("[getInterviewSession] threw (supabaseAdmin init failed?):", String(e));
      return { session: null, error: String(e) };
    }
  });

// ─── 1. createInterviewSession ────────────────────────────────────────────────
export const createInterviewSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateSessionSchema.parse(input))
  .handler(async ({ data }) => {
    console.log("[createInterviewSession] user_id:", data.user_id, "role:", data.role_title);
    const { data: session, error } = await supabaseAdmin
      .from("interview_sessions")
      .insert({
        user_id: data.user_id,
        role_title: data.role_title,
        company_type: data.company_type,
        industry: data.industry,
        experience_level: data.experience_level,
        interview_type: data.interview_type,
        total_questions: data.total_questions,
        status: "setup",
        current_question: 0,
      })
      .select("id")
      .single();
    if (error || !session) {
      console.error("[createInterviewSession] insert error:", JSON.stringify(error));
      throw new Error("Failed to create interview session: " + JSON.stringify(error));
    }
    console.log("[createInterviewSession] created id:", session.id);
    return { session_id: session.id as string };
  });

// ─── 2. generateInterviewQuestion ─────────────────────────────────────────────
export const generateInterviewQuestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateQuestionSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: session, error: sErr } = await supabaseAdmin
      .from("interview_sessions")
      .select("*")
      .eq("id", data.session_id)
      .eq("user_id", data.user_id)
      .single();
    if (sErr || !session) {
      console.error("[generateInterviewQuestion] session lookup failed:", JSON.stringify(sErr));
      throw new Error(sErr?.message ?? "Session not found.");
    }

    const { data: prevResponses } = await supabaseAdmin
      .from("interview_responses")
      .select("question_number, question_text, answer_text")
      .eq("session_id", data.session_id)
      .order("question_number", { ascending: true });

    const prevQA = (prevResponses ?? [])
      .filter((r) => r.answer_text)
      .map((r) => `Q${r.question_number}: ${r.question_text}\nA: ${r.answer_text}`)
      .join("\n\n");

    const systemPrompt = `You are a Senior Interview Panel Chair with 15+ years experience conducting recruitment for Malaysian employers including GLCs, MNCs, and government agencies. You design interview questions that assess true candidate capability while maintaining fairness and compliance with Malaysian employment standards.

## Interview Context
- Role: ${session.role_title}
- Company Type: ${session.company_type}
- Industry: ${session.industry}
- Interview Type: ${session.interview_type}
- Experience Level: ${session.experience_level}
- Question ${data.question_number} of ${session.total_questions}

## Question Design Principles

1. **Progressive Difficulty**: Build on previous questions to assess depth
2. **Malaysian Context**: Include scenarios relevant to local business environment
3. **Competency-Based**: Assess specific skills required for the role
4. **Behavioral Focus**: For behavioral interviews, use STAR method structure
5. **Technical Depth**: For technical roles, assess practical problem-solving
6. **Cultural Fit**: Evaluate alignment with Malaysian workplace values

## Question Types by Interview Type

- **behavioral**: "Tell me about a time when..." (STAR format expected)
- **technical**: Scenario-based problem requiring technical solution
- **competency**: Skills demonstration with specific criteria
- **situational**: Hypothetical Malaysian workplace scenarios

## Quality Standards

- AVOID: Generic questions like "Tell me about yourself"
- PREFER: "Describe a situation where you had to navigate a complex stakeholder relationship in a Malaysian government procurement process. What was your approach and what did you learn?"

- AVOID: Vague technical questions
- PREFER: "You're given a dataset with 100,000 customer transactions from a Malaysian retail chain showing duplicate entries and inconsistent currency formats. Walk me through your data cleaning and analysis approach."

${prevQA ? `## Previous Interview Exchange\n${prevQA}\n
Design the next question to build on previous responses and probe deeper into demonstrated competencies.` : ""}

Generate ONE interview question now. Return ONLY the question text (1-2 sentences).`;

    // Upgrade to GPT-5-mini for faster question generation with quality
    const { text, modelUsed } = await interviewWithGpt5(
      systemPrompt,
      "Generate the next interview question for this Malaysian job candidate.",
      undefined,
      true, // Use mini for speed
      "Generating your next interview question…"
    );

    console.log(`[Interview Question] Generated with ${modelUsed}`);

    const questionText = text?.trim() ?? "Tell me about yourself and what draws you to this role.";

    const { data: response, error: rErr } = await supabaseAdmin
      .from("interview_responses")
      .insert({
        session_id: data.session_id,
        question_number: data.question_number,
        question_text: questionText,
        answer_text: null,
      })
      .select("id")
      .single();
    if (rErr || !response) throw new Error("Failed to save question.");

    await supabaseAdmin
      .from("interview_sessions")
      .update({ current_question: data.question_number, status: "in_progress" })
      .eq("id", data.session_id);

    return { question: questionText, response_id: response.id as string };
  });

// ─── 3. submitInterviewAnswer ─────────────────────────────────────────────────
export const submitInterviewAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubmitAnswerSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: response, error: rErr } = await supabaseAdmin
      .from("interview_responses")
      .select("*, interview_sessions!inner(role_title, company_type, industry, experience_level, user_id)")
      .eq("id", data.response_id)
      .single();
    if (rErr || !response) throw new Error("Response not found.");
    const session = (response as any).interview_sessions;
    if (session.user_id !== data.user_id) throw new Error("Unauthorized.");

    const SCORE_TOOL = {
      type: "function" as const,
      function: {
        name: "score_interview_answer",
        description: "Score a candidate's interview answer",
        parameters: {
          type: "object",
          properties: {
            score: { type: "number", description: "Score 0-100" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            competencies_demonstrated: { type: "array", items: { type: "string" } },
          },
          required: ["score", "strengths", "improvements", "competencies_demonstrated"],
        },
      },
    };

    const systemPrompt = `You are a Senior Interview Panel Assessor evaluating candidate responses for Malaysian employers. Your scoring reflects recruiter-grade standards and provides actionable feedback for candidate development.

## Assessment Framework

Score the answer across these dimensions (0-100 overall):

1. **Relevance & Comprehension** (25%): Did the candidate understand and address the question?
2. **Depth & Specificity** (30%): Are answers detailed with concrete examples and data?
3. **Communication Clarity** (25%): Is the response well-structured and professionally articulated?
4. **Malaysian Workplace Context** (20%): Does the answer demonstrate awareness of local business practices, regulations, or cultural norms?

## Scoring Guidelines

- 90-100: Exceptional - Exceeds expectations with detailed examples and strategic thinking
- 75-89: Strong - Good response with minor gaps in depth or context
- 60-74: Adequate - Addresses question but lacks specificity or depth
- 40-59: Needs Improvement - Partial answer with significant gaps
- 0-39: Poor - Off-topic, unclear, or inappropriate response

## Quality Standards

- AVOID: "Good answer, needs more detail"
- PREFER: "Candidate provided a structured response with specific metrics (20% efficiency improvement). However, lacked mention of stakeholder communication approach which is critical for this GLC role."

- AVOID: "Clear communication"
- PREFER: "Used STAR format effectively. Technical terminology was accurate. Would benefit from more concise opening statement."

- AVOID: "Not relevant"
- PREFER: "Answer addressed project management broadly but did not specifically address the regulatory compliance aspect asked in the question, which is mandatory for banking sector roles in Malaysia.`;

    const userPrompt = `## Interview Assessment Request

**Context:**
- Role: ${session.role_title}
- Company Type: ${session.company_type}
- Industry: ${session.industry}
- Experience Level: ${session.experience_level}

**Question:**
${response.question_text}

**Candidate Answer:**
${data.answer_text}

Provide recruiter-grade assessment with specific feedback.`;

    // Upgrade to GPT-5 for interview assessment with reasoning
    const { toolArgs, modelUsed, reasoning } = await interviewWithGpt5(
      systemPrompt,
      userPrompt,
      SCORE_TOOL,
      false, // Use full GPT-5 for quality assessment
      "Scoring your answer…"
    );

    console.log(`[Interview Score] Completed with ${modelUsed}${reasoning ? ' (with reasoning)' : ''}`);

    const feedback = toolArgs as { score: number; strengths: string[]; improvements: string[]; competencies_demonstrated: string[] };

    await supabaseAdmin
      .from("interview_responses")
      .update({
        answer_text: data.answer_text,
        score: Math.round(feedback.score),
        feedback: feedback as unknown as never,
        model_used: "gpt-5.4-mini",
      })
      .eq("id", data.response_id);

    return { score: Math.round(feedback.score), feedback };
  });

// ─── 4. completeInterview ─────────────────────────────────────────────────────
export const completeInterview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CompleteInterviewSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: session, error: sErr } = await supabaseAdmin
      .from("interview_sessions")
      .select("*")
      .eq("id", data.session_id)
      .eq("user_id", data.user_id)
      .single();
    if (sErr || !session) throw new Error("Session not found.");

    const { data: responses } = await supabaseAdmin
      .from("interview_responses")
      .select("*")
      .eq("session_id", data.session_id)
      .order("question_number", { ascending: true });

    const allQA = (responses ?? [])
      .map((r) => `Q${r.question_number} (Score: ${r.score ?? "N/A"}): ${r.question_text}\nAnswer: ${r.answer_text ?? "(no answer)"}`)
      .join("\n\n");

    const SUMMARY_TOOL = {
      type: "function" as const,
      function: {
        name: "generate_interview_assessment",
        description: "Generate comprehensive interview assessment",
        parameters: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            competency_scores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  score: { type: "number" },
                  evidence: { type: "string" },
                },
                required: ["name", "score", "evidence"],
              },
            },
            hiring_recommendation: {
              type: "string",
              enum: ["strong_hire", "hire", "maybe", "no_hire"],
            },
            summary: { type: "string" },
            improvement_areas: { type: "array", items: { type: "string" } },
          },
          required: ["overall_score", "strengths", "weaknesses", "competency_scores", "hiring_recommendation", "summary", "improvement_areas"],
        },
      },
    };

    const systemPrompt = `You are the Head of Talent Assessment for a leading Malaysian recruitment firm. You synthesize interview performance into executive-grade candidate assessments suitable for PERKESO, HRD Corp, and employer decision-making.

## Assessment Framework

Generate a comprehensive assessment including:

1. **Overall Score** (0-100): Weighted average considering question difficulty progression
2. **Strengths** (3-5): Specific competencies demonstrated with evidence from answers
3. **Weaknesses** (3-5): Development areas with impact on role readiness
4. **Competency Scores**: Breakdown by key skill areas with evidence
5. **Hiring Recommendation**: 
   - strong_hire: Exceeds role requirements, immediate placement recommended
   - hire: Meets requirements, ready for role
   - maybe: Close to ready, minor development needed
   - no_hire: Significant gaps, not currently suitable
6. **Summary**: 3-4 sentences suitable for employer reporting
7. **Improvement Areas**: Priority development needs with timeline estimates

## Malaysian Market Context

Consider:
- GLC requirements: Governance awareness, stakeholder management, compliance
- MNC requirements: Global mindset, cross-cultural competency, international standards
- Government requirements: Public service values, policy understanding, BM proficiency
- Industry-specific: Technical competency standards for Malaysian market

## Quality Standards

- AVOID: "Candidate performed well"
- PREFER: "Candidate demonstrated strong technical competency (Python, SQL) with 4/5 answers scoring above 80. Communication was structured and professional. However, limited exposure to Malaysian regulatory frameworks (BNM, PDPA) suggests additional training required before placement in financial services."

- AVOID: "Good fit for role"
- PREFER: "Strong hire recommendation. Technical skills exceed role requirements. Demonstrated problem-solving under pressure. Recommend immediate placement with salary band RM8,000-10,000 for mid-level position.`;

    const userPrompt = `## Comprehensive Interview Assessment

**Interview Context:**
- Role: ${session.role_title}
- Company Type: ${session.company_type}
- Industry: ${session.industry}
- Experience Level: ${session.experience_level}
- Interview Type: ${session.interview_type}

**Question & Answer Transcript:**
${allQA}

Generate executive-grade assessment suitable for employer decision-making.`;

    // Upgrade to GPT-5 for comprehensive interview assessment
    const { toolArgs, modelUsed, reasoning } = await interviewWithGpt5(
      systemPrompt,
      userPrompt,
      SUMMARY_TOOL,
      false, // Use full GPT-5 for comprehensive assessment
      "Generating your interview assessment…"
    );

    console.log(`[Interview Summary] Generated with ${modelUsed}${reasoning ? ' (with reasoning)' : ''}`);

    const summary = toolArgs as InterviewSummary;

    await supabaseAdmin
      .from("interview_sessions")
      .update({
        status: "completed",
        overall_score: Math.round(summary.overall_score),
        ai_summary: summary as unknown as never,
        model_used: "gpt-5.5",
      })
      .eq("id", data.session_id);

    return summary;
  });

// ─── 5. generateSpeech ────────────────────────────────────────────────────────
export const generateSpeech = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateSpeechSchema.parse(input))
  .handler(async ({ data }) => {
    const AI_API_KEY = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;
    if (!AI_API_KEY) throw new Error("AI service is not configured.");

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: data.text,
        voice: data.voice ?? "nova",
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("TTS error:", res.status, txt.slice(0, 200));
      throw new Error("Voice generation failed. Interview will continue without audio.");
    }

    const audioBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    return { audio: base64 };
  });

// ─── Legacy: generateInterviewPreparation (used by /interview-preparation page) ─
const LegacyInputSchema = z.object({
  cvAnalysis: z.object({
    overall_score: z.coerce.number().catch(0),
    keywords: z.object({
      present_keywords: z.array(z.string()).default([]),
      missing_keywords: z.array(z.string()).default([]),
    }).default({ present_keywords: [], missing_keywords: [] }),
    priority_improvements: z.array(z.string()).default([]),
    malaysia_market_fit: z.coerce.number().catch(0),
    keyword_optimization_score: z.coerce.number().catch(0),
  }),
  targetRole: z.string(),
  industry: z.string(),
  employerType: z.string(),
  experienceLevel: z.string(),
});

export const generateInterviewPreparation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LegacyInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { cvAnalysis, targetRole, industry, employerType, experienceLevel } = data;
    const isGov = employerType.toLowerCase().includes("government") || employerType.toLowerCase().includes("civil service");
    const prompt = `Generate comprehensive interview preparation for:
Role: ${targetRole} | Industry: ${industry} | Type: ${employerType} | Level: ${experienceLevel}
CV Score: ${cvAnalysis.overall_score}/100 | Market Fit: ${cvAnalysis.malaysia_market_fit}%
Present skills: ${cvAnalysis.keywords.present_keywords.slice(0, 10).join(", ")}
Missing skills: ${cvAnalysis.keywords.missing_keywords.slice(0, 10).join(", ")}

Return JSON with: overview{targetRole,industry,employerType,readinessScore,readinessLevel}, technicalQuestions[10], behavioralQuestions[8], situationalQuestions[6]${isGov ? ", governmentQuestions[5]" : ""}, answerFramework{format,explanation,example}, readiness{score,level,strengths,areasToImprove,preparationTips}, topQuestionsToPractice[5].
Each question: {question,category,difficulty,whyImportant,suggestedApproach}.`;

    const systemPrompt = `You are a Senior Interview Coach and Career Strategist specializing in Malaysian job market preparation. You create personalized, role-specific interview preparation materials that help candidates succeed with GLCs, MNCs, and government employers.

## Preparation Framework

Generate comprehensive materials including:

1. **Overview**: Role-specific readiness assessment with honest gap analysis
2. **Technical Questions** (10): Role and industry-specific with difficulty calibration
3. **Behavioral Questions** (8): STAR-format with Malaysian workplace scenarios
4. **Situational Questions** (6): Hypothetical challenges relevant to target role
5. **Government Questions** (5, if applicable): Public sector competency assessments
6. **Answer Framework**: STAR method guide with Malaysian examples
7. **Readiness Score**: Honest assessment with specific improvement roadmap
8. **Priority Practice Questions**: Top 5 most likely to be asked

## Quality Standards

Each question should include:
- category: behavioral/technical/situational
- difficulty: Easy/Medium/Hard
- whyImportant: Why this question matters for the role
- suggestedApproach: How to structure the answer

- AVOID: Generic questions
- PREFER: "Tell me about a time you had to interpret BNM guidelines for a cross-border transaction while working with a team in different time zones."

- AVOID: "Be confident"
- PREFER: "Use STAR format: Situation (set context), Task (your responsibility), Action (what YOU did), Result (quantified outcome). For Malaysian government roles, emphasize compliance and stakeholder consultation.`;

    // Upgrade to GPT-5 for comprehensive interview preparation
    const { toolArgs, modelUsed, reasoning } = await interviewWithGpt5(
      systemPrompt,
      prompt,
      {
        type: "function",
        function: {
          name: "provide_interview_preparation",
          description: "Generate comprehensive, personalized interview preparation materials for Malaysian job market",
          parameters: {
            type: "object",
            properties: {
              overview: {
                type: "object",
                properties: {
                  targetRole: { type: "string" },
                  industry: { type: "string" },
                  employerType: { type: "string" },
                  readinessScore: { type: "number" },
                  readinessLevel: { type: "string" },
                  keyGaps: { type: "array", items: { type: "string" } },
                },
                required: ["targetRole", "industry", "employerType", "readinessScore", "readinessLevel"],
              },
              technicalQuestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    category: { type: "string" },
                    difficulty: { type: "string" },
                    whyImportant: { type: "string" },
                    suggestedApproach: { type: "string" },
                  },
                  required: ["question", "category", "difficulty", "whyImportant", "suggestedApproach"],
                },
              },
              behavioralQuestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    category: { type: "string" },
                    difficulty: { type: "string" },
                    whyImportant: { type: "string" },
                    suggestedApproach: { type: "string" },
                  },
                  required: ["question", "category", "difficulty", "whyImportant", "suggestedApproach"],
                },
              },
              situationalQuestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    category: { type: "string" },
                    difficulty: { type: "string" },
                    whyImportant: { type: "string" },
                    suggestedApproach: { type: "string" },
                  },
                  required: ["question", "category", "difficulty", "whyImportant", "suggestedApproach"],
                },
              },
              governmentQuestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    category: { type: "string" },
                    difficulty: { type: "string" },
                    whyImportant: { type: "string" },
                    suggestedApproach: { type: "string" },
                  },
                  required: ["question", "category", "difficulty", "whyImportant", "suggestedApproach"],
                },
              },
              answerFramework: {
                type: "object",
                properties: {
                  format: { type: "string" },
                  explanation: { type: "string" },
                  example: { type: "string" },
                },
                required: ["format", "explanation", "example"],
              },
              readiness: {
                type: "object",
                properties: {
                  score: { type: "number" },
                  level: { type: "string" },
                  strengths: { type: "array", items: { type: "string" } },
                  areasToImprove: { type: "array", items: { type: "string" } },
                  preparationTips: { type: "array", items: { type: "string" } },
                },
                required: ["score", "level", "strengths", "areasToImprove", "preparationTips"],
              },
              topQuestionsToPractice: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["overview", "technicalQuestions", "behavioralQuestions", "situationalQuestions", "answerFramework", "readiness", "topQuestionsToPractice"],
          },
        },
      },
      false, // Use full GPT-5 for comprehensive preparation
      "Generating your personalised interview preparation…"
    );

    console.log(`[Interview Prep] Generated with ${modelUsed}${reasoning ? ' (with reasoning)' : ''}`);
    return toolArgs as any;
  });

