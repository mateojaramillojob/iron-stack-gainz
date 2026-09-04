import { RoutineDay } from "@/lib/types";
import { getMuscleGroupForExercise } from "@/lib/exerciseLibrary";

const DEFAULT_LABEL = /^\s*day\s*\d+\s*$/i;

// Shorter forms so a two-group name still fits on one line on a phone.
const SHORT_NAME: Record<string, string> = {
  "Glutes / Hams": "Glutes",
  Shoulders: "Shoulders",
  Back: "Back",
  Quads: "Legs",
  Chest: "Chest",
  Arms: "Arms",
  Core: "Core",
};

function groupsByVolume(day: RoutineDay): string[] {
  const counts: Record<string, number> = {};
  day.exercises.forEach((ex) => {
    const group = ex.muscleGroup || getMuscleGroupForExercise(ex.name);
    if (!group || group === "Other") return;
    counts[group] = (counts[group] || 0) + 1;
  });
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([g]) => SHORT_NAME[g] || g);
}

/**
 * A day called "Day 3" says nothing about what you're about to train, so
 * derive a name from what it actually contains. A label the user typed
 * themselves always wins.
 */
export function getDayName(day: RoutineDay): string {
  if (day.label && !DEFAULT_LABEL.test(day.label)) return day.label;

  const groups = groupsByVolume(day);
  if (groups.length === 0) return day.label || "Workout";
  if (groups.length === 1) return groups[0];
  // Three or more groups that are all upper body reads better as one word.
  const [first, second] = groups;
  return `${first} & ${second}`;
}

/** The original label, shown as secondary text when the name was derived. */
export function getDaySubtitle(day: RoutineDay): string | null {
  if (!day.label || !DEFAULT_LABEL.test(day.label)) return null;
  return day.label.trim();
}
