import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

interface Lantern {
  id: number;
  x: number; // percentage horizontal
  size: number; // size in px
  delay: number; // animation delay in seconds
  duration: number; // animation duration in seconds
  opacity: number;
  glowColor: string;
}

export default function GlowingLanterns() {
  const [lanterns, setLanterns] = useState<Lantern[]>([]);

  useEffect(() => {
    // Generate 25 floating lanterns with random properties
    const list: Lantern[] = Array.from({ length: 25 }).map((_, idx) => {
      const size = Math.random() * 24 + 16; // 16px to 40px
      const x = Math.random() * 100; // 0% to 100%
      const delay = Math.random() * 12; // 0s to 12s delay
      const duration = Math.random() * 18 + 14; // 14s to 32s float time
      const opacity = Math.random() * 0.4 + 0.55; // 0.55 to 0.95 opacity
      const glowColors = [
        "rgba(252,211,77,0.8)", // bright golden
        "rgba(245,158,11,0.8)", // amber
        "rgba(251,146,60,0.8)", // warm orange
      ];
      const glowColor = glowColors[Math.floor(Math.random() * glowColors.length)];

      return { id: idx, x, size, delay, duration, opacity, glowColor };
    });
    setLanterns(list);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {lanterns.map((l) => (
        <motion.div
          key={l.id}
          initial={{ y: "105vh", x: `${l.x}vw`, opacity: 0, rotate: Math.random() * 15 - 7.5 }}
          animate={{
            y: "-15vh",
            x: [
              `${l.x}vw`,
              `${l.x + (Math.random() * 10 - 5)}vw`,
              `${l.x + (Math.random() * 14 - 7)}vw`
            ],
            opacity: [0, l.opacity, l.opacity, 0],
            rotate: [Math.random() * 15 - 7.5, Math.random() * 30 - 15, Math.random() * 15 - 7.5],
          }}
          transition={{
            duration: l.duration,
            delay: l.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            position: "absolute",
            width: l.size,
            height: l.size * 1.35,
          }}
        >
          {/* Lantern outer shell */}
          <div
            className="w-full h-full rounded-b-xl rounded-t-3xl relative flex flex-col justify-between items-center p-1 border border-amber-300/30"
            style={{
              background: "linear-gradient(to bottom, #FEF08A, #F59E0B)",
              boxShadow: `0 0 25px 6px ${l.glowColor}, inset 0 0 10px rgba(255,255,255,0.6)`,
            }}
          >
            {/* Lantern top cap ring */}
            <div className="w-1/3 h-1 rounded bg-amber-700/80 -mt-1.5 shadow-sm" />

            {/* Inner glowing flame */}
            <div
              className="w-2/5 h-2/5 rounded-full bg-white animate-pulse"
              style={{
                boxShadow: "0 0 12px 4px rgba(255, 255, 255, 1)",
              }}
            />

            {/* Bottom tassels/decorations */}
            <div className="w-full flex justify-around px-1 mt-auto">
              <div className="w-0.5 h-2 bg-amber-700/60 rounded" />
              <div className="w-0.5 h-3 bg-amber-800/80 rounded" />
              <div className="w-0.5 h-2 bg-amber-700/60 rounded" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
