import { useMemo } from "react";
import { Routine, WorkoutSession } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2, History } from "lucide-react";
import { getDayName } from "@/lib/routineNaming";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RecentSessionsProps {
  sessions: WorkoutSession[];
  routines: Routine[];
  onEditSession?: (session: WorkoutSession) => void;
  onDeleteSession?: (sessionId: string) => void;
}

const RECENT_COUNT = 3;

const RecentSessions = ({ sessions, routines, onEditSession, onDeleteSession }: RecentSessionsProps) => {
  // Sessions store the label as it was at the time; resolve back to the live
  // day so a renamed or derived name shows here too.
  const nameFor = (s: WorkoutSession) => {
    const day = routines.find((r) => r.id === s.routineId)?.days.find((d) => d.id === s.dayId);
    return day ? getDayName(day) : s.dayLabel;
  };
  const recent = useMemo(
    () => [...sessions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, RECENT_COUNT),
    [sessions]
  );

  return (
    <div className="rounded-3xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <History size={16} className="text-muted-foreground" />
        <h3 className="text-sm font-bold text-foreground">Recent Sessions</h3>
      </div>

      {recent.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-6">No sessions logged yet.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((session) => (
            <div key={session.id} className="flex items-center gap-1 p-3 rounded-2xl bg-muted">
              <button
                onClick={() => onEditSession?.(session)}
                className="flex-1 min-w-0 text-left active:scale-[0.98] transition-transform"
              >
                <p className="text-sm font-semibold text-foreground truncate">
                  {nameFor(session)}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {session.routineName} · {format(parseISO(session.date), "d MMM yyyy")}
                </p>
              </button>
              {onEditSession && (
                <button
                  onClick={() => onEditSession(session)}
                  aria-label="Edit session"
                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground active:text-primary active:scale-95 transition-transform"
                >
                  <Pencil size={15} />
                </button>
              )}
              {onDeleteSession && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      aria-label="Delete session"
                      className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground active:text-destructive active:scale-95 transition-transform"
                    >
                      <Trash2 size={15} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the "{nameFor(session)}" session from{" "}
                        {format(parseISO(session.date), "MMM d, yyyy")}. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteSession(session.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentSessions;
