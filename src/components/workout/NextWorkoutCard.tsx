import { useState } from "react";
import { Routine, RoutineDay } from "@/lib/types";
import MuscleBodyDiagram from "./MuscleBodyDiagram";
import { getMuscleTargetFor } from "@/lib/exerciseMuscleMap";
import { getDayName, getDaySubtitle } from "@/lib/routineNaming";
import { Play, ChevronDown, CalendarDays, Repeat, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviousByNameData {
  [exerciseName: string]: { weight: number; reps: number; series: number; date: string };
}

interface NextWorkoutCardProps {
  routine: Routine;
  day: RoutineDay;
  routines: Routine[];
  previousByName?: PreviousByNameData;
  onStart: (routine: Routine, day: RoutineDay) => void;
  onPickDay: (routine: Routine, day: RoutineDay) => void;
  onChangeRoutine: (routineId: string) => void;
}

type Panel = "none" | "days" | "routines";

const NextWorkoutCard = ({
  routine, day, routines, previousByName, onStart, onPickDay, onChangeRoutine,
}: NextWorkoutCardProps) => {
  const [panel, setPanel] = useState<Panel>("none");
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? "none" : p));

  const dayName = getDayName(day);
  const daySubtitle = getDaySubtitle(day);

  // The muscle groups this day hits, in order, deduped — a one-glance answer to
  // "what am I training today?" before reading a single exercise name.
  const muscleGroups = Array.from(new Set(day.exercises.map((e) => e.muscleGroup).filter(Boolean))) as string[];

  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-lg">
        {/* Hero */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-primary uppercase tracking-[0.15em] mb-1">Next Workout</p>
              <h2 className="text-3xl font-black text-foreground leading-none tracking-tight">{dayName}</h2>
              <p className="text-sm text-muted-foreground mt-1.5 truncate">
                {routine.name}{daySubtitle && ` · ${daySubtitle}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-black font-mono-display text-foreground leading-none">{day.exercises.length}</p>
              <p className="text-[11px] text-muted-foreground mt-1">exercises</p>
            </div>
          </div>

          {muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {muscleGroups.map((g) => (
                <span key={g} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Big play CTA — the one place the accent gets full saturation */}
          <button
            onClick={() => onStart(routine, day)}
            className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-black text-lg flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform shadow-lg glow-emerald"
          >
            <Play size={22} fill="currentColor" />
            Start Workout
          </button>
        </div>

        {/* The routine, previewed */}
        <div className="border-t border-border divide-y divide-border">
          {day.exercises.map((ex, i) => {
            const last = previousByName?.[ex.name];
            const target = getMuscleTargetFor(ex.name);
            return (
              <div key={ex.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 text-center text-xs font-bold font-mono-display text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <span className="w-8 h-8 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden py-0.5">
                  <MuscleBodyDiagram view={target.view} highlight={target.muscles} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ex.defaultSets || 3} × {ex.defaultReps || 10}
                    {last && <span className="text-muted-foreground/70"> · last {last.weight}kg</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pick another day within the routine you're following */}
      <button
        onClick={() => toggle("days")}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
      >
        <CalendarDays size={16} />
        Train a different day
        <ChevronDown size={16} className={cn("transition-transform", panel === "days" && "rotate-180")} />
      </button>

      {panel === "days" && (
        <div className="rounded-2xl bg-card border border-border p-3 space-y-1.5">
          {routine.days.map((d) => {
            const isCurrent = d.id === day.id;
            return (
              <button
                key={d.id}
                onClick={() => { onPickDay(routine, d); setPanel("none"); }}
                className={cn(
                  "w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left active:scale-[0.98] transition-transform",
                  isCurrent ? "bg-primary/15 border border-primary/30" : "bg-muted"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{getDayName(d)}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {getDaySubtitle(d) ? `${getDaySubtitle(d)} · ` : ""}{d.exercises.length} exercises
                  </p>
                </div>
                <Play size={16} className={cn("shrink-0", isCurrent ? "text-primary" : "text-muted-foreground")} />
              </button>
            );
          })}
        </div>
      )}

      {/* Switching routine is a rarer, deliberate action, so it's secondary */}
      {routines.length > 1 && (
        <>
          <button
            onClick={() => toggle("routines")}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl text-muted-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            <Repeat size={15} />
            Change routine
            <ChevronDown size={15} className={cn("transition-transform", panel === "routines" && "rotate-180")} />
          </button>

          {panel === "routines" && (
            <div className="rounded-2xl bg-card border border-border p-3 space-y-1.5">
              {routines.map((r) => {
                const isActive = r.id === routine.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => { onChangeRoutine(r.id); setPanel("none"); }}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left active:scale-[0.98] transition-transform",
                      isActive ? "bg-primary/15 border border-primary/30" : "bg-muted"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.days.length} {r.days.length === 1 ? "day" : "days"}
                      </p>
                    </div>
                    {isActive
                      ? <Check size={16} className="text-primary shrink-0" />
                      : <span className="text-[11px] font-semibold text-muted-foreground shrink-0">Use</span>}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NextWorkoutCard;
