import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ThemeConfig } from "../../lib/themes.js";

interface LightingLayerProps {
  theme: ThemeConfig;
  isActive?: boolean;
}

export default function LightingLayer({ theme, isActive = true }: LightingLayerProps) {
  const [daypart, setDaypart] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('afternoon');
  const [overlayStyle, setOverlayStyle] = useState({});

  useEffect(() => {
    const updateDaypart = () => {
      const hour = new Date().getHours();
      let currentPart: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon';
      let style = {};

      if (hour >= 5 && hour < 11) {
        currentPart = 'morning';
        // Warm bright morning light
        style = {
          background: 'linear-gradient(135deg, rgba(255,240,200,0.2) 0%, rgba(255,255,255,0) 100%)',
          mixBlendMode: 'overlay',
          opacity: 0.6
        };
      } else if (hour >= 11 && hour < 17) {
        currentPart = 'afternoon';
        // Neutral, clear
        style = {
          background: 'transparent',
          opacity: 1
        };
      } else if (hour >= 17 && hour < 20) {
        currentPart = 'evening';
        // Golden hour / Amber
        style = {
          background: 'linear-gradient(to bottom, rgba(255,165,0,0.15), rgba(255,100,0,0.25))',
          mixBlendMode: 'overlay',
          opacity: 0.7
        };
      } else {
        currentPart = 'night';
        // Cool dark blue tint
        style = {
          background: 'linear-gradient(to bottom, rgba(10,15,40,0.4), rgba(0,5,20,0.6))',
          mixBlendMode: 'multiply',
          opacity: 0.8
        };
      }

      setDaypart(currentPart);
      setOverlayStyle(style);
    };

    updateDaypart();
    const interval = setInterval(updateDaypart, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={overlayStyle}
      transition={{ duration: 2, ease: "easeInOut" }}
      className="fixed inset-0 pointer-events-none z-[3]"
      aria-hidden="true"
    />
  );
}
