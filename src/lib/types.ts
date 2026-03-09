export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
  defaultReps?: number;
  defaultSets?: number;
  color?: string;
}

export interface RoutineDay {
  id: string;
  label: string;
  exercises: Exercise[];
}

export interface Routine {
  id: string;
  name: string;
  days: RoutineDay[];
  createdAt: string;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  series: number;
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  routineName: string;
  dayId: string;
  dayLabel: string;
  date: string;
  exercises: ExerciseLog[];
  totalVolume: number;
}

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  age?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bodyFatPct?: number | null;
  goal?: string | null;
}
