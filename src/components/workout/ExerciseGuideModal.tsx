import { getExerciseGuide, MUSCLE_GROUP_IMAGES } from "@/lib/exerciseGuides";
import { getMuscleGroupForExercise } from "@/lib/exerciseLibrary";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, Lightbulb } from "lucide-react";

interface ExerciseGuideModalProps {
  exerciseName: string | null;
  onClose: () => void;
}

const ExerciseGuideModal = ({ exerciseName, onClose }: ExerciseGuideModalProps) => {
  if (!exerciseName) return null;

  const guide = getExerciseGuide(exerciseName);
  const muscleGroup = getMuscleGroupForExercise(exerciseName);
  const emoji = MUSCLE_GROUP_IMAGES[muscleGroup] || "🏋️";

  return (
    <Dialog open={!!exerciseName} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-4xl">{emoji}</span>
            <div>
              <DialogTitle className="text-lg font-bold">{exerciseName}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">{muscleGroup}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* How-to */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Eye size={14} className="text-primary" />
              <h4 className="text-sm font-semibold text-foreground">How to perform</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{guide.description}</p>
          </div>

          {/* Tips */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb size={14} className="text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Tips</h4>
            </div>
            <ul className="space-y-1">
              {guide.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseGuideModal;
