/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Plus, Trash2, Calendar, AlertCircle, Sparkles, Check, Bell, BellOff, Volume2, CloudSun } from "lucide-react";
import { Reminder } from "../types.js";
import { ThemeConfig } from "../lib/themes.js";
import { API } from "../lib/api.js";

interface ClockPageProps {
  reminders: Reminder[];
  onRefreshReminders: () => void;
  theme: ThemeConfig;
}

export default function ClockPage({ reminders, onRefreshReminders, theme }: ClockPageProps) {
  const [time, setTime] = useState(new Date());
  
  // States for creating a reminder
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [reminderTime, setReminderTime] = useState("08:00");
  const [reminderDate, setReminderDate] = useState("");
  const [repeat, setRepeat] = useState<Reminder['repeat']>("none");
  const [type, setType] = useState<Reminder['type']>("custom");

  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);

  // Filter reminders list state
  const [activeFilter, setActiveFilter] = useState("all");

  // Motivational Greeting
  const [greeting, setGreeting] = useState("Good morning");

  // Soothing synthesized sound chime
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const freqs = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5 (Major 7th Chord)
      
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        
        const start = ctx.currentTime + i * 0.12;
        const duration = 1.6 - i * 0.1;
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      });
    } catch (err) {
      console.warn("Audio Context blocked:", err);
    }
  };

  useEffect(() => {
    // Smooth sweeping clock updates
    let animationFrameId: number;
    
    const updateTime = () => {
      setTime(new Date());
      animationFrameId = requestAnimationFrame(updateTime);
    };
    
    animationFrameId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Update motivational greeting based on time of day
  useEffect(() => {
    const hours = time.getHours();
    if (hours < 12) {
      setGreeting("Good morning, sweet soul. May today bring you peace.");
    } else if (hours < 17) {
      setGreeting("Good afternoon, love. Take a gentle breath and smile.");
    } else {
      setGreeting("Good evening, beautiful. Let the quiet of the night warm your heart.");
    }
  }, [time]);

  // Analog clock hands rotational degrees
  const hrs = time.getHours();
  const mins = time.getMinutes();
  const secs = time.getSeconds();
  const ms = time.getMilliseconds();

  const secondsDegrees = (secs * 6) + (ms * 0.006);
  const minutesDegrees = (mins * 6) + (secs * 0.1);
  const hoursDegrees = ((hrs % 12) * 30) + (mins * 0.5);

  // Filter reminders based on selected filter tab
  const filteredReminders = reminders.filter((r) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "active") return r.isActive;
    return r.type === activeFilter;
  });

  // Submit new reminder
  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !reminderTime) return;

    try {
      const result = await API.createReminder({
        title,
        time: reminderTime,
        date: reminderDate || undefined,
        repeat,
        type
      });
      if (result.success) {
        setTitle("");
        setReminderTime("08:00");
        setReminderDate("");
        setRepeat("none");
        setType("custom");
        setIsAdding(false);
        onRefreshReminders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle reminder active status
  const handleToggleReminder = async (id: string, currentStatus: boolean) => {
    try {
      await API.updateReminder(id, { isActive: !currentStatus });
      onRefreshReminders();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete reminder
  const handleDeleteReminder = (id: string) => {
    setDeletingReminderId(id);
  };

  const confirmDeleteReminder = async () => {
    if (!deletingReminderId) return;
    try {
      const result = await API.deleteReminder(deletingReminderId);
      if (result.success) {
        onRefreshReminders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingReminderId(null);
    }
  };

  const getTypeIcon = (type: Reminder['type']) => {
    switch (type) {
      case "anniversary": return "💖";
      case "birthday": return "🎂";
      case "prayer": return "🙏";
      case "medicine": return "💊";
      default: return "🌸";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-32">
      {/* Header */}
      <div className="text-center mb-8 mt-4">
        <h2 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${theme.textPrimary} font-sans`}>
          Clock & Reminders
        </h2>
        <p className={`text-xs mt-2 ${theme.textSecondary} tracking-widest uppercase`}>
          A quiet rhythm of our beautiful days
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left Column: Sweeping Analog & Digital Clock */}
        <div className="flex flex-col items-center space-y-6">
          {/* Glassmorphic Sweeping Analog Clock */}
          <div className="relative">
            {/* outer halo shadow */}
            <div className={`absolute inset-0 rounded-full ${theme.analogClockGlow} pointer-events-none blur-xl`} />

            {/* Main Dial container */}
            <div className={`w-64 h-64 md:w-72 md:h-72 rounded-full relative flex items-center justify-center ${theme.analogClockBg} ${theme.shadow} border-2 border-white/40 dark:border-white/10 backdrop-blur-xl z-10`}>
              {/* Dial markings */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-[10px] font-bold text-gray-400 select-none"
                  style={{
                    transform: `rotate(${i * 30}deg) translateY(-110px) rotate(-${i * 30}deg)`,
                    // Adjust offsets slightly for standard numbers
                    marginTop: i === 0 || i === 6 ? "4px" : "0",
                  }}
                >
                  {i === 0 ? "12" : i}
                </div>
              ))}

              {/* Hour Hand */}
              <div
                className="absolute rounded-full bg-slate-800 dark:bg-slate-100 shadow-sm"
                style={{
                  width: "6px",
                  height: "64px",
                  marginLeft: "-3px",
                  bottom: "50%",
                  left: "50%",
                  transform: `rotate(${hoursDegrees}deg)`,
                  transformOrigin: "bottom center",
                  transition: "transform 0.1s ease-out",
                }}
              />

              {/* Minute Hand */}
              <div
                className="absolute rounded-full bg-slate-500 dark:bg-slate-300 shadow-sm"
                style={{
                  width: "4px",
                  height: "88px",
                  marginLeft: "-2px",
                  bottom: "50%",
                  left: "50%",
                  transform: `rotate(${minutesDegrees}deg)`,
                  transformOrigin: "bottom center",
                  transition: "transform 0.1s ease-out",
                }}
              />

              {/* Sweeping Gold Seconds Hand */}
              <div
                className="absolute rounded-full bg-[#EC708B]"
                style={{
                  width: "2px",
                  height: "94px",
                  marginLeft: "-1px",
                  bottom: "50%",
                  left: "50%",
                  transform: `rotate(${secondsDegrees}deg)`,
                  transformOrigin: "bottom center",
                }}
              />

              {/* Center Pin */}
              <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-[#EC708B] z-30 shadow" />
            </div>
          </div>

          {/* Large Digital Clock & Weather */}
          <div className="text-center space-y-1">
            <h3 className={`text-4xl font-extrabold font-sans tracking-tight ${theme.textPrimary}`}>
              {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            </h3>
            <p className={`text-xs ${theme.textSecondary} italic max-w-xs mx-auto leading-relaxed px-4`}>
              "{greeting}"
            </p>
          </div>
        </div>

        {/* Right Column: Reminders Panel */}
        <div className="space-y-6 w-full">
          <div className={`rounded-3xl p-5 md:p-6 ${theme.card} ${theme.shadow} border ${theme.border} relative overflow-hidden`}>
            
            {/* Header / Trigger */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-pink-400 animate-bounce" />
                <h3 className={`text-lg font-bold font-sans ${theme.textPrimary}`}>
                  Today's Reminders
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Interactive Test Chime button */}
                <button
                  onClick={playChime}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold border ${theme.border} bg-neutral-500/5 ${theme.textSecondary} hover:bg-neutral-500/10 cursor-pointer transition-all active:scale-95`}
                  title="Test soothing garden chime"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Test Chime</span>
                </button>

                <button
                  id="add-reminder-trigger"
                  onClick={() => setIsAdding(!isAdding)}
                  className={`p-2 rounded-full ${theme.accent} ${theme.accentHover} text-white cursor-pointer shadow-sm transition-all duration-300 active:scale-95 flex items-center justify-center`}
                >
                  <motion.div
                    animate={{ rotate: isAdding ? 135 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.div>
                </button>
              </div>
            </div>

            {/* Quick Add Form Panel */}
            <AnimatePresence>
              {isAdding && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleCreateReminder}
                  className={`space-y-4 mb-6 p-4 rounded-2xl border ${theme.border} bg-black/5 dark:bg-black/25 overflow-hidden`}
                >
                  <h4 className={`text-xs font-bold ${theme.accentText} uppercase tracking-wider`}>
                    Create Sacred Reminder
                  </h4>
                  
                  <input
                    type="text"
                    required
                    placeholder="Reminder title (e.g., Anniversary)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/50 dark:bg-[#14121F] ${theme.textPrimary} placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50`}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-[10px] font-bold ${theme.textSecondary} block mb-1`}>Time</label>
                      <input
                        type="time"
                        required
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/50 dark:bg-[#14121F] ${theme.textPrimary} focus:outline-none focus:ring-1 focus:ring-pink-500/50`}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] font-bold ${theme.textSecondary} block mb-1`}>Date (Optional)</label>
                      <input
                        type="date"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/50 dark:bg-[#14121F] ${theme.textPrimary} focus:outline-none focus:ring-1 focus:ring-pink-500/50`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-[10px] font-bold ${theme.textSecondary} block mb-1`}>Repeat</label>
                      <select
                        value={repeat}
                        onChange={(e) => setRepeat(e.target.value as Reminder['repeat'])}
                        className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/50 dark:bg-[#14121F] ${theme.textPrimary} focus:outline-none focus:ring-1 focus:ring-pink-500/50`}
                      >
                        <option value="none" className="bg-neutral-900 text-white">Once</option>
                        <option value="daily" className="bg-neutral-900 text-white">Daily</option>
                        <option value="weekly" className="bg-neutral-900 text-white">Weekly</option>
                        <option value="monthly" className="bg-neutral-900 text-white">Monthly</option>
                        <option value="yearly" className="bg-neutral-900 text-white">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-[10px] font-bold ${theme.textSecondary} block mb-1`}>Type</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as Reminder['type'])}
                        className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/50 dark:bg-[#14121F] ${theme.textPrimary} focus:outline-none focus:ring-1 focus:ring-pink-500/50`}
                      >
                        <option value="custom" className="bg-neutral-900 text-white">General 🌸</option>
                        <option value="anniversary" className="bg-neutral-900 text-white">Anniversary 💖</option>
                        <option value="birthday" className="bg-neutral-900 text-white">Birthday 🎂</option>
                        <option value="prayer" className="bg-neutral-900 text-white">Prayer 🙏</option>
                        <option value="medicine" className="bg-neutral-900 text-white">Medicine 💊</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className={`px-3 py-1.5 text-[10px] font-bold ${theme.textSecondary} hover:bg-neutral-500/10 border ${theme.border} rounded-xl cursor-pointer transition-colors`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-3 py-1.5 text-[10px] font-bold text-white ${theme.accent} ${theme.accentHover} rounded-xl cursor-pointer shadow-sm transition-colors`}
                    >
                      Save Reminder
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Horizontal Filter Tabs */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800 scrollbar-track-transparent">
              {["all", "active", "anniversary", "birthday", "prayer", "medicine"].map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold capitalize transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? `${theme.accent} text-white shadow-sm`
                        : `bg-neutral-500/5 ${theme.textSecondary} hover:bg-neutral-500/10`
                    }`}
                  >
                    {filter === "all" ? "All 🌸" :
                     filter === "active" ? "Active 🔔" :
                     filter === "anniversary" ? "Anniversary 💖" :
                     filter === "birthday" ? "Birthday 🎂" :
                     filter === "prayer" ? "Prayer 🙏" :
                     filter === "medicine" ? "Medicine 💊" : filter}
                  </button>
                );
              })}
            </div>

            {/* Reminders List */}
            <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredReminders.length === 0 ? (
                <div className={`text-center py-12 text-xs ${theme.textSecondary}`}>
                  <BellOff className="w-8 h-8 mx-auto mb-3 opacity-40 animate-pulse text-neutral-400" />
                  <p className="font-medium">No matching reminders found</p>
                  <p className="text-[10px] mt-1 opacity-70">Create a reminder or try another filter</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      id={`reminder-item-${reminder.id}`}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 ${
                        reminder.isActive 
                          ? `${theme.accentLight}/40 ${theme.border} shadow-sm` 
                          : "bg-black/5 dark:bg-white/5 border-transparent opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg w-9 h-9 rounded-full flex items-center justify-center border ${reminder.isActive ? 'bg-white/80 dark:bg-black/40 border-pink-100/20' : 'bg-neutral-200/50 dark:bg-neutral-800/50 border-transparent'}`}>
                          {getTypeIcon(reminder.type)}
                        </span>
                        <div>
                          <h4 className={`text-xs font-bold ${reminder.isActive ? theme.textPrimary : `${theme.textSecondary} line-through`}`}>
                            {reminder.title}
                          </h4>
                          <div className={`flex items-center gap-2 mt-1 text-[10px] font-semibold ${theme.textSecondary}`}>
                            <span className="inline-flex items-center gap-0.5">🕒 {reminder.time}</span>
                            {reminder.repeat !== "none" && (
                              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                🔁 {reminder.repeat}
                              </span>
                            )}
                            {reminder.date && (
                              <span className="opacity-85">📅 {reminder.date}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Toggle */}
                        <button
                          id={`toggle-reminder-${reminder.id}`}
                          onClick={() => handleToggleReminder(reminder.id, reminder.isActive)}
                          className={`w-9 h-5 rounded-full relative flex items-center p-0.5 cursor-pointer outline-none transition-colors duration-300 ${
                            reminder.isActive ? theme.accent : "bg-neutral-300 dark:bg-neutral-700"
                          }`}
                        >
                          <motion.div
                            layout
                            className="w-4 h-4 rounded-full bg-white shadow-sm"
                            animate={{ x: reminder.isActive ? 16 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>

                        {/* Delete Button */}
                        <button
                          id={`delete-reminder-${reminder.id}`}
                          onClick={() => handleDeleteReminder(reminder.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Reminder Confirmation Modal */}
      <AnimatePresence>
        {deletingReminderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-3xl p-6 ${theme.card} border ${theme.border} shadow-xl space-y-4 text-left`}
            >
              <h3 className={`text-lg font-bold ${theme.textPrimary}`}>
                Remove this reminder?
              </h3>
              <p className={`text-xs ${theme.textSecondary}`}>
                Are you sure you want to remove this reminder flower? You will no longer receive notifications for it.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  id="cancel-delete-reminder-btn"
                  onClick={() => setDeletingReminderId(null)}
                  className={`px-4 py-2 text-xs font-bold ${theme.textSecondary} hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors`}
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-reminder-btn"
                  onClick={confirmDeleteReminder}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer transition-colors"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
