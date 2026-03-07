import { useState } from "react";
import { MUSCLE_GROUPS } from "@/lib/exerciseLibrary";
import { ArrowLeft, Plus, Info, PenLine } from "lucide-react";
import ExerciseGuideModal from "./ExerciseGuideModal";

interface ExerciseSelectorProps {
  onSelect: (exerciseName: string, muscleGroup: string) => void;
  onClose: () => void;
  customExercises?: Record<string, string[]>;
  onAddCustomExercise?: (muscleGroup: string, exerciseName: string) => void;
}

const ExerciseSelector = ({ onSelect, onClose, customExercises = {}, onAddCustomExercise }: ExerciseSelectorProps) => {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [guideExercise, setGuideExercise] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");

  const group = MUSCLE_GROUPS.find((g) => g.id === selectedGroup);

  const handleAddCustom = () => {
    if (!customName.trim() || !group) return;
    onAddCustomExercise?.(group.label, customName.trim());
    onSelect(customName.trim(), group.label);
    setCustomName("");
    setShowCustomInput(false);
    setSelectedGroup(null);
  };

  if (group) {
    const extras = customExercises[group.label] || [];
    const allExercises = [...group.exercises, ...extras.filter((e) => !group.exercises.includes(e))];

    return (
      <div className="space-y-2">
        <button
          onClick={() => { setSelectedGroup(null); setShowCustomInput(false); }}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2 active:opacity-70"
        >
          <ArrowLeft size={16} />
          {group.emoji} {group.label}
        </button>
        <div className="space-y-1.5">
          {allExercises.map((ex) => (
            <div
              key={ex}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-background border border-border"
            >
              <button
                onClick={() => {
                  onSelect(ex, group.label);
                  setSelectedGroup(null);
                }}
                className="flex-1 text-left active:scale-[0.98] transition-transform"
              >
                <span className="text-sm font-medium text-foreground">{ex}</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setGuideExercise(ex); }}
                  className="p-1 rounded-md text-muted-foreground hover:text-primary transition-colors"
                >
                  <Info size={16} />
                </button>
                <button
                  onClick={() => {
                    onSelect(ex, group.label);
                    setSelectedGroup(null);
                  }}
                  className="text-primary"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Custom exercise input */}
        {showCustomInput ? (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Exercise name..."
              className="flex-1 px-3 py-2.5 rounded-lg bg-background text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
            />
            <button
              onClick={handleAddCustom}
              disabled={!customName.trim()}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomInput(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-[0.98] transition-transform mt-1"
          >
            <PenLine size={14} />
            Add Custom Exercise
          </button>
        )}

        <ExerciseGuideModal exerciseName={guideExercise} onClose={() => setGuideExercise(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
        Select Muscle Group
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MUSCLE_GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGroup(g.id)}
            className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-background border border-border active:scale-[0.97] transition-transform"
          >
            <span className="text-2xl">{g.emoji}</span>
            <span className="text-xs font-semibold text-foreground">{g.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onClose}
        className="w-full py-2 text-xs text-muted-foreground font-medium active:opacity-70 mt-1"
      >
        Cancel
      </button>
    </div>
  );
};

export default ExerciseSelector;
