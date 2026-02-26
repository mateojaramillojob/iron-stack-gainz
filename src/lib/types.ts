export interface Exercise {
  id: string;
  name: string;
}

export interface RoutineDay {
  id: string;
  label: string; // e.g. "Day 1", "Day 2"
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
