import { useState } from "react";
import { MUSCLE_GROUPS } from "@/lib/exerciseLibrary";
import { ArrowLeft, Plus } from "lucide-react";

interface ExerciseSelectorProps {
  onSelect: (exerciseName: string, muscleGroup: string) => void;
  onClose: () => void;
}

const ExerciseSelector = ({ onSelect, onClose }: ExerciseSelectorProps) => {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const group = MUSCLE_GROUPS.find((g) => g.id === selectedGroup);

  if (group) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setSelectedGroup(null)}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2 active:opacity-70"
        >
          <ArrowLeft size={16} />
          {group.emoji} {group.label}
        </button>
        <div className="space-y-1.5">
          {group.exercises.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                onSelect(ex, group.label);
                setSelectedGroup(null);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-background border border-border text-left active:scale-[0.98] transition-transform"
            >
              <span className="text-sm font-medium text-foreground">{ex}</span>
              <Plus size={16} className="text-primary" />
            </button>
          ))}
        </div>
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
