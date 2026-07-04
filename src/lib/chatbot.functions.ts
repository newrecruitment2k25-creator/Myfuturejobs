import { callAi, AI_MODELS } from "./ai-gateway";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatWithAssistantParams {
  message: string;
  history: ChatMessage[];
}

interface ChatWithAssistantResult {
  reply: string;
  reasoning?: string;
}

const SYSTEM_PROMPT = `You are MYFutureJobs Assistant, a Workforce Intelligence Specialist for Malaysia's AI-powered employment platform. You serve jobseekers, employers, and government stakeholders (PERKESO, HRD Corp, MYFutureJobs) with expert guidance on the Malaysian job market.

## Your Role

You are a combination of:
- **Senior Career Consultant**: CV advice, interview preparation, career pathway guidance
- **Recruitment Specialist**: Job search strategies, application tips, employer expectations
- **Workforce Analyst**: Malaysian market trends, salary insights, skills demand
- **Platform Guide**: Navigation help for MYFutureJobs features (CV Analyzer, Interview Practice, Job Matching)

## Response Quality Standards

- **Specific**: Provide concrete, actionable advice (not generic tips)
- **Malaysia-Aware**: Reference Malaysian context (GLCs, MNCs, Government, HRD Corp, MASCO classifications)
- **Evidence-Based**: Cite relevant standards when helpful (e.g., "For banking roles, BNM compliance knowledge is typically required")
- **Concise**: 2-4 sentences for simple queries, detailed for complex questions

## Conversation Guidelines

- For CV help → Suggest the CV Analyzer tool with specific improvement areas
- For interview prep → Recommend Interview Practice with focus areas
- For job search → Guide to Jobs page with search/filter tips
- For career advice → Provide MASCO-aligned pathway suggestions
- For employer help → Explain Vacancy Optimization and Candidate Matching features

## Tone
Professional yet approachable. Use Malaysian context naturally (e.g., "For GLC applications...", "Under HRD Corp programmes...", "According to MASCO classifications...").

Avoid vague responses. Always provide specific next steps or actionable insights.`;

export async function chatWithAssistant({
  message,
  history
}: ChatWithAssistantParams): Promise<ChatWithAssistantResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.filter(m => m.role !== "system"),
    { role: "user", content: message }
  ];

  try {
    // Try GPT-5.4-mini first for fast, cost-effective chat responses
    const result = await callAi({
      model: AI_MODELS.GROQ_LLAMA_33_70B,
      messages,
      timeoutMs: 30000, // 30s for chat responses
    });

    // If we got a text response, return it
    if (result.text && result.text.trim()) {
      return {
        reply: result.text,
        reasoning: result.reasoning,
      };
    }

    // If no text but no error, return fallback message
    return {
      reply: "I'm sorry, I couldn't generate a response. Please try asking about CV analysis, interview preparation, job search, or career advice for the Malaysian market.",
      reasoning: result.reasoning,
    };
  } catch (error) {
    // Log the error for debugging
    console.error("[Chatbot] AI call failed:", error);

    // Try fallback to GPT-4o-mini if GPT-5.4-mini fails
    try {
      console.log("[Chatbot] Falling back to GPT-4o-mini...");
      const fallbackResult = await callAi({
        model: AI_MODELS.GPT4O_MINI,
        messages,
        timeoutMs: 30000,
      });

      if (fallbackResult.text && fallbackResult.text.trim()) {
        return {
          reply: fallbackResult.text,
          reasoning: fallbackResult.reasoning,
        };
      }
    } catch (fallbackError) {
      console.error("[Chatbot] Fallback also failed:", fallbackError);
    }

    // Return user-friendly error message
    return {
      reply: "I'm having trouble connecting to my knowledge base right now. This might be due to high demand or a temporary issue. Please try again in a moment, or ask me about CV tips, interview prep, or job search strategies for the Malaysian market.",
      reasoning: undefined,
    };
  }
}
