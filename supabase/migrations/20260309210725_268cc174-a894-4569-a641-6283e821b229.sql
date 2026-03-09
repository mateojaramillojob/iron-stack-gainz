ALTER TABLE public.routine_day_exercises
  ADD COLUMN default_reps integer NOT NULL DEFAULT 10,
  ADD COLUMN default_sets integer NOT NULL DEFAULT 3,
  ADD COLUMN color text NOT NULL DEFAULT '#10b981';