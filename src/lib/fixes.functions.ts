import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAi } from "./ai-gateway";

const InputSchema = z.object({
  cv_text: z.string().min(50).max(60000),
  priority_improvements: z.array(z.string()).min(1).max(10),
  company_type: z.string().min(1).max(100),
  industry: z.string().min(1).max(100),
});

export type AiFix = {
  issue_title: string;
  original: string;
  fix: string;
};

const FIXES_TOOL = {
  type: "function" as const,
  function: {
    name: "return_fixes",
    description: "Return AI-suggested CV fixes.",
    parameters: {
      type: "object",
      properties: {
        fixes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              issue_title: { type: "string" },
              original: { type: "string" },
              fix: { type: "string" },
            },
            required: ["issue_title", "original", "fix"],
          },
        },
      },
      required: ["fixes"],
    },
  },
};

export const generateFixes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {

    const prompt = `You are an expert Malaysian career coach. Based on this CV and the listed priority improvements, produce concrete before/after rewrites.

TARGET EMPLOYER TYPE: ${data.company_type}
INDUSTRY: ${data.industry}

PRIORITY IMPROVEMENTS:
${data.priority_improvements.map((p, i) => `${i + 1}. ${p}`).join("\n")}

CV CONTENT:
"""
${data.cv_text}
"""

For EACH priority improvement (in the same order), return:
- issue_title: short title (max 8 words) describing what's wrong
- original: the exact problematic excerpt copied from the CV (1-3 lines). If nothing exists in the CV for that issue, write "[Not present in your CV]".
- fix: the rewritten improved version, tailored for the Malaysian job market, ATS-friendly, concise and ready to paste into the CV.

Return ONLY structured data via the tool call.`;

    const { toolArgs } = await callAi({
      model: "gpt-5.4-mini",
      messages: [{ role: "user", content: prompt }],
      tool: FIXES_TOOL,
      busyMessage: "We're handling lots of requests right now. Please try again in a minute.",
    });
    const parsed = toolArgs as { fixes: AiFix[] };

    return { fixes: parsed.fixes ?? [] };
  });