import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAi } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequest } from "@tanstack/react-start/server";

const InputSchema = z.object({
  profile_text: z.string().min(50).max(60000),
  experience_level: z.string().min(1).max(100),
  industry: z.string().min(1).max(100),
  goal: z.string().min(1).max(100),
});

export type LinkedInAnalysis = {
  overall_score: number;
  photo_headline: { score: number; rating: string; feedback: string[] };
  about_section: {
    score: number;
    rating: string;
    feedback: string[];
    rewritten_version?: string;
  };
  experience: { score: number; rating: string; feedback: string[] };
  skills: {
    score: number;
    rating: string;
    missing_skills: string[];
    present_skills: string[];
  };
  keywords: {
    score: number;
    rating: string;
    missing_keywords: string[];
    present_keywords: string[];
  };
  malaysia_market_fit: { score: number; rating: string; feedback: string[] };
  priority_improvements: string[];
  rewritten_headline: string;
  rewritten_about?: string;
};

const LINKEDIN_TOOL = {
  type: "function" as const,
  function: {
    name: "return_linkedin_analysis",
    description: "Return the structured LinkedIn analysis.",
    parameters: {
      type: "object",
      properties: {
        overall_score: { type: "number" },
        photo_headline: {
          type: "object",
          properties: {
            score: { type: "number" },
            rating: { type: "string" },
            feedback: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rating", "feedback"],
        },
        about_section: {
          type: "object",
          properties: {
            score: { type: "number" },
            rating: { type: "string" },
            feedback: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rating", "feedback"],
        },
        experience: {
          type: "object",
          properties: {
            score: { type: "number" },
            rating: { type: "string" },
            feedback: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rating", "feedback"],
        },
        skills: {
          type: "object",
          properties: {
            score: { type: "number" },
            rating: { type: "string" },
            missing_skills: { type: "array", items: { type: "string" } },
            present_skills: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rating", "missing_skills", "present_skills"],
        },
        keywords: {
          type: "object",
          properties: {
            score: { type: "number" },
            rating: { type: "string" },
            missing_keywords: { type: "array", items: { type: "string" } },
            present_keywords: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rating", "missing_keywords", "present_keywords"],
        },
        malaysia_market_fit: {
          type: "object",
          properties: {
            score: { type: "number" },
            rating: { type: "string" },
            feedback: { type: "array", items: { type: "string" } },
          },
          required: ["score", "rating", "feedback"],
        },
        priority_improvements: { type: "array", items: { type: "string" } },
        rewritten_headline: { type: "string" },
      },
      required: [
        "overall_score",
        "photo_headline",
        "about_section",
        "experience",
        "skills",
        "keywords",
        "malaysia_market_fit",
        "priority_improvements",
        "rewritten_headline",
      ],
    },
  },
};

export const analyzeLinkedIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const systemPrompt = `You are a Malaysian career coach. Analyze the LinkedIn profile text provided and return ONLY structured data via the return_linkedin_analysis tool. Focus on Malaysian professional standards — local company culture, GLC expectations, MNC requirements and the fresh grad landscape.`;

    const userPrompt = `Context:
- Experience: ${data.experience_level}
- Industry: ${data.industry}
- Goal: ${data.goal}

LINKEDIN PROFILE:
"""
${data.profile_text}
"""

Return the structured analysis.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let toolArgs: unknown | null = null;
    try {
      const result = await callAi({
        model: "gpt-5.4-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tool: LINKEDIN_TOOL,
        signal: controller.signal,
        busyMessage: "We're handling lots of profiles right now. Please try again in a minute.",
      });
      toolArgs = result.toolArgs;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        throw new Error("TIMEOUT");
      }
      throw err;
    }
    clearTimeout(timeoutId);

    const parsed = toolArgs as LinkedInAnalysis;

    // Persist to analyses table (best-effort)
    let analysisId: string | null = null;
    try {
      let userId: string | null = null;
      let userEmail: string | null = null;
      try {
        const req = getRequest();
        const authHeader = req?.headers.get("authorization");
        const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : null;
        if (token) {
          const { data: u } = await supabaseAdmin.auth.getUser(token);
          if (u.user) { userId = u.user.id; userEmail = u.user.email ?? null; }
        }
      } catch { /**/ }
      const { data: inserted } = await supabaseAdmin.from("analyses").insert({
        company_type: "linkedin_review",
        industry: data.industry,
        experience_level: data.experience_level,
        language_preference: "English",
        overall_score: Math.round(parsed.overall_score),
        full_results: parsed as unknown as never,
        user_id: userId,
        email: userEmail,
      }).select("id").single();
      if (inserted?.id) analysisId = inserted.id as string;
    } catch (e) {
      console.error("Failed to save LinkedIn analysis:", e);
    }

    return { result: parsed, analysis_id: analysisId };
  });