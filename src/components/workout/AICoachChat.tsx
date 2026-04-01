import { useState, useRef, useEffect } from "react";
import { WorkoutSession } from "@/lib/types";
import { Brain, Send, Loader2, Coins, Zap } from "lucide-react";
import { toast } from "sonner";
import { checkFreeQuestion, useFreeQuestion, spendCredits, MuscleCredits } from "@/lib/creditsService";

interface AICoachChatProps {
  sessions: WorkoutSession[];
  profileName?: string;
  profileId: string;
  credits: MuscleCredits | null;
  onCreditsChange: () => void;
}

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = [
  { label: "📊 Analyze progress", prompt: "Analyze my progress over the last 30 days. Summarize my strength and volume gains." },
  { label: "🧱 Stuck on plateau", prompt: "I feel stuck on a plateau. Suggest exercise variations or a deload cycle for my stalled lifts." },
  { label: "🔄 Quick substitute", prompt: "Suggest a quick substitute exercise I can do if a machine is busy." },
  { label: "📈 Check volume", prompt: "Check my volume distribution. Am I overtraining or undertraining any muscle groups?" },
  { label: "🩹 Soreness advice", prompt: "I have some soreness. How should I modify my workout today?" },
];

const QUESTION_COST = 3;

const AICoachChat = ({ sessions, profileName, profileId, credits, onCreditsChange }: AICoachChatProps) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Check credits
    const isFree = await checkFreeQuestion(profileId);
    if (!isFree) {
      if (!credits || credits.balance < QUESTION_COST) {
        toast.error(`Not enough Muscle Credits (need ${QUESTION_COST}). Complete workouts to earn more!`);
        return;
      }
      const spent = await spendCredits(profileId, QUESTION_COST, "AI Coach question");
      if (!spent) {
        toast.error("Not enough credits");
        return;
      }
      onCreditsChange();
    } else {
      await useFreeQuestion(profileId);
      onCreditsChange();
    }

    const userMsg: Msg = { role: "user", content: text };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach-chat`;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMsgs,
          sessions,
          profileName,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) { toast.error("Rate limited. Try again shortly."); }
        else if (resp.status === 402) { toast.error("Usage limit reached."); }
        else { toast.error("Failed to get AI response"); }
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect to AI Coach");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">AI Coach</h2>
        </div>
        {credits && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/15 border border-warning/30">
            <Coins size={14} className="text-warning" />
            <span className="text-sm font-bold text-warning">{credits.balance}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center pt-8">
            <Brain size={40} className="mx-auto text-primary/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Ask me anything about your training!</p>
            <p className="text-xs text-muted-foreground mb-4 flex items-center justify-center gap-1">
              <Zap size={12} className="text-primary" /> First question of the day is free · {QUESTION_COST} credits after
            </p>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => sendMessage(qa.prompt)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground active:scale-[0.98] transition-transform"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-card border border-border text-foreground rounded-bl-md"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-card border border-border rounded-bl-md">
              <Loader2 size={16} className="animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Quick actions when in conversation */}
      {messages.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-thin">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => sendMessage(qa.prompt)}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground active:scale-95 transition-transform disabled:opacity-40"
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask your AI Coach..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="p-3 rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AICoachChat;
