/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, BellOff, Trash2, Plus, Volume2, Sparkles,
  ChevronRight, Mic, Loader2, CheckCircle2, X, Calendar,
} from "lucide-react";
import { Reminder } from "../types.js";
import { ThemeConfig } from "../lib/themes.js";
import { API } from "../lib/api.js";

interface ClockPageProps {
  reminders: Reminder[];
  onRefreshReminders: () => void;
  theme: ThemeConfig;
}

const TYPE_META: Record<Reminder["type"], { icon: string; color: string; label: string }> = {
  anniversary: { icon: "💖", color: "bg-pink-500/15 border-pink-400/30 text-pink-400", label: "Anniversary" },
  birthday:    { icon: "🎂", color: "bg-amber-500/15 border-amber-400/30 text-amber-400", label: "Birthday" },
  prayer:      { icon: "🙏", color: "bg-teal-500/15 border-teal-400/30 text-teal-400", label: "Prayer" },
  medicine:    { icon: "💊", color: "bg-blue-500/15 border-blue-400/30 text-blue-400", label: "Medicine" },
  custom:      { icon: "🌸", color: "bg-purple-500/15 border-purple-400/30 text-purple-400", label: "General" },
};

const REPEAT_LABELS: Record<string, string> = {
  none: "Once", daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly",
};

export default function ClockPage({ reminders, onRefreshReminders, theme }: ClockPageProps) {
  const [time, setTime] = useState(new Date());

  // ── AI assistant state ──
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    title: string; time: string; date: string | null;
    repeat: string; type: string; suggestion: string;
  } | null>(null);
  const [aiError, setAiError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Manual form state ──
  const [showManual, setShowManual] = useState(false);
  const [title, setTitle] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderDate, setReminderDate] = useState("");
  const [repeat, setRepeat] = useState<Reminder["repeat"]>("none");
  const [type, setType] = useState<Reminder["type"]>("custom");

  // ── UI state ──
  const [activeFilter, setActiveFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingAI, setSavingAI] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // ── Greeting ──
  const [greeting, setGreeting] = useState("");

  // ── Clock ──
  useEffect(() => {
    let id: number;
    const tick = () => { setTime(new Date()); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const h = time.getHours();
    if (h < 12) setGreeting("Good morning, sweet soul 🌸");
    else if (h < 17) setGreeting("Good afternoon, love ✨");
    else setGreeting("Good evening, beautiful 💕");
  }, []);

  const hrs  = time.getHours();
  const mins = time.getMinutes();
  const secs = time.getSeconds();
  const ms   = time.getMilliseconds();
  const secDeg  = secs * 6 + ms * 0.006;
  const minDeg  = mins * 6 + secs * 0.1;
  const hourDeg = (hrs % 12) * 30 + mins * 0.5;

  // ── Chime ──
  const playChime = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5 - i * 0.1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + 1.6);
      });
    } catch {}
  };

  // ── Smart local parser (no API needed — works offline & when quota exhausted) ──
  const parseReminderLocally = (input: string) => {
    const lower = input.toLowerCase();

    // ── Type detection ──
    let type: Reminder["type"] = "custom";
    if (/anniversary|annivers/i.test(lower)) type = "anniversary";
    else if (/birthday|bday|born|birth/i.test(lower)) type = "birthday";
    else if (/prayer|namaz|salah|salat|fajr|dhuhr|asr|maghrib|isha/i.test(lower)) type = "prayer";
    else if (/medicine|tablet|pill|capsule|dose|medication|drug/i.test(lower)) type = "medicine";

    // ── Repeat detection ──
    let repeat: Reminder["repeat"] = "none";
    if (/every\s*day|daily|each\s*day|morning|night|evening|afternoon/i.test(lower)) repeat = "daily";
    else if (/every\s*week|weekly|each\s*week/i.test(lower)) repeat = "weekly";
    else if (/every\s*month|monthly|each\s*month/i.test(lower)) repeat = "monthly";
    else if (/every\s*year|yearly|annually|annual/i.test(lower)) repeat = "yearly";
    else if (type === "birthday" || type === "anniversary") repeat = "yearly";
    else if (type === "prayer" || type === "medicine") repeat = "daily";

    // ── Time detection ──
    let time = "09:00";
    const timeMatch = lower.match(/(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?/i);
    const hourOnlyMatch = lower.match(/(\d{1,2})\s*(am|pm)/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1]);
      const m = parseInt(timeMatch[2]);
      const ampm = timeMatch[3]?.toLowerCase();
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
      time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    } else if (hourOnlyMatch) {
      let h = parseInt(hourOnlyMatch[1]);
      const ampm = hourOnlyMatch[2].toLowerCase();
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
      time = `${String(h).padStart(2, "0")}:00`;
    } else if (/morning/i.test(lower)) time = "08:00";
    else if (/afternoon/i.test(lower)) time = "14:00";
    else if (/evening/i.test(lower)) time = "18:00";
    else if (/night/i.test(lower)) time = "21:00";
    else if (/fajr/i.test(lower)) time = "05:15";
    else if (/dhuhr|zuhr/i.test(lower)) time = "13:00";
    else if (/asr/i.test(lower)) time = "16:30";
    else if (/maghrib/i.test(lower)) time = "19:00";
    else if (/isha/i.test(lower)) time = "21:00";

    // ── Date detection ──
    let date: string | null = null;
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const monthFull = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    const today = new Date();
    const dateMatch = lower.match(/(\d{1,2})\s*(st|nd|rd|th)?\s+([a-z]+)|([a-z]+)\s+(\d{1,2})/);
    if (dateMatch && repeat === "none") {
      const dayStr = dateMatch[1] || dateMatch[5];
      const monStr = (dateMatch[3] || dateMatch[4] || "").toLowerCase().slice(0, 3);
      const monIdx = months.indexOf(monStr) !== -1 ? months.indexOf(monStr) : monthFull.findIndex(m => m.startsWith(monStr));
      if (dayStr && monIdx !== -1) {
        const yr = today.getFullYear();
        date = `${yr}-${String(monIdx + 1).padStart(2,"0")}-${String(parseInt(dayStr)).padStart(2,"0")}`;
      }
    }

    // ── Title cleanup ──
    let title = input
      .replace(/remind(er)?\s*(me\s*)?(to\s*)?/i, "")
      .replace(/every\s*(day|week|month|year|morning|night|evening|afternoon)/i, "")
      .replace(/\d{1,2}\s*:\s*\d{2}\s*(am|pm)?/i, "")
      .replace(/\d{1,2}\s*(am|pm)/i, "")
      .replace(/at\s+/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!title || title.length < 3) title = input.trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
    if (title.length > 60) title = title.slice(0, 57) + "...";

    // ── Warm suggestion ──
    const suggestions: Record<string, string> = {
      anniversary: "Celebrating love is one of the most beautiful things in life 💖",
      birthday: "Making someone feel special on their birthday means everything 🎂",
      prayer: "Taking a moment for prayer brings peace and clarity to the day 🙏",
      medicine: "Staying on top of health is the greatest form of self-care 💊",
      custom: "Every reminder is a small act of love and care for yourself 🌸",
    };

    return { title, time, date, repeat, type, suggestion: suggestions[type] };
  };

  // ── AI Smart Reminder (tries server first, falls back to local parser) ──
  const handleAskAI = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiError("");
    setAiSuggestion(null);
    try {
      const result = await API.smartReminder(aiInput.trim());
      setAiSuggestion(result);
    } catch {
      // Fallback: parse locally so it always works
      const local = parseReminderLocally(aiInput.trim());
      setAiSuggestion(local);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAI = async () => {
    if (!aiSuggestion) return;
    setSavingAI(true);
    try {
      await API.createReminder({
        title: aiSuggestion.title,
        time: aiSuggestion.time,
        date: aiSuggestion.date || undefined,
        repeat: aiSuggestion.repeat as Reminder["repeat"],
        type: aiSuggestion.type as Reminder["type"],
      });
      setJustSaved(true);
      setAiInput("");
      setAiSuggestion(null);
      onRefreshReminders();
      setTimeout(() => setJustSaved(false), 2500);
    } catch {
      setAiError("Failed to save reminder. Please try again.");
    } finally {
      setSavingAI(false);
    }
  };

  // ── Manual create ──
  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !reminderTime) return;
    try {
      await API.createReminder({ title, time: reminderTime, date: reminderDate || undefined, repeat, type });
      setTitle(""); setReminderTime("09:00"); setReminderDate(""); setRepeat("none"); setType("custom");
      setShowManual(false);
      onRefreshReminders();
    } catch {}
  };

  // ── Toggle / Delete ──
  const handleToggle = async (id: string, current: boolean) => {
    try { await API.updateReminder(id, { isActive: !current }); onRefreshReminders(); } catch {}
  };
  const confirmDelete = async () => {
    if (!deletingId) return;
    try { await API.deleteReminder(deletingId); onRefreshReminders(); } catch {}
    finally { setDeletingId(null); }
  };

  const filteredReminders = reminders.filter((r) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "active") return r.isActive;
    return r.type === activeFilter;
  });

  // ── Render ──
  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-32">

      {/* ── Clock section ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-8">
        {/* Analog clock */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full ${theme.analogClockGlow} blur-xl pointer-events-none`} />
            <div className={`w-64 h-64 rounded-full relative flex items-center justify-center ${theme.analogClockBg} ${theme.shadow} border-2 border-white/30 backdrop-blur-xl z-10`}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className="absolute text-[10px] font-bold text-gray-400 select-none"
                  style={{ transform: `rotate(${i * 30}deg) translateY(-110px) rotate(-${i * 30}deg)` }}>
                  {i === 0 ? "12" : i}
                </div>
              ))}
              {/* Hour */}
              <div className="absolute rounded-full bg-slate-800 dark:bg-slate-100 shadow-sm"
                style={{ width: 6, height: 64, marginLeft: -3, bottom: "50%", left: "50%",
                  transform: `rotate(${hourDeg}deg)`, transformOrigin: "bottom center" }} />
              {/* Minute */}
              <div className="absolute rounded-full bg-slate-500 dark:bg-slate-300 shadow-sm"
                style={{ width: 4, height: 88, marginLeft: -2, bottom: "50%", left: "50%",
                  transform: `rotate(${minDeg}deg)`, transformOrigin: "bottom center" }} />
              {/* Second */}
              <div className="absolute rounded-full bg-[#EC708B]"
                style={{ width: 2, height: 94, marginLeft: -1, bottom: "50%", left: "50%",
                  transform: `rotate(${secDeg}deg)`, transformOrigin: "bottom center" }} />
              <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-[#EC708B] z-30 shadow" />
            </div>
          </div>
          <div className="text-center">
            <h3 className={`text-4xl font-extrabold tracking-tight ${theme.textPrimary}`}>
              {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            </h3>
            <p className={`text-xs mt-1 ${theme.textSecondary} italic`}>"{greeting}"</p>
          </div>
          <button onClick={playChime}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${theme.border} bg-white/5 ${theme.textSecondary} active:scale-95 transition-all`}>
            <Volume2 className="w-3.5 h-3.5" /> Test Chime
          </button>
        </div>

        {/* ── AI Smart Assistant ── */}
        <div className={`rounded-3xl p-5 ${theme.card} ${theme.shadow} border ${theme.border} space-y-4`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className={`text-sm font-black ${theme.textPrimary}`}>Smart Reminder Assistant</h3>
              <p className={`text-[10px] ${theme.textSecondary}`}>Powered by Gemini AI</p>
            </div>
          </div>

          {/* Input box */}
          <div className={`relative rounded-2xl border ${theme.border} bg-white/5 focus-within:border-pink-400 transition-colors`}>
            <textarea
              ref={inputRef}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskAI(); } }}
              placeholder={`Tell me what to remind you about...\n\nExamples:\n• "Remind me to take my medicine every morning at 8am"\n• "Our anniversary is on Aug 5, remind me yearly"\n• "Fajr prayer reminder every day at 5:15 am"`}
              rows={5}
              className={`w-full px-4 py-3 text-xs rounded-2xl bg-transparent ${theme.textPrimary} placeholder-gray-500 focus:outline-none resize-none`}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {aiInput && (
                <button onClick={() => { setAiInput(""); setAiSuggestion(null); setAiError(""); }}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-200 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={handleAskAI} disabled={!aiInput.trim() || aiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[10px] font-bold shadow-md disabled:opacity-40 active:scale-95 transition-all">
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiLoading ? "Thinking…" : "Ask AI"}
              </button>
            </div>
          </div>

          {/* AI Error */}
          {aiError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {aiError}
            </motion.p>
          )}

          {/* AI Suggestion card */}
          <AnimatePresence>
            {aiSuggestion && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="rounded-2xl border border-violet-500/30 bg-violet-500/10 backdrop-blur-md p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{TYPE_META[aiSuggestion.type as Reminder["type"]]?.icon || "🌸"}</span>
                    <div>
                      <p className={`text-sm font-bold ${theme.textPrimary}`}>{aiSuggestion.title}</p>
                      <div className={`flex items-center gap-2 mt-0.5 text-[10px] font-semibold ${theme.textSecondary}`}>
                        <span>🕒 {aiSuggestion.time}</span>
                        {aiSuggestion.date && <span>📅 {aiSuggestion.date}</span>}
                        <span className="capitalize">🔁 {REPEAT_LABELS[aiSuggestion.repeat] || aiSuggestion.repeat}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border ${TYPE_META[aiSuggestion.type as Reminder["type"]]?.color}`}>
                          {TYPE_META[aiSuggestion.type as Reminder["type"]]?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setAiSuggestion(null)}
                    className="text-gray-400 hover:text-gray-200 shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* AI explanation */}
                <p className="text-[11px] italic text-violet-300 leading-relaxed border-t border-violet-500/20 pt-2">
                  ✨ {aiSuggestion.suggestion}
                </p>

                <button onClick={handleSaveAI} disabled={savingAI}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-bold shadow-md active:scale-98 transition-transform flex items-center justify-center gap-2 disabled:opacity-60">
                  {savingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                  {savingAI ? "Saving…" : "Save this Reminder"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved confirmation */}
          <AnimatePresence>
            {justSaved && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" /> Reminder saved successfully!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual fallback */}
          <button onClick={() => setShowManual((v) => !v)}
            className={`w-full text-center text-[10px] font-semibold ${theme.textSecondary} hover:text-pink-400 transition-colors underline underline-offset-2`}>
            {showManual ? "Hide manual form" : "Add manually instead"}
          </button>

          <AnimatePresence>
            {showManual && (
              <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                onSubmit={handleManualCreate}
                className="overflow-hidden space-y-3 pt-1">
                <input required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Reminder title"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} placeholder-gray-500 focus:outline-none focus:border-pink-400`} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[10px] font-bold ${theme.textSecondary} block mb-1`}>Time</label>
                    <input type="time" required value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`} />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold ${theme.textSecondary} block mb-1`}>Date</label>
                    <input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={repeat} onChange={(e) => setRepeat(e.target.value as Reminder["repeat"])}
                    className={`px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`}>
                    <option value="none">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <select value={type} onChange={(e) => setType(e.target.value as Reminder["type"])}
                    className={`px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`}>
                    <option value="custom">General 🌸</option>
                    <option value="anniversary">Anniversary 💖</option>
                    <option value="birthday">Birthday 🎂</option>
                    <option value="prayer">Prayer 🙏</option>
                    <option value="medicine">Medicine 💊</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowManual(false)}
                    className={`flex-1 py-2 text-xs font-bold ${theme.textSecondary} border ${theme.border} rounded-xl active:scale-95 transition-transform`}>
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 py-2 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl active:scale-95 transition-all">
                    Save
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Reminders List ── */}
      <div className={`rounded-3xl p-5 ${theme.card} ${theme.shadow} border ${theme.border}`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-pink-400 animate-bounce" />
            <h3 className={`text-base font-black ${theme.textPrimary}`}>Your Reminders</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20`}>
              {reminders.filter(r => r.isActive).length} active
            </span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {["all", "active", "anniversary", "birthday", "prayer", "medicine"].map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold capitalize whitespace-nowrap transition-all active:scale-95 ${
                activeFilter === f ? `${theme.accent} text-white shadow` : `bg-white/5 border ${theme.border} ${theme.textSecondary}`
              }`}>
              {f === "all" ? "All 🌸" : f === "active" ? "Active 🔔" : `${TYPE_META[f as Reminder["type"]]?.icon} ${TYPE_META[f as Reminder["type"]]?.label}`}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {filteredReminders.length === 0 ? (
            <div className={`text-center py-12 ${theme.textSecondary}`}>
              <BellOff className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
              <p className="text-xs font-semibold">No reminders here yet</p>
              <p className="text-[10px] mt-1 opacity-60">Use the AI assistant above to add one instantly</p>
            </div>
          ) : (
            filteredReminders.map((r) => {
              const meta = TYPE_META[r.type];
              return (
                <motion.div key={r.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    r.isActive
                      ? `bg-white/5 border-white/10`
                      : "bg-black/5 border-transparent opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg border ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${r.isActive ? theme.textPrimary : `${theme.textSecondary} line-through`}`}>
                        {r.title}
                      </p>
                      <div className={`flex items-center gap-2 mt-0.5 text-[10px] font-semibold ${theme.textSecondary}`}>
                        <span>🕒 {r.time}</span>
                        {r.date && <span>📅 {r.date}</span>}
                        {r.repeat !== "none" && (
                          <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-emerald-500/20">
                            🔁 {REPEAT_LABELS[r.repeat]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Toggle */}
                    <button onClick={() => handleToggle(r.id, r.isActive)}
                      className={`w-10 h-5.5 rounded-full relative flex items-center p-0.5 transition-colors duration-300 ${
                        r.isActive ? "bg-pink-500" : "bg-gray-600"
                      }`}
                      style={{ minWidth: 40, height: 22 }}>
                      <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-sm"
                        animate={{ x: r.isActive ? 18 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                    </button>
                    {/* Delete */}
                    <button onClick={() => setDeletingId(r.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors active:scale-90">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
              className={`w-full max-w-sm rounded-3xl p-6 ${theme.card} border ${theme.border} shadow-2xl space-y-4`}>
              <h3 className={`text-base font-bold ${theme.textPrimary}`}>Remove reminder?</h3>
              <p className={`text-xs ${theme.textSecondary}`}>
                You won't receive notifications for this reminder anymore.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl border ${theme.border} ${theme.textSecondary} active:scale-95 transition-transform`}>
                  Cancel
                </button>
                <button onClick={confirmDelete}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl active:scale-95 transition-all">
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
