export interface MuscleGroup {
  id: string;
  label: string;
  emoji: string;
  exercises: string[];
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  {
    id: "glutes-hams",
    label: "Glutes / Hams",
    emoji: "🍑",
    exercises: [
      "Hip Thrusts",
      "RDLs",
      "Bulgarian Split Squats",
      "Cable Kickbacks",
      "Hamstring Curls",
      "Glute Bridge",
      "Cable Abductions",
    ],
  },
  {
    id: "shoulders",
    label: "Shoulders",
    emoji: "🛡️",
    exercises: [
      "Shoulder Press (DB)",
      "Shoulder Press (BB)",
      "Arnold Press",
      "Lateral Raises",
      "Rear Delt Fly",
      "Face Pulls",
    ],
  },
  {
    id: "back",
    label: "Back",
    emoji: "🛶",
    exercises: [
      "Lat Pulldown",
      "Chest-Supported Row",
      "Seated Cable Row",
      "Pull-Ups",
    ],
  },
  {
    id: "quads",
    label: "Quads",
    emoji: "🦵",
    exercises: [
      "Squats (BB)",
      "Squats (Machine)",
      "Leg Press",
      "Walking Lunges",
      "Step Ups",
      "Leg Extension",
    ],
  },
  {
    id: "chest",
    label: "Chest",
    emoji: "👕",
    exercises: [
      "Bench Press",
      "Incline DB Press",
      "Machine Chest Press",
    ],
  },
  {
    id: "arms",
    label: "Arms",
    emoji: "💪",
    exercises: [
      "Tricep Pushdowns",
      "Overhead Extensions",
      "Hammer Curls",
      "Bicep Curls",
    ],
  },
  {
    id: "core",
    label: "Core",
    emoji: "🧘",
    exercises: [
      "Hanging Leg Raises",
      "Russian Twists",
      "Cable Crunches",
      "Weighted Plank",
    ],
  },
];

export function getMuscleGroupForExercise(exerciseName: string): string {
  for (const group of MUSCLE_GROUPS) {
    if (group.exercises.includes(exerciseName)) return group.label;
  }
  return "Other";
}
