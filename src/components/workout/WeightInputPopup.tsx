import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Info } from "lucide-react";
import ExerciseGuideModal from "./ExerciseGuideModal";

interface WeightInputPopupProps {
  exerciseName: string;
  initialWeight: string;
  initialReps: string;
  initialSeries: string;
  defaultReps?: number;
  defaultSets?: number;
  onSave: (weight: string, reps: string, series: string) => void;
  onBack: () => void;
}

const WEIGHT_OPTIONS = Array.from({ length: 80 }, (_, i) => (i + 1) * 2.5);
const REPS_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);
const SETS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

const ScrollSelector = ({ values, selected, onChange, label }: {
  values: number[];
  selected: number;
  onChange: (v: number) => void;
  label: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44;

  useEffect(() => {
    if (containerRef.current) {
      const idx = values.indexOf(selected);
      if (idx >= 0) {
        containerRef.current.scrollTop = idx * itemHeight - itemHeight * 2;
      }
    }
  }, []);

  return (
    <div className="flex-1">
      <p className="text-xs text-muted-foreground font-semibold text-center mb-2">{label}</p>
      <div ref={containerRef} className="h-[220px] overflow-y-auto rounded-xl bg-muted scrollbar-thin relative">
        <div className="absolute inset-x-0 top-[88px] h-[44px] bg-primary/15 rounded-lg pointer-events-none z-10 border-y border-primary/30" />
        {values.map((v) => (
          <button key={v} onClick={() => onChange(v)}
            className={`w-full h-[44px] flex items-center justify-center text-base font-bold transition-colors relative z-20 ${
              selected === v ? "text-primary" : "text-muted-foreground"
            }`}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
};

const WeightInputPopup = ({ exerciseName, initialWeight, initialReps, initialSeries, defaultReps, defaultSets, onSave, onBack }: WeightInputPopupProps) => {
  const [weight, setWeight] = useState(parseFloat(initialWeight) || 20);
  const [reps, setReps] = useState(parseInt(initialReps) || defaultReps || 10);
  const [series, setSeries] = useState(parseInt(initialSeries) || defaultSets || 3);
  const [showGuide, setShowGuide] = useState(false);

  const vol = weight * reps * series;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-md bg-card rounded-t-2xl border-t border-border p-5 pb-8 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-muted-foreground active:opacity-70">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">{exerciseName}</h3>
            <button onClick={() => setShowGuide(true)} className="p-1 text-muted-foreground active:text-primary">
              <Info size={16} />
            </button>
          </div>
          <div className="w-12" />
        </div>

        <div className="flex gap-3 mb-4">
          <ScrollSelector values={WEIGHT_OPTIONS} selected={weight} onChange={setWeight} label="Weight (kg)" />
          <ScrollSelector values={REPS_OPTIONS} selected={reps} onChange={setReps} label="Reps" />
          <ScrollSelector values={SETS_OPTIONS} selected={series} onChange={setSeries} label="Sets" />
        </div>

        <div className="bg-muted rounded-xl p-3 mb-4 text-center">
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="text-xl font-bold font-mono-display text-primary">{vol.toLocaleString()} <span className="text-sm text-muted-foreground font-sans">kg</span></p>
        </div>

        <button onClick={() => onSave(String(weight), String(reps), String(series))}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.98] transition-transform glow-emerald">
          Save Exercise
        </button>
      </div>

      <ExerciseGuideModal exerciseName={showGuide ? exerciseName : null} onClose={() => setShowGuide(false)} />
    </div>
  );
};

export default WeightInputPopup;
