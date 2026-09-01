import { useMemo, useState } from "react";
import { WorkoutSession } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  format, parseISO, addDays, isSameDay, isWithinInterval,
  startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths, eachWeekOfInterval,
} from "date-fns";
import { Flame, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Range = "week" | "month";

interface ProgressViewProps {
  sessions: WorkoutSession[];
}

// Weeks run Monday→Sunday, and "this week"/"this month" mean the real calendar
// period you're currently in — not a rolling window of the last 7/30 days.
const WEEK_OPTS = { weekStartsOn: 1 as const };

function periodFor(range: Range, offset = 0) {
  const now = new Date();
  if (range === "week") {
    const ref = subWeeks(now, offset);
    return { start: startOfWeek(ref, WEEK_OPTS), end: endOfWeek(ref, WEEK_OPTS) };
  }
  const ref = subMonths(now, offset);
  return { start: startOfMonth(ref), end: endOfMonth(ref) };
}

const ProgressView = ({ sessions }: ProgressViewProps) => {
  const [range, setRange] = useState<Range>("week");

  const inPeriod = (list: WorkoutSession[], p: { start: Date; end: Date }) =>
    list.filter((s) => isWithinInterval(parseISO(s.date), p));

  const metrics = useMemo(() => {
    const current = inPeriod(sessions, periodFor(range, 0));
    const previous = inPeriod(sessions, periodFor(range, 1));

    const volume = current.reduce((sum, s) => sum + s.totalVolume, 0);
    const prevVolume = previous.reduce((sum, s) => sum + s.totalVolume, 0);
    const change = prevVolume > 0 ? ((volume - prevVolume) / prevVolume) * 100 : 0;

    const maxPerExercise = (list: WorkoutSession[]) => {
      const map: Record<string, number> = {};
      list.flatMap((s) => s.exercises).forEach((e) => {
        map[e.exerciseName] = Math.max(map[e.exerciseName] || 0, e.weight);
      });
      return map;
    };
    const currentMax = maxPerExercise(current);
    const prevMax = maxPerExercise(previous);
    const prs = Object.entries(currentMax).filter(([n, w]) => !prevMax[n] || w > prevMax[n]).length;

    const targetSessions = range === "week" ? 4 : 16;
    const consistency = Math.min(100, Math.round((current.length / targetSessions) * 100));

    return { volume, change, prs, consistency, sessions: current.length };
  }, [sessions, range]);

  const period = periodFor(range, 0);

  // Label the exact window so "this week" is never ambiguous.
  const periodLabel = range === "week"
    ? `${format(period.start, "EEE d MMM")} – ${format(period.end, "EEE d MMM")}`
    : format(period.start, "MMMM yyyy");

  const chartData = useMemo(() => {
    if (range === "week") {
      // Mon → Sun of the current calendar week.
      return Array.from({ length: 7 }, (_, i) => {
        const date = addDays(period.start, i);
        const vol = sessions
          .filter((s) => isSameDay(parseISO(s.date), date))
          .reduce((sum, s) => sum + s.totalVolume, 0);
        return { label: format(date, "EEEEE"), volume: vol };
      });
    }
    // Each Mon-start week that overlaps the current calendar month.
    return eachWeekOfInterval({ start: period.start, end: period.end }, WEEK_OPTS).map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, WEEK_OPTS);
      const vol = sessions
        .filter((s) => { const d = parseISO(s.date); return d >= weekStart && d <= weekEnd; })
        .reduce((sum, s) => sum + s.totalVolume, 0);
      return { label: format(weekStart, "d MMM"), volume: vol };
    });
  }, [sessions, range, period.start, period.end]);

  const hasData = chartData.some((d) => d.volume > 0);

  return (
    <div className="space-y-4">
      {/* Range toggle */}
      <div className="flex gap-1 bg-muted rounded-2xl p-1">
        {(["week", "month"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "flex-1 h-11 rounded-xl text-sm font-bold capitalize transition-colors",
              range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            This {r}
          </button>
        ))}
      </div>

      {/* Headline volume — oversized numeric, the one stat that matters most */}
      <div className="rounded-3xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Total Volume</span>
            <span className="text-[11px] text-muted-foreground/70">{periodLabel}</span>
          </div>
          {metrics.change !== 0 && (
            <span className={cn("text-xs font-bold shrink-0", metrics.change > 0 ? "text-primary" : "text-destructive")}>
              {metrics.change > 0 ? "+" : ""}{metrics.change.toFixed(0)}% vs last {range}
            </span>
          )}
        </div>
        <p className="text-4xl font-black font-mono-display text-foreground leading-none">
          {metrics.volume.toLocaleString()}
          <span className="text-base font-normal text-muted-foreground ml-1.5">kg</span>
        </p>

        {hasData ? (
          <div className="mt-4 -mx-1">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData}>
                <XAxis dataKey="label" tick={{ fill: "hsl(240 5% 62%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "hsl(240 8% 16%)" }}
                  contentStyle={{
                    background: "hsl(240 9% 13%)",
                    border: "1px solid hsl(240 8% 20%)",
                    borderRadius: 12,
                    color: "hsl(240 6% 96%)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v.toLocaleString()} kg`, "Volume"]}
                />
                <Bar dataKey="volume" fill="hsl(152 76% 47%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-10">
            No sessions this {range} yet — time to train.
          </p>
        )}
      </div>

      {/* Supporting stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, label: "Sessions", value: String(metrics.sessions) },
          { icon: Trophy, label: "PRs", value: String(metrics.prs) },
          { icon: Zap, label: "Consistency", value: `${metrics.consistency}%` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl bg-card border border-border p-4 text-center">
            <Icon size={18} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-black font-mono-display text-foreground leading-none">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressView;
