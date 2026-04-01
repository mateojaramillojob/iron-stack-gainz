import { useEffect, useState } from "react";
import { Coins, Trophy, Flame, Dumbbell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreditRewardModalProps {
  open: boolean;
  onClose: () => void;
  breakdown: { label: string; amount: number }[];
  total: number;
  newBalance: number;
}

const CreditRewardModal = ({ open, onClose, breakdown, total, newBalance }: CreditRewardModalProps) => {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setShowDetails(true), 400);
      return () => clearTimeout(t);
    } else {
      setShowDetails(false);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button onClick={onClose} className="p-1 text-muted-foreground"><X size={18} /></button>
            </div>

            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-3"
              >
                <Coins size={32} className="text-warning" />
              </motion.div>
              <h3 className="text-xl font-black text-foreground">Muscle Credits Earned!</h3>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-3xl font-black text-warning mt-2"
              >
                +{total}
              </motion.p>
            </div>

            {showDetails && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 mb-4"
              >
                {breakdown.map((b, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                    <span className="text-sm text-foreground">{b.label}</span>
                    <span className="text-sm font-bold text-warning">+{b.amount}</span>
                  </div>
                ))}
              </motion.div>
            )}

            <div className="text-center bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">New Balance</p>
              <p className="text-lg font-bold text-warning flex items-center justify-center gap-1">
                <Coins size={16} /> {newBalance}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-transform"
            >
              Awesome! 💪
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreditRewardModal;
