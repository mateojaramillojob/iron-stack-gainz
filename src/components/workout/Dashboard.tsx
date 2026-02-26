import { useMemo, useState } from "react";
import { WorkoutSession } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { calculateVolume } from "@/lib/calculations";

interface DashboardProps {
  sessions: WorkoutSession[];
}

const Dashboard = ({ sessions }: DashboardProps) => {
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  // All unique exercise names
  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    sessions.forEach((s) => s.exercises.forEach((e) => names.add(e.exerciseName)));
    return Array.from(names).sort();
  }, [sessions]);

  // Weekly total volume data
  const weeklyTotalData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStr = format(date, "yyyy-MM-dd");
      const dayLabel = format(date, "EEE");
      const vol = sessions
        .filter((s) => format(parseISO(s.date), "yyyy-MM-dd") === dayStr)
        .reduce((sum, s) => sum + s.totalVolume, 0);
      return { day: dayLabel, volume: vol };
    });
  }, [sessions]);

  // Weekly per-exercise volume data
  const weeklyExerciseData = useMemo(() => {
    if (!selectedExercise) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStr = format(date, "yyyy-MM-dd");
      const dayLabel = format(date, "EEE");
      const vol = sessions
        .filter((s) => format(parseISO(s.date), "yyyy-MM-dd") === dayStr)
        .flatMap((s) => s.exercises)
        .filter((e) => e.exerciseName === selectedExercise)
        .reduce((sum, e) => sum + calculateVolume(e.weight, e.reps, e.series), 0);
      const weight = sessions
        .filter((s) => format(parseISO(s.date), "yyyy-MM-dd") === dayStr)
        .flatMap((s) => s.exercises)
        .filter((e) => e.exerciseName === selectedExercise)
        .reduce((max, e) => Math.max(max, e.weight), 0);
      return { day: dayLabel, volume: vol, weight };
    });
  }, [sessions, selectedExercise]);

  const tooltipStyle = {
    background: "hsl(220 30% 9%)",
    border: "1px solid hsl(215 20% 16%)",
    borderRadius: 8,
    color: "hsl(210 20% 92%)",
  };

  return (
    <div className="space-y-4">
      {/* Weekly Total Volume */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Weekly Volume</h3>
        {weeklyTotalData.some((d) => d.volume > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyTotalData}>
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
              weeklyExerciseData.some((d) => d.volume > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyExerciseData}>
                    <XAxis dataKey="day" tick={{ fill: "hsl(215 14% 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [
                        `${value.toLocaleString()} ${name === "weight" ? "kg" : "kg"}`,
                        name === "weight" ? "Max Weight" : "Volume",
                      ]}
                    />
                    <Bar dataKey="volume" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-6">No data for {selectedExercise} this week</p>
              )
            ) : (
              // Show all exercises summary
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
    </div>
  );
};

export default Dashboard;
