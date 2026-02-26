import { useState } from "react";
import { Routine, WorkoutSession, RecoveryLog } from "@/lib/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import RoutineManager from "@/components/workout/RoutineManager";
import WorkoutSessionView from "@/components/workout/WorkoutSessionView";
import Dashboard from "@/components/workout/Dashboard";
import { Dumbbell, BarChart3, ListChecks, Plus } from "lucide-react";

type Tab = "dashboard" | "workout" | "routines";

const Index = () => {
  const [routines, setRoutines] = useLocalStorage<Routine[]>("ironstack-routines", []);
  const [sessions, setSessions] = useLocalStorage<WorkoutSession[]>("ironstack-sessions", []);
  const [recoveryLogs, setRecoveryLogs] = useLocalStorage<RecoveryLog[]>("ironstack-recovery", []);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);

  const saveRoutine = (routine: Routine) => {
    setRoutines((prev) => [...prev, routine]);
  };

  const deleteRoutine = (id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const finishSession = (session: WorkoutSession) => {
    setSessions((prev) => [...prev, session]);
    setActiveRoutine(null);
    setTab("dashboard");
  };

  const logRecovery = (log: RecoveryLog) => {
    setRecoveryLogs((prev) => [...prev, log]);
  };

  // Active workout session
  if (activeRoutine) {
    return (
      <WorkoutSessionView
        routine={activeRoutine}
        onFinish={finishSession}
        onCancel={() => setActiveRoutine(null)}
      />
    );
  }

  // Routine manager view
  if (tab === "routines") {
    return (
      <RoutineManager
        routines={routines}
        onSave={saveRoutine}
        onDelete={deleteRoutine}
        onClose={() => setTab("dashboard")}
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
            <h1 className="text-2xl font-black text-foreground tracking-tight">Iron Stack</h1>
          </div>
        </div>

        {tab === "dashboard" && (
          <>
            {/* Quick start */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Start Workout</h2>
              {routines.length > 0 ? (
                <div className="space-y-2">
                  {routines.map((routine) => (
                    <button
                      key={routine.id}
                      onClick={() => setActiveRoutine(routine)}
                      className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Dumbbell size={18} className="text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">{routine.name}</p>
                          <p className="text-xs text-muted-foreground">{routine.exercises.length} exercises</p>
                        </div>
                      </div>
                      <Plus size={20} className="text-primary" />
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setTab("routines")}
                  className="w-full py-6 bg-card rounded-xl border border-dashed border-border text-muted-foreground text-sm font-medium active:scale-[0.98] transition-transform"
                >
                  Create your first routine →
                </button>
              )}
            </div>

            <Dashboard sessions={sessions} recoveryLogs={recoveryLogs} onLogRecovery={logRecovery} />
          </>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border">
        <div className="max-w-md mx-auto flex">
          {([
            { key: "dashboard" as Tab, icon: BarChart3, label: "Dashboard" },
            { key: "routines" as Tab, icon: ListChecks, label: "Routines" },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${tab === key ? "text-primary" : "text-muted-foreground"}`}
            >
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
