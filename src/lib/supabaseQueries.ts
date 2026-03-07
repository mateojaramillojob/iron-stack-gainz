import { supabase } from "@/integrations/supabase/client";
import type { Profile, Routine, RoutineDay, Exercise, WorkoutSession, ExerciseLog } from "@/lib/types";

// ── Profiles ──

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    createdAt: p.created_at,
  }));
}

export async function insertProfile(profile: Profile) {
  const { error } = await supabase.from("profiles").insert({
    id: profile.id,
    name: profile.name,
    emoji: profile.emoji,
  });
  if (error) throw error;
}

export async function deleteProfileById(id: string) {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

// ── Routines ──

export async function fetchRoutinesForProfile(profileId: string): Promise<Routine[]> {
  const { data: routineRows, error: rErr } = await supabase
    .from("routines")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at");
  if (rErr) throw rErr;
  if (!routineRows?.length) return [];

  const routineIds = routineRows.map((r) => r.id);

  const { data: dayRows, error: dErr } = await supabase
    .from("routine_days")
    .select("*")
    .in("routine_id", routineIds)
    .order("sort_order");
  if (dErr) throw dErr;

  const dayIds = (dayRows || []).map((d) => d.id);
  let exRows: any[] = [];
  if (dayIds.length) {
    const { data, error: eErr } = await supabase
      .from("routine_day_exercises")
      .select("*")
      .in("routine_day_id", dayIds)
      .order("sort_order");
    if (eErr) throw eErr;
    exRows = data || [];
  }

  return routineRows.map((r) => {
    const days: RoutineDay[] = (dayRows || [])
      .filter((d) => d.routine_id === r.id)
      .map((d) => ({
        id: d.id,
        label: d.label,
        exercises: exRows
          .filter((e) => e.routine_day_id === d.id)
          .map((e) => ({ id: e.id, name: e.exercise_name, muscleGroup: e.muscle_group })),
      }));
    return { id: r.id, name: r.name, days, createdAt: r.created_at };
  });
}

export async function upsertRoutine(profileId: string, routine: Routine) {
  // Upsert routine row
  const { error: rErr } = await supabase.from("routines").upsert({
    id: routine.id,
    profile_id: profileId,
    name: routine.name,
  });
  if (rErr) throw rErr;

  // Delete old days (cascade deletes exercises)
  await supabase.from("routine_days").delete().eq("routine_id", routine.id);

  // Insert days and exercises
  for (let i = 0; i < routine.days.length; i++) {
    const day = routine.days[i];
    const { error: dErr } = await supabase.from("routine_days").insert({
      id: day.id,
      routine_id: routine.id,
      label: day.label,
      sort_order: i,
    });
    if (dErr) throw dErr;

    if (day.exercises.length) {
      const { error: eErr } = await supabase.from("routine_day_exercises").insert(
        day.exercises.map((ex, j) => ({
          id: ex.id,
          routine_day_id: day.id,
          exercise_name: ex.name,
          muscle_group: (ex as any).muscleGroup || "Other",
          sort_order: j,
        }))
      );
      if (eErr) throw eErr;
    }
  }
}

export async function deleteRoutineById(id: string) {
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) throw error;
}

// ── Sessions ──

export async function fetchSessionsForProfile(profileId: string): Promise<WorkoutSession[]> {
  const { data: sessionRows, error: sErr } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("profile_id", profileId)
    .order("date", { ascending: false });
  if (sErr) throw sErr;
  if (!sessionRows?.length) return [];

  const sessionIds = sessionRows.map((s) => s.id);
  const { data: exRows, error: eErr } = await supabase
    .from("workout_session_exercises")
    .select("*")
    .in("session_id", sessionIds);
  if (eErr) throw eErr;

  return sessionRows.map((s) => ({
    id: s.id,
    routineId: s.routine_id,
    routineName: s.routine_name,
    dayId: s.day_id,
    dayLabel: s.day_label,
    date: s.date,
    totalVolume: Number(s.total_volume),
    exercises: (exRows || [])
      .filter((e) => e.session_id === s.id)
      .map((e) => ({
        exerciseId: e.exercise_id,
        exerciseName: e.exercise_name,
        weight: Number(e.weight),
        reps: e.reps,
        series: e.series,
      })),
  }));
}

// ── Custom Exercises ──

export async function fetchCustomExercises(profileId: string): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from("custom_exercises")
    .select("*")
    .eq("profile_id", profileId);
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const row of data || []) {
    if (!map[row.muscle_group]) map[row.muscle_group] = [];
    map[row.muscle_group].push(row.exercise_name);
  }
  return map;
}

export async function insertCustomExercise(profileId: string, muscleGroup: string, exerciseName: string) {
  const { error } = await supabase.from("custom_exercises").upsert({
    profile_id: profileId,
    muscle_group: muscleGroup,
    exercise_name: exerciseName,
  }, { onConflict: "profile_id,muscle_group,exercise_name" });
  if (error) throw error;
}

// ── Sessions ──

export async function upsertSession(profileId: string, session: WorkoutSession) {
  const { error: sErr } = await supabase.from("workout_sessions").upsert({
    id: session.id,
    profile_id: profileId,
    routine_id: session.routineId,
    routine_name: session.routineName,
    day_id: session.dayId,
    day_label: session.dayLabel,
    date: session.date,
    total_volume: session.totalVolume,
  });
  if (sErr) throw sErr;

  // Replace exercises
  await supabase.from("workout_session_exercises").delete().eq("session_id", session.id);
  if (session.exercises.length) {
    const { error: eErr } = await supabase.from("workout_session_exercises").insert(
      session.exercises.map((e) => ({
        session_id: session.id,
        exercise_id: e.exerciseId,
        exercise_name: e.exerciseName,
        weight: e.weight,
        reps: e.reps,
        series: e.series,
      }))
    );
    if (eErr) throw eErr;
  }
}
