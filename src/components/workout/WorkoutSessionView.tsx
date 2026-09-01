import { useState, useEffect, useCallback, useRef } from "react";
import { RoutineDay, ExerciseLog, WorkoutSession, Routine } from "@/lib/types";
import { calculateSessionVolume } from "@/lib/calculations";
import { Check, X, ChevronLeft, ChevronRight, Info, Trophy, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import ExerciseGuideModal from "./ExerciseGuideModal";
import ExerciseReferenceMedia from "./ExerciseReferenceMedia";
import { getVariantsFor } from "@/lib/exerciseVariants";
import { getMuscleGroupForExercise } from "@/lib/exerciseLibrary";

interface PreviousExerciseData {
  [exerciseId: string]: { weight: number; reps: number; series: number };
}

interface AllTimePRData {
  [exerciseName: string]: number; // max weight ever lifted
}

interface PreviousByNameData {
  [exerciseName: string]: { weight: number; reps: number; series: number; date: string };
}

interface WorkoutSessionViewProps {
  routine: Routine;
  day: RoutineDay;
  onFinish: (session: WorkoutSession, hasPR: boolean) => void;
  onCancel: () => void;
  onAutoSave?: (session: WorkoutSession) => void;
  editSession?: WorkoutSession;
  previousData?: PreviousExerciseData;
  allTimePRs?: AllTimePRData;
  previousByName?: PreviousByNameData;
}

const WEIGHT_OPTIONS = Array.from({ length: 80 }, (_, i) => (i + 1) * 2.5);
const REPS_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);
const SETS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

interface StepperInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: number[];
  step: number;
}

const StepperInput = ({ label, value, onChange, options, step }: StepperInputProps) => {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: "center" });
  }, [open]);

  const round = (n: number) => Math.round(n * 100) / 100;

  return (
    <div className="flex-1">
      <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1 text-center">{label}</label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(round(Math.max(0, value - step)))}
          aria-label={`Decrease ${label}`}
          className="w-9 h-12 shrink-0 rounded-lg bg-muted/70 text-foreground text-lg font-bold active:scale-95 transition-transform"
        >
          −
        </button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex-1 min-w-0 h-12 text-center text-lg font-bold rounded-lg bg-muted/50 border border-border text-foreground active:bg-muted transition-colors"
            >
              {value || 0}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-20 p-1 max-h-64 overflow-y-auto" align="center">
            <div ref={listRef}>
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  data-selected={opt === value}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={cn(
                    "w-full text-center py-2 rounded-md text-sm font-semibold transition-colors",
                    opt === value ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={() => onChange(round(value + step))}
          aria-label={`Increase ${label}`}
          className="w-9 h-12 shrink-0 rounded-lg bg-muted/70 text-foreground text-lg font-bold active:scale-95 transition-transform"
        >
          +
        </button>
      </div>
    </div>
  );
};

const WorkoutSessionView = ({ routine, day, onFinish, onCancel, onAutoSave, editSession, previousData, allTimePRs, previousByName }: WorkoutSessionViewProps) => {
  const sessionDate = useRef(editSession ? new Date(editSession.date) : new Date()).current;
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
      : Object.fromEntries(day.exercises.map((ex) => {
          // Preload last time's numbers so progressive overload starts from where you left off.
          const prev = previousData?.[ex.id] || previousByName?.[ex.name];
          return [ex.id, {
            weight: prev ? String(prev.weight) : "",
            reps: prev ? String(prev.reps) : String(ex.defaultReps || 10),
            series: prev ? String(prev.series) : String(ex.defaultSets || 3),
          }];
        }))
  );
  const [savedExercises, setSavedExercises] = useState<Set<string>>(
    editSession ? new Set(editSession.exercises.map((e) => e.exerciseId)) : new Set()
  );
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [showGuide, setShowGuide] = useState<string | null>(null);
  // Per-exercise variant overrides (exerciseId -> chosen variant name).
  // Only affects the current session; does not mutate the routine template.
  const [variantOverrides, setVariantOverrides] = useState<Record<string, string>>({});
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionId = useRef(editSession?.id || crypto.randomUUID());

  const getActiveName = (ex: { id: string; name: string }) => variantOverrides[ex.id] || ex.name;

  const buildSession = useCallback((): WorkoutSession => {
    const exerciseLogs: ExerciseLog[] = day.exercises
      .filter((ex) => savedExercises.has(ex.id))
      .map((ex) => ({
        exerciseId: ex.id,
        exerciseName: variantOverrides[ex.id] || ex.name,
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
  }, [day, logs, savedExercises, routine, sessionDate, variantOverrides]);

  useEffect(() => {
    if (savedExercises.size === 0 || !onAutoSave) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { onAutoSave(buildSession()); }, 1500);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [logs, savedExercises, sessionDate, buildSession, onAutoSave]);

  const saveExercise = (exId: string, weight: string, reps: string, series: string) => {
    setLogs((prev) => ({ ...prev, [exId]: { weight, reps, series } }));
    setSavedExercises((prev) => new Set(prev).add(exId));
  };

  const checkForPRs = (): boolean => {
    if (!allTimePRs) return false;
    return day.exercises.some((ex) => {
      if (!savedExercises.has(ex.id)) return false;
      const w = parseFloat(logs[ex.id].weight) || 0;
      const pr = allTimePRs[getActiveName(ex)] || 0;
      return w > pr;
    });
  };

  const finishSession = () => {
    const hasPR = checkForPRs();
    onFinish(buildSession(), hasPR);
  };

  const goNext = () => setActiveCardIndex((i) => Math.min(i + 1, day.exercises.length - 1));
  const goPrev = () => setActiveCardIndex((i) => Math.max(i - 1, 0));

  const nextEx = day.exercises[activeCardIndex + 1];
  const activeEx = day.exercises[activeCardIndex];
  const activeName = getActiveName(activeEx);
  const activeLog = logs[activeEx.id];
  const activeWeight = parseFloat(activeLog.weight) || 0;
  const activePR = allTimePRs?.[activeName] || 0;
  const isNewPR = activeWeight > activePR && activeWeight > 0;
  const variantOptions = getVariantsFor(activeName);
  const isVariant = variantOverrides[activeEx.id] && variantOverrides[activeEx.id] !== activeEx.name;

  // Last session data — prefer name-based lookup when a variant is active or when day-based lookup misses.
  const lastByName = previousByName?.[activeName];
  const lastByDay = previousData?.[activeEx.id];
  const activeLastSession = isVariant ? lastByName : (lastByDay || lastByName);

  const switchVariant = (newName: string) => {
    setVariantOverrides((prev) => ({ ...prev, [activeEx.id]: newName }));
    // Pre-fill weight/reps from the variant's last session if available
    const last = previousByName?.[newName];
    setLogs((prev) => ({
      ...prev,
      [activeEx.id]: {
        weight: last ? String(last.weight) : "",
        reps: last ? String(last.reps) : prev[activeEx.id].reps,
        series: last ? String(last.series) : prev[activeEx.id].series,
      },
    }));
    // Switching variant invalidates a previously-saved log for this slot
    setSavedExercises((prev) => {
      const next = new Set(prev);
      next.delete(activeEx.id);
      return next;
    });
  };

  const saveActive = () => {
    saveExercise(activeEx.id, activeLog.weight, activeLog.reps, activeLog.series);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 pb-4 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">{routine.name}</h2>
          <button onClick={onCancel} className="p-2 rounded-lg bg-secondary text-secondary-foreground active:scale-95 transition-transform">
            <X size={20} />
          </button>
        </div>

        {/* Exercise Card — leads with the big picture, everything else follows below */}
        <div className="mb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeEx.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -60, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full"
            >
              <div className="bg-card rounded-2xl border border-border p-5 shadow-lg"
                style={{ borderTopWidth: 4, borderTopColor: activeEx.color || '#10b981' }}>
                {/* Reference illustration — how to perform this exercise, first thing you see */}
                <ExerciseReferenceMedia exerciseName={activeName} className="mb-3" />

                {/* Exercise header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {savedExercises.has(activeEx.id) && <Check size={18} className="text-primary shrink-0" />}
                    <h3 className="text-lg font-bold text-foreground truncate">{activeName}</h3>
                    {variantOptions.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1.5 rounded-lg bg-primary/10 text-primary active:scale-95 transition-transform"
                            aria-label="Switch variant"
                          >
                            <Shuffle size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuLabel>Switch variant</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {isVariant && (
                            <DropdownMenuItem onClick={() => switchVariant(activeEx.name)}>
                              ↺ Reset to {activeEx.name}
                            </DropdownMenuItem>
                          )}
                          {variantOptions.map((v) => (
                            <DropdownMenuItem key={v} onClick={() => switchVariant(v)}>
                              {v}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <button onClick={() => setShowGuide(activeName)} className="p-1.5 rounded-lg bg-muted text-muted-foreground active:text-primary">
                    <Info size={16} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {isVariant ? getMuscleGroupForExercise(activeName) : activeEx.muscleGroup} · Default: {activeEx.defaultReps || 10} reps × {activeEx.defaultSets || 3} sets
                  {isVariant && <span className="ml-1 text-primary">· variant</span>}
                </p>

                {/* Compact stats strip — PR / last session / volume */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {activePR > 0 && (
                    <span className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0",
                      isNewPR ? "bg-warning/20 text-warning" : "bg-warning/10 text-warning/80"
                    )}>
                      <Trophy size={11} /> {isNewPR ? `NEW PR ${activeWeight}kg` : `PR ${activePR}kg`}
                    </span>
                  )}
                  {activeLastSession && (
                    <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold whitespace-nowrap shrink-0">
                      Last {activeLastSession.weight}kg × {activeLastSession.reps} × {activeLastSession.series}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold whitespace-nowrap shrink-0">
                    Vol {((parseFloat(activeLog.weight) || 0) * (parseInt(activeLog.reps) || 0) * (parseInt(activeLog.series) || 0)).toLocaleString()}kg
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {day.exercises.map((ex, idx) => (
              <button key={ex.id} onClick={() => setActiveCardIndex(idx)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  idx === activeCardIndex ? "w-6 bg-primary" : savedExercises.has(ex.id) ? "w-2 bg-primary/50" : "w-2 bg-border"
                )} />
            ))}
          </div>

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

          {/* What's coming up next */}
          {nextEx ? (
            <p className="text-center text-base text-muted-foreground mt-3">
              Next up: <span className="font-bold text-foreground">{getActiveName(nextEx)}</span>
            </p>
          ) : (
            <p className="text-center text-base font-bold text-foreground mt-3">Last exercise — finish strong 💪</p>
          )}
        </div>
      </div>

      {/* ── Sticky Bottom Input Sheet ── */}
      <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 safe-area-bottom">
        <div className="max-w-md mx-auto px-4 pt-3 pb-4">
          {/* Stepper inputs — tap +/- to nudge, tap the number to jump to a value */}
          <div className="flex gap-2 mb-3">
            <StepperInput
              label="Weight (kg)"
              value={parseFloat(activeLog.weight) || 0}
              step={2.5}
              options={WEIGHT_OPTIONS}
              onChange={(v) => setLogs((prev) => ({ ...prev, [activeEx.id]: { ...prev[activeEx.id], weight: String(v) } }))}
            />
            <StepperInput
              label="Reps"
              value={parseInt(activeLog.reps) || 0}
              step={1}
              options={REPS_OPTIONS}
              onChange={(v) => setLogs((prev) => ({ ...prev, [activeEx.id]: { ...prev[activeEx.id], reps: String(v) } }))}
            />
            <StepperInput
              label="Sets"
              value={parseInt(activeLog.series) || 0}
              step={1}
              options={SETS_OPTIONS}
              onChange={(v) => setLogs((prev) => ({ ...prev, [activeEx.id]: { ...prev[activeEx.id], series: String(v) } }))}
            />
          </div>

          {/* Save / Finish row */}
          <div className="flex gap-2">
            <button
              onClick={saveActive}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all",
                savedExercises.has(activeEx.id)
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {savedExercises.has(activeEx.id) ? "✓ Update" : "Save Exercise"}
            </button>
            {savedExercises.size > 0 && (
              <button
                onClick={finishSession}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-transform"
              >
                {editSession ? "Save" : "Finish"}
              </button>
            )}
          </div>
        </div>
      </div>

      <ExerciseGuideModal exerciseName={showGuide} onClose={() => setShowGuide(null)} />
    </div>
  );
};

export default WorkoutSessionView;
