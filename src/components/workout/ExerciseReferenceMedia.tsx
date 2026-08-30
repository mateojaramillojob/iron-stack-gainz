import MuscleBodyDiagram from "./MuscleBodyDiagram";
import { getMuscleTargetFor } from "@/lib/exerciseMuscleMap";
import { cn } from "@/lib/utils";

interface ExerciseReferenceMediaProps {
  exerciseName: string;
  className?: string;
}

// The "how to perform this" visual — a full-body anatomy diagram with the
// primary muscle highlighted, rather than a stock photo.
const ExerciseReferenceMedia = ({ exerciseName, className }: ExerciseReferenceMediaProps) => {
  const { view, muscles } = getMuscleTargetFor(exerciseName);
  return (
    <div className={cn("w-full h-36 rounded-xl bg-muted/50 border border-border flex items-center justify-center py-3", className)}>
      <MuscleBodyDiagram view={view} highlight={muscles} className="h-full" />
    </div>
  );
};

export default ExerciseReferenceMedia;
