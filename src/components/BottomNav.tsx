/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Heart, Clock, Settings } from "lucide-react";
import { ThemeConfig } from "../lib/themes.js";
import DynamicCalendarIcon from "./DynamicCalendarIcon.js";

interface BottomNavProps {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  theme: ThemeConfig;
}

export default function BottomNav({ activeTab, setActiveTab, theme }: BottomNavProps) {
  const navItems = [
    { id: 0, label: "Calendar" },
    { id: 1, label: "Timeline", icon: Heart },
    { id: 2, label: "Reminders", icon: Clock },
    { id: 3, label: "Settings", icon: Settings },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div 
        id="bottom-nav-container"
        className={`flex items-center gap-1 p-2 rounded-2xl ${theme.card} ${theme.shadow} border backdrop-blur-xl pointer-events-auto max-w-md w-full justify-around md:px-6`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              id={`nav-btn-${item.label.toLowerCase()}`}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center gap-1 py-2 px-3 sm:px-4 rounded-xl cursor-pointer transition-colors duration-200 outline-none select-none"
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-glow"
                  className={`absolute inset-0 rounded-xl ${theme.accentLight} -z-10`}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              
              {item.label === "Calendar" ? (
                <DynamicCalendarIcon
                  theme={theme}
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isActive 
                      ? "scale-110 filter drop-shadow-[0_2px_8px_rgba(236,112,139,0.3)]" 
                      : "opacity-80 hover:opacity-100 hover:scale-105"
                  }`}
                />
              ) : (
                Icon && (
                  <Icon 
                    id={`nav-icon-${item.label.toLowerCase()}`}
                    className={`w-5 h-5 transition-transform duration-300 ${
                      isActive 
                        ? `${theme.accentText} scale-110` 
                        : `${theme.textSecondary} hover:scale-105 hover:${theme.textPrimary}`
                    }`} 
                  />
                )
              )}
              
              <span 
                id={`nav-text-${item.label.toLowerCase()}`}
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? theme.textPrimary : theme.textSecondary
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

