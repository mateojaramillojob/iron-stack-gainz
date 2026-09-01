import { useState, useEffect, useCallback, useMemo } from "react";
import { Profile, Routine, RoutineDay, WorkoutSession } from "@/lib/types";
import {
  fetchProfiles, insertProfile, deleteProfileById,
  fetchRoutinesForProfile, upsertRoutine, deleteRoutineById,
  fetchSessionsForProfile, upsertSession, deleteSessionById,
  fetchCustomExercises, insertCustomExercise,
} from "@/lib/supabaseQueries";
import {
  fetchCredits, calculateSessionCredits, earnCredits, MuscleCredits,
} from "@/lib/creditsService";
import ProfileSelector from "@/components/workout/ProfileSelector";
import RoutineManager from "@/components/workout/RoutineManager";
import WorkoutSessionView from "@/components/workout/WorkoutSessionView";
import ProfileView from "@/components/workout/ProfileView";
import AIRoutineBuilder from "@/components/workout/AIRoutineBuilder";
import NextWorkoutCard from "@/components/workout/NextWorkoutCard";
import ProgressView from "@/components/workout/ProgressView";
import RecentSessions from "@/components/workout/RecentSessions";
import TrainingStats from "@/components/workout/TrainingStats";
import AICoachChat from "@/components/workout/AICoachChat";
import CreditRewardModal from "@/components/workout/CreditRewardModal";
import { Dumbbell, TrendingUp, LogOut, Loader2, Sparkles, User, Brain, Coins, ListChecks } from "lucide-react";
import { toast } from "sonner";

type Tab = "train" | "progress" | "coach" | "profile";

const Index = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    try { return localStorage.getItem("ironstack-active-profile-id"); } catch { return null; }
  });
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [customExercises, setCustomExercises] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("train");
  const [activeSession, setActiveSession] = useState<{ routine: Routine; day: RoutineDay; editSession?: WorkoutSession } | null>(null);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [managingRoutines, setManagingRoutines] = useState(false);
  const [credits, setCredits] = useState<MuscleCredits | null>(null);
  const [rewardModal, setRewardModal] = useState<{ open: boolean; breakdown: { label: string; amount: number }[]; total: number; newBalance: number }>({
    open: false, breakdown: [], total: 0, newBalance: 0,
  });

  useEffect(() => {
    fetchProfiles().then(setProfiles).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadCredits = useCallback(async () => {
    if (!activeProfileId) return;
    try {
      const c = await fetchCredits(activeProfileId);
      setCredits(c);
    } catch (e) { console.error("Failed to load credits:", e); }
  }, [activeProfileId]);

  useEffect(() => {
    if (!activeProfileId) { setRoutines([]); setSessions([]); setCredits(null); return; }
    localStorage.setItem("ironstack-active-profile-id", activeProfileId);
    Promise.all([
      fetchRoutinesForProfile(activeProfileId),
      fetchSessionsForProfile(activeProfileId),
      fetchCustomExercises(activeProfileId),
    ]).then(([r, s, ce]) => { setRoutines(r); setSessions(s); setCustomExercises(ce); }).catch(console.error);
    loadCredits();
  }, [activeProfileId, loadCredits]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  // All-time PRs per exercise name
  const allTimePRs = useMemo(() => {
    const prs: Record<string, number> = {};
    sessions.forEach((s) =>
      s.exercises.forEach((e) => {
        prs[e.exerciseName] = Math.max(prs[e.exerciseName] || 0, e.weight);
      })
    );
    return prs;
  }, [sessions]);

  const getUpNextDay = useCallback(() => {
    if (!routines.length) return null;
    const sorted = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastSession = sorted[0];
    if (!lastSession) {
      const r = routines[0];
      return r.days.length ? { routine: r, day: r.days[0] } : null;
    }
    const routine = routines.find((r) => r.id === lastSession.routineId);
    if (!routine) {
      const r = routines[0];
      return r.days.length ? { routine: r, day: r.days[0] } : null;
    }
    const lastDayIdx = routine.days.findIndex((d) => d.id === lastSession.dayId);
    const nextDayIdx = (lastDayIdx + 1) % routine.days.length;
    return { routine, day: routine.days[nextDayIdx] };
  }, [routines, sessions]);

  const saveProfile = async (profile: Profile) => {
    await insertProfile(profile);
    setProfiles((prev) => [...prev, profile]);
  };

  const deleteProfile = async (id: string) => {
    await deleteProfileById(id);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (activeProfileId === id) { setActiveProfileId(null); localStorage.removeItem("ironstack-active-profile-id"); }
  };

  const saveRoutine = async (routine: Routine) => {
    if (!activeProfileId) return;
    await upsertRoutine(activeProfileId, routine);
    setRoutines((prev) => [...prev, routine]);
  };

  const updateRoutine = async (routine: Routine) => {
    if (!activeProfileId) return;
    await upsertRoutine(activeProfileId, routine);
    setRoutines((prev) => prev.map((r) => (r.id === routine.id ? routine : r)));
  };

  const deleteRoutine = async (id: string) => {
    await deleteRoutineById(id);
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const finishSession = async (session: WorkoutSession, hasPR: boolean) => {
    if (!activeProfileId) return;
    await upsertSession(activeProfileId, session);
    setSessions((prev) => {
      const exists = prev.find((s) => s.id === session.id);
      if (exists) return prev.map((s) => (s.id === session.id ? session : s));
      return [session, ...prev];
    });
    setActiveSession(null);

    // Calculate and award credits
    const { total, breakdown } = calculateSessionCredits(session, sessions, hasPR);
    await earnCredits(activeProfileId, total, "session_complete", `Completed ${session.routineName} - ${session.dayLabel}`);
    const updatedCredits = await fetchCredits(activeProfileId);
    setCredits(updatedCredits);
    setRewardModal({ open: true, breakdown, total, newBalance: updatedCredits.balance });

    setTab("progress");
  };

  const autoSaveSession = async (session: WorkoutSession) => {
    if (!activeProfileId) return;
    try {
      await upsertSession(activeProfileId, session);
      setSessions((prev) => {
        const exists = prev.find((s) => s.id === session.id);
        if (exists) return prev.map((s) => (s.id === session.id ? session : s));
        return [session, ...prev];
      });
    } catch (e) {
      console.error("Auto-save failed:", e);
    }
  };

  const deleteSession = async (sessionId: string) => {
    await deleteSessionById(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success("Session deleted");
  };

  const editSession = (session: WorkoutSession) => {
    const routine = routines.find((r) => r.id === session.routineId);
    const day = routine?.days.find((d) => d.id === session.dayId);
    if (routine && day) setActiveSession({ routine, day, editSession: session });
  };

  const handleAddCustomExercise = async (muscleGroup: string, exerciseName: string) => {
    if (!activeProfileId) return;
    await insertCustomExercise(activeProfileId, muscleGroup, exerciseName);
    setCustomExercises((prev) => ({
      ...prev,
      [muscleGroup]: [...(prev[muscleGroup] || []), exerciseName],
    }));
  };

  const handleAIRoutineGenerated = async (routine: Routine) => {
    await saveRoutine(routine);
    setShowAIBuilder(false);
    toast.success("AI routine saved!");
  };

  const handleProfileUpdated = (updated: Profile) => {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const previousData2 = useMemo(() => {
    if (!activeSession) return {};
    const dayId = activeSession.day.id;
    const pastForDay = sessions
      .filter((s) => s.dayId === dayId && s.id !== activeSession.editSession?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last = pastForDay[0];
    if (!last) return {};
    const map: Record<string, { weight: number; reps: number; series: number }> = {};
    last.exercises.forEach((e) => {
      map[e.exerciseId] = { weight: e.weight, reps: e.reps, series: e.series };
    });
    return map;
  }, [activeSession, sessions]);

  // Last logged set per exercise NAME (across all sessions) — used for variant lookups
  const previousByName = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const map: Record<string, { weight: number; reps: number; series: number; date: string }> = {};
    sorted.forEach((s) => {
      s.exercises.forEach((e) => {
        if (!map[e.exerciseName]) {
          map[e.exerciseName] = { weight: e.weight, reps: e.reps, series: e.series, date: s.date };
        }
      });
    });
    return map;
  }, [sessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!activeProfile) {
    return <ProfileSelector profiles={profiles} onSelect={(p) => setActiveProfileId(p.id)} onSave={saveProfile} onDelete={deleteProfile} />;
  }

  if (showAIBuilder) {
    return <AIRoutineBuilder onGenerated={handleAIRoutineGenerated} onClose={() => setShowAIBuilder(false)} />;
  }

  if (activeSession) {
    return (
      <WorkoutSessionView
        routine={activeSession.routine}
        day={activeSession.day}
        onFinish={finishSession}
        onCancel={() => setActiveSession(null)}
        onAutoSave={autoSaveSession}
        editSession={activeSession.editSession}
        previousData={previousData2}
        allTimePRs={allTimePRs}
        previousByName={previousByName}
      />
    );
  }

  if (managingRoutines) {
    return <RoutineManager routines={routines} onSave={saveRoutine} onUpdate={updateRoutine} onDelete={deleteRoutine}
      onClose={() => setManagingRoutines(false)} customExercises={customExercises} onAddCustomExercise={handleAddCustomExercise} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell size={20} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight leading-none">Iron Stack</h1>
              <p className="text-xs text-muted-foreground">{activeProfile.emoji} {activeProfile.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {credits && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-warning/15 border border-warning/30">
                <Coins size={12} className="text-warning" />
                <span className="text-xs font-bold text-warning">{credits.balance}</span>
              </div>
            )}
            <button onClick={() => { setActiveProfileId(null); localStorage.removeItem("ironstack-active-profile-id"); }}
              className="p-2 rounded-lg bg-secondary text-secondary-foreground active:scale-95 transition-transform">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* ── Train Tab ── */}
        {tab === "train" && (() => {
          const upNext = getUpNextDay();
          if (!upNext) {
            return (
              <div className="rounded-3xl bg-card border border-dashed border-border p-8 text-center">
                <Dumbbell size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">No routine yet</p>
                <p className="text-xs text-muted-foreground mb-5">Build one and your next workout shows up here.</p>
                <button onClick={() => setShowAIBuilder(true)}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-transform">
                  Create a routine
                </button>
              </div>
            );
          }
          return (
            <NextWorkoutCard
              routine={upNext.routine}
              day={upNext.day}
              routines={routines}
              previousByName={previousByName}
              onStart={(routine, day) => setActiveSession({ routine, day })}
              onPickDay={(routine, day) => setActiveSession({ routine, day })}
            />
          );
        })()}

        {/* ── Progress Tab ── */}
        {tab === "progress" && <ProgressView sessions={sessions} />}

        {/* ── AI Coach Tab ── */}
        {tab === "coach" && activeProfileId && (
          <div className="fixed inset-0 top-0 bottom-[68px] bg-background z-40">
            <AICoachChat
              sessions={sessions}
              profileName={activeProfile?.name}
              profileId={activeProfileId}
              credits={credits}
              onCreditsChange={loadCredits}
              nextDayLabel={getUpNextDay()?.day.label}
              nextExercises={getUpNextDay()?.day.exercises.map((e) => e.name)}
            />
          </div>
        )}

        {/* ── Profile Tab ── */}
        {tab === "profile" && (
          <div className="space-y-4">
            <ProfileView profile={activeProfile} onProfileUpdated={handleProfileUpdated} />

            <TrainingStats profile={activeProfile} sessions={sessions} />

            <RecentSessions
              sessions={sessions}
              onEditSession={editSession}
              onDeleteSession={deleteSession}
            />

            {/* Routine management lives here, out of the daily training path */}
            <div className="rounded-3xl bg-card border border-border p-4 space-y-2">
              <h3 className="text-sm font-bold text-foreground mb-3">Routines</h3>
              <button onClick={() => setShowAIBuilder(true)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted active:scale-[0.98] transition-transform text-left">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Sparkles size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Create with AI</p>
                  <p className="text-[11px] text-muted-foreground">Generate a personalized routine</p>
                </div>
              </button>
              <button onClick={() => setManagingRoutines(true)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted active:scale-[0.98] transition-transform text-left">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-secondary flex items-center justify-center">
                  <ListChecks size={18} className="text-secondary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Manage routines</p>
                  <p className="text-[11px] text-muted-foreground">
                    {routines.length} {routines.length === 1 ? "routine" : "routines"} · edit, add or remove
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav — 4 destinations, 56px targets, active state shown by both
          an accent pill behind the icon and the label weight. */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
        <div className="max-w-md mx-auto flex px-2 pt-1.5 pb-2">
          {([
            { key: "train" as Tab, icon: Dumbbell, label: "Train" },
            { key: "progress" as Tab, icon: TrendingUp, label: "Progress" },
            { key: "coach" as Tab, icon: Brain, label: "Max" },
            { key: "profile" as Tab, icon: User, label: "Profile" },
          ]).map(({ key, icon: Icon, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                aria-current={active ? "page" : undefined}
                className="flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 rounded-xl active:scale-95 transition-transform"
              >
                <span className={`flex items-center justify-center h-7 w-12 rounded-full transition-colors ${active ? "bg-primary/15" : ""}`}>
                  <Icon size={20} className={active ? "text-primary" : "text-muted-foreground"} />
                </span>
                <span className={`text-[11px] ${active ? "font-bold text-primary" : "font-medium text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Credit Reward Modal */}
      <CreditRewardModal
        open={rewardModal.open}
        onClose={() => setRewardModal((p) => ({ ...p, open: false }))}
        breakdown={rewardModal.breakdown}
        total={rewardModal.total}
        newBalance={rewardModal.newBalance}
      />
    </div>
  );
};

export default Index;
