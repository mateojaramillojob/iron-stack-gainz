
CREATE TABLE public.muscle_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  last_free_question_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.muscle_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read muscle_credits" ON public.muscle_credits FOR SELECT TO public USING (true);
CREATE POLICY "Public insert muscle_credits" ON public.muscle_credits FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update muscle_credits" ON public.muscle_credits FOR UPDATE TO public USING (true);

CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read credit_transactions" ON public.credit_transactions FOR SELECT TO public USING (true);
CREATE POLICY "Public insert credit_transactions" ON public.credit_transactions FOR INSERT TO public WITH CHECK (true);
