import { useMemo, useState } from "react";
import { WorkoutSession } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, subMonths, parseISO, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { calculateVolume } from "@/lib/calculations";
import { Pencil } from "lucide-react";

type TimeRange = "weekly" | "monthly" | "quarterly";

interface DashboardProps {
  sessions: WorkoutSession[];
  onEditSession?: (session: WorkoutSession) => void;
}

const Dashboard = ({ sessions, onEditSession }: DashboardProps) => {
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>("weekly");

  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    sessions.forEach((s) => s.exercises.forEach((e) => names.add(e.exerciseName)));
    return Array.from(names).sort();
  }, [sessions]);

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case "weekly":
        return { start: subDays(now, 6), end: now, days: 7 };
      case "monthly":
        return { start: subDays(now, 29), end: now, days: 30 };
      case "quarterly":
        return { start: subDays(now, 89), end: now, days: 90 };
    }
  };

  const buildChartData = (filterFn?: (e: { exerciseName: string }) => boolean) => {
    const { start, end, days } = getDateRange();

    if (timeRange === "weekly") {
      return Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayStr = format(date, "yyyy-MM-dd");
        const dayLabel = format(date, "EEE");
        const daySessions = sessions.filter((s) => format(parseISO(s.date), "yyyy-MM-dd") === dayStr);
        const vol = filterFn
          ? daySessions.flatMap((s) => s.exercises).filter(filterFn).reduce((sum, e) => sum + calculateVolume(e.weight, e.reps, e.series), 0)
          : daySessions.reduce((sum, s) => sum + s.totalVolume, 0);
        return { day: dayLabel, volume: vol };
      });
    }

    if (timeRange === "monthly") {
      // Group by week
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      return weeks.map((weekStart) => {
        const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const label = format(weekStart, "MMM d");
        const weekSessions = sessions.filter((s) => {
          const d = parseISO(s.date);
          return d >= weekStart && d <= wEnd;
        });
        const vol = filterFn
          ? weekSessions.flatMap((s) => s.exercises).filter(filterFn).reduce((sum, e) => sum + calculateVolume(e.weight, e.reps, e.series), 0)
          : weekSessions.reduce((sum, s) => sum + s.totalVolume, 0);
        return { day: label, volume: vol };
      });
    }

    // Quarterly - group by month
    const months = eachMonthOfInterval({ start, end });
    return months.map((monthStart) => {
      const mEnd = endOfMonth(monthStart);
      const label = format(monthStart, "MMM");
      const monthSessions = sessions.filter((s) => {
        const d = parseISO(s.date);
        return d >= monthStart && d <= mEnd;
      });
      const vol = filterFn
        ? monthSessions.flatMap((s) => s.exercises).filter(filterFn).reduce((sum, e) => sum + calculateVolume(e.weight, e.reps, e.series), 0)
        : monthSessions.reduce((sum, s) => sum + s.totalVolume, 0);
      return { day: label, volume: vol };
    });
  };

  const totalData = useMemo(() => buildChartData(), [sessions, timeRange]);
  const exerciseData = useMemo(
    () => selectedExercise ? buildChartData((e) => e.exerciseName === selectedExercise) : [],
    [sessions, timeRange, selectedExercise]
  );

  const tooltipStyle = {
    background: "hsl(220 30% 9%)",
    border: "1px solid hsl(215 20% 16%)",
    borderRadius: 8,
    color: "hsl(210 20% 92%)",
  };

  const TimeRangeToggle = () => (
    <div className="flex gap-1 bg-muted rounded-lg p-1 mb-3">
      {(["weekly", "monthly", "quarterly"] as TimeRange[]).map((range) => (
        <button
          key={range}
          onClick={() => setTimeRange(range)}
          className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${
            timeRange === range ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );

  // Recent sessions for editing
  const recentSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [sessions]);

  return (
    <div className="space-y-4">
      {/* Weekly Total Volume */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Volume Overview</h3>
        <TimeRangeToggle />
        {totalData.some((d) => d.volume > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={totalData}>
              <XAxis dataKey="day" tick={{ fill: "hsl(215 14% 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volume"]} />
              <Bar dataKey="volume" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-8">No data yet. Complete a workout!</p>
        )}
      </div>

      {/* Per-Exercise Overview */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Exercise Overview</h3>
        {exerciseNames.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => setSelectedExercise("")}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors active:scale-95 ${
                  selectedExercise === "" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                All
              </button>
              {exerciseNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedExercise(name)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors active:scale-95 ${
                    selectedExercise === name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {selectedExercise ? (
              exerciseData.some((d) => d.volume > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={exerciseData}>
                    <XAxis dataKey="day" tick={{ fill: "hsl(215 14% 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volume"]} />
                    <Bar dataKey="volume" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-6">No data for {selectedExercise} this period</p>
              )
            ) : (
              <div className="space-y-2">
                {exerciseNames.map((name) => {
                  const totalVol = sessions
                    .flatMap((s) => s.exercises)
                    .filter((e) => e.exerciseName === name)
                    .reduce((sum, e) => sum + calculateVolume(e.weight, e.reps, e.series), 0);
                  const maxWeight = sessions
                    .flatMap((s) => s.exercises)
                    .filter((e) => e.exerciseName === name)
                    .reduce((max, e) => Math.max(max, e.weight), 0);
                  return (
                    <button
                      key={name}
                      onClick={() => setSelectedExercise(name)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-muted active:scale-[0.98] transition-transform"
                    >
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <div className="flex gap-4 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">Best</p>
                          <p className="text-sm font-bold font-mono-display text-foreground">{maxWeight} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Vol</p>
                          <p className="text-sm font-bold font-mono-display text-primary">{totalVol.toLocaleString()} kg</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-8">Complete workouts to see exercise data</p>
        )}
      </div>

      {/* Recent Sessions (editable) */}
      {recentSessions.length > 0 && onEditSession && (
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onEditSession(session)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-muted active:scale-[0.98] transition-transform"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{session.routineName} — {session.dayLabel}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(session.date), "MMM d, yyyy")} · {session.totalVolume.toLocaleString()} kg</p>
                </div>
                <Pencil size={14} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
