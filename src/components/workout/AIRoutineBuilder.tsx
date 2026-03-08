import { useState } from "react";
import { Routine, RoutineDay } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ChevronRight, ChevronLeft, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface AIRoutineBuilderProps {
  onGenerated: (routine: Routine) => void;
  onClose: () => void;
}

const GOALS = ["Build Muscle", "Lose Weight", "Get Stronger", "Improve Endurance", "Tone Up"];
const EQUIPMENT_OPTIONS = ["Full Gym", "Home (Dumbbells Only)", "Home (Minimal)", "Calisthenics Only"];
const DAYS_OPTIONS = [2, 3, 4, 5, 6];
const FITNESS_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const FOCUS_AREAS = ["Glutes / Hams", "Shoulders", "Back", "Quads", "Chest", "Arms", "Core", "Full Body"];

type Step = 0 | 1 | 2 | 3 | 4;

const AIRoutineBuilder = ({ onGenerated, onClose }: AIRoutineBuilderProps) => {
  const [step, setStep] = useState<Step>(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [equipment, setEquipment] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleMulti = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const canNext = () => {
    switch (step) {
      case 0: return goals.length > 0;
      case 1: return !!equipment;
      case 2: return true;
      case 3: return !!fitnessLevel;
      case 4: return focusAreas.length > 0;
    }
  };

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-routine", {
        body: { goals, equipment, daysPerWeek, fitnessLevel, focusAreas },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const routine: Routine = {
        id: crypto.randomUUID(),
        name: data.name || "AI Generated Routine",
        days: (data.days || []).map((d: any, i: number) => ({
          id: crypto.randomUUID(),
          label: d.label || `Day ${i + 1}`,
          exercises: (d.exercises || []).map((ex: any) => ({
            id: crypto.randomUUID(),
            name: ex.name,
            muscleGroup: ex.muscleGroup || "Other",
            defaultReps: ex.defaultReps || 10,
            defaultSets: ex.defaultSets || 3,
          })),
        })),
        createdAt: new Date().toISOString(),
      };
      onGenerated(routine);
      toast.success("AI routine created!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to generate routine");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "What are your goals?",
      subtitle: "Select all that apply",
      content: (
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <button key={g} onClick={() => toggleMulti(goals, g, setGoals)}
              className={`px-4 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${
                goals.includes(g) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{g}</button>
          ))}
        </div>
      ),
    },
    {
      title: "Available equipment?",
      subtitle: "Pick one",
      content: (
        <div className="space-y-2">
          {EQUIPMENT_OPTIONS.map((e) => (
            <button key={e} onClick={() => setEquipment(e)}
              className={`w-full px-4 py-3.5 rounded-xl text-sm font-semibold text-left transition-all active:scale-[0.98] flex items-center justify-between ${
                equipment === e ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
              {e}
              {equipment === e && <Check size={16} />}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "How many days per week?",
      subtitle: "Choose your schedule",
      content: (
        <div className="flex gap-2 justify-center">
          {DAYS_OPTIONS.map((d) => (
            <button key={d} onClick={() => setDaysPerWeek(d)}
              className={`w-14 h-14 rounded-xl text-lg font-bold transition-all active:scale-95 ${
                daysPerWeek === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{d}</button>
          ))}
        </div>
      ),
    },
    {
      title: "Fitness level?",
      subtitle: "Be honest — we'll adjust volume accordingly",
      content: (
        <div className="space-y-2">
          {FITNESS_LEVELS.map((l) => (
            <button key={l} onClick={() => setFitnessLevel(l)}
              className={`w-full px-4 py-3.5 rounded-xl text-sm font-semibold text-left transition-all active:scale-[0.98] flex items-center justify-between ${
                fitnessLevel === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
              {l}
              {fitnessLevel === l && <Check size={16} />}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Focus areas?",
      subtitle: "Select all that apply",
      content: (
        <div className="grid grid-cols-2 gap-2">
          {FOCUS_AREAS.map((a) => (
            <button key={a} onClick={() => toggleMulti(focusAreas, a, setFocusAreas)}
              className={`px-4 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${
                focusAreas.includes(a) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{a}</button>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            <h2 className="text-xl font-bold text-foreground">AI Routine Builder</h2>
          </div>
          <button onClick={onClose} className="text-sm text-muted-foreground font-medium active:opacity-70">Cancel</button>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-foreground mb-1">{current.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{current.subtitle}</p>
          {current.content}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep((step - 1) as Step)}
              className="flex items-center gap-1 px-5 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-[0.98] transition-transform">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step < 4 ? (
            <button onClick={() => setStep((step + 1) as Step)} disabled={!canNext()}
              className="flex-1 flex items-center justify-center gap-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={generate} disabled={!canNext() || loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform glow-emerald">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate Routine</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIRoutineBuilder;
