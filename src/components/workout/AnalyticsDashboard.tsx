import { useMemo, useState } from "react";
import { WorkoutSession } from "@/lib/types";
import { calculateVolume } from "@/lib/calculations";
import { parseISO, subDays, differenceInDays } from "date-fns";
import { Activity, Flame, Trophy, TrendingUp, BarChart3, Zap } from "lucide-react";

interface AnalyticsDashboardProps {
  sessions: WorkoutSession[];
}

const AnalyticsDashboard = ({ sessions }: AnalyticsDashboardProps) => {
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "reports">("overview");

  const metrics = useMemo(() => {
    const now = new Date();
    const last30 = sessions.filter((s) => differenceInDays(now, parseISO(s.date)) <= 30);
    const prev30 = sessions.filter((s) => {
      const d = differenceInDays(now, parseISO(s.date));
      return d > 30 && d <= 60;
    });

    const totalVolume = last30.reduce((sum, s) => sum + s.totalVolume, 0);
    const prevVolume = prev30.reduce((sum, s) => sum + s.totalVolume, 0);
    const volChange = prevVolume > 0 ? ((totalVolume - prevVolume) / prevVolume * 100) : 0;

    // PRs: max weight per exercise this month vs last month
    const getMaxWeights = (sess: WorkoutSession[]) => {
      const map: Record<string, number> = {};
      sess.flatMap((s) => s.exercises).forEach((e) => {
        map[e.exerciseName] = Math.max(map[e.exerciseName] || 0, e.weight);
      });
      return map;
    };
    const currentMaxes = getMaxWeights(last30);
    const prevMaxes = getMaxWeights(prev30);
    let prs = 0;
    Object.entries(currentMaxes).forEach(([name, w]) => {
      if (!prevMaxes[name] || w > prevMaxes[name]) prs++;
    });

    // Consistency: sessions per week (target 4)
    const weeks = Math.max(1, Math.ceil(30 / 7));
    const sessionsPerWeek = last30.length / weeks;
    const consistency = Math.min(100, Math.round((sessionsPerWeek / 4) * 100));

    // Streak
    let streak = 0;
    const sortedDates = [...new Set(sessions.map((s) => s.date.split("T")[0]))].sort().reverse();
    for (let i = 0; i < sortedDates.length; i++) {
      const expected = subDays(now, i).toISOString().split("T")[0];
      // Allow 1-day gaps
      if (sortedDates[i] === expected || differenceInDays(now, parseISO(sortedDates[i])) <= i + 1) {
        streak++;
      } else break;
    }

    return { totalVolume, volChange, prs, consistency, sessionsCount: last30.length, streak };
  }, [sessions]);

  const progressPercent = metrics.consistency;
  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset = circumference - (circumference * progressPercent) / 100;

  const exerciseBreakdown = useMemo(() => {
    const map: Record<string, { volume: number; maxWeight: number; sessions: number }> = {};
    sessions.slice(0, 50).forEach((s) => {
      s.exercises.forEach((e) => {
        if (!map[e.exerciseName]) map[e.exerciseName] = { volume: 0, maxWeight: 0, sessions: 0 };
        map[e.exerciseName].volume += calculateVolume(e.weight, e.reps, e.series);
        map[e.exerciseName].maxWeight = Math.max(map[e.exerciseName].maxWeight, e.weight);
        map[e.exerciseName].sessions++;
      });
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b.volume - a.volume)
      .slice(0, 6);
  }, [sessions]);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            Analytics Dashboard
          </h3>
          <p className="text-xs text-muted-foreground">Performance metrics at a glance</p>
        </div>
        {/* Progress Ring */}
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" opacity="0.3" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold font-mono-display text-foreground">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-border">
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {(["overview", "analytics", "reports"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Main metric */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Monthly Volume</span>
                {metrics.volChange !== 0 && (
                  <span className={`text-xs font-bold ${metrics.volChange > 0 ? "text-primary" : "text-destructive"}`}>
                    {metrics.volChange > 0 ? "+" : ""}{metrics.volChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-black font-mono-display text-foreground">
                {metrics.totalVolume.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">kg</span>
              </p>
              {/* Mini bar visual */}
              <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, metrics.consistency)}%` }} />
              </div>
            </div>

            {/* Metric grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Flame, label: "Sessions", value: String(metrics.sessionsCount) },
                { icon: Trophy, label: "PRs Hit", value: String(metrics.prs) },
                { icon: Zap, label: "Consistency", value: `${metrics.consistency}%` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                  <Icon size={16} className="text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold font-mono-display text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-2">
            {exerciseBreakdown.length > 0 ? exerciseBreakdown.map(([name, data]) => (
              <div key={name} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{name}</span>
                </div>
                <span className="text-sm font-bold font-mono-display text-foreground ml-2">{data.volume.toLocaleString()} kg</span>
              </div>
            )) : (
              <p className="text-center text-muted-foreground text-sm py-6">Complete workouts to see exercise analytics</p>
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-xl p-4">
              <h4 className="text-sm font-bold text-foreground mb-1">Weekly Summary</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {metrics.sessionsCount > 0
                  ? `You completed ${metrics.sessionsCount} sessions this month with ${metrics.totalVolume.toLocaleString()} kg total volume. ${metrics.prs > 0 ? `You hit ${metrics.prs} new personal records!` : "Keep pushing for new PRs!"}`
                  : "Start training to see your weekly summary here."}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <h4 className="text-sm font-bold text-foreground mb-2">Key Insights</h4>
              <div className="space-y-1.5">
                {[
                  `${metrics.consistency}% training consistency`,
                  `${metrics.sessionsCount} sessions in 30 days`,
                  `${metrics.prs} personal records this month`,
                ].map((insight) => (
                  <div key={insight} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-primary">•</span>
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
