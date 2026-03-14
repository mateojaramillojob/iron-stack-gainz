import { useMemo, useState } from "react";
import { WorkoutSession } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
import { calculateVolume } from "@/lib/calculations";
import { Pencil, TrendingUp, Trash2 } from "lucide-react";
import AICoach from "./AICoach";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type TimeRange = "weekly" | "monthly" | "quarterly";

interface DashboardProps {
  sessions: WorkoutSession[];
  onEditSession?: (session: WorkoutSession) => void;
  onDeleteSession?: (sessionId: string) => void;
}

const Dashboard = ({ sessions, onEditSession, onDeleteSession }: DashboardProps) => {
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
      case "weekly": return { start: subDays(now, 6), end: now };
      case "monthly": return { start: subDays(now, 29), end: now };
      case "quarterly": return { start: subDays(now, 89), end: now };
    }
  };

  const buildChartData = (filterFn?: (e: { exerciseName: string }) => boolean) => {
    const { start, end } = getDateRange();

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

    // Group by week for monthly/quarterly
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
  };

  // Weekly evolution data (last 4 weeks)
  const weeklyEvolution = useMemo(() => {
    const now = new Date();
    const start = subDays(now, 27);
    const weeks = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });
    return weeks.map((weekStart, i) => {
      const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekSessions = sessions.filter((s) => {
        const d = parseISO(s.date);
        return d >= weekStart && d <= wEnd;
      });
      const totalVol = weekSessions.reduce((sum, s) => sum + s.totalVolume, 0);
      const maxWeight = weekSessions.flatMap((s) => s.exercises).reduce((max, e) => Math.max(max, e.weight), 0);
      return {
        week: `W${i + 1}`,
        label: format(weekStart, "MMM d"),
        volume: totalVol,
        maxWeight,
        sessions: weekSessions.length,
      };
    });
  }, [sessions]);

  const totalData = useMemo(() => buildChartData(), [sessions, timeRange]);
  const exerciseData = useMemo(
    () => selectedExercise ? buildChartData((e) => e.exerciseName === selectedExercise) : [],
    [sessions, timeRange, selectedExercise]
  );

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
  };

  const TimeRangeToggle = () => (
    <div className="flex gap-1 bg-muted rounded-lg p-1 mb-3">
      {(["weekly", "monthly", "quarterly"] as TimeRange[]).map((range) => (
        <button key={range} onClick={() => setTimeRange(range)}
          className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${
            timeRange === range ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}>{range}</button>
      ))}
    </div>
  );

  const recentSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [sessions]);

  return (
    <div className="space-y-4">
      {/* Weekly Evolution */}
      {weeklyEvolution.some((w) => w.volume > 0) && (
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Weekly Evolution</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weeklyEvolution}>
              <XAxis dataKey="label" tick={{ fill: "hsl(215 14% 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [
                `${value.toLocaleString()} ${name === "volume" ? "kg" : name === "sessions" ? "sessions" : "kg"}`,
                name === "volume" ? "Total Volume" : name === "maxWeight" ? "Max Weight" : "Sessions"
              ]} />
              <Line type="monotone" dataKey="volume" stroke="hsl(160 84% 39%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(160 84% 39%)" }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {weeklyEvolution.filter(w => w.volume > 0).slice(-3).map((w, i) => (
              <div key={i} className="bg-muted rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">{w.label}</p>
                <p className="text-sm font-bold font-mono-display text-foreground">{w.volume.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{w.sessions} sess</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Coach */}
      <AICoach sessions={sessions} />

      {/* Volume Overview */}
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
              <button onClick={() => setSelectedExercise("")}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors active:scale-95 ${
                  selectedExercise === "" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>All</button>
              {exerciseNames.map((name) => (
                <button key={name} onClick={() => setSelectedExercise(name)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors active:scale-95 ${
                    selectedExercise === name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>{name}</button>
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
                  const totalVol = sessions.flatMap((s) => s.exercises).filter((e) => e.exerciseName === name)
                    .reduce((sum, e) => sum + calculateVolume(e.weight, e.reps, e.series), 0);
                  const maxWeight = sessions.flatMap((s) => s.exercises).filter((e) => e.exerciseName === name)
                    .reduce((max, e) => Math.max(max, e.weight), 0);
                  return (
                    <button key={name} onClick={() => setSelectedExercise(name)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-muted active:scale-[0.98] transition-transform">
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

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div key={session.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <button onClick={() => onEditSession?.(session)}
                  className="flex-1 text-left active:scale-[0.98] transition-transform">
                  <p className="text-sm font-semibold text-foreground">{session.routineName} — {session.dayLabel}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(session.date), "MMM d, yyyy")} · {session.totalVolume.toLocaleString()} kg</p>
                </button>
                {onEditSession && (
                  <button onClick={() => onEditSession(session)} className="p-1.5 text-muted-foreground active:text-primary">
                    <Pencil size={14} />
                  </button>
                )}
                {onDeleteSession && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 text-muted-foreground active:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove the "{session.routineName} — {session.dayLabel}" session from {format(parseISO(session.date), "MMM d, yyyy")}. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteSession(session.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
