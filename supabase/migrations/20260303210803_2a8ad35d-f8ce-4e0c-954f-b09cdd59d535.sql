
-- Profiles table (no auth, shared access)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💪',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete profiles" ON public.profiles FOR DELETE USING (true);

-- Routines table
CREATE TABLE public.routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read routines" ON public.routines FOR SELECT USING (true);
CREATE POLICY "Public insert routines" ON public.routines FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update routines" ON public.routines FOR UPDATE USING (true);
CREATE POLICY "Public delete routines" ON public.routines FOR DELETE USING (true);

-- Routine days
CREATE TABLE public.routine_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.routine_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read routine_days" ON public.routine_days FOR SELECT USING (true);
CREATE POLICY "Public insert routine_days" ON public.routine_days FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update routine_days" ON public.routine_days FOR UPDATE USING (true);
CREATE POLICY "Public delete routine_days" ON public.routine_days FOR DELETE USING (true);

-- Routine day exercises
CREATE TABLE public.routine_day_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_day_id UUID NOT NULL REFERENCES public.routine_days(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  muscle_group TEXT NOT NULL DEFAULT 'Other',
  sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.routine_day_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read routine_day_exercises" ON public.routine_day_exercises FOR SELECT USING (true);
CREATE POLICY "Public insert routine_day_exercises" ON public.routine_day_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update routine_day_exercises" ON public.routine_day_exercises FOR UPDATE USING (true);
CREATE POLICY "Public delete routine_day_exercises" ON public.routine_day_exercises FOR DELETE USING (true);

-- Workout sessions
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  routine_name TEXT NOT NULL,
  day_id UUID NOT NULL,
  day_label TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_volume NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read workout_sessions" ON public.workout_sessions FOR SELECT USING (true);
CREATE POLICY "Public insert workout_sessions" ON public.workout_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update workout_sessions" ON public.workout_sessions FOR UPDATE USING (true);
CREATE POLICY "Public delete workout_sessions" ON public.workout_sessions FOR DELETE USING (true);

-- Workout session exercises (logged data)
CREATE TABLE public.workout_session_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  series INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.workout_session_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read workout_session_exercises" ON public.workout_session_exercises FOR SELECT USING (true);
CREATE POLICY "Public insert workout_session_exercises" ON public.workout_session_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update workout_session_exercises" ON public.workout_session_exercises FOR UPDATE USING (true);
CREATE POLICY "Public delete workout_session_exercises" ON public.workout_session_exercises FOR DELETE USING (true);
