// Exercise variant groups — switching within a group preserves "intent" but tracks
// each variant's history independently (PRs and last-session lookups are by name).
export const VARIANT_GROUPS: string[][] = [
  ["Shoulder Press (DB)", "Shoulder Press (BB)", "Arnold Press", "Machine Shoulder Press"],
  ["Squats (BB)", "Squats (Machine)", "Hack Squat", "Leg Press"],
  ["Bench Press", "Incline DB Press", "Incline BB Press", "Machine Chest Press", "Incline Machine Press"],
  ["Lat Pulldown", "Pull-Ups", "Assisted Pull-Ups"],
  ["Chest-Supported Row", "Seated Cable Row", "Bent-Over Row (BB)", "T-Bar Row"],
  ["RDLs", "Hamstring Curls", "Seated Leg Curl", "Nordic Curls"],
  ["Hip Thrusts", "Glute Bridge", "Machine Hip Thrust"],
  ["Bicep Curls", "Hammer Curls", "Preacher Curls", "Cable Curls"],
  ["Tricep Pushdowns", "Overhead Extensions", "Skullcrushers", "Dips"],
  ["Lateral Raises", "Cable Lateral Raises", "Machine Lateral Raises"],
];

export function getVariantsFor(exerciseName: string): string[] {
  const group = VARIANT_GROUPS.find((g) => g.includes(exerciseName));
  return group ? group.filter((n) => n !== exerciseName) : [];
}

export const MOTIVATION_QUOTES: { title: string; quote: string }[] = [
  { title: "Beast Mode Activated", quote: "The only bad workout is the one that didn't happen. You're already winning." },
  { title: "You're Built Different", quote: "Pain is weakness leaving the body. Embrace it." },
  { title: "Iron Sharpens Iron", quote: "Every rep is a vote for the person you're becoming." },
  { title: "Don't Stop Now", quote: "The body achieves what the mind believes. Push one more." },
  { title: "PR Loading…", quote: "Strength isn't given. It's taken — one set at a time." },
  { title: "Stay Hungry", quote: "Champions train, losers complain. Which one are you today?" },
  { title: "Trust the Process", quote: "Discipline is choosing what you want most over what you want now." },
  { title: "Fire It Up", quote: "Your only competition is the person you were yesterday." },
  { title: "Grind Mode", quote: "Sweat is just fat crying. Make it weep." },
  { title: "Keep Going", quote: "The last 3 reps are where champions are made." },
];

export function randomMotivation() {
  return MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
}