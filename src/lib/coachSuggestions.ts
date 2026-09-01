import { WorkoutSession } from "@/lib/types";
import { calculateVolume } from "@/lib/calculations";
import { getMuscleGroupForExercise } from "@/lib/exerciseLibrary";
import { differenceInDays, parseISO } from "date-fns";

export interface CoachSuggestion {
  label: string;
  prompt: string;
}

interface BuildOptions {
  nextDayLabel?: string;
  nextExercises?: string[];
}

// Per-exercise history, oldest first, of the best set that day.
function exerciseHistory(sessions: WorkoutSession[]) {
  const byName: Record<string, { date: string; weight: number }[]> = {};
  [...sessions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((s) =>
      s.exercises.forEach((e) => {
        const list = (byName[e.exerciseName] ||= []);
        const existing = list.find((x) => x.date === s.date);
        if (existing) existing.weight = Math.max(existing.weight, e.weight);
        else list.push({ date: s.date, weight: e.weight });
      })
    );
  return byName;
}

// An exercise is "stalled" when its best weight hasn't improved across the last
// 3+ times it was trained — the single most useful thing to ask a coach about.
function findStalledLift(history: ReturnType<typeof exerciseHistory>) {
  let best: { name: string; weight: number; times: number } | null = null;
  for (const [name, entries] of Object.entries(history)) {
    if (entries.length < 3) continue;
    const allTimeMax = Math.max(...entries.map((e) => e.weight));
    const recent = entries.slice(-3);
    const improvedRecently = recent.some((e, i) => i > 0 && e.weight > recent[i - 1].weight);
    const atCeiling = recent.every((e) => e.weight <= allTimeMax);
    if (!improvedRecently && atCeiling && recent[0].weight > 0) {
      const stuckAt = recent[recent.length - 1].weight;
      if (!best || stuckAt > best.weight) best = { name, weight: stuckAt, times: recent.length };
    }
  }
  return best;
}

function findRecentPR(sessions: WorkoutSession[], history: ReturnType<typeof exerciseHistory>) {
  const now = new Date();
  let best: { name: string; weight: number } | null = null;
  for (const [name, entries] of Object.entries(history)) {
    if (entries.length < 2) continue;
    const last = entries[entries.length - 1];
    if (differenceInDays(now, parseISO(last.date)) > 14) continue;
    const priorMax = Math.max(...entries.slice(0, -1).map((e) => e.weight));
    if (last.weight > priorMax && (!best || last.weight > best.weight)) {
      best = { name, weight: last.weight };
    }
  }
  return best;
}

function muscleGroupVolume(sessions: WorkoutSession[], days: number) {
  const now = new Date();
  const totals: Record<string, number> = {};
  sessions
    .filter((s) => differenceInDays(now, parseISO(s.date)) <= days)
    .flatMap((s) => s.exercises)
    .forEach((e) => {
      const group = getMuscleGroupForExercise(e.exerciseName);
      if (group === "Other") return;
      totals[group] = (totals[group] || 0) + calculateVolume(e.weight, e.reps, e.series);
    });
  return totals;
}

export function buildCoachSuggestions(
  sessions: WorkoutSession[],
  { nextDayLabel, nextExercises }: BuildOptions = {}
): CoachSuggestion[] {
  const suggestions: CoachSuggestion[] = [];

  // Cold start — nothing logged yet.
  if (sessions.length === 0) {
    return [
      { label: "Build me a beginner plan", prompt: "I'm just starting out. Build me a simple 3-day full-body plan and explain how to pick starting weights." },
      { label: "How many sets should I do?", prompt: "How many sets and reps per muscle group should I do each week to build muscle?" },
      { label: "How fast should I add weight?", prompt: "How quickly should I add weight to a lift, and how do I know when I'm ready?" },
    ];
  }

  const history = exerciseHistory(sessions);

  // 1. Today's session — most actionable thing in the app.
  if (nextDayLabel && nextExercises?.length) {
    suggestions.push({
      label: `Plan my ${nextDayLabel}`,
      prompt: `My next session is ${nextDayLabel}: ${nextExercises.join(", ")}. Based on my recent logs, tell me what weight and reps to target for each exercise today.`,
    });
  }

  // 2. A lift that has stopped moving.
  const stalled = findStalledLift(history);
  if (stalled) {
    suggestions.push({
      label: `${stalled.name} is stuck at ${stalled.weight}kg`,
      prompt: `My ${stalled.name} has been stuck around ${stalled.weight}kg for my last ${stalled.times} sessions. Why might that be, and what should I change to break through it?`,
    });
  }

  // 3. A PR worth building on.
  const pr = findRecentPR(sessions, history);
  if (pr) {
    suggestions.push({
      label: `I hit ${pr.weight}kg on ${pr.name}`,
      prompt: `I just hit a new best of ${pr.weight}kg on ${pr.name}. How should I progress it from here without stalling or getting injured?`,
    });
  }

  // 4. An under-trained muscle group.
  const volumes = muscleGroupVolume(sessions, 30);
  const ranked = Object.entries(volumes).sort(([, a], [, b]) => a - b);
  if (ranked.length >= 3) {
    const [lowest] = ranked[0];
    const [highest] = ranked[ranked.length - 1];
    suggestions.push({
      label: `Am I neglecting ${lowest}?`,
      prompt: `Over the last 30 days my highest-volume muscle group is ${highest} and my lowest is ${lowest}. Is my training balanced, and how should I adjust it?`,
    });
  }

  // 5. Always useful, and keeps the list full when data is thin.
  suggestions.push(
    { label: "Review my last 30 days", prompt: "Review my last 30 days of training. What's improving, what's slipping, and what should I focus on next?" },
    { label: "A machine is taken — swap?", prompt: "If a machine I need is busy, give me a good substitute for each exercise in my current routine." },
    { label: "I'm sore today", prompt: "I'm sore today. Should I train through it, and how should I modify my session?" },
  );

  return suggestions.slice(0, 5);
}
