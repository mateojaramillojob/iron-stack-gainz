import { useState, useEffect } from "react";
import { Profile } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { User, Ruler, Weight, Target, Pencil, Check, X, Activity, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface ProfileViewProps {
  profile: Profile;
  onProfileUpdated: (profile: Profile) => void;
}

const GOALS = ["Hypertrophy", "Strength", "Endurance", "Weight Loss", "General Fitness", "Powerlifting"];

const ProfileView = ({ profile, onProfileUpdated }: ProfileViewProps) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: profile.name,
    emoji: profile.emoji,
    age: profile.age || null as number | null,
    weightKg: profile.weightKg || null as number | null,
    heightCm: profile.heightCm || null as number | null,
    bodyFatPct: profile.bodyFatPct || null as number | null,
    goal: profile.goal || "Hypertrophy",
  });

  useEffect(() => {
    setForm({
      name: profile.name,
      emoji: profile.emoji,
      age: profile.age || null,
      weightKg: profile.weightKg || null,
      heightCm: profile.heightCm || null,
      bodyFatPct: profile.bodyFatPct || null,
      goal: profile.goal || "Hypertrophy",
    });
  }, [profile]);

  const handleSave = async () => {
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
      toast.success("Profile updated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to save profile");
    }
  };

  const StatCard = ({ icon: Icon, label, value, unit }: { icon: any; label: string; value: number | null; unit: string }) => (
    <div className="bg-muted/50 rounded-xl p-4 flex flex-col items-center gap-1">
      <Icon size={18} className="text-primary" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-bold font-mono-display text-foreground">
        {value != null ? value : "—"}
      </span>
      <span className="text-[10px] text-muted-foreground">{unit}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Card 1: Identity */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
            {profile.emoji}
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted text-foreground text-lg font-bold border-0 outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <>
                <h2 className="text-xl font-black text-foreground">{profile.name}</h2>
                <p className="text-xs text-muted-foreground">Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
              </>
            )}
          </div>
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="p-2 rounded-lg bg-muted text-muted-foreground active:scale-95">
                <X size={18} />
              </button>
              <button onClick={handleSave} className="p-2 rounded-lg bg-primary text-primary-foreground active:scale-95">
                <Check size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="p-2 rounded-lg bg-muted text-muted-foreground active:scale-95">
              <Pencil size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Card 2: Body — feeds relative-strength and lean-mass below, and gives
          the AI coach context when it recommends weights. */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Body</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Used for your strength ratios and to give Max better advice.
        </p>
        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Age", key: "age" as const, unit: "years", type: "number" },
              { label: "Weight", key: "weightKg" as const, unit: "kg", type: "number" },
              { label: "Height", key: "heightCm" as const, unit: "cm", type: "number" },
              { label: "Body Fat", key: "bodyFatPct" as const, unit: "%", type: "number" },
            ].map(({ label, key, unit }) => (
              <div key={key} className="bg-muted/50 rounded-xl p-3">
                <label className="text-xs text-muted-foreground block mb-1">{label} ({unit})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form[key] ?? ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-2 py-1.5 rounded-lg bg-background text-foreground font-bold font-mono-display text-center border-0 outline-none focus:ring-2 focus:ring-primary"
                  placeholder="—"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={User} label="Age" value={profile.age ?? null} unit="years" />
            <StatCard icon={Weight} label="Weight" value={profile.weightKg ?? null} unit="kg" />
            <StatCard icon={Ruler} label="Height" value={profile.heightCm ?? null} unit="cm" />
            <StatCard icon={TrendingUp} label="Body Fat" value={profile.bodyFatPct ?? null} unit="%" />
          </div>
        )}
      </div>

      {/* Card 3: Goals */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Goal</h3>
        </div>
        {editing ? (
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                onClick={() => setForm({ ...form, goal: g })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors active:scale-95 ${
                  form.goal === g
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-primary/10 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Target size={20} className="text-primary-foreground" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{profile.goal || "Hypertrophy"}</p>
              <p className="text-xs text-muted-foreground">Active training focus</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
