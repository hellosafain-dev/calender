import React from 'react';
import { ThemeConfig } from '../lib/themes.js';

interface DynamicCalendarIconProps {
  theme: ThemeConfig;
  className?: string; // for custom sizes
  dayNumber?: number; // optional overrides, otherwise defaults to today's date
}

export default function DynamicCalendarIcon({ theme, className = "w-6 h-6", dayNumber }: DynamicCalendarIconProps) {
  const today = new Date();
  const displayDay = dayNumber !== undefined ? dayNumber : today.getDate();

  const bgClass = theme.accent;
  const textClass = theme.accentText || "text-white";

  return (
    <div className={`relative ${bgClass} rounded-[28%] aspect-square flex items-center justify-center p-[12%] shadow-sm ${className}`}>
      {/* Calendar White Page */}
      <div className="w-full h-full bg-white rounded-[22%] flex flex-col items-center justify-center relative p-[8%] select-none">
        
        {/* Binder Rings/Tabs at top (recreates the classic look) */}
        <div className="absolute top-[8%] left-[28%] w-[10%] h-[15%] bg-black/10 dark:bg-black/20 rounded-full" />
        <div className="absolute top-[8%] right-[28%] w-[10%] h-[15%] bg-black/10 dark:bg-black/20 rounded-full" />
        
        {/* Date text */}
        <span className={`text-[46%] font-black tracking-tighter leading-none ${textClass} mt-[10%] font-sans`}>
          {displayDay}
        </span>
      </div>
    </div>
  );
}
