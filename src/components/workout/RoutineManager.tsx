import { useState } from "react";
import { Routine, Exercise } from "@/lib/types";
import { Plus, Trash2, X, Dumbbell } from "lucide-react";

interface RoutineManagerProps {
  routines: Routine[];
  onSave: (routine: Routine) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const RoutineManager = ({ routines, onSave, onDelete, onClose }: RoutineManagerProps) => {
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseName, setExerciseName] = useState("");

  const addExercise = () => {
    if (!exerciseName.trim()) return;
    setExercises((prev) => [...prev, { id: crypto.randomUUID(), name: exerciseName.trim() }]);
    setExerciseName("");
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const saveRoutine = () => {
    if (!name.trim() || exercises.length === 0) return;
    const routine: Routine = {
      id: crypto.randomUUID(),
      name: name.trim(),
      exercises,
      createdAt: new Date().toISOString(),
    };
    onSave(routine);
    setName("");
    setExercises([]);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Routines</h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-secondary text-secondary-foreground active:scale-95 transition-transform">
            <X size={20} />
          </button>
        </div>

        {/* Create new routine */}
        <div className="bg-card rounded-xl p-5 border border-border mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">New Routine</h3>
          <input
            type="text"
            placeholder="Routine name (e.g. Push Day)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3.5 rounded-lg bg-input text-foreground placeholder:text-muted-foreground text-base font-medium border-0 outline-none focus:ring-2 focus:ring-primary mb-4"
          />

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Add exercise..."
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExercise()}
              className="flex-1 px-4 py-3.5 rounded-lg bg-input text-foreground placeholder:text-muted-foreground text-base font-medium border-0 outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={addExercise} className="p-3.5 rounded-lg bg-primary text-primary-foreground active:scale-95 transition-transform">
              <Plus size={20} />
            </button>
          </div>

          {exercises.length > 0 && (
            <div className="space-y-2 mb-4">
              {exercises.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted">
                  <span className="text-sm font-medium text-foreground">{ex.name}</span>
                  <button onClick={() => removeExercise(ex.id)} className="text-muted-foreground active:text-destructive">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={saveRoutine}
            disabled={!name.trim() || exercises.length === 0}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-transform glow-emerald"
          >
            Save Routine
          </button>
        </div>

        {/* Existing routines */}
        <div className="space-y-3">
          {routines.map((routine) => (
            <div key={routine.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Dumbbell size={18} className="text-primary" />
                  <h4 className="text-base font-bold text-foreground">{routine.name}</h4>
                </div>
                <button onClick={() => onDelete(routine.id)} className="text-muted-foreground active:text-destructive p-1">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {routine.exercises.map((ex) => (
                  <span key={ex.id} className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-medium">{ex.name}</span>
                ))}
              </div>
            </div>
          ))}
          {routines.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No routines yet. Create one above!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutineManager;
