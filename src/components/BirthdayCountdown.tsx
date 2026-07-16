import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Gift, Lock } from 'lucide-react';

interface BirthdayCountdownProps {
  targetTimeMs: number;
  onUnlock: () => void;
}

export default function BirthdayCountdown({ targetTimeMs, onUnlock }: BirthdayCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, targetTimeMs - Date.now()));
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, targetTimeMs - Date.now());
      setTimeLeft(remaining);

      if (remaining === 0 && !isUnlocked) {
        setIsUnlocked(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTimeMs, isUnlocked]);

  // Format MM:SS
  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Only show if we are within the last 10 minutes (600,000 ms) and it's not opened yet
  const showCountdown = timeLeft <= 600000 && timeLeft > 0;

  return (
    <AnimatePresence>
      {(showCountdown || isUnlocked) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 16 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-0 inset-x-0 z-[90] flex justify-center px-4 pointer-events-none"
        >
          <div className="w-full max-w-sm pointer-events-auto bg-black/80 backdrop-blur-3xl border-2 border-amber-500/30 shadow-[0_10px_40px_rgba(245,158,11,0.3)] rounded-3xl overflow-hidden p-4">
            <div className="flex items-center gap-4">
              
              <div className="relative shrink-0">
                <motion.div
                  animate={isUnlocked ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-500 ${isUnlocked ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-white/10'}`}
                >
                  {isUnlocked ? <Gift className="w-6 h-6 text-white" /> : <Lock className="w-6 h-6 text-white/50" />}
                </motion.div>
                {isUnlocked && (
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl border-2 border-amber-400"
                  />
                )}
              </div>
              
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  {isUnlocked ? "Surprise Unlocked!" : "Birthday Surprise"}
                </p>
                <div className="mt-0.5 flex items-end gap-1">
                  {isUnlocked ? (
                    <h2 className="text-lg font-bold text-white leading-tight">Ready to open!</h2>
                  ) : (
                    <>
                      <h2 className="text-2xl font-black text-white tabular-nums tracking-tight leading-none">{timeString}</h2>
                      <span className="text-xs text-white/50 font-bold mb-0.5">remaining</span>
                    </>
                  )}
                </div>
              </div>

              {isUnlocked && (
                <button
                  onClick={onUnlock}
                  className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 transition-transform flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Open
                </button>
              )}

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
