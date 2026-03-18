import { useState, useEffect, useCallback, useRef } from "react";
import { RoutineDay, ExerciseLog, WorkoutSession, Routine } from "@/lib/types";
import { calculateVolume, calculateSessionVolume } from "@/lib/calculations";
import { Check, CalendarIcon, X, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import ExerciseGuideModal from "./ExerciseGuideModal";

interface PreviousExerciseData {
  [exerciseId: string]: { weight: number; reps: number; series: number };
}

interface WorkoutSessionViewProps {
  routine: Routine;
  day: RoutineDay;
  onFinish: (session: WorkoutSession) => void;
  onCancel: () => void;
  onAutoSave?: (session: WorkoutSession) => void;
  editSession?: WorkoutSession;
  previousData?: PreviousExerciseData;
}

const WEIGHT_OPTIONS = Array.from({ length: 80 }, (_, i) => (i + 1) * 2.5);
const REPS_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);
const SETS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

const InlineScrollSelector = ({ values, selected, onChange, label }: {
  values: number[];
  selected: number;
  onChange: (v: number) => void;
  label: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 40;

  useEffect(() => {
    if (containerRef.current) {
      const idx = values.indexOf(selected);
      if (idx >= 0) {
        containerRef.current.scrollTop = idx * itemHeight - itemHeight * 1.5;
      }
    }
  }, []);

  return (
    <div className="flex-1">
      <p className="text-[10px] text-muted-foreground font-semibold text-center mb-1 uppercase tracking-wider">{label}</p>
      <div ref={containerRef} className="h-[160px] overflow-y-auto rounded-lg bg-muted/50 scrollbar-thin relative">
        <div className="absolute inset-x-0 top-[60px] h-[40px] bg-primary/15 rounded pointer-events-none z-10 border-y border-primary/30" />
        {values.map((v) => (
          <button key={v} onClick={() => onChange(v)}
            className={`w-full h-[40px] flex items-center justify-center text-sm font-bold transition-colors relative z-20 ${
              selected === v ? "text-primary" : "text-muted-foreground/60"
            }`}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
};

const WorkoutSessionView = ({ routine, day, onFinish, onCancel, onAutoSave, editSession }: WorkoutSessionViewProps) => {
  const [sessionDate, setSessionDate] = useState<Date>(editSession ? new Date(editSession.date) : new Date());
  const [logs, setLogs] = useState<Record<string, { weight: string; reps: string; series: string }>>(
    editSession
      ? Object.fromEntries(
          day.exercises.map((ex) => {
            const existing = editSession.exercises.find((e) => e.exerciseId === ex.id);
            return [ex.id, existing
              ? { weight: String(existing.weight), reps: String(existing.reps), series: String(existing.series) }
              : { weight: "", reps: String(ex.defaultReps || ""), series: String(ex.defaultSets || "") }];
          })
        )
      : Object.fromEntries(day.exercises.map((ex) => [ex.id, {
          weight: "",
          reps: String(ex.defaultReps || 10),
          series: String(ex.defaultSets || 3),
        }]))
  );
  const [savedExercises, setSavedExercises] = useState<Set<string>>(
    editSession ? new Set(editSession.exercises.map((e) => e.exerciseId)) : new Set()
  );
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [showGuide, setShowGuide] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionId = useRef(editSession?.id || crypto.randomUUID());

  const buildSession = useCallback((): WorkoutSession => {
    const exerciseLogs: ExerciseLog[] = day.exercises
      .filter((ex) => savedExercises.has(ex.id))
      .map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        weight: parseFloat(logs[ex.id].weight) || 0,
        reps: parseInt(logs[ex.id].reps) || 0,
        series: parseInt(logs[ex.id].series) || 0,
      }));

    return {
      id: sessionId.current,
      routineId: routine.id,
      routineName: routine.name,
      dayId: day.id,
      dayLabel: day.label,
      date: sessionDate.toISOString(),
      exercises: exerciseLogs,
      totalVolume: calculateSessionVolume(exerciseLogs),
    };
  }, [day, logs, savedExercises, routine, sessionDate]);

  // Auto-save debounced
  useEffect(() => {
    if (savedExercises.size === 0 || !onAutoSave) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      onAutoSave(buildSession());
    }, 1500);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [logs, savedExercises, sessionDate, buildSession, onAutoSave]);

  const saveExercise = (exId: string, weight: string, reps: string, series: string) => {
    setLogs((prev) => ({ ...prev, [exId]: { weight, reps, series } }));
    setSavedExercises((prev) => new Set(prev).add(exId));
  };

  const finishSession = () => {
    onFinish(buildSession());
  };

  const totalVolume = day.exercises
    .filter((ex) => savedExercises.has(ex.id))
    .reduce((sum, ex) => {
      const l = logs[ex.id];
      return sum + calculateVolume(parseFloat(l.weight) || 0, parseInt(l.reps) || 0, parseInt(l.series) || 0);
    }, 0);

  const goNext = () => setActiveCardIndex((i) => Math.min(i + 1, day.exercises.length - 1));
  const goPrev = () => setActiveCardIndex((i) => Math.max(i - 1, 0));

  const activeEx = day.exercises[activeCardIndex];
  const activeLog = logs[activeEx.id];

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 pb-32 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{routine.name}</h2>
            <p className="text-sm text-muted-foreground">{day.label} · {savedExercises.size}/{day.exercises.length} done</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-lg bg-secondary text-secondary-foreground active:scale-95 transition-transform">
            <X size={20} />
          </button>
        </div>

        {/* Date picker */}
        <div className="mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-left transition-colors active:scale-[0.98]">
                <CalendarIcon size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">{format(sessionDate, "EEEE, MMMM d, yyyy")}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={sessionDate} onSelect={(d) => d && setSessionDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Volume summary */}
        <div className="bg-card rounded-xl p-4 border border-border mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Session Volume</p>
          <p className="text-2xl font-bold font-mono-display text-primary">{totalVolume.toLocaleString()} <span className="text-sm text-muted-foreground font-sans">kg</span></p>
        </div>

        {/* Card Stack Carousel */}
        <div className="mb-4">
          {/* Navigation dots */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {day.exercises.map((ex, idx) => {
              const isSaved = savedExercises.has(ex.id);
              return (
                <button key={ex.id} onClick={() => setActiveCardIndex(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    idx === activeCardIndex ? "w-6 bg-primary" : isSaved ? "w-2 bg-primary/50" : "w-2 bg-border"
                  )} />
              );
            })}
          </div>

          {/* Card area */}
          <div className="relative min-h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeEx.id}
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -60, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full"
              >
                <div
                  className="bg-card rounded-2xl border border-border p-5 shadow-lg"
                  style={{ borderTopWidth: 4, borderTopColor: activeEx.color || '#10b981' }}
                >
                  {/* Exercise header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {savedExercises.has(activeEx.id) && <Check size={18} className="text-primary" />}
                      <h3 className="text-lg font-bold text-foreground">{activeEx.name}</h3>
                    </div>
                    <button onClick={() => setShowGuide(activeEx.name)} className="p-1.5 rounded-lg bg-muted text-muted-foreground active:text-primary">
                      <Info size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    {activeEx.muscleGroup} · Default: {activeEx.defaultReps || 10} reps × {activeEx.defaultSets || 3} sets
                  </p>

                  {/* Scroll selectors */}
                  <div className="flex gap-2 mb-4">
                    <InlineScrollSelector
                      values={WEIGHT_OPTIONS}
                      selected={parseFloat(activeLog.weight) || 20}
                      onChange={(v) => setLogs((prev) => ({ ...prev, [activeEx.id]: { ...prev[activeEx.id], weight: String(v) } }))}
                      label="Weight (kg)"
                    />
                    <InlineScrollSelector
                      values={REPS_OPTIONS}
                      selected={parseInt(activeLog.reps) || activeEx.defaultReps || 10}
                      onChange={(v) => setLogs((prev) => ({ ...prev, [activeEx.id]: { ...prev[activeEx.id], reps: String(v) } }))}
                      label="Reps"
                    />
                    <InlineScrollSelector
                      values={SETS_OPTIONS}
                      selected={parseInt(activeLog.series) || activeEx.defaultSets || 3}
                      onChange={(v) => setLogs((prev) => ({ ...prev, [activeEx.id]: { ...prev[activeEx.id], series: String(v) } }))}
                      label="Sets"
                    />
                  </div>

                  {/* Volume for this exercise */}
                  <div className="bg-muted/50 rounded-xl p-3 mb-4 text-center">
                    <p className="text-xs text-muted-foreground">Volume</p>
                    <p className="text-lg font-bold font-mono-display text-primary">
                      {((parseFloat(activeLog.weight) || 0) * (parseInt(activeLog.reps) || 0) * (parseInt(activeLog.series) || 0)).toLocaleString()}
                      <span className="text-sm text-muted-foreground font-sans ml-1">kg</span>
                    </p>
                  </div>

                  {/* Save this exercise */}
                  <button
                    onClick={() => saveExercise(activeEx.id, activeLog.weight, activeLog.reps, activeLog.series)}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all",
                      savedExercises.has(activeEx.id)
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-primary text-primary-foreground glow-emerald"
                    )}
                  >
                    {savedExercises.has(activeEx.id) ? "✓ Saved — Tap to Update" : "Save Exercise"}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Prev / Next buttons */}
            <div className="flex items-center justify-between mt-3">
              <button onClick={goPrev} disabled={activeCardIndex === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm disabled:opacity-30 active:scale-95 transition-transform">
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="text-xs text-muted-foreground font-semibold">{activeCardIndex + 1} / {day.exercises.length}</span>
              <button onClick={goNext} disabled={activeCardIndex === day.exercises.length - 1}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm disabled:opacity-30 active:scale-95 transition-transform">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Finish button */}
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

      <ExerciseGuideModal exerciseName={showGuide} onClose={() => setShowGuide(null)} />
    </div>
  );
};

export default WorkoutSessionView;
