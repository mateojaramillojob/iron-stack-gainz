import { useState, useRef, useEffect, useMemo } from "react";
import { WorkoutSession } from "@/lib/types";
import { Brain, Send, Loader2, Coins, Zap, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { checkFreeQuestion, useFreeQuestion, spendCredits, MuscleCredits } from "@/lib/creditsService";
import { buildCoachSuggestions } from "@/lib/coachSuggestions";

interface AICoachChatProps {
  sessions: WorkoutSession[];
  profileName?: string;
  profileId: string;
  credits: MuscleCredits | null;
  onCreditsChange: () => void;
  nextDayLabel?: string;
  nextExercises?: string[];
}

type Msg = { role: "user" | "assistant"; content: string };

const QUESTION_COST = 3;

// The coach answers in markdown. Rather than pull in a full parser, handle the
// few things it actually uses: headings, bullets and **bold**.
const inline = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );

const CoachMarkdown = ({ text }: { text: string }) => (
  <div className="space-y-1.5">
    {text.split("\n").map((raw, i) => {
      const line = raw.trim();
      if (!line) return <div key={i} className="h-1.5" />;
      if (/^#{1,6}\s/.test(line)) {
        return <p key={i} className="font-bold text-foreground pt-1">{inline(line.replace(/^#{1,6}\s/, ""))}</p>;
      }
      if (/^([-*]|\d+\.)\s/.test(line)) {
        return (
          <div key={i} className="flex gap-2">
            <span className="text-primary shrink-0">&bull;</span>
            <span>{inline(line.replace(/^([-*]|\d+\.)\s/, ""))}</span>
          </div>
        );
      }
      return <p key={i}>{inline(line)}</p>;
    })}
  </div>
);

const AICoachChat = ({ sessions, profileName, profileId, credits, onCreditsChange, nextDayLabel, nextExercises }: AICoachChatProps) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Suggestions are computed from the user's own logs, so they name real
  // exercises and real numbers instead of generic prompts.
  const suggestions = useMemo(
    () => buildCoachSuggestions(sessions, { nextDayLabel, nextExercises }),
    [sessions, nextDayLabel, nextExercises]
  );

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
      const spent = await spendCredits(profileId, QUESTION_COST, "Max question");
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
      toast.error("Could not reach Max. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <Brain size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-none">Max</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Your coach &middot; powered by AI</p>
          </div>
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
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Brain size={30} className="text-primary/60" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">Hey, I&apos;m Max.</p>
            <p className="text-sm text-muted-foreground mb-1">Ask me anything about your training.</p>
            <p className="text-[11px] text-muted-foreground/70 mb-3">I&apos;m an AI assistant, not a certified trainer.</p>
            <p className="text-xs text-muted-foreground mb-4 flex items-center justify-center gap-1">
              <Zap size={12} className="text-primary" /> First question of the day is free · {QUESTION_COST} credits after
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left mb-2">
              Based on your training data
            </p>
            <div className="space-y-2 text-left">
              {suggestions.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => sendMessage(qa.prompt)}
                  className="w-full flex items-center gap-3 text-left px-4 py-3.5 rounded-2xl bg-card border border-border active:scale-[0.98] transition-transform"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground">{qa.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                : "bg-card border border-border text-foreground rounded-bl-md"
            }`}>
              {msg.role === "user" ? msg.content : <CoachMarkdown text={msg.content} />}
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
          <button
            onClick={() => setMessages([])}
            disabled={isLoading}
            aria-label="Start a new conversation"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted border border-border text-xs font-medium text-muted-foreground active:scale-95 transition-transform disabled:opacity-40"
          >
            <RotateCcw size={12} /> New
          </button>
          {suggestions.map((qa) => (
            <button
              key={qa.label}
              onClick={() => sendMessage(qa.prompt)}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-2 rounded-full bg-muted border border-border text-xs font-medium text-muted-foreground active:scale-95 transition-transform disabled:opacity-40 whitespace-nowrap"
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
            placeholder="Ask Max..."
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
