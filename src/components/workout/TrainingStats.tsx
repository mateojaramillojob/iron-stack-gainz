import { useMemo } from "react";
import { Profile, WorkoutSession } from "@/lib/types";
import { parseISO, startOfWeek, differenceInCalendarWeeks, format } from "date-fns";
import { Dumbbell, Layers, CalendarDays, Flame, Scale } from "lucide-react";

interface TrainingStatsProps {
  profile: Profile;
  sessions: WorkoutSession[];
}

const WEEK_OPTS = { weekStartsOn: 1 as const };

// Compounds worth expressing as a multiple of bodyweight. Machine/isolation
// work is excluded because the ratio isn't a meaningful strength standard.
const RELATIVE_STRENGTH_LIFTS = [
  "Squats (BB)", "Squats (Machine)", "Squats", "Bench Press", "RDLs",
  "Shoulder Press (BB)", "Shoulder Press (DB)", "Pull-Ups", "Incline DB Press",
];

const TrainingStats = ({ profile, sessions }: TrainingStatsProps) => {
  const stats = useMemo(() => {
    const totalVolume = sessions.reduce((sum, s) => sum + s.totalVolume, 0);

    // Weekly streak: consecutive weeks (Mon-start) with at least one session,
    // counting back from this week. More honest than a daily streak for lifting.
    const trainedWeeks = new Set(
      sessions.map((s) => startOfWeek(parseISO(s.date), WEEK_OPTS).toISOString())
    );
    let streak = 0;
    const thisWeek = startOfWeek(new Date(), WEEK_OPTS);
    for (let i = 0; i < 260; i++) {
      const wk = new Date(thisWeek);
      wk.setDate(wk.getDate() - i * 7);
      if (trainedWeeks.has(startOfWeek(wk, WEEK_OPTS).toISOString())) streak++;
      else if (i > 0) break;
    }

    const firstSession = [...sessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];
    const trainingSince = firstSession ? parseISO(firstSession.date) : parseISO(profile.createdAt);
    const weeksTraining = Math.max(1, differenceInCalendarWeeks(new Date(), trainingSince, WEEK_OPTS) + 1);

    return { totalVolume, streak, trainingSince, weeksTraining, sessionCount: sessions.length };
  }, [sessions, profile.createdAt]);

  const bodyweight = profile.weightKg ?? null;

  const leanMass = useMemo(() => {
    if (!bodyweight || profile.bodyFatPct == null) return null;
    return Math.round(bodyweight * (1 - profile.bodyFatPct / 100) * 10) / 10;
  }, [bodyweight, profile.bodyFatPct]);

  const relativeStrength = useMemo(() => {
    if (!bodyweight) return [];
    const best: Record<string, number> = {};
    sessions.flatMap((s) => s.exercises).forEach((e) => {
      if (!RELATIVE_STRENGTH_LIFTS.includes(e.exerciseName)) return;
      best[e.exerciseName] = Math.max(best[e.exerciseName] || 0, e.weight);
    });
    return Object.entries(best)
      .filter(([, w]) => w > 0)
      .map(([name, weight]) => ({ name, weight, ratio: weight / bodyweight }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 4);
  }, [sessions, bodyweight]);

  return (
    <div className="space-y-4">
      {/* Lifetime totals — the numbers that only grow */}
      <div className="rounded-3xl bg-card border border-border p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">All Time</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Dumbbell, label: "Sessions", value: stats.sessionCount.toLocaleString() },
            { icon: Layers, label: "Volume lifted", value: `${Math.round(stats.totalVolume / 1000).toLocaleString()}t` },
            { icon: Flame, label: "Week streak", value: String(stats.streak) },
            { icon: CalendarDays, label: "Training for", value: `${stats.weeksTraining}w` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-muted p-3.5">
              <Icon size={16} className="text-muted-foreground mb-2" />
              <p className="text-xl font-black font-mono-display text-foreground leading-none">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Since {format(stats.trainingSince, "MMMM yyyy")}
        </p>
      </div>

      {/* Strength relative to bodyweight — what the weight field is actually for */}
      <div className="rounded-3xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-1">
          <Scale size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Relative Strength</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Your best lift as a multiple of bodyweight.
        </p>

        {!bodyweight ? (
          <p className="text-sm text-muted-foreground py-3">
            Add your bodyweight above to unlock this.
          </p>
        ) : relativeStrength.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">
            Log a compound lift (squat, bench, press) to see your ratios.
          </p>
        ) : (
          <div className="space-y-2">
            {relativeStrength.map(({ name, weight, ratio }) => (
              <div key={name} className="rounded-2xl bg-muted p-3">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                  <span className="text-sm font-black font-mono-display text-primary shrink-0">
                    {ratio.toFixed(2)}×
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-background overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(100, (ratio / 2) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {weight}kg at {bodyweight}kg bodyweight
                </p>
              </div>
            ))}
          </div>
        )}

        {leanMass != null && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Lean mass ({profile.bodyFatPct}% body fat)</span>
            <span className="text-sm font-bold font-mono-display text-foreground">{leanMass} kg</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingStats;
