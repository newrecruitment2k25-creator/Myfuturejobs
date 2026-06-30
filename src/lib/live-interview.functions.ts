import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAi } from "./ai-gateway";

const InputSchema = z.object({
  targetRole: z.string(),
  industry: z.string(),
  employerType: z.string(),
  experienceLevel: z.string(),
  questionFocus: z.array(z.string()),
  cvSummary: z.string().optional(),
});

const QuestionSchema = z.object({
  id: z.string(),
  category: z.enum(["opening", "technical", "behavioural", "situational", "government", "communication"]),
  question: z.string(),
});

const OutputSchema = z.object({
  questions: z.array(QuestionSchema),
});

type Input = z.infer<typeof InputSchema>;

export const generateLiveInterviewQuestions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }: { data: Input }) => {
    const { targetRole, industry, employerType, experienceLevel, questionFocus, cvSummary } = data;
    const isGov =
      employerType.toLowerCase().includes("gov") ||
      questionFocus.includes("Government / Civil Service");

    const prompt = `You are an AI recruiter conducting a structured screening interview.

Generate exactly 8–10 interview questions for the following candidate profile:

- Target Role: ${targetRole}
- Industry: ${industry}
- Employer Type: ${employerType}
- Experience Level: ${experienceLevel}
- Question Focus Areas: ${questionFocus.join(", ")}
${cvSummary ? `- Candidate CV Summary: ${cvSummary}` : ""}

Question structure required:
- 2 opening questions (warmup, background)
- 2 technical questions (role and industry specific)
- 2 behavioural questions (past behaviour, STAR format expected)
- 2 situational questions (hypothetical, role specific)
${isGov ? "- 2 government/public sector questions (integrity, public service values)" : ""}

Rules:
- Questions must be specific to the role and industry
- Do NOT ask generic filler questions
- Each question must be answerable in 2–5 minutes of speaking
- Government questions must reflect Malaysian public sector values if applicable

Return JSON:
{
  "questions": [
    { "id": "q1", "category": "opening", "question": "..." },
    { "id": "q2", "category": "technical", "question": "..." }
  ]
}

Categories must be one of: opening, technical, behavioural, situational, government, communication`;

    const { toolArgs } = await callAi({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: "You are an expert AI recruiter generating structured screening interview questions for Malaysian employers." },
        { role: "user", content: prompt },
      ],
      tool: {
        type: "function",
        function: {
          name: "provide_interview_questions",
          description: "Generate structured interview questions",
          parameters: {
            type: "object",
            properties: {
              questions: { type: "array" },
            },
            required: ["questions"],
          },
        },
      },
      busyMessage: "Generating interview questions...",
    });

    return OutputSchema.parse(toolArgs);
  });
