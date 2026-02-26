import { useState, useEffect, useCallback, useRef } from "react";

interface RestTimerProps {
  onClose: () => void;
}

const RestTimer = ({ onClose }: RestTimerProps) => {
  const [seconds, setSeconds] = useState(90);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const addTime = useCallback(() => setSeconds((s) => s + 30), []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = ((90 - seconds) / 90) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border p-4 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="24" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono-display text-sm font-bold text-foreground">
              {mins}:{secs.toString().padStart(2, "0")}
            </span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">Rest Timer</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addTime}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground active:scale-95 transition-transform"
          >
            +30s
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground active:scale-95 transition-transform"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestTimer;
