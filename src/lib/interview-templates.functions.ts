import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { interviewWithGpt5, AI_MODELS } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const QuestionSchema = z.object({
  question_text: z.string().min(1).max(2000),
  question_type: z.enum(["open", "behavioral", "technical", "situational"]).optional(),
  scoring_criteria: z.string().max(1000).optional(),
  time_limit_seconds: z.number().int().min(10).max(600).optional(),
});

const CreateTemplateSchema = z.object({
  employer_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  role_title: z.string().min(1).max(200),
  job_id: z.string().uuid().optional(),
  company_name: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  experience_level: z.string().max(100).optional(),
  interview_type: z.string().min(1).max(100),
  instructions: z.string().max(2000).optional(),
  time_limit_minutes: z.number().int().min(1).max(180).optional(),
  questions: z.array(QuestionSchema).min(1).max(20),
});

const InviteCandidatesSchema = z.object({
  employer_id: z.string().uuid(),
  template_id: z.string().uuid(),
  candidate_ids: z.array(z.string().uuid()).min(1).max(100),
  message: z.string().max(1000).optional(),
  deadline: z.string().optional(),
});

const GetCandidateInvitationsSchema = z.object({
  candidate_id: z.string().uuid(),
});

const StartInvitedInterviewSchema = z.object({
  invitation_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
});

const ScoreInvitedAnswerSchema = z.object({
  invitation_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  question_id: z.string().uuid(),
  question_number: z.number().int().min(1),
  answer_text: z.string().min(1).max(10000),
});

const CompleteInvitedInterviewSchema = z.object({
  invitation_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  proctoring: z.object({
    tab_switches: z.number().int().min(0).default(0),
    fullscreen_exits: z.number().int().min(0).default(0),
    face_absent_seconds: z.number().min(0).default(0),
  }).optional(),
});

const GetEmployerTemplatesSchema = z.object({
  employer_id: z.string().uuid(),
});

const GetTemplateInvitationsSchema = z.object({
  employer_id: z.string().uuid(),
  template_id: z.string().uuid(),
});

const GetInvitationDetailSchema = z.object({
  employer_id: z.string().uuid(),
  invitation_id: z.string().uuid(),
});

// ─── 1. createTemplate ────────────────────────────────────────────────────────
export const createTemplate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateTemplateSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: template, error: tErr } = await supabaseAdmin
      .from("interview_templates")
      .insert({
        employer_id: data.employer_id,
        title: data.title,
        role_title: data.role_title,
        job_id: data.job_id ?? null,
        company_name: data.company_name ?? null,
        industry: data.industry ?? null,
        experience_level: data.experience_level ?? null,
        interview_type: data.interview_type,
        instructions: data.instructions ?? null,
        time_limit_minutes: data.time_limit_minutes ?? null,
      })
      .select("id")
      .single();

    if (tErr || !template) throw new Error("Failed to create template: " + tErr?.message);

    const questionRows = data.questions.map((q, i) => ({
      template_id: template.id,
      question_number: i + 1,
      question_text: q.question_text,
      question_type: q.question_type ?? null,
      scoring_criteria: q.scoring_criteria ?? null,
      time_limit_seconds: q.time_limit_seconds ?? null,
    }));

    const { error: qErr } = await supabaseAdmin
      .from("interview_template_questions")
      .insert(questionRows);

    if (qErr) throw new Error("Failed to save questions: " + qErr.message);

    return { template_id: template.id as string };
  });

// ─── 2. inviteCandidates ──────────────────────────────────────────────────────
export const inviteCandidates = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InviteCandidatesSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: template, error: tErr } = await supabaseAdmin
      .from("interview_templates")
      .select("id")
      .eq("id", data.template_id)
      .eq("employer_id", data.employer_id)
      .single();
    if (tErr || !template) throw new Error("Template not found or unauthorized.");

    const rows = data.candidate_ids.map((cid) => ({
      template_id: data.template_id,
      candidate_id: cid,
      status: "pending",
      message: data.message ?? null,
      deadline: data.deadline ?? null,
    }));

    const { error: iErr } = await supabaseAdmin
      .from("interview_invitations")
      .upsert(rows, { onConflict: "template_id,candidate_id", ignoreDuplicates: true });

    if (iErr) throw new Error("Failed to create invitations: " + iErr.message);

    return { invited_count: rows.length };
  });

// ─── 3. getCandidateInvitations ───────────────────────────────────────────────
export const getCandidateInvitations = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GetCandidateInvitationsSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("interview_invitations")
      .select("id, status, deadline, created_at, overall_score, started_at, completed_at, message, template_id")
      .eq("candidate_id", data.candidate_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    if (!rows || rows.length === 0) return { invitations: [] };

    const templateIds = [...new Set(rows.map((r) => r.template_id))];
    const { data: templates } = await supabaseAdmin
      .from("interview_templates")
      .select("id, title, role_title, company_name, interview_type")
      .in("id", templateIds);

    const templateMap = new Map((templates ?? []).map((t) => [t.id, t]));

    const invitations = rows.map((r) => ({
      ...r,
      template: templateMap.get(r.template_id) ?? null,
    }));

    return { invitations };
  });

// ─── 4. startInvitedInterview ─────────────────────────────────────────────────
export const startInvitedInterview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StartInvitedInterviewSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: inv, error: iErr } = await supabaseAdmin
      .from("interview_invitations")
      .select("*")
      .eq("id", data.invitation_id)
      .eq("candidate_id", data.candidate_id)
      .single();
    if (iErr || !inv) throw new Error("Invitation not found or unauthorized.");
    if (inv.status === "completed") throw new Error("This interview has already been completed.");

    await supabaseAdmin
      .from("interview_invitations")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", data.invitation_id);

    const { data: template, error: tErr } = await supabaseAdmin
      .from("interview_templates")
      .select("*")
      .eq("id", inv.template_id)
      .single();
    if (tErr || !template) throw new Error("Template not found.");

    const { data: questions, error: qErr } = await supabaseAdmin
      .from("interview_template_questions")
      .select("*")
      .eq("template_id", inv.template_id)
      .order("question_number", { ascending: true });
    if (qErr) throw new Error("Failed to load questions.");

    return { invitation_id: data.invitation_id, template, questions: questions ?? [] };
  });

// ─── 5. scoreInvitedAnswer ────────────────────────────────────────────────────
export const scoreInvitedAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ScoreInvitedAnswerSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: inv, error: iErr } = await supabaseAdmin
      .from("interview_invitations")
      .select("template_id")
      .eq("id", data.invitation_id)
      .eq("candidate_id", data.candidate_id)
      .single();
    if (iErr || !inv) throw new Error("Invitation not found or unauthorized.");

    const { data: question, error: qErr } = await supabaseAdmin
      .from("interview_template_questions")
      .select("question_text, question_type, scoring_criteria")
      .eq("id", data.question_id)
      .eq("template_id", inv.template_id)
      .single();
    if (qErr || !question) throw new Error("Question not found.");

    const { data: template } = await supabaseAdmin
      .from("interview_templates")
      .select("role_title, company_name, industry")
      .eq("id", inv.template_id)
      .single();

    const SCORE_TOOL = {
      type: "function" as const,
      function: {
        name: "score_interview_answer",
        description: "Score a candidate's interview answer against employer criteria",
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

    const criteriaNote = question.scoring_criteria
      ? `\n\nEmployer's scoring criteria: ${question.scoring_criteria}`
      : "";

    const systemPrompt = `You are an Expert Interview Assessor conducting employer-grade evaluations for Malaysian recruitment. You provide detailed, actionable feedback suitable for hiring decision-making.

## Assessment Framework

Score the answer 0-100 with detailed reasoning:

1. **Relevance** (25%): Does the answer directly address the question?
2. **Depth** (30%): Are there concrete examples, metrics, and specificity?
3. **Clarity** (25%): Is the communication structured and professional?
4. **Context** (20%): Does it demonstrate Malaysian workplace/regulatory awareness?

## Quality Standards

- AVOID: "Good answer"
- PREFER: "Strong use of STAR format with quantified result (30% efficiency gain). Technical accuracy was high. Missing: stakeholder management approach critical for GLC roles."

${question.scoring_criteria ? `## Employer Scoring Criteria
${question.scoring_criteria}

Apply these criteria strictly in your assessment.` : ""}`;

    const userPrompt = `## Interview Assessment

**Role:** ${template?.role_title ?? "Unknown"}
**Company:** ${template?.company_name ?? "Unknown"} (${template?.industry ?? "Unknown"})
**Question Type:** ${question.question_type ?? "open"}

**Question:**
${question.question_text}

**Candidate Answer:**
${data.answer_text}

Provide employer-grade assessment.`;

    // Upgrade to GPT-5 for template-based interview scoring
    const { toolArgs, modelUsed, reasoning } = await interviewWithGpt5(
      systemPrompt,
      userPrompt,
      SCORE_TOOL,
      false, // Use full GPT-5 for quality
      "Scoring your answer…"
    );

    console.log(`[Template Interview Score] Completed with ${modelUsed}${reasoning ? ' (with reasoning)' : ''}`);

    const feedback = toolArgs as { score: number; strengths: string[]; improvements: string[]; competencies_demonstrated: string[] };

    await supabaseAdmin
      .from("invitation_responses")
      .upsert({
        invitation_id: data.invitation_id,
        question_id: data.question_id,
        question_number: data.question_number,
        answer_text: data.answer_text,
        score: Math.round(feedback.score),
        feedback: feedback as unknown as never,
      }, { onConflict: "invitation_id,question_id" });

    return { score: Math.round(feedback.score), feedback };
  });

// ─── 6. completeInvitedInterview ──────────────────────────────────────────────
export const completeInvitedInterview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CompleteInvitedInterviewSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: inv, error: iErr } = await supabaseAdmin
      .from("interview_invitations")
      .select("template_id")
      .eq("id", data.invitation_id)
      .eq("candidate_id", data.candidate_id)
      .single();
    if (iErr || !inv) throw new Error("Invitation not found or unauthorized.");

    const { data: template } = await supabaseAdmin
      .from("interview_templates")
      .select("role_title, company_name, industry, interview_type, experience_level")
      .eq("id", inv.template_id)
      .single();

    const { data: responses } = await supabaseAdmin
      .from("invitation_responses")
      .select("*, interview_template_questions!inner(question_text)")
      .eq("invitation_id", data.invitation_id)
      .order("question_number", { ascending: true });

    const allQA = (responses ?? [])
      .map((r) => `Q${r.question_number} (Score: ${r.score ?? "N/A"}): ${(r as any).interview_template_questions?.question_text ?? ""}\nAnswer: ${r.answer_text ?? "(no answer)"}`)
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

    const systemPrompt = `You are the Head of Talent Assessment generating comprehensive interview reports for Malaysian employers. Your assessments guide hiring decisions and candidate development planning.

## Assessment Framework

1. **Overall Score** (0-100): Weighted by question difficulty and importance
2. **Strengths** (3-5): Evidence-based competencies demonstrated
3. **Weaknesses** (3-5): Development areas with impact on role fit
4. **Competency Scores**: Specific skill breakdowns with evidence
5. **Hiring Recommendation**:
   - strong_hire: Exceeds requirements, immediate placement
   - hire: Meets requirements, ready for role
   - maybe: Near ready, minor gaps
   - no_hire: Significant gaps, not suitable
6. **Summary**: Executive summary for employer reporting
7. **Improvement Areas**: Priority development with timelines

## Malaysian Context

Consider: GLC governance requirements, MNC global standards, Government public service values, Industry-specific competencies.`;

    const userPrompt = `## Interview Assessment Request

**Context:**
- Role: ${template?.role_title ?? "Unknown"}
- Company: ${template?.company_name ?? "Unknown"} (${template?.industry ?? "Unknown"})
- Experience Level: ${template?.experience_level ?? "Not specified"}
- Interview Type: ${template?.interview_type ?? "general"}

**Interview Transcript:**
${allQA}

Generate executive-grade assessment for employer decision-making.`;

    // Upgrade to GPT-5 for comprehensive template interview assessment
    const { toolArgs, modelUsed, reasoning } = await interviewWithGpt5(
      systemPrompt,
      userPrompt,
      SUMMARY_TOOL,
      false, // Use full GPT-5
      "Generating interview assessment…"
    );

    console.log(`[Template Interview Summary] Generated with ${modelUsed}${reasoning ? ' (with reasoning)' : ''}`);

    const summary = toolArgs as { overall_score: number };
    const finalSummary = data.proctoring
      ? { ...(summary as object), proctoring: data.proctoring }
      : summary;

    await supabaseAdmin
      .from("interview_invitations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        overall_score: Math.round((summary as any).overall_score ?? 0),
        ai_summary: finalSummary as unknown as never,
      })
      .eq("id", data.invitation_id);

    return { summary: finalSummary, company_name: template?.company_name ?? "the company" };
  });

// ─── 7. getEmployerTemplates ──────────────────────────────────────────────────
export const getEmployerTemplates = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GetEmployerTemplatesSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: templates, error } = await supabaseAdmin
      .from("interview_templates")
      .select("id, title, role_title, company_name, interview_type, experience_level, created_at")
      .eq("employer_id", data.employer_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const result = await Promise.all(
      (templates ?? []).map(async (t) => {
        const { data: questions } = await supabaseAdmin
          .from("interview_template_questions")
          .select("id")
          .eq("template_id", t.id);

        const { data: invitations } = await supabaseAdmin
          .from("interview_invitations")
          .select("id, status")
          .eq("template_id", t.id);

        const total = invitations?.length ?? 0;
        const pending = invitations?.filter((i) => i.status === "pending").length ?? 0;
        const completed = invitations?.filter((i) => i.status === "completed").length ?? 0;
        const in_progress = invitations?.filter((i) => i.status === "in_progress").length ?? 0;

        return {
          ...t,
          question_count: questions?.length ?? 0,
          invitation_counts: { total, pending, completed, in_progress },
        };
      })
    );

    return { templates: result };
  });

// ─── 8. getTemplateInvitations ────────────────────────────────────────────────
export const getTemplateInvitations = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GetTemplateInvitationsSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: template, error: tErr } = await supabaseAdmin
      .from("interview_templates")
      .select("id")
      .eq("id", data.template_id)
      .eq("employer_id", data.employer_id)
      .single();
    if (tErr || !template) throw new Error("Template not found or unauthorized.");

    const { data: invitations, error } = await supabaseAdmin
      .from("interview_invitations")
      .select("id, candidate_id, status, overall_score, started_at, completed_at, created_at")
      .eq("template_id", data.template_id)
      .order("overall_score", { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);

    const candidateIds = (invitations ?? []).map((i) => i.candidate_id);
    let emailMap: Map<string, string> = new Map();
    if (candidateIds.length > 0) {
      try {
        for (const cid of candidateIds) {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(cid);
          if (u?.user) emailMap.set(cid, u.user.email ?? cid);
        }
      } catch (_) {}
    }

    const enriched = (invitations ?? []).map((i) => ({
      ...i,
      candidate_email: emailMap.get(i.candidate_id) ?? i.candidate_id,
    }));

    return { invitations: enriched };
  });

// ─── 9. getInvitationDetail ───────────────────────────────────────────────────
export const getInvitationDetail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GetInvitationDetailSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: inv, error: iErr } = await supabaseAdmin
      .from("interview_invitations")
      .select("*, interview_templates!inner(employer_id, role_title, company_name, interview_type, experience_level, title)")
      .eq("id", data.invitation_id)
      .single();
    if (iErr || !inv) throw new Error("Invitation not found.");

    const tmpl = (inv as any).interview_templates;
    if (tmpl?.employer_id !== data.employer_id) throw new Error("Unauthorized.");

    const { data: responses } = await supabaseAdmin
      .from("invitation_responses")
      .select("*, interview_template_questions!inner(question_text, question_type, scoring_criteria)")
      .eq("invitation_id", data.invitation_id)
      .order("question_number", { ascending: true });

    let candidateEmail = inv.candidate_id;
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(inv.candidate_id);
      if (u?.user) candidateEmail = u.user.email ?? inv.candidate_id;
    } catch (_) {}

    return {
      invitation: { ...inv, candidate_email: candidateEmail },
      template: tmpl,
      responses: (responses ?? []).map((r) => ({
        ...r,
        question: (r as any).interview_template_questions,
      })),
    };
  });
