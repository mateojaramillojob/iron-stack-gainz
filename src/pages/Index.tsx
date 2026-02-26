import { useState } from "react";
import { Routine, RoutineDay, WorkoutSession } from "@/lib/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import RoutineManager from "@/components/workout/RoutineManager";
import WorkoutSessionView from "@/components/workout/WorkoutSessionView";
import Dashboard from "@/components/workout/Dashboard";
import { Dumbbell, BarChart3, ListChecks, Play } from "lucide-react";

type Tab = "dashboard" | "routines";

const Index = () => {
  const [routines, setRoutines] = useLocalStorage<Routine[]>("ironstack-routines", []);
  const [sessions, setSessions] = useLocalStorage<WorkoutSession[]>("ironstack-sessions", []);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [activeSession, setActiveSession] = useState<{ routine: Routine; day: RoutineDay } | null>(null);

  const saveRoutine = (routine: Routine) => setRoutines((prev) => [...prev, routine]);
  const deleteRoutine = (id: string) => setRoutines((prev) => prev.filter((r) => r.id !== id));

  const finishSession = (session: WorkoutSession) => {
    setSessions((prev) => [...prev, session]);
    setActiveSession(null);
    setTab("dashboard");
  };

  if (activeSession) {
    return (
      <WorkoutSessionView
        routine={activeSession.routine}
        day={activeSession.day}
        onFinish={finishSession}
        onCancel={() => setActiveSession(null)}
      />
    );
  }

  if (tab === "routines") {
    return <RoutineManager routines={routines} onSave={saveRoutine} onDelete={deleteRoutine} onClose={() => setTab("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto p-4">
        <div className="flex items-center gap-2.5 mb-6 pt-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Dumbbell size={20} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Iron Stack</h1>
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

        <Dashboard sessions={sessions} />
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
