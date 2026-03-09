import { useState } from "react";
import { Routine, RoutineDay, Exercise } from "@/lib/types";
import { Plus, Trash2, X, Dumbbell, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import ExerciseSelector from "./ExerciseSelector";
import { getMuscleGroupForExercise } from "@/lib/exerciseLibrary";

interface RoutineManagerProps {
  routines: Routine[];
  onSave: (routine: Routine) => void;
  onUpdate: (routine: Routine) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  customExercises?: Record<string, string[]>;
  onAddCustomExercise?: (muscleGroup: string, exerciseName: string) => void;
}

const RoutineManager = ({ routines, onSave, onUpdate, onDelete, onClose, customExercises = {}, onAddCustomExercise }: RoutineManagerProps) => {
  const [name, setName] = useState("");
  const [days, setDays] = useState<RoutineDay[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingExerciseDayId, setAddingExerciseDayId] = useState<string | null>(null);

  const startEdit = (routine: Routine) => {
    setEditingId(routine.id);
    setName(routine.name);
    setDays(routine.days.map((d) => ({ ...d, exercises: [...d.exercises] })));
    setExpandedDay(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setDays([]);
    setExpandedDay(null);
  };

  const addDay = () => {
    const day: RoutineDay = { id: crypto.randomUUID(), label: `Day ${days.length + 1}`, exercises: [] };
    setDays((prev) => [...prev, day]);
    setExpandedDay(day.id);
  };

  const removeDay = (id: string) => setDays((prev) => prev.filter((d) => d.id !== id));

  const updateDayLabel = (dayId: string, label: string) =>
    setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, label } : d)));

  const addExerciseToDay = (dayId: string, exerciseName: string, muscleGroup: string, defaultReps?: number, defaultSets?: number, color?: string) => {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, exercises: [...d.exercises, { id: crypto.randomUUID(), name: exerciseName, muscleGroup, defaultReps: defaultReps || 10, defaultSets: defaultSets || 3, color: color || '#10b981' }] }
          : d
      )
    );
    setAddingExerciseDayId(null);
  };

  const removeExercise = (dayId: string, exId: string) =>
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d
      )
    );

  const updateExerciseDefaults = (dayId: string, exId: string, updates: Partial<Exercise>) =>
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...updates } : e)) }
          : d
      )
    );

  const saveRoutine = () => {
    if (!name.trim() || days.length === 0 || days.every((d) => d.exercises.length === 0)) return;
    if (editingId) {
      onUpdate({
        id: editingId,
        name: name.trim(),
        days,
        createdAt: routines.find((r) => r.id === editingId)?.createdAt || new Date().toISOString(),
      });
    } else {
      onSave({
        id: crypto.randomUUID(),
        name: name.trim(),
        days,
        createdAt: new Date().toISOString(),
      });
    }
    setName("");
    setDays([]);
    setExpandedDay(null);
    setEditingId(null);
  };

  const canSave = name.trim() && days.length > 0 && days.some((d) => d.exercises.length > 0);
  const isEditing = editingId !== null;

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Routines</h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-secondary text-secondary-foreground active:scale-95 transition-transform">
            <X size={20} />
          </button>
        </div>

        {/* Create / Edit routine */}
        <div className="bg-card rounded-xl p-5 border border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">{isEditing ? "Edit Routine" : "New Routine"}</h3>
            {isEditing && (
              <button onClick={cancelEdit} className="text-xs text-muted-foreground font-medium px-3 py-1 rounded-lg bg-secondary active:scale-95 transition-transform">
                Cancel
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Routine name (e.g. Build Up)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3.5 rounded-lg bg-input text-foreground placeholder:text-muted-foreground text-base font-medium border-0 outline-none focus:ring-2 focus:ring-primary mb-4"
          />

          {/* Days */}
          <div className="space-y-3 mb-4">
            {days.map((day) => {
              const isExpanded = expandedDay === day.id;
              return (
                <div key={day.id} className="bg-muted rounded-xl border border-border">
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day.id)}
                    className="w-full flex items-center justify-between p-3.5"
                  >
                    <span className="font-semibold text-sm text-foreground">{day.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{day.exercises.length} ex.</span>
                      {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 space-y-2">
                      <input
                        type="text"
                        value={day.label}
                        onChange={(e) => updateDayLabel(day.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background text-foreground text-sm font-medium border-0 outline-none focus:ring-2 focus:ring-primary mb-1"
                        placeholder="Day name..."
                      />

                      {/* Exercise cards */}
                      {day.exercises.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between px-3 py-3 rounded-xl bg-background border border-border" style={{ borderLeftWidth: 4, borderLeftColor: ex.color || '#10b981' }}>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                            <p className="text-xs text-muted-foreground">{ex.muscleGroup || getMuscleGroupForExercise(ex.name)}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">Reps:</span>
                                <input type="number" value={ex.defaultReps || 10} onChange={(e) => updateExerciseDefaults(day.id, ex.id, { defaultReps: parseInt(e.target.value) || 10 })} className="w-10 text-xs text-center font-semibold bg-muted rounded px-1 py-0.5 border-0 outline-none focus:ring-1 focus:ring-primary" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">Sets:</span>
                                <input type="number" value={ex.defaultSets || 3} onChange={(e) => updateExerciseDefaults(day.id, ex.id, { defaultSets: parseInt(e.target.value) || 3 })} className="w-10 text-xs text-center font-semibold bg-muted rounded px-1 py-0.5 border-0 outline-none focus:ring-1 focus:ring-primary" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">Color:</span>
                                <input type="color" value={ex.color || '#10b981'} onChange={(e) => updateExerciseDefaults(day.id, ex.id, { color: e.target.value })} className="w-5 h-5 rounded border-0 cursor-pointer" />
                              </div>
                            </div>
                          </div>
                          <button onClick={() => removeExercise(day.id, ex.id)} className="text-muted-foreground active:text-destructive p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      {/* Exercise Selector or Add button */}
                      {addingExerciseDayId === day.id ? (
                        <ExerciseSelector
                          onSelect={(name, muscleGroup) => addExerciseToDay(day.id, name, muscleGroup)}
                          onClose={() => setAddingExerciseDayId(null)}
                          customExercises={customExercises}
                          onAddCustomExercise={onAddCustomExercise}
                        />
                      ) : (
                        <button
                          onClick={() => setAddingExerciseDayId(day.id)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-semibold text-sm active:scale-[0.98] transition-transform"
                        >
                          <Plus size={16} />
                          Add Exercise
                        </button>
                      )}

                      <button onClick={() => removeDay(day.id)} className="w-full py-2 text-xs text-destructive font-medium active:opacity-70">
                        Remove Day
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={addDay} className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm mb-4 active:scale-[0.98] transition-transform">
            + Add Day
          </button>

          <button
            onClick={saveRoutine}
            disabled={!canSave}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-transform glow-emerald"
          >
            {isEditing ? "Update Routine" : "Save Routine"}
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
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(routine)} className="text-muted-foreground active:text-primary p-1">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => onDelete(routine.id)} className="text-muted-foreground active:text-destructive p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{routine.days.length} days</p>
              <div className="space-y-1.5">
                {routine.days.map((day) => (
                  <div key={day.id} className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary min-w-[42px]">{day.label}</span>
                    <div className="flex flex-wrap gap-1">
                      {day.exercises.map((ex) => (
                        <span key={ex.id} className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{ex.name}</span>
                      ))}
                    </div>
                  </div>
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
