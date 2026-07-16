import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, BellRing } from 'lucide-react';
import { Reminder } from '../types.js';

interface AlarmOverlayProps {
  reminder: Reminder | null;
  onDismiss: () => void;
  onSnooze: () => void;
  typeMetaLabel: string;
  getIcon: (className: string) => React.ReactNode;
}

export default function AlarmOverlay({ reminder, onDismiss, onSnooze, typeMetaLabel, getIcon }: AlarmOverlayProps) {
  return (
    <AnimatePresence>
      {reminder && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 16, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-0 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none"
        >
          {/* iOS Dynamic Island / Premium Android Heads-Up Style */}
          <div className="w-full max-w-md pointer-events-auto bg-black/70 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[28px] overflow-hidden">
            <div className="flex flex-col p-4">
              
              {/* Header area with Icon and Title */}
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg"
                  >
                    {getIcon("w-6 h-6 text-white")}
                  </motion.div>
                  {/* Subtle pulsing ring */}
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-pink-400"
                  />
                </div>
                
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-pink-400/90">
                      {typeMetaLabel} Alarm
                    </p>
                    <p className="text-[10px] font-bold text-white/50">{reminder.time}</p>
                  </div>
                  
                  {(() => {
                    const parts = reminder.title.split("|");
                    const mainTitle = parts[0].trim();
                    const loveNote = parts[1]?.trim();
                    return (
                      <div className="mt-1">
                        <h2 className="text-base font-bold text-white leading-tight truncate">{mainTitle}</h2>
                        {loveNote && (
                          <div className="mt-2 p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
                            <Mail className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                            <p className="text-white/80 text-xs italic leading-snug line-clamp-2">"{loveNote}"</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <button 
                  onClick={onSnooze}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold active:scale-95 transition-all"
                >
                  Snooze 5m
                </button>
                <button 
                  onClick={onDismiss}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white text-xs font-bold shadow-[0_0_15px_rgba(236,112,139,0.4)] active:scale-95 transition-all"
                >
                  Dismiss
                </button>
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
