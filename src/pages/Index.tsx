import { useState, useEffect } from "react";
import { Profile, Routine, RoutineDay, WorkoutSession } from "@/lib/types";
import {
  fetchProfiles, insertProfile, deleteProfileById,
  fetchRoutinesForProfile, upsertRoutine, deleteRoutineById,
  fetchSessionsForProfile, upsertSession,
  fetchCustomExercises, insertCustomExercise,
} from "@/lib/supabaseQueries";
import ProfileSelector from "@/components/workout/ProfileSelector";
import RoutineManager from "@/components/workout/RoutineManager";
import WorkoutSessionView from "@/components/workout/WorkoutSessionView";
import Dashboard from "@/components/workout/Dashboard";
import ProfileView from "@/components/workout/ProfileView";
import AIRoutineBuilder from "@/components/workout/AIRoutineBuilder";
import AnalyticsDashboard from "@/components/workout/AnalyticsDashboard";
import { Dumbbell, BarChart3, ListChecks, Play, LogOut, Loader2, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

type Tab = "routines" | "dashboard" | "profile";

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

  useEffect(() => {
    fetchProfiles().then(setProfiles).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeProfileId) { setRoutines([]); setSessions([]); return; }
    localStorage.setItem("ironstack-active-profile-id", activeProfileId);
    Promise.all([
      fetchRoutinesForProfile(activeProfileId),
      fetchSessionsForProfile(activeProfileId),
      fetchCustomExercises(activeProfileId),
    ]).then(([r, s, ce]) => { setRoutines(r); setSessions(s); setCustomExercises(ce); }).catch(console.error);
  }, [activeProfileId]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

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

  const finishSession = async (session: WorkoutSession) => {
    if (!activeProfileId) return;
    await upsertSession(activeProfileId, session);
    setSessions((prev) => {
      const exists = prev.find((s) => s.id === session.id);
      if (exists) return prev.map((s) => (s.id === session.id ? session : s));
      return [session, ...prev];
    });
    setActiveSession(null);
    setTab("dashboard");
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
        editSession={activeSession.editSession}
      />
    );
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
          <button onClick={() => { setActiveProfileId(null); localStorage.removeItem("ironstack-active-profile-id"); }}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground active:scale-95 transition-transform">
            <LogOut size={18} />
          </button>
        </div>

        {/* ── Routines Tab ── */}
        {tab === "routines" && (
          <div>
            {/* AI Routine Builder CTA */}
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

            {/* Start Workout */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Start Workout</h2>
                <button onClick={() => setTab("dashboard")}
                  className="text-xs font-semibold text-primary active:scale-95">Manage Routines →</button>
              </div>
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

            {/* Manage routines button */}
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
            <Dashboard sessions={sessions} onEditSession={editSession} />
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
    </div>
  );
};

export default Index;
