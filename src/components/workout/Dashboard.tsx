import { useMemo, useState } from "react";
import { WorkoutSession, RecoveryLog } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { calculate1RM } from "@/lib/calculations";

interface DashboardProps {
  sessions: WorkoutSession[];
  recoveryLogs: RecoveryLog[];
  onLogRecovery: (log: RecoveryLog) => void;
}

const Dashboard = ({ sessions, recoveryLogs, onLogRecovery }: DashboardProps) => {
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [soreness, setSoreness] = useState(5);

  // Weekly volume data
  const weeklyData = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStr = format(date, "yyyy-MM-dd");
      const dayLabel = format(date, "EEE");
      const vol = sessions
        .filter((s) => format(parseISO(s.date), "yyyy-MM-dd") === dayStr)
        .reduce((sum, s) => sum + s.totalVolume, 0);
      return { day: dayLabel, volume: vol };
    });
    return last7;
  }, [sessions]);

  // All unique exercises
  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    sessions.forEach((s) => s.exercises.forEach((e) => names.add(e.exerciseName)));
    return Array.from(names);
  }, [sessions]);

  // 1RM progress for selected exercise
  const strengthData = useMemo(() => {
    if (!selectedExercise) return [];
    return sessions
      .flatMap((s) =>
        s.exercises
          .filter((e) => e.exerciseName === selectedExercise)
          .map((e) => ({
            date: format(parseISO(s.date), "MMM d"),
            oneRM: calculate1RM(e.weight, e.reps),
          }))
      )
      .slice(-20);
  }, [sessions, selectedExercise]);

  const logRestDay = () => {
    onLogRecovery({ date: new Date().toISOString(), soreness });
  };

  const todayIsRest = recoveryLogs.some(
    (r) => format(parseISO(r.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );

  return (
    <div className="space-y-4">
      {/* Weekly Volume */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Weekly Volume</h3>
        {weeklyData.some((d) => d.volume > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fill: "hsl(215 14% 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "hsl(220 30% 9%)", border: "1px solid hsl(215 20% 16%)", borderRadius: 8, color: "hsl(210 20% 92%)" }}
                formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volume"]}
              />
              <Bar dataKey="volume" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-8">No data yet. Complete a workout!</p>
        )}
      </div>

      {/* Strength Progress */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Strength Progress (1RM)</h3>
        {exerciseNames.length > 0 ? (
          <>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-input text-foreground text-base font-medium border-0 outline-none focus:ring-2 focus:ring-primary mb-3 appearance-none"
            >
              <option value="">Select exercise</option>
              {exerciseNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {strengthData.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={strengthData}>
                  <XAxis dataKey="date" tick={{ fill: "hsl(215 14% 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "hsl(220 30% 9%)", border: "1px solid hsl(215 20% 16%)", borderRadius: 8, color: "hsl(210 20% 92%)" }}
                    formatter={(value: number) => [`${value} kg`, "Est. 1RM"]}
                  />
                  <Line type="monotone" dataKey="oneRM" stroke="hsl(160 84% 39%)" strokeWidth={2.5} dot={{ fill: "hsl(160 84% 39%)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-8">Complete workouts to see progress</p>
        )}
      </div>

      {/* Recovery Logger */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recovery</h3>
        {todayIsRest ? (
          <p className="text-center text-primary font-medium py-4">Rest day logged ✓</p>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm text-muted-foreground">Soreness Level</label>
                <span className="font-mono-display font-bold text-foreground">{soreness}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={soreness}
                onChange={(e) => setSoreness(parseInt(e.target.value))}
                className="w-full accent-primary h-2"
              />
            </div>
            <button
              onClick={logRestDay}
              className="w-full py-3.5 rounded-xl bg-secondary text-secondary-foreground font-bold text-base active:scale-[0.98] transition-transform"
            >
              Log Rest Day
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
