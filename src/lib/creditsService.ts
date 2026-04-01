import { supabase } from "@/integrations/supabase/client";
import { WorkoutSession } from "@/lib/types";

export interface MuscleCredits {
  id: string;
  profileId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastFreeQuestionDate: string | null;
}

export async function fetchCredits(profileId: string): Promise<MuscleCredits> {
  const { data, error } = await supabase
    .from("muscle_credits")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // Create initial record
    const { data: created, error: cErr } = await supabase
      .from("muscle_credits")
      .insert({ profile_id: profileId, balance: 50, total_earned: 50 })
      .select()
      .single();
    if (cErr) throw cErr;
    return mapRow(created);
  }
  return mapRow(data);
}

function mapRow(r: any): MuscleCredits {
  return {
    id: r.id,
    profileId: r.profile_id,
    balance: r.balance,
    totalEarned: r.total_earned,
    totalSpent: r.total_spent,
    lastFreeQuestionDate: r.last_free_question_date,
  };
}

export function calculateSessionCredits(
  session: WorkoutSession,
  allSessions: WorkoutSession[],
  hasPR: boolean,
): { total: number; breakdown: { label: string; amount: number }[] } {
  const breakdown: { label: string; amount: number }[] = [];

  // Base: 1 credit per 500 kg volume
  const volumeCredits = Math.max(1, Math.floor(session.totalVolume / 500));
  breakdown.push({ label: "Volume bonus", amount: volumeCredits });

  // Streak bonus: check consecutive days with sessions
  const today = new Date(session.date).toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const hadYesterday = allSessions.some(
    (s) => new Date(s.date).toDateString() === yesterday && s.id !== session.id,
  );
  if (hadYesterday) {
    breakdown.push({ label: "Streak bonus", amount: 5 });
  }

  // PR bonus
  if (hasPR) {
    breakdown.push({ label: "🏆 PR broken!", amount: 10 });
  }

  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  return { total, breakdown };
}

export async function earnCredits(profileId: string, amount: number, type: string, description: string) {
  await supabase.from("credit_transactions").insert({
    profile_id: profileId,
    amount,
    type,
    description,
  });

  const { data } = await supabase
    .from("muscle_credits")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  if (data) {
    await supabase
      .from("muscle_credits")
      .update({
        balance: data.balance + amount,
        total_earned: data.total_earned + amount,
      })
      .eq("profile_id", profileId);
  }
}

export async function spendCredits(profileId: string, amount: number, description: string): Promise<boolean> {
  const { data } = await supabase
    .from("muscle_credits")
    .select("*")
    .eq("profile_id", profileId)
    .single();
  if (!data || data.balance < amount) return false;

  await supabase.from("credit_transactions").insert({
    profile_id: profileId,
    amount: -amount,
    type: "ai_question",
    description,
  });

  await supabase
    .from("muscle_credits")
    .update({
      balance: data.balance - amount,
      total_spent: data.total_spent + amount,
    })
    .eq("profile_id", profileId);

  return true;
}

export async function checkFreeQuestion(profileId: string): Promise<boolean> {
  const { data } = await supabase
    .from("muscle_credits")
    .select("last_free_question_date")
    .eq("profile_id", profileId)
    .single();
  if (!data) return true;
  const today = new Date().toISOString().split("T")[0];
  return data.last_free_question_date !== today;
}

export async function useFreeQuestion(profileId: string) {
  const today = new Date().toISOString().split("T")[0];
  await supabase
    .from("muscle_credits")
    .update({ last_free_question_date: today })
    .eq("profile_id", profileId);
}
