import { useState, useEffect, useCallback } from "react";
import { Profile, Routine, RoutineDay, WorkoutSession } from "@/lib/types";
import {
  fetchProfiles, insertProfile, deleteProfileById,
  fetchRoutinesForProfile, upsertRoutine, deleteRoutineById,
  fetchSessionsForProfile, upsertSession,
} from "@/lib/supabaseQueries";
import ProfileSelector from "@/components/workout/ProfileSelector";
import RoutineManager from "@/components/workout/RoutineManager";
import WorkoutSessionView from "@/components/workout/WorkoutSessionView";
import Dashboard from "@/components/workout/Dashboard";
import { Dumbbell, BarChart3, ListChecks, Play, LogOut, Loader2 } from "lucide-react";

type Tab = "dashboard" | "routines";

const Index = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    try { return localStorage.getItem("ironstack-active-profile-id"); } catch { return null; }
  });
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [activeSession, setActiveSession] = useState<{ routine: Routine; day: RoutineDay; editSession?: WorkoutSession } | null>(null);

  // Load profiles
  useEffect(() => {
    fetchProfiles().then(setProfiles).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Load routines & sessions when profile changes
  useEffect(() => {
    if (!activeProfileId) { setRoutines([]); setSessions([]); return; }
    localStorage.setItem("ironstack-active-profile-id", activeProfileId);
    Promise.all([
      fetchRoutinesForProfile(activeProfileId),
      fetchSessionsForProfile(activeProfileId),
    ]).then(([r, s]) => { setRoutines(r); setSessions(s); }).catch(console.error);
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

  if (tab === "routines") {
    return <RoutineManager routines={routines} onSave={saveRoutine} onUpdate={updateRoutine} onDelete={deleteRoutine} onClose={() => setTab("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto p-4">
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
          <button onClick={() => { setActiveProfileId(null); localStorage.removeItem("ironstack-active-profile-id"); }} className="p-2 rounded-lg bg-secondary text-secondary-foreground active:scale-95 transition-transform">
            <LogOut size={18} />
          </button>
        </div>

        {/* Start Workout */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Start Workout</h2>
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
                      <button
                        key={day.id}
                        onClick={() => setActiveSession({ routine, day })}
                        className="w-full flex items-center justify-between p-3 bg-muted rounded-lg active:scale-[0.98] transition-transform"
                      >
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
            <button onClick={() => setTab("routines")}
              className="w-full py-6 bg-card rounded-xl border border-dashed border-border text-muted-foreground text-sm font-medium active:scale-[0.98] transition-transform">
              Create your first routine →
            </button>
          )}
        </div>

        <Dashboard sessions={sessions} onEditSession={editSession} />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border">
        <div className="max-w-md mx-auto flex">
          {([
            { key: "dashboard" as Tab, icon: BarChart3, label: "Dashboard" },
            { key: "routines" as Tab, icon: ListChecks, label: "Routines" },
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
