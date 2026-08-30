export interface ExerciseMuscleTarget {
  view: "anterior" | "posterior";
  muscles: string[];
}

export const EXERCISE_MUSCLE_TARGETS: Record<string, ExerciseMuscleTarget> = {
  // Glutes / Hams
  "Hip Thrusts": { view: "posterior", muscles: ["GLUTEAL"] },
  "RDLs": { view: "posterior", muscles: ["HAMSTRING"] },
  "Bulgarian Split Squats": { view: "anterior", muscles: ["QUADRICEPS"] },
  "Cable Kickbacks": { view: "posterior", muscles: ["GLUTEAL"] },
  "Hamstring Curls": { view: "posterior", muscles: ["HAMSTRING"] },
  "Glute Bridge": { view: "posterior", muscles: ["GLUTEAL"] },
  "Cable Abductions": { view: "posterior", muscles: ["ABDUCTOR"] },
  // Shoulders
  "Shoulder Press (DB)": { view: "anterior", muscles: ["FRONT_DELTOIDS"] },
  "Shoulder Press (BB)": { view: "anterior", muscles: ["FRONT_DELTOIDS"] },
  "Arnold Press": { view: "anterior", muscles: ["FRONT_DELTOIDS"] },
  "Lateral Raises": { view: "anterior", muscles: ["FRONT_DELTOIDS"] },
  "Rear Delt Fly": { view: "posterior", muscles: ["BACK_DELTOIDS"] },
  "Face Pulls": { view: "posterior", muscles: ["BACK_DELTOIDS", "TRAPEZIUS"] },
  // Back
  "Lat Pulldown": { view: "posterior", muscles: ["UPPER_BACK"] },
  "Chest-Supported Row": { view: "posterior", muscles: ["UPPER_BACK"] },
  "Seated Cable Row": { view: "posterior", muscles: ["UPPER_BACK"] },
  "Pull-Ups": { view: "posterior", muscles: ["UPPER_BACK"] },
  // Quads
  "Squats (BB)": { view: "anterior", muscles: ["QUADRICEPS"] },
  "Squats (Machine)": { view: "anterior", muscles: ["QUADRICEPS"] },
  "Leg Press": { view: "anterior", muscles: ["QUADRICEPS"] },
  "Walking Lunges": { view: "anterior", muscles: ["QUADRICEPS"] },
  "Step Ups": { view: "anterior", muscles: ["QUADRICEPS"] },
  "Leg Extension": { view: "anterior", muscles: ["QUADRICEPS"] },
  // Chest
  "Bench Press": { view: "anterior", muscles: ["CHEST"] },
  "Incline DB Press": { view: "anterior", muscles: ["CHEST"] },
  "Machine Chest Press": { view: "anterior", muscles: ["CHEST"] },
  // Arms
  "Tricep Pushdowns": { view: "anterior", muscles: ["TRICEPS"] },
  "Overhead Extensions": { view: "anterior", muscles: ["TRICEPS"] },
  "Hammer Curls": { view: "anterior", muscles: ["BICEPS"] },
  "Bicep Curls": { view: "anterior", muscles: ["BICEPS"] },
  // Core
  "Hanging Leg Raises": { view: "anterior", muscles: ["ABS"] },
  "Russian Twists": { view: "anterior", muscles: ["OBLIQUES"] },
  "Cable Crunches": { view: "anterior", muscles: ["ABS"] },
  "Weighted Plank": { view: "anterior", muscles: ["ABS"] },
};

export function getMuscleTargetFor(exerciseName: string): ExerciseMuscleTarget {
  return EXERCISE_MUSCLE_TARGETS[exerciseName] || { view: "anterior", muscles: [] };
}
