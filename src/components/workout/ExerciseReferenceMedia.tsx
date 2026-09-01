import MuscleBodyDiagram from "./MuscleBodyDiagram";
import { getMuscleTargetFor } from "@/lib/exerciseMuscleMap";
import { getExercisePhoto } from "@/lib/exercisePhotos";
import { cn } from "@/lib/utils";

interface ExerciseReferenceMediaProps {
  exerciseName: string;
  className?: string;
}

// The "how to perform this" visual: a start/end reference photo where we have
// one, otherwise a body diagram highlighting the muscle the exercise trains.
const ExerciseReferenceMedia = ({ exerciseName, className }: ExerciseReferenceMediaProps) => {
  const photo = getExercisePhoto(exerciseName);

  if (photo) {
    return (
      <img
        src={photo}
        alt={`${exerciseName} — start and end position`}
        className={cn("w-full aspect-[337/128] object-cover rounded-xl border border-border bg-muted", className)}
      />
    );
  }

  const { view, muscles } = getMuscleTargetFor(exerciseName);
  return (
    <div className={cn("w-full aspect-[337/128] rounded-xl bg-muted/50 border border-border flex items-center justify-center py-3", className)}>
      <MuscleBodyDiagram view={view} highlight={muscles} className="h-full" />
    </div>
  );
};

export default ExerciseReferenceMedia;
