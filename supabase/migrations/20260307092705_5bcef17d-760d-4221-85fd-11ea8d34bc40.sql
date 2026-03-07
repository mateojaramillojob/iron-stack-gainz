CREATE TABLE public.custom_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muscle_group TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, muscle_group, exercise_name)
);

ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read custom exercises" ON public.custom_exercises FOR SELECT USING (true);
CREATE POLICY "Anyone can insert custom exercises" ON public.custom_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete custom exercises" ON public.custom_exercises FOR DELETE USING (true);