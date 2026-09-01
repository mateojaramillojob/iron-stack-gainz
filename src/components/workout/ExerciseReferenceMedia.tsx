import MuscleBodyDiagram from "./MuscleBodyDiagram";
import { getMuscleTargetFor } from "@/lib/exerciseMuscleMap";
import { getExercisePhoto } from "@/lib/exercisePhotos";
import { cn } from "@/lib/utils";

interface ExerciseReferenceMediaProps {
  exerciseName: string;
  className?: string;
}

// Matches the light background baked into the reference photos, so a photo
// letterboxed inside a taller frame still reads as one continuous panel.
const PHOTO_BG = "#E7E7E7";

// The "how to perform this" visual: a start/end reference photo where we have
// one, otherwise a body diagram highlighting the muscle the exercise trains.
const ExerciseReferenceMedia = ({ exerciseName, className }: ExerciseReferenceMediaProps) => {
  const photo = getExercisePhoto(exerciseName);
  const shape = "w-full aspect-[337/128]";

  if (photo) {
    return (
      <div
        className={cn("rounded-xl overflow-hidden border border-border flex items-center justify-center", shape, className)}
        style={{ backgroundColor: PHOTO_BG }}
      >
        <img
          src={photo}
          alt={`${exerciseName} — start and end position`}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  const { view, muscles } = getMuscleTargetFor(exerciseName);
  return (
    <div className={cn("rounded-xl bg-muted/50 border border-border flex items-center justify-center py-3", shape, className)}>
      <MuscleBodyDiagram view={view} highlight={muscles} className="h-full" />
    </div>
  );
};

export default ExerciseReferenceMedia;
