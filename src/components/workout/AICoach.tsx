import { useState } from "react";
import { WorkoutSession } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Loader2, RefreshCw, Lightbulb, TrendingUp, Heart } from "lucide-react";
import { toast } from "sonner";

interface AICoachProps {
  sessions: WorkoutSession[];
  profileName?: string;
}

interface CoachAnalysis {
  summary: string;
  takeaways: string[];
  motivation: string;
}

const AICoach = ({ sessions }: AICoachProps) => {
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (sessions.length < 2) {
      toast.info("Complete at least 2 sessions for AI coaching insights.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: { sessions },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to get coaching insights");
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI Coach</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Get personalized insights on your training progress, trends, and recommendations.
        </p>
        <button onClick={analyze} disabled={loading || sessions.length < 2}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Brain size={16} /> Get Coaching Insights</>}
        </button>
        {sessions.length < 2 && (
          <p className="text-xs text-muted-foreground text-center mt-2">Need at least 2 sessions</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI Coach</h3>
        </div>
        <button onClick={analyze} disabled={loading} className="p-1.5 rounded-lg text-muted-foreground active:scale-95 transition-transform">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      <div className="space-y-3">
        {/* Summary */}
        <div className="flex gap-2">
          <TrendingUp size={14} className="text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Takeaways */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb size={14} className="text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Takeaways</span>
          </div>
          <ul className="space-y-1.5">
            {analysis.takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-primary mt-0.5">•</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Motivation */}
        <div className="flex gap-2 bg-primary/10 rounded-lg p-3">
          <Heart size={14} className="text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground font-medium italic">{analysis.motivation}</p>
        </div>
      </div>
    </div>
  );
};

export default AICoach;
