export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function calculateVolume(weight: number, reps: number, series: number): number {
  return weight * reps * series;
}

export function calculateSessionVolume(exercises: { weight: number; reps: number; series: number }[]): number {
  return exercises.reduce((total, ex) => total + calculateVolume(ex.weight, ex.reps, ex.series), 0);
}
