import { useState, useEffect, useMemo } from "react";
import { Profile, WorkoutSession } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { parseISO, startOfWeek, differenceInCalendarWeeks, format } from "date-fns";
import { Target, Pencil, Check, X, Dumbbell, Layers, Flame, CalendarDays, Ruler, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProfileViewProps {
  profile: Profile;
  sessions: WorkoutSession[];
  onProfileUpdated: (profile: Profile) => void;
}

const GOALS = ["Hypertrophy", "Strength", "Endurance", "Weight Loss", "General Fitness", "Powerlifting"];
const WEEK_OPTS = { weekStartsOn: 1 as const };

// Compounds worth expressing as a multiple of bodyweight. Machine and isolation
// work is excluded because the ratio isn't a meaningful strength standard there.
const RELATIVE_STRENGTH_LIFTS = [
  "Squats (BB)", "Squats (Machine)", "Squats", "Bench Press", "RDLs",
  "Shoulder Press (BB)", "Shoulder Press (DB)", "Pull-Ups", "Incline DB Press",
];

const MEASUREMENTS = [
  { label: "Age", key: "age", unit: "years", short: "y" },
  { label: "Weight", key: "weightKg", unit: "kg", short: "kg" },
  { label: "Height", key: "heightCm", unit: "cm", short: "cm" },
  { label: "Body fat", key: "bodyFatPct", unit: "%", short: "% bf" },
] as const;

const ProfileView = ({ profile, sessions, onProfileUpdated }: ProfileViewProps) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: profile.name,
    emoji: profile.emoji,
    age: profile.age ?? null,
    weightKg: profile.weightKg ?? null,
    heightCm: profile.heightCm ?? null,
    bodyFatPct: profile.bodyFatPct ?? null,
    goal: profile.goal || "Hypertrophy",
  });

  useEffect(() => {
    setForm({
      name: profile.name,
      emoji: profile.emoji,
      age: profile.age ?? null,
      weightKg: profile.weightKg ?? null,
      heightCm: profile.heightCm ?? null,
      bodyFatPct: profile.bodyFatPct ?? null,
      goal: profile.goal || "Hypertrophy",
    });
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        name: form.name,
        emoji: form.emoji,
        age: form.age,
        weight_kg: form.weightKg,
        height_cm: form.heightCm,
        body_fat_pct: form.bodyFatPct,
        goal: form.goal,
      }).eq("id", profile.id);
      if (error) throw error;
      onProfileUpdated({
        ...profile,
        name: form.name,
        emoji: form.emoji,
        age: form.age,
        weightKg: form.weightKg,
        heightCm: form.heightCm,
        bodyFatPct: form.bodyFatPct,
        goal: form.goal,
      });
      setEditing(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const allTime = useMemo(() => {
    const totalVolume = sessions.reduce((sum, s) => sum + s.totalVolume, 0);

    // Weekly streak: consecutive Mon-start weeks with at least one session.
    // More honest than a daily streak for lifting, where rest days are planned.
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

    const first = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    const since = first ? parseISO(first.date) : parseISO(profile.createdAt);
    const weeks = Math.max(1, differenceInCalendarWeeks(new Date(), since, WEEK_OPTS) + 1);

    return { totalVolume, streak, since, weeks, count: sessions.length };
  }, [sessions, profile.createdAt]);

  const bodyweight = profile.weightKg ?? null;
  const hasMeasurements = MEASUREMENTS.some(({ key }) => profile[key] != null);

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
      {/* ── Identity ── */}
      <div className="rounded-3xl bg-card border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-muted flex items-center justify-center text-3xl">
            {profile.emoji}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 h-11 rounded-xl bg-muted text-foreground text-lg font-bold border border-border outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <>
                <h2 className="text-xl font-black text-foreground truncate">{profile.name}</h2>
                <p className="text-xs text-muted-foreground">
                  Training since {format(allTime.since, "MMMM yyyy")}
                </p>
              </>
            )}
          </div>
          {editing ? (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setEditing(false)} aria-label="Cancel"
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-muted text-muted-foreground active:scale-95 transition-transform">
                <X size={18} />
              </button>
              <button onClick={handleSave} disabled={saving} aria-label="Save"
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 active:scale-95 transition-transform">
                <Check size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)}
              className="shrink-0 flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-muted text-foreground text-sm font-semibold active:scale-95 transition-transform">
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* ── All time: the reward for showing up, so it leads ── */}
      <div className="rounded-3xl bg-card border border-border p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">All Time</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Dumbbell, label: "Sessions", value: allTime.count.toLocaleString() },
            { icon: Layers, label: "Volume lifted", value: `${Math.round(allTime.totalVolume / 1000).toLocaleString()}t` },
            { icon: Flame, label: "Week streak", value: String(allTime.streak) },
            { icon: CalendarDays, label: "Weeks training", value: String(allTime.weeks) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-muted p-3.5">
              <Icon size={16} className="text-muted-foreground mb-2" />
              <p className="text-xl font-black font-mono-display text-foreground leading-none">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body: paired with what it unlocks, so the numbers have a purpose ── */}
      <div className="rounded-3xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-1">
          <Ruler size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Body</h3>
        </div>

        {editing ? (
          <>
            <p className="text-[11px] text-muted-foreground mb-3">
              Weight unlocks your strength ratios. Body fat adds lean mass.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MEASUREMENTS.map(({ label, key, unit }) => (
                <div key={key} className="rounded-2xl bg-muted p-3">
                  <label className="text-[11px] text-muted-foreground block mb-1.5">{label} ({unit})</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form[key] ?? ""}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value ? Number(e.target.value) : null })}
                    placeholder="—"
                    className="w-full px-2 h-10 rounded-lg bg-background text-foreground font-bold font-mono-display text-center border border-border outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          </>
        ) : !hasMeasurements ? (
          // Empty state invites the one action that makes this section work,
          // rather than showing four meaningless dashes.
          <div className="mt-2">
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Add your weight to see how much you lift relative to bodyweight, and
              to let Max tailor its advice.
            </p>
            <button onClick={() => setEditing(true)}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <Plus size={16} /> Add measurements
            </button>
          </div>
        ) : (
          <>
            {/* Values read as one line rather than four separate tiles */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
              {MEASUREMENTS.filter(({ key }) => profile[key] != null).map(({ key, short }, i) => (
                <span key={key} className="flex items-center gap-2">
                  {i > 0 && <span className="text-border">·</span>}
                  <span className="text-base font-bold font-mono-display text-foreground">
                    {profile[key]}<span className="text-xs font-normal text-muted-foreground ml-0.5">{short}</span>
                  </span>
                </span>
              ))}
            </div>
            {leanMass != null && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Lean mass <span className="font-bold text-foreground">{leanMass} kg</span>
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Relative strength
              </p>
              {!bodyweight ? (
                <p className="text-sm text-muted-foreground py-2">
                  Add your weight above to unlock this.
                </p>
              ) : relativeStrength.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Log a compound lift to see your ratios.
                </p>
              ) : (
                <div className="space-y-2.5 mt-2">
                  {relativeStrength.map(({ name, weight, ratio }) => (
                    <div key={name}>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                        <span className="text-sm font-black font-mono-display text-primary shrink-0">
                          {ratio.toFixed(2)}×
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(100, (ratio / 2) * 100)}%` }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {weight}kg at {bodyweight}kg bodyweight
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Goal ── */}
      <div className="rounded-3xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Training goal</h3>
        </div>
        {editing ? (
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button key={g} onClick={() => setForm({ ...form, goal: g })}
                className={cn(
                  "h-10 px-3.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform",
                  form.goal === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                {g}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-lg font-bold text-foreground">{profile.goal || "Hypertrophy"}</p>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
