import { ANTERIOR_MUSCLE_POLYGONS, POSTERIOR_MUSCLE_POLYGONS } from "@/lib/muscleBodyMap";
import { cn } from "@/lib/utils";

const BODY = "#94A3B8";
const MUSCLE = "#EF4444";
const SEAM = "#64748B";

interface MuscleBodyDiagramProps {
  view: "anterior" | "posterior";
  highlight: string[];
  className?: string;
}

// Full-body silhouette (front or back) with the given muscle regions filled
// in the highlight color — the "which muscle does this work" reference.
const MuscleBodyDiagram = ({ view, highlight, className }: MuscleBodyDiagramProps) => {
  const data = view === "anterior" ? ANTERIOR_MUSCLE_POLYGONS : POSTERIOR_MUSCLE_POLYGONS;
  const viewBox = view === "anterior" ? "0 0 100 196" : "0 0 100 220";

  return (
    <svg viewBox={viewBox} className={cn("h-full w-auto", className)} xmlns="http://www.w3.org/2000/svg">
      {Object.entries(data).map(([muscle, polygons]) =>
        polygons.map((points, i) => (
          <polygon
            key={`${muscle}-${i}`}
            points={points}
            fill={highlight.includes(muscle) ? MUSCLE : BODY}
            stroke={SEAM}
            strokeWidth={0.5}
            strokeLinejoin="round"
          />
        ))
      )}
    </svg>
  );
};

export default MuscleBodyDiagram;
