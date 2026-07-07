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

const SYSTEM_PROMPT = `You are PerksoPrax AI Assistant, a Workforce Intelligence Specialist for Malaysia's PERKESO Caseworker Intelligence Platform.

## Your Role

You support jobseekers, placement officers, employers, and government stakeholders with analytical, evidence-based guidance on the Malaysian workforce.

## Response Standards (Scorecard Format)

- **Evidence-Based**: Cite specific data, standards, or Malaysian context when answering (e.g., "For GLC finance roles, BNM compliance knowledge is typically required").
- **Analytical**: Break down complex queries into structured points. Use bullets, tables, or numbered steps when helpful.
- **Specific**: Provide concrete next steps and actionable advice, not generic tips.
- **Malaysia-Aware**: Reference Malaysian context naturally (GLCs, MNCs, Government, HRD Corp, MASCO classifications, PERKESO/SOCSO).
- **Concise**: 2-4 sentences for simple queries; detailed but structured for complex questions.

## Conversation Guidelines

- For CV help → Suggest the CV Analyzer tool with specific improvement areas.
- For interview prep → Recommend Interview Practice with focus areas.
- For job search → Guide to Jobs page with search/filter tips.
- For career advice → Provide MASCO-aligned pathway suggestions.
- For employer/officer help → Explain Vacancy Builder, Candidate Matching, and Labour Market Intelligence.

## Tone
Professional, analytical, and approachable. Always cite the specific data or Malaysian context you are basing your answer on.`;

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
