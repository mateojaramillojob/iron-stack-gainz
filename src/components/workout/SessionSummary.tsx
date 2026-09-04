import { useMemo } from "react";
import { WorkoutSession } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { parseISO, startOfWeek, isWithinInterval, endOfWeek } from "date-fns";
import { Trophy, TrendingUp, Flame, Coins, ArrowUp, Check } from "lucide-react";

interface SessionSummaryProps {
  open: boolean;
  session: WorkoutSession | null;
  /** All sessions INCLUDING the one just finished. */
  sessions: WorkoutSession[];
  profileName?: string;
  creditsEarned: number;
  onClose: () => void;
}

const WEEK_OPTS = { weekStartsOn: 1 as const };

const SessionSummary = ({ open, session, sessions, profileName, creditsEarned, onClose }: SessionSummaryProps) => {
  const summary = useMemo(() => {
    if (!session) return null;

    // Compare each lift against the best it had reached BEFORE today.
    const priorBest: Record<string, number> = {};
    sessions
      .filter((s) => s.id !== session.id && new Date(s.date) < new Date(session.date))
      .forEach((s) => s.exercises.forEach((e) => {
        priorBest[e.exerciseName] = Math.max(priorBest[e.exerciseName] || 0, e.weight);
      }));

    const improved: { name: string; gain: number; weight: number }[] = [];
    const firstTime: string[] = [];
    session.exercises.forEach((e) => {
      const before = priorBest[e.exerciseName];
      if (before === undefined) firstTime.push(e.exerciseName);
      else if (e.weight > before) improved.push({ name: e.exerciseName, gain: e.weight - before, weight: e.weight });
    });
    improved.sort((a, b) => b.gain - a.gain);

    const week = {
      start: startOfWeek(parseISO(session.date), WEEK_OPTS),
      end: endOfWeek(parseISO(session.date), WEEK_OPTS),
    };
    const thisWeek = sessions.filter((s) => isWithinInterval(parseISO(s.date), week)).length;

    // Consecutive Mon-start weeks with at least one session.
    const trained = new Set(sessions.map((s) => startOfWeek(parseISO(s.date), WEEK_OPTS).toISOString()));
    let streak = 0;
    for (let i = 0; i < 260; i++) {
      const wk = new Date(week.start);
      wk.setDate(wk.getDate() - i * 7);
      if (trained.has(startOfWeek(wk, WEEK_OPTS).toISOString())) streak++;
      else break;
    }

    return { improved, firstTime, thisWeek, streak, exerciseCount: session.exercises.length };
  }, [session, sessions]);

  if (!summary || !session) return null;

  const { improved, firstTime, thisWeek, streak, exerciseCount } = summary;

  const headline = improved.length > 0
    ? `${improved.length} lift${improved.length > 1 ? "s" : ""} went up`
    : firstTime.length > 0
      ? "New ground covered"
      : "Session logged";

  const subline = improved.length > 0
    ? "You beat your previous best today."
    : `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"} in the bank. Consistency is the win.`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="bg-card rounded-3xl border border-border p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 400 }}
                className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3"
              >
                {improved.length > 0
                  ? <TrendingUp size={30} className="text-primary" />
                  : <Check size={30} className="text-primary" />}
              </motion.div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">
                {profileName ? `Nice work, ${profileName}` : "Nice work"}
              </p>
              <h3 className="text-2xl font-black text-foreground leading-tight">{headline}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">{subline}</p>
            </div>

            {/* What actually moved — the part worth reading */}
            {improved.length > 0 && (
              <div className="space-y-2 mb-4">
                {improved.slice(0, 4).map(({ name, gain, weight }) => (
                  <div key={name} className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-primary/10">
                    <ArrowUp size={15} className="text-primary shrink-0" />
                    <span className="text-sm font-semibold text-foreground truncate flex-1">{name}</span>
                    <span className="text-sm font-black font-mono-display text-primary shrink-0">
                      +{gain}kg
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">→ {weight}kg</span>
                  </div>
                ))}
              </div>
            )}

            {firstTime.length > 0 && improved.length === 0 && (
              <div className="mb-4 px-3 py-2.5 rounded-2xl bg-muted">
                <p className="text-xs text-muted-foreground">
                  First time logging{" "}
                  <span className="font-semibold text-foreground">{firstTime.slice(0, 3).join(", ")}</span>
                  {firstTime.length > 3 && ` +${firstTime.length - 3} more`}. That's your baseline set.
                </p>
              </div>
            )}

            {/* Rhythm, not raw tonnage */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { icon: Flame, value: String(thisWeek), label: thisWeek === 1 ? "session this week" : "sessions this week" },
                { icon: Trophy, value: String(streak), label: streak === 1 ? "week streak" : "weeks in a row" },
                { icon: Coins, value: `+${creditsEarned}`, label: "credits" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-2xl bg-muted p-3 text-center">
                  <Icon size={14} className="text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-xl font-black font-mono-display text-foreground leading-none">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full h-13 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-transform"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionSummary;
