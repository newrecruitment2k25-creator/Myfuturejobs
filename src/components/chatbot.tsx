import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, MessageCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! How can we help with your career journey today?" },
    { role: "assistant", content: "You can ask about jobs, career advice, CV tips, or interview preparation." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          message: userMessage,
          history: messages,
        }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      const reply = data.reply || "Sorry, I could not process that. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      console.error("[Chatbot] Unexpected error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting right now. Please try again in a moment." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="chatbot-widget">
      {/* Chat Panel */}
      {isOpen && (
        <div className="chatbot-panel">
          {/* Header — navy gradient */}
          <div className="chatbot-header">
            <div>
              <strong className="text-sm font-extrabold">Ask AI</strong>
              <span>Ask me anything about your career!</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="chatbot-close"
              aria-label="Close chatbot"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages body */}
          <div className="chatbot-body">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chatbot-message ${message.role === "assistant" ? "bot" : "user"}`}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message bot">
                <Loader2 className="size-4 animate-spin" style={{ color: 'var(--accent)' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input footer */}
          <div className="chatbot-footer">
            <input
              type="text"
              className="chatbot-input"
              placeholder="Type your message..."
              aria-label="Type your message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="chatbot-send"
              type="button"
              onClick={() => void handleSend()}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button — orange gradient pill */}
      <button
        className="chatbot-toggle"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-controls="chatbotPanel"
        aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
      >
        <MessageCircle className="size-5" />
        Ask AI
      </button>
    </div>
  );
}
