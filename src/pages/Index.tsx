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
import Dashboard from "@/components/workout/Dashboard";
import ProfileView from "@/components/workout/ProfileView";
import AIRoutineBuilder from "@/components/workout/AIRoutineBuilder";
import AnalyticsDashboard from "@/components/workout/AnalyticsDashboard";
import AICoachChat from "@/components/workout/AICoachChat";
import CreditRewardModal from "@/components/workout/CreditRewardModal";
import { Dumbbell, BarChart3, ListChecks, Play, LogOut, Loader2, Sparkles, User, Brain, Coins } from "lucide-react";
import { toast } from "sonner";

type Tab = "routines" | "dashboard" | "coach" | "profile";

const Index = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    try { return localStorage.getItem("ironstack-active-profile-id"); } catch { return null; }
  });
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [customExercises, setCustomExercises] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("routines");
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

    setTab("dashboard");
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

        {/* ── Routines Tab ── */}
        {tab === "routines" && (
          <div>
            {(() => {
              const upNext = getUpNextDay();
              if (upNext) {
                return (
                  <div className="mb-5">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Up Next</h2>
                    <div className="bg-card rounded-2xl border-2 border-primary/40 p-5 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-8 translate-x-8" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-1">
                          <Dumbbell size={18} className="text-primary" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{upNext.routine.name}</span>
                        </div>
                        <h3 className="text-xl font-black text-foreground mb-2">{upNext.day.label}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {upNext.day.exercises.map((e) => e.name).join(" · ")}
                        </p>
                        <button onClick={() => setActiveSession({ routine: upNext.routine, day: upNext.day })}
                          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.98] transition-transform shadow-lg">
                          <Play size={18} className="inline mr-2 -mt-0.5" />
                          Start Session
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <button onClick={() => setShowAIBuilder(true)}
              className="w-full flex items-center gap-3 p-4 mb-4 bg-primary/10 rounded-xl border border-primary/20 active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles size={20} className="text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">AI Routine Builder</p>
                <p className="text-xs text-muted-foreground">Generate a personalized routine in seconds</p>
              </div>
            </button>

            <div className="mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">All Workouts</h2>
              {routines.length > 0 ? (
                <div className="space-y-3">
                  {routines.map((routine) => (
                    <div key={routine.id} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Dumbbell size={16} className="text-primary" />
                        <h3 className="font-bold text-foreground">{routine.name}</h3>
                      </div>
                      <div className="space-y-2">
                        {routine.days.map((day) => (
                          <button key={day.id} onClick={() => setActiveSession({ routine, day })}
                            className="w-full flex items-center justify-between p-3 bg-muted rounded-lg active:scale-[0.98] transition-transform">
                            <div className="text-left">
                              <p className="text-sm font-semibold text-foreground">{day.label}</p>
                              <p className="text-xs text-muted-foreground">{day.exercises.map((e) => e.name).join(", ")}</p>
                            </div>
                            <Play size={16} className="text-primary" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <button onClick={() => setShowAIBuilder(true)}
                  className="w-full py-6 bg-card rounded-xl border border-dashed border-border text-muted-foreground text-sm font-medium active:scale-[0.98] transition-transform">
                  Create your first routine →
                </button>
              )}
            </div>

            <button onClick={() => setManagingRoutines(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-[0.98] transition-transform">
              <ListChecks size={16} />
              Manage Routines
            </button>
          </div>
        )}

        {/* ── Dashboard Tab ── */}
        {tab === "dashboard" && (
          <div className="space-y-4">
            <AnalyticsDashboard sessions={sessions} />
            <Dashboard sessions={sessions} onEditSession={editSession} onDeleteSession={deleteSession} profileName={activeProfile?.name} />
          </div>
        )}

        {/* ── AI Coach Tab ── */}
        {tab === "coach" && activeProfileId && (
          <div className="fixed inset-0 top-0 bottom-[68px] bg-background z-40">
            <AICoachChat
              sessions={sessions}
              profileName={activeProfile?.name}
              profileId={activeProfileId}
              credits={credits}
              onCreditsChange={loadCredits}
            />
          </div>
        )}

        {/* ── Profile Tab ── */}
        {tab === "profile" && (
          <ProfileView profile={activeProfile} onProfileUpdated={handleProfileUpdated} />
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border z-50">
        <div className="max-w-md mx-auto flex">
          {([
            { key: "routines" as Tab, icon: ListChecks, label: "Routines" },
            { key: "dashboard" as Tab, icon: BarChart3, label: "Dashboard" },
            { key: "coach" as Tab, icon: Brain, label: "AI Coach" },
            { key: "profile" as Tab, icon: User, label: "Profile" },
          ]).map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${tab === key ? "text-primary" : "text-muted-foreground"}`}>
              <Icon size={22} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
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
