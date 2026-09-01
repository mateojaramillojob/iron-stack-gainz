import { useMemo } from "react";
import { WorkoutSession } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2, History } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RecentSessionsProps {
  sessions: WorkoutSession[];
  onEditSession?: (session: WorkoutSession) => void;
  onDeleteSession?: (sessionId: string) => void;
}

const RECENT_COUNT = 5;

const RecentSessions = ({ sessions, onEditSession, onDeleteSession }: RecentSessionsProps) => {
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
                  {session.routineName} — {session.dayLabel}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {format(parseISO(session.date), "MMM d, yyyy")} · {session.totalVolume.toLocaleString()} kg
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
                        This will permanently remove the "{session.routineName} — {session.dayLabel}" session from{" "}
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
