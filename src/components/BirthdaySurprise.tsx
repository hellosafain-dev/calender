import React from "react";
import { motion } from "motion/react";
import { X, Sparkles, Heart } from "lucide-react";
import GlowingLanterns from "./GlowingLanterns.js";

interface BirthdaySurpriseProps {
  onClose: () => void;
}

export default function BirthdaySurprise({ onClose }: BirthdaySurpriseProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center p-4 py-12 sm:py-20 overflow-y-auto select-none">
      {/* Floating lanterns rising in the pitch black background */}
      <GlowingLanterns />

      {/* Love Letter Container */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 25, delay: 1 }}
        className="relative w-full max-w-lg bg-[#FCF8F2] border-2 border-[#D97706]/40 rounded-[32px] p-6 sm:p-10 shadow-[0_0_50px_rgba(252,211,77,0.3)] text-gray-800 font-serif my-8"
      >
        {/* Subtle ribbon decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-amber-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md">
          <Heart className="w-3.5 h-3.5 fill-current" />
          For My Princess
        </div>

        {/* Elegant Close Cross */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-all active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Letter content */}
        <div className="space-y-6 text-center mt-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-amber-900 tracking-tight flex items-center justify-center gap-1">
              Happy Birthday, My Princess! 🦋
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-amber-700/80 font-sans font-extrabold">
              July 18, {new Date().getFullYear()} — The Bestest Day
            </p>
          </div>

          <hr className="border-t border-dashed border-amber-900/10" />

          <div className="text-left space-y-4 text-sm leading-relaxed text-amber-950/90 font-medium whitespace-pre-line italic px-2 sm:px-4">
            My Dearest Princess,

            From the magical beginning in June 2019, you transformed my world into an endless, enchanting garden in full bloom. Your laughter is my favorite melody, and your cherished presence is my greatest treasure.

            Today, on July 18th — the bestest day of the entire year — I celebrate the wonder and beauty of you. May your path be ever illuminated with boundless peace, unshakeable joy, and enduring love.

            Happy Birthday to my butterfly, my beautiful flower, my precious chamcham, my sunshine, my dream come true, and my absolute everything. 🦋🎂

            Forever & Always Yours,
            <Heart className="w-5 h-5 text-red-500 fill-current inline-block ml-1.5" />
          </div>

          <hr className="border-t border-dashed border-amber-900/10" />

          <div className="flex justify-center gap-2">
            {[...Array(3)].map((_, i) => (
              <Heart key={i} className={`w-4 h-4 text-red-500 fill-current animate-pulse`} style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
