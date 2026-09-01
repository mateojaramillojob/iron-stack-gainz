// Reference photos showing the start/end position of each exercise, cropped
// from the AI-generated exercise-library charts in public/exercise-photos.
// Exercises without a photo fall back to the muscle-highlight body diagram.
const EXERCISE_PHOTO_SLUGS: Record<string, string> = {
  // Back
  "Lat Pulldown": "lat-pulldown",
  "Seated Cable Row": "seated-cable-row",
  "Chest-Supported Row": "chest-supported-row",
  "Pull-Ups": "pull-ups",
  // Quads
  "Squats (BB)": "squats-bb",
  "Leg Press": "leg-press",
  "Leg Extension": "leg-extension",
  "Walking Lunges": "walking-lunges",
  // Glutes / Hams
  "RDLs": "rdls",
  "Hamstring Curls": "hamstring-curls",
  "Hip Thrusts": "hip-thrusts",
  "Bulgarian Split Squats": "bulgarian-split-squats",
  "Cable Abductions": "cable-abductions",
  // Shoulders
  "Shoulder Press (BB)": "shoulder-press-bb",
  "Lateral Raises": "lateral-raises",
  "Rear Delt Fly": "rear-delt-fly",
  "Face Pulls": "face-pulls",
  // Arms
  "Bicep Curls": "bicep-curls",
  "Tricep Pushdowns": "tricep-pushdowns",
  "Overhead Extensions": "overhead-extensions",
  // Core
  "Hanging Leg Raises": "hanging-leg-raises",
  "Russian Twists": "russian-twists",
  "Cable Crunches": "cable-crunches",

  // Custom exercises reusing the same movement pattern under different loading
  "Calf raises": "calf-raises",
  "Squats": "squats-bb",
  "Assisted Pull-Ups": "pull-ups",
  "Machine Lateral Raises": "lateral-raises",
  "Machine Shoulder Press": "shoulder-press-bb",
};

export function getExercisePhoto(exerciseName: string): string | null {
  const slug = EXERCISE_PHOTO_SLUGS[exerciseName];
  return slug ? `${import.meta.env.BASE_URL}exercise-photos/${slug}.jpg` : null;
}
