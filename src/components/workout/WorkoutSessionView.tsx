import { useState } from "react";
import { RoutineDay, ExerciseLog, WorkoutSession, Routine } from "@/lib/types";
import { calculateVolume, calculateSessionVolume } from "@/lib/calculations";
import { Check, X, ChevronDown, ChevronUp, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface WorkoutSessionViewProps {
  routine: Routine;
  day: RoutineDay;
  onFinish: (session: WorkoutSession) => void;
  onCancel: () => void;
  /** If provided, we are editing an existing session */
  editSession?: WorkoutSession;
}

const WorkoutSessionView = ({ routine, day, onFinish, onCancel, editSession }: WorkoutSessionViewProps) => {
  const [sessionDate, setSessionDate] = useState<Date>(editSession ? new Date(editSession.date) : new Date());

  const [logs, setLogs] = useState<Record<string, { weight: string; reps: string; series: string }>>(
    editSession
      ? Object.fromEntries(
          day.exercises.map((ex) => {
            const existing = editSession.exercises.find((e) => e.exerciseId === ex.id);
            return [ex.id, existing
              ? { weight: String(existing.weight), reps: String(existing.reps), series: String(existing.series) }
              : { weight: "", reps: "", series: "" }];
          })
        )
      : Object.fromEntries(day.exercises.map((ex) => [ex.id, { weight: "", reps: "", series: "" }]))
  );
  const [savedExercises, setSavedExercises] = useState<Set<string>>(
    editSession ? new Set(editSession.exercises.map((e) => e.exerciseId)) : new Set()
  );
  const [expandedEx, setExpandedEx] = useState<string | null>(day.exercises[0]?.id ?? null);

  const updateLog = (id: string, field: "weight" | "reps" | "series", value: string) => {
    setLogs((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveExercise = (id: string) => {
    const log = logs[id];
    if (!log.weight || !log.reps || !log.series) return;
    setSavedExercises((prev) => new Set(prev).add(id));
    const idx = day.exercises.findIndex((e) => e.id === id);
    if (idx < day.exercises.length - 1) {
      setExpandedEx(day.exercises[idx + 1].id);
    }
  };

  const finishSession = () => {
    const exerciseLogs: ExerciseLog[] = day.exercises
      .filter((ex) => savedExercises.has(ex.id))
      .map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        weight: parseFloat(logs[ex.id].weight) || 0,
        reps: parseInt(logs[ex.id].reps) || 0,
        series: parseInt(logs[ex.id].series) || 0,
      }));

    const session: WorkoutSession = {
      id: editSession?.id || crypto.randomUUID(),
      routineId: routine.id,
      routineName: routine.name,
      dayId: day.id,
      dayLabel: day.label,
      date: sessionDate.toISOString(),
      exercises: exerciseLogs,
      totalVolume: calculateSessionVolume(exerciseLogs),
    };
    onFinish(session);
  };

  const totalVolume = day.exercises
    .filter((ex) => savedExercises.has(ex.id))
    .reduce((sum, ex) => {
      const l = logs[ex.id];
      return sum + calculateVolume(parseFloat(l.weight) || 0, parseInt(l.reps) || 0, parseInt(l.series) || 0);
    }, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 pb-32 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{routine.name}</h2>
            <p className="text-sm text-muted-foreground">{day.label} · {savedExercises.size}/{day.exercises.length} done</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-lg bg-secondary text-secondary-foreground active:scale-95 transition-transform">
            <X size={20} />
          </button>
        </div>

        {/* Date Picker */}
        <div className="mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-left transition-colors active:scale-[0.98]",
              )}>
                <CalendarIcon size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">{format(sessionDate, "EEEE, MMMM d, yyyy")}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={sessionDate}
                onSelect={(d) => d && setSessionDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Session Volume</p>
          <p className="text-2xl font-bold font-mono-display text-primary">{totalVolume.toLocaleString()} <span className="text-sm text-muted-foreground font-sans">kg</span></p>
        </div>

        <div className="space-y-3">
          {day.exercises.map((ex) => {
            const log = logs[ex.id];
            const isSaved = savedExercises.has(ex.id);
            const isExpanded = expandedEx === ex.id;
            const w = parseFloat(log.weight) || 0;
            const r = parseInt(log.reps) || 0;
            const s = parseInt(log.series) || 0;
            const vol = calculateVolume(w, r, s);

            return (
              <div key={ex.id} className={`bg-card rounded-xl border transition-colors ${isSaved ? "border-primary/40" : "border-border"}`}>
                <button onClick={() => setExpandedEx(isExpanded ? null : ex.id)} className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {isSaved && <Check size={18} className="text-primary" />}
                    <span className={`font-semibold text-base ${isSaved ? "text-primary" : "text-foreground"}`}>{ex.name}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Weight (kg)</label>
                        <input type="number" inputMode="decimal" placeholder="0" value={log.weight}
                          onChange={(e) => updateLog(ex.id, "weight", e.target.value)}
                          className="w-full px-3 py-3.5 rounded-lg bg-input text-foreground text-center text-lg font-bold border-0 outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Reps</label>
                        <input type="number" inputMode="numeric" placeholder="0" value={log.reps}
                          onChange={(e) => updateLog(ex.id, "reps", e.target.value)}
                          className="w-full px-3 py-3.5 rounded-lg bg-input text-foreground text-center text-lg font-bold border-0 outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Series</label>
                        <input type="number" inputMode="numeric" placeholder="0" value={log.series}
                          onChange={(e) => updateLog(ex.id, "series", e.target.value)}
                          className="w-full px-3 py-3.5 rounded-lg bg-input text-foreground text-center text-lg font-bold border-0 outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                    </div>

                    {w > 0 && r > 0 && s > 0 && (
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="text-base font-bold font-mono-display text-foreground">{vol.toLocaleString()} kg</p>
                      </div>
                    )}

                    <button onClick={() => saveExercise(ex.id)} disabled={!w || !r || !s}
                      className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-transform">
                      {isSaved ? "Update" : "Save Exercise"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {savedExercises.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
          <div className="max-w-md mx-auto">
            <button onClick={finishSession}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg active:scale-[0.98] transition-transform glow-emerald">
              {editSession ? "Save Changes" : "Finish Session"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutSessionView;
