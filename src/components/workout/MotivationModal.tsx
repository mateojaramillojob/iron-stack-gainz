import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles } from "lucide-react";

interface MotivationModalProps {
  open: boolean;
  title: string;
  quote: string;
  onDismiss: () => void;
}

const MotivationModal = ({ open, title, quote, onDismiss }: MotivationModalProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl p-6"
      >
        <motion.div
          initial={{ scale: 0.7, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="relative w-full max-w-sm rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-warning/10 pointer-events-none" />
          <motion.div
            initial={{ rotate: -15, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-warning shadow-lg"
          >
            <Flame size={40} className="text-primary-foreground" />
          </motion.div>
          <div className="relative">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Sparkles size={14} className="text-warning" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-warning">AI Coach</span>
              <Sparkles size={14} className="text-warning" />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground mb-3">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{quote}"</p>
            <button
              onClick={onDismiss}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-base active:scale-95 transition-transform shadow-lg shadow-primary/30"
            >
              Let's Go! 🔥
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default MotivationModal;