export interface Exercise {
  id: string;
  name: string;
}

export interface Routine {
  id: string;
  name: string;
  exercises: Exercise[];
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
  date: string;
  exercises: ExerciseLog[];
  totalVolume: number;
}

export interface RecoveryLog {
  date: string;
  soreness: number;
}
