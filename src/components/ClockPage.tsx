/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Premium Reminder Management System
 * Features:
 *  - AI Smart Assistant (natural language → reminder)
 *  - Viewer self-set reminders
 *  - Web Notifications API + melodious Web Audio alarm
 *  - Snooze, dismiss, edit
 *  - Fully mobile-responsive
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, BellOff, Trash2, Plus, Volume2, Sparkles,
  Loader2, CheckCircle2, X, ChevronDown,
  AlarmClock, Edit3, Save, RefreshCw, Search,
  Heart, Check, Mail, BookOpen, Droplet,
  ChevronLeft, ChevronRight, Pill, Activity, Compass, Moon, Sun, Award
} from "lucide-react";
import { Reminder } from "../types.js";
import { ThemeConfig } from "../lib/themes.js";
import { API } from "../lib/api.js";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ClockPageProps {
  reminders: Reminder[];
  onRefreshReminders: () => void;
  theme: ThemeConfig;
  session?: { role: string | null; username: string | null };
}

interface ParsedReminder {
  title: string;
  time: string;
  date: string | null;
  repeat: string;
  type: string;
  suggestion: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TYPE_META: Record<Reminder["type"], { gradient: string; label: string; border: string }> = {
  anniversary: { gradient: "from-pink-500 to-rose-500",   label: "Anniversary", border: "border-pink-400/30" },
  birthday:    { gradient: "from-amber-400 to-orange-500",label: "Birthday",    border: "border-amber-400/30" },
  prayer:      { gradient: "from-teal-400 to-cyan-500",   label: "Prayer",      border: "border-teal-400/30" },
  medicine:    { gradient: "from-blue-400 to-indigo-500", label: "Medicine",    border: "border-blue-400/30" },
  custom:      { gradient: "from-purple-400 to-violet-500",label: "General",    border: "border-purple-400/30" },
};

const getReminderIcon = (type: string, className = "w-5 h-5") => {
  switch (type) {
    case "anniversary": return <Heart className={className} />;
    case "birthday": return <Award className={className} />;
    case "prayer": return <Compass className={className} />;
    case "medicine": return <Pill className={className} />;
    default: return <Activity className={className} />;
  }
};

const REPEAT_OPTS = ["none","daily","weekly","monthly","yearly"] as const;
const REPEAT_LABELS: Record<string, string> = {
  none: "Once", daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly",
};
const TYPE_OPTS = ["custom","anniversary","birthday","prayer","medicine"] as const;

// ─── Melodious Web Audio Alarm ────────────────────────────────────────────────
function playMelodiousAlarm(loops = 3) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx = new Ctx();
    // Beautiful ascending arpeggio: C5 E5 G5 B5 | D6 F#6 A6 C7
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1479.98, 1760, 2093];
    let t = ctx.currentTime;
    for (let loop = 0; loop < loops; loop++) {
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        // Triangle wave for a warm, melodious tone
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
        t += 0.18;
      });
      t += 0.6; // pause between loops
    }
    return () => { try { ctx.close(); } catch {} };
  } catch { return () => {}; }
}

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      const t = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 1.3);
    });
  } catch {}
}

// ─── Notification helper ──────────────────────────────────────────────────────
async function requestNotificationPermission() {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

function sendNotification(title: string, body: string) {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" });
  }
}

// ─── Local smart parser (offline fallback) ────────────────────────────────────
function parseReminderLocally(input: string): ParsedReminder {
  const lower = input.toLowerCase();
  let type: Reminder["type"] = "custom";
  if (/anniversary/i.test(lower)) type = "anniversary";
  else if (/birthday|bday/i.test(lower)) type = "birthday";
  else if (/prayer|namaz|salah|fajr|dhuhr|asr|maghrib|isha/i.test(lower)) type = "prayer";
  else if (/medicine|tablet|pill|capsule|dose/i.test(lower)) type = "medicine";

  let repeat: Reminder["repeat"] = "none";
  if (/every\s*day|daily|each\s*day|morning|night|evening|afternoon/i.test(lower)) repeat = "daily";
  else if (/every\s*week|weekly/i.test(lower)) repeat = "weekly";
  else if (/every\s*month|monthly/i.test(lower)) repeat = "monthly";
  else if (/every\s*year|yearly|annually/i.test(lower)) repeat = "yearly";
  else if (type === "birthday" || type === "anniversary") repeat = "yearly";
  else if (type === "prayer" || type === "medicine") repeat = "daily";

  let time = "09:00";
  const t24 = lower.match(/(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?/i);
  const t12 = lower.match(/(\d{1,2})\s*(am|pm)/i);
  if (t24) {
    let h = parseInt(t24[1]), m = parseInt(t24[2]);
    const ap = t24[3]?.toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    time = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  } else if (t12) {
    let h = parseInt(t12[1]);
    if (t12[2].toLowerCase() === "pm" && h < 12) h += 12;
    if (t12[2].toLowerCase() === "am" && h === 12) h = 0;
    time = `${String(h).padStart(2,"0")}:00`;
  } else if (/morning/i.test(lower)) time = "08:00";
  else if (/afternoon/i.test(lower)) time = "14:00";
  else if (/evening/i.test(lower)) time = "18:00";
  else if (/night/i.test(lower)) time = "21:00";
  else if (/fajr/i.test(lower)) time = "05:15";
  else if (/dhuhr|zuhr/i.test(lower)) time = "13:00";
  else if (/asr/i.test(lower)) time = "16:30";
  else if (/maghrib/i.test(lower)) time = "19:00";
  else if (/isha/i.test(lower)) time = "21:00";

  let date: string | null = null;
  const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const dm = lower.match(/(\d{1,2})\s*(st|nd|rd|th)?\s+([a-z]+)|([a-z]+)\s+(\d{1,2})/);
  if (dm && repeat === "none") {
    const dayStr = dm[1] || dm[5];
    const monStr = (dm[3] || dm[4] || "").toLowerCase().slice(0,3);
    const mi = months.indexOf(monStr);
    if (dayStr && mi !== -1) {
      const yr = new Date().getFullYear();
      date = `${yr}-${String(mi+1).padStart(2,"0")}-${String(parseInt(dayStr)).padStart(2,"0")}`;
    }
  }

  let title = input.replace(/remind(er)?\s*(me\s*)?(to\s*)?/i,"")
    .replace(/every\s*(day|week|month|year|morning|night|evening|afternoon)/i,"")
    .replace(/\d{1,2}\s*:\s*\d{2}\s*(am|pm)?/i,"").replace(/\d{1,2}\s*(am|pm)/i,"")
    .replace(/at\s+/i,"").replace(/\s{2,}/g," ").trim();
  if (!title || title.length < 3) title = input.trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 60) title = title.slice(0,57) + "...";

  const suggestions: Record<string, string> = {
    anniversary: "Celebrating love is one of the most beautiful things in life 💖",
    birthday: "Making someone feel special on their birthday means everything 🎂",
    prayer: "A moment for prayer brings peace and clarity to the soul 🙏",
    medicine: "Staying on top of your health is the greatest form of self-love 💊",
    custom: "Every reminder is a small act of love and care for yourself 🌸",
  };
  return { title, time, date, repeat, type, suggestion: suggestions[type] };
}

// ─── Inline Edit form ─────────────────────────────────────────────────────────
function ReminderEditForm({
  reminder, theme, onSave, onCancel,
}: {
  reminder: Reminder; theme: ThemeConfig;
  onSave: (data: Partial<Reminder>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(reminder.title);
  const [time, setTime] = useState(reminder.time);
  const [date, setDate] = useState(reminder.date || "");
  const [repeat, setRepeat] = useState<Reminder["repeat"]>(reminder.repeat);
  const [type, setType] = useState<Reminder["type"]>(reminder.type);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ title, time, date: date || undefined, repeat, type });
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }} className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
      <input value={title} onChange={e => setTitle(e.target.value)}
        className={`w-full px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`} />
      <div className="grid grid-cols-2 gap-2">
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className={`px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className={`px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`} />
        <select value={repeat} onChange={e => setRepeat(e.target.value as Reminder["repeat"])}
          className={`px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`}>
          {REPEAT_OPTS.map(r => <option key={r} value={r}>{REPEAT_LABELS[r]}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value as Reminder["type"])}
          className={`px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`}>
          {TYPE_OPTS.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className={`flex-1 py-2 text-xs font-bold rounded-xl border border-white/10 ${theme.textSecondary} active:scale-95 transition-transform`}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-pink-500 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1.5 disabled:opacity-60">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClockPage({ reminders, onRefreshReminders, theme, session }: ClockPageProps) {
  const [time, setTime] = useState(new Date());

  // Sub-tabs in Reminders (0: Alarms List, 1: Planner & Love Notes)
  const [activeSubTab, setActiveSubTab] = useState(0);

  // Daily task completed local tracking
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("bloom_completed_reminders");
      if (saved) {
        const parsed = JSON.parse(saved);
        const todayYMD = new Date().toDateString();
        if (parsed.date === todayYMD) {
          return parsed.ids;
        }
      }
    } catch {}
    return [];
  });

  const handleToggleComplete = (id: string) => {
    const isCompleted = completedIds.includes(id);
    let next: string[];
    if (isCompleted) {
      next = completedIds.filter(x => x !== id);
    } else {
      next = [...completedIds, id];
    }
    setCompletedIds(next);
    localStorage.setItem("bloom_completed_reminders", JSON.stringify({
      date: new Date().toDateString(),
      ids: next
    }));
  };

  // Love note modal display state
  const [openedLoveNote, setOpenedLoveNote] = useState<string | null>(null);

  // Quick Preset modal / state
  const [activePreset, setActivePreset] = useState<{ title: string; type: Reminder["type"]; note?: string } | null>(null);
  const [presetTime, setPresetTime] = useState("08:00");
  const [addingPreset, setAddingPreset] = useState(false);

  // Admin Love Note creation form states
  const [loveNoteTitle, setLoveNoteTitle] = useState("");
  const [loveNoteTime, setLoveNoteTime] = useState("10:00");
  const [loveNoteContent, setLoveNoteContent] = useState("");
  const [sendingLoveNote, setSendingLoveNote] = useState(false);
  const [loveNoteSuccess, setLoveNoteSuccess] = useState(false);


  // AI assistant
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<ParsedReminder | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [savingAI, setSavingAI] = useState(false);

  // Manual form
  const [showManual, setShowManual] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mTime, setMTime] = useState("09:00");
  const [mDate, setMDate] = useState("");
  const [mRepeat, setMRepeat] = useState<Reminder["repeat"]>("none");
  const [mType, setMType] = useState<Reminder["type"]>("custom");
  const [mSaving, setMSaving] = useState(false);

  // List controls
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Notification permission
  const [notifPerm, setNotifPerm] = useState(Notification.permission);

  // Clock tick
  useEffect(() => {
    let id: number;
    const tick = () => { setTime(new Date()); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const h = time.getHours(), m = time.getMinutes(), s = time.getSeconds(), ms = time.getMilliseconds();
  const secDeg = s * 6 + ms * 0.006;
  const minDeg = m * 6 + s * 0.1;
  const hrDeg  = (h % 12) * 30 + m * 0.5;

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // ── AI handler ──
  const handleAskAI = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const result = await API.smartReminder(aiInput.trim());
      setAiSuggestion(result as ParsedReminder);
    } catch {
      setAiSuggestion(parseReminderLocally(aiInput.trim()));
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
    } catch {} finally { setSavingAI(false); }
  };

  // ── Manual create ──
  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMSaving(true);
    try {
      await API.createReminder({ title: mTitle, time: mTime, date: mDate || undefined, repeat: mRepeat, type: mType });
      setMTitle(""); setMTime("09:00"); setMDate(""); setMRepeat("none"); setMType("custom");
      setShowManual(false);
      onRefreshReminders();
    } catch {} finally { setMSaving(false); }
  };

  // ── Toggle / Delete / Edit ──
  const handleToggle = async (id: string, cur: boolean) => {
    try { await API.updateReminder(id, { isActive: !cur }); onRefreshReminders(); } catch {}
  };
  const confirmDelete = async () => {
    if (!deletingId) return;
    try { await API.deleteReminder(deletingId); onRefreshReminders(); } catch {}
    finally { setDeletingId(null); }
  };
  const handleEdit = async (id: string, data: Partial<Reminder>) => {
    try { await API.updateReminder(id, data); onRefreshReminders(); } catch {}
    finally { setEditingId(null); }
  };

  // ── Filtered list ──
  const displayed = useMemo(() => reminders.filter(r => {
    if (activeFilter === "active" && !r.isActive) return false;
    if (activeFilter !== "all" && activeFilter !== "active" && r.type !== activeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !r.time.includes(q)) return false;
    }
    return true;
  }), [reminders, activeFilter, search]);

  const activeCount = reminders.filter(r => r.isActive).length;

  const handleCreatePreset = async (title: string, type: Reminder["type"], note?: string) => {
    try {
      setAddingPreset(true);
      const fullTitle = note ? `${title} | ${note}` : title;
      await API.createReminder({
        title: fullTitle,
        time: presetTime,
        repeat: "daily",
        type: type
      });
      onRefreshReminders();
      setActivePreset(null);
    } catch (err) {
      console.error("Failed to create preset reminder:", err);
    } finally {
      setAddingPreset(false);
    }
  };

  const handleSendLoveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loveNoteTitle.trim() || !loveNoteContent.trim()) return;
    try {
      setSendingLoveNote(true);
      const fullTitle = `${loveNoteTitle.trim()} | ${loveNoteContent.trim()}`;
      await API.createReminder({
        title: fullTitle,
        time: loveNoteTime,
        repeat: "daily",
        type: "custom"
      });
      onRefreshReminders();
      setLoveNoteTitle("");
      setLoveNoteContent("");
      setLoveNoteSuccess(true);
      setTimeout(() => setLoveNoteSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to send love note reminder:", err);
    } finally {
      setSendingLoveNote(false);
    }
  };

  // ─────────────────────────────────── RENDER ─────────────────────────────────
  const isAuthorized = true;

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-5 pt-4 pb-28">

      {/* ════════ HEADER ════════ */}
      <div className="text-center mb-6 mt-2">
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${theme.textPrimary}`}>
          Reminders
        </h1>
        <p className={`text-xs mt-1 ${theme.textSecondary} italic`}>{greeting}</p>
      </div>

      {/* Sub-tabs segment switcher (Only visible if isAuthorized) */}
      {isAuthorized && (
        <div className="flex justify-center mb-6 select-none">
          <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-md">
            <button
              onClick={() => setActiveSubTab(0)}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
                activeSubTab === 0
                  ? "bg-[#EC708B] text-white shadow-md"
                  : `${theme.textSecondary} hover:text-[#EC708B]`
              }`}
            >
              Alarms
            </button>
            <button
              onClick={() => setActiveSubTab(1)}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeSubTab === 1
                  ? "bg-[#EC708B] text-white shadow-md"
                  : `${theme.textSecondary} hover:text-[#EC708B]`
              }`}
            >
              Planner & Notes
            </button>
          </div>
        </div>
      )}

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={(e, info) => {
          if (info.offset.x < -100 && activeSubTab === 0 && isAuthorized) {
            setActiveSubTab(1);
          } else if (info.offset.x > 100 && activeSubTab === 1) {
            setActiveSubTab(0);
          }
        }}
        className="w-full relative"
      >
        <AnimatePresence mode="wait">
          {activeSubTab === 0 ? (
            <motion.div
              key="alarms-view"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
            >
              {/* ════════ TOP ROW: CLOCK + NOTIFICATION PERMISSION ════════ */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 items-center sm:items-start">

        {/* Analog Clock */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full ${theme.analogClockGlow} blur-xl opacity-60 pointer-events-none`} />
            <div className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full relative flex items-center justify-center ${theme.analogClockBg} shadow-2xl border-2 border-white/25 backdrop-blur-xl z-10`}>
              {[...Array(12)].map((_,i) => (
                <div key={i} className="absolute text-[9px] sm:text-[10px] font-bold text-gray-400 select-none"
                  style={{ transform: `rotate(${i*30}deg) translateY(-${window.innerWidth < 640 ? 75 : 90}px) rotate(-${i*30}deg)` }}>
                  {i === 0 ? "12" : i}
                </div>
              ))}
              <div className="absolute rounded-full bg-slate-800 dark:bg-slate-100 shadow"
                style={{ width:5, height:50, marginLeft:-2.5, bottom:"50%", left:"50%", transform:`rotate(${hrDeg}deg)`, transformOrigin:"bottom center" }} />
              <div className="absolute rounded-full bg-slate-500 dark:bg-slate-300"
                style={{ width:3, height:68, marginLeft:-1.5, bottom:"50%", left:"50%", transform:`rotate(${minDeg}deg)`, transformOrigin:"bottom center" }} />
              <div className="absolute rounded-full bg-[#EC708B]"
                style={{ width:2, height:74, marginLeft:-1, bottom:"50%", left:"50%", transform:`rotate(${secDeg}deg)`, transformOrigin:"bottom center" }} />
              <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-[#EC708B] z-20 shadow" />
            </div>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-black tabular-nums ${theme.textPrimary}`}>
              {time.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true })}
            </p>
            <p className={`text-[10px] mt-0.5 ${theme.textSecondary}`}>
              {time.toLocaleDateString("en-US", { weekday:"long", day:"numeric", month:"long" })}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={playChime}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${theme.border} bg-white/5 ${theme.textSecondary} active:scale-95 transition-all`}>
              <Volume2 className="w-3.5 h-3.5" /> Test
            </button>
            {notifPerm !== "granted" && (
              <button
                onClick={async () => { const p = await requestNotificationPermission(); setNotifPerm(p); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-violet-500/20 border border-violet-500/30 text-violet-300 active:scale-95 transition-all">
                <Bell className="w-3.5 h-3.5" /> Allow Notifications
              </button>
            )}
            {notifPerm === "granted" && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Notifications ON
              </div>
            )}
          </div>
        </div>

        {/* ── AI Smart Assistant ── */}
        <div className={`flex-1 w-full rounded-3xl p-4 sm:p-5 ${theme.card} ${theme.shadow} border ${theme.border} space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className={`text-sm font-black ${theme.textPrimary}`}>Smart Reminder Assistant</p>
              <p className={`text-[10px] ${theme.textSecondary}`}>Just type naturally — AI will set it up</p>
            </div>
          </div>

          <div className={`relative rounded-2xl border-2 transition-colors ${aiInput ? "border-violet-500/60" : `${theme.border}`} bg-white/5`}>
            <textarea
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskAI(); } }}
              placeholder={"Describe your reminder naturally…\n\nExamples:\n• Remind me to take my medicine every morning at 8am\n• Our anniversary is August 5, remind me yearly\n• Fajr prayer every day at 5:15 am"}
              rows={5}
              className={`w-full px-4 py-3 pb-12 text-xs rounded-2xl bg-transparent ${theme.textPrimary} placeholder-gray-500 focus:outline-none resize-none`}
            />
            <div className="absolute bottom-3 right-3 flex gap-2">
              {aiInput && (
                <button onClick={() => { setAiInput(""); setAiSuggestion(null); }}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-200 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={handleAskAI} disabled={!aiInput.trim() || aiLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[10px] font-bold shadow-lg disabled:opacity-40 active:scale-95 transition-all">
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiLoading ? "Thinking…" : "Ask AI"}
              </button>
            </div>
          </div>

          {/* AI suggestion card */}
          <AnimatePresence>
            {aiSuggestion && (
              <motion.div initial={{ opacity:0, y:10, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, y:8 }}
                className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-pink-500/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-xl bg-violet-500/20 text-violet-400">
                    {getReminderIcon(aiSuggestion.type as Reminder["type"], "w-5 h-5")}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${theme.textPrimary}`}>{aiSuggestion.title}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold text-white/70">
                        {aiSuggestion.time}
                      </span>
                      {aiSuggestion.date && (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold text-white/70">
                          📅 {aiSuggestion.date}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold text-white/70 capitalize">
                        🔁 {REPEAT_LABELS[aiSuggestion.repeat]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold bg-gradient-to-r ${TYPE_META[aiSuggestion.type as Reminder["type"]]?.gradient} bg-opacity-20 text-white border-white/20`}>
                        {TYPE_META[aiSuggestion.type as Reminder["type"]]?.label}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setAiSuggestion(null)} className="text-gray-500 hover:text-gray-300 transition-colors mt-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] italic text-violet-300 border-t border-violet-500/20 pt-2 leading-relaxed">
                  ✨ {aiSuggestion.suggestion}
                </p>
                <button onClick={handleSaveAI} disabled={savingAI}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-black shadow-lg active:scale-98 transition-transform flex items-center justify-center gap-2 disabled:opacity-60">
                  {savingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlarmClock className="w-4 h-4" />}
                  {savingAI ? "Saving…" : "Set this Reminder"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {justSaved && (
              <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" /> Reminder saved! It will notify you at the right time.
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual form toggle */}
          <button onClick={() => setShowManual(v => !v)}
            className={`flex items-center gap-1.5 text-[10px] font-semibold ${theme.textSecondary} hover:text-pink-400 transition-colors`}>
            <Plus className="w-3.5 h-3.5" />
            {showManual ? "Hide" : "Add manually"}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showManual ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showManual && (
              <motion.form initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }}
                onSubmit={handleManualCreate} className="overflow-hidden space-y-3">
                <input required value={mTitle} onChange={e => setMTitle(e.target.value)}
                  placeholder="Reminder title"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} placeholder-gray-500 focus:outline-none focus:border-pink-400`} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[9px] font-bold ${theme.textSecondary} block mb-1 uppercase tracking-wider`}>Time *</label>
                    <input type="time" required value={mTime} onChange={e => setMTime(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`} />
                  </div>
                  <div>
                    <label className={`text-[9px] font-bold ${theme.textSecondary} block mb-1 uppercase tracking-wider`}>Date</label>
                    <input type="date" value={mDate} onChange={e => setMDate(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`} />
                  </div>
                  <select value={mRepeat} onChange={e => setMRepeat(e.target.value as Reminder["repeat"])}
                    className={`px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`}>
                    {REPEAT_OPTS.map(r => <option key={r} value={r}>{REPEAT_LABELS[r]}</option>)}
                  </select>
                  <select value={mType} onChange={e => setMType(e.target.value as Reminder["type"])}
                    className={`px-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} focus:outline-none focus:border-pink-400`}>
                    {TYPE_OPTS.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowManual(false)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl border ${theme.border} ${theme.textSecondary} active:scale-95 transition-transform`}>
                    Cancel
                  </button>
                  <button type="submit" disabled={mSaving}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
                    {mSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                    Save Reminder
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ════════ REMINDER LIST ════════ */}
      <div className={`rounded-3xl p-4 sm:p-5 ${theme.card} ${theme.shadow} border ${theme.border}`}>
        {/* List Header */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <AlarmClock className="w-5 h-5 text-pink-400" />
            <h2 className={`text-base font-black ${theme.textPrimary}`}>Your Reminders</h2>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black">
                {activeCount} active
              </span>
            )}
          </div>
          <button onClick={onRefreshReminders}
            className={`p-2 rounded-xl ${theme.textSecondary} hover:text-pink-400 border ${theme.border} bg-white/5 active:scale-90 transition-all`}>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search reminders…"
            className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border ${theme.border} bg-white/5 ${theme.textPrimary} placeholder-gray-500 focus:outline-none focus:border-pink-400`} />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
          {["all","active","anniversary","birthday","prayer","medicine"].map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold capitalize whitespace-nowrap transition-all active:scale-95 ${
                activeFilter === f
                  ? `bg-gradient-to-r ${f === "all" || f === "active" ? "from-pink-500 to-violet-500" : TYPE_META[f as Reminder["type"]]?.gradient} text-white shadow-md`
                  : `bg-white/5 border ${theme.border} ${theme.textSecondary}`
              }`}>
              {f === "all" ? "All" : f === "active" ? "Active" : TYPE_META[f as Reminder["type"]]?.label}
            </button>
          ))}
        </div>

        {/* Empty */}
        {displayed.length === 0 && (
          <div className={`text-center py-12 ${theme.textSecondary}`}>
            <BellOff className="w-10 h-10 mx-auto mb-3 opacity-20 animate-pulse" />
            <p className="text-xs font-semibold">No reminders here</p>
            <p className="text-[10px] mt-1 opacity-60">Use the AI assistant above to add one!</p>
          </div>
        )}

        {/* Reminder cards */}
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-0.5">
          <AnimatePresence initial={false}>
            {displayed.map(r => {
              const meta = TYPE_META[r.type];
              const isEditing = editingId === r.id;
              return (
                <motion.div key={r.id}
                  layout
                  initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:20 }}
                  transition={{ type:"spring", stiffness:350, damping:28 }}
                  className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                    r.isActive ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 p-3.5">
                    {/* Type icon */}
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-md shrink-0 transition-all duration-300 ${!r.isActive ? "opacity-40" : ""}`}>
                      {getReminderIcon(r.type, "w-5 h-5 text-white")}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate transition-all flex items-center gap-1.5 ${r.isActive ? theme.textPrimary : "text-gray-500 line-through"}`}>
                        {r.title.split("|")[0].trim()}
                        {r.title.includes("|") && (
                          <Mail className="w-3 h-3 text-pink-400 inline shrink-0" />
                        )}
                      </p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <span className={`text-[10px] font-semibold ${r.isActive ? theme.textSecondary : "text-gray-600"}`}>
                          🕒 {r.time}
                        </span>
                        {r.date && (
                          <span className={`text-[10px] font-semibold ${r.isActive ? theme.textSecondary : "text-gray-600"}`}>
                            📅 {r.date}
                          </span>
                        )}
                        {r.repeat !== "none" && (
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all ${
                            r.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-gray-800/30 text-gray-600 border-gray-700/20"
                          }`}>
                            🔁 {REPEAT_LABELS[r.repeat]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* ON/OFF Toggle */}
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => handleToggle(r.id, r.isActive)}
                          style={{ width:50, height:28, padding:"4px" }}
                          className={`relative flex items-center rounded-full transition-all duration-300 active:scale-90 ${
                            r.isActive
                              ? "bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.55)]"
                              : "bg-gray-600/50"
                          }`}>
                          <motion.div
                            layout
                            animate={{ x: r.isActive ? 22 : 0 }}
                            transition={{ type:"spring", stiffness:600, damping:35 }}
                            className={`w-5 h-5 rounded-full shadow-md flex items-center justify-center transition-colors ${
                              r.isActive ? "bg-white" : "bg-gray-300"
                            }`}
                          />
                        </button>
                        <span className={`text-[8px] font-black tracking-widest uppercase ${r.isActive ? "text-emerald-400" : "text-gray-500"}`}>
                          {r.isActive ? "ON" : "OFF"}
                        </span>
                      </div>

                      {/* Edit */}
                      <button onClick={() => setEditingId(isEditing ? null : r.id)}
                        className={`p-2 rounded-xl transition-all active:scale-90 ${
                          isEditing ? "text-violet-400 bg-violet-500/15" : `${theme.textSecondary} hover:text-violet-400 hover:bg-violet-500/10`
                        }`}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button onClick={() => setDeletingId(r.id)}
                        className={`p-2 rounded-xl ${theme.textSecondary} hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  <AnimatePresence>
                    {isEditing && (
                      <div className="px-4 pb-4">
                        <ReminderEditForm
                          reminder={r} theme={theme}
                          onSave={data => handleEdit(r.id, data)}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Active green accent bar */}
                  {r.isActive && (
                    <div className="h-0.5 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
            </motion.div>
          ) : (
            <motion.div
              key="planner-view"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Daily Progress Card */}
              {(() => {
                const dailyReminders = reminders.filter(r => r.repeat === "daily" && r.isActive);
                const completedDaily = completedIds.filter(id => dailyReminders.some(r => r.id === id));
                const percent = dailyReminders.length > 0 ? Math.round((completedDaily.length / dailyReminders.length) * 100) : 0;
                
                return (
                  <div className={`rounded-3xl p-6 border ${theme.card} ${theme.border} ${theme.shadow} flex flex-col items-center text-center space-y-4`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                      Daily Progress
                    </h3>
                    
                    {/* SVG Glowing Progress Circle */}
                    <div className="relative w-28 h-28 flex items-center justify-center select-none">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="56" cy="56" r="48"
                          className="stroke-gray-205 dark:stroke-white/5 fill-none"
                          strokeWidth="8"
                        />
                        <motion.circle
                          cx="56" cy="56" r="48"
                          className="stroke-[#EC708B] fill-none"
                          strokeWidth="8"
                          strokeDasharray={2 * Math.PI * 48}
                          animate={{ strokeDashoffset: (2 * Math.PI * 48) * (1 - percent / 100) }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className={`text-2xl font-black ${theme.textPrimary}`}>{percent}%</span>
                        <span className={`text-[8px] font-black uppercase tracking-wider ${theme.textSecondary}`}>Completed</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className={`text-xs ${theme.textSecondary} italic`}>
                        {percent === 100 ? "Your daily checklist is completed!" : "Track your scheduled tasks for the day."}
                      </p>
                    </div>

                    {/* Daily Checklist */}
                    {dailyReminders.length > 0 ? (
                      <div className="w-full text-left space-y-2 pt-2">
                        {dailyReminders.map(r => {
                          const isDone = completedIds.includes(r.id);
                          const cleanTitle = r.title.split("|")[0].trim();
                          return (
                            <button
                              key={r.id}
                              onClick={() => handleToggleComplete(r.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${
                                isDone 
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                  : `${theme.card} border-white/5 ${theme.textPrimary} hover:border-[#EC708B]/30`
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                                  isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 dark:border-white/20"
                                }`}>
                                  {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <span className={`text-xs font-bold ${isDone ? "line-through opacity-70" : ""}`}>
                                  {cleanTitle}
                                </span>
                              </div>
                              <span className={`text-[9px] font-bold ${isDone ? "text-emerald-400" : theme.textSecondary}`}>
                                {r.time}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={`text-xs ${theme.textSecondary} opacity-70 italic py-2`}>No active daily reminders scheduled.</p>
                    )}
                  </div>
                );
              })()}

              {/* Quick presets */}
              <div className="space-y-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textSecondary} px-1`}>
                  Quick presets
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: "Drink Water", iconKey: "water", type: "custom", note: "Keep drinking water to stay fresh and glowing!" },
                    { title: "Vitamins & Meds", iconKey: "medicine", type: "medicine", note: "Remember to take your morning vitamins and meds!" },
                    { title: "Self-Care Breath", iconKey: "selfcare", type: "custom", note: "Take a 5-minute break, stretch, and relax!" },
                    { title: "Prayer Moment", iconKey: "prayer", type: "prayer", note: "Spend a quiet moment in prayer and gratitude." },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActivePreset({ title: p.title, type: p.type as any, note: p.note });
                        setPresetTime("08:00");
                      }}
                      className={`p-4 rounded-3xl border flex flex-col items-center text-center space-y-2.5 transition-all duration-305 active:scale-95 ${theme.card} ${theme.border} hover:border-[#EC708B]/40 shadow-sm`}
                    >
                      <div className="p-2 rounded-2xl bg-white/5 border border-white/5">
                        {p.iconKey === "water" && <Droplet className="w-5 h-5 text-blue-400" />}
                        {p.iconKey === "medicine" && <Pill className="w-5 h-5 text-emerald-400" />}
                        {p.iconKey === "selfcare" && <Activity className="w-5 h-5 text-purple-400" />}
                        {p.iconKey === "prayer" && <Compass className="w-5 h-5 text-amber-400" />}
                      </div>
                      <div>
                        <h4 className={`text-xs font-black ${theme.textPrimary}`}>{p.title}</h4>
                        <span className={`text-[8px] font-black uppercase text-[#EC708B]`}>Daily Preset</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Love Notes */}
              <div className="space-y-4">
                {/* Scheduled Letters List */}
                <div className="space-y-3">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textSecondary} px-1`}>
                    Scheduled Love Notes
                  </h3>
                  {(() => {
                    const noteReminders = reminders.filter(r => r.title.includes("|") && r.isActive);
                    if (noteReminders.length === 0) {
                      return (
                        <div className={`rounded-3xl p-5 border border-dashed ${theme.border} text-center py-6`}>
                          <p className={`text-xs ${theme.textSecondary} italic opacity-75`}>No love notes scheduled yet.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {noteReminders.map(r => {
                          const parts = r.title.split("|");
                          const mainTitle = parts[0].trim();
                          const noteContent = parts[1].trim();
                          return (
                            <button
                              key={r.id}
                              onClick={() => setOpenedLoveNote(noteContent)}
                              className={`p-4 rounded-3xl border flex flex-col items-center text-center space-y-2.5 transition-all duration-300 active:scale-95 bg-white/5 border-white/10 shadow-sm relative overflow-hidden`}
                            >
                              <div className="absolute top-2 right-2.5 text-[8px] font-bold text-[#EC708B]">Time: {r.time}</div>
                              <div className="p-2 rounded-2xl bg-pink-500/10 text-pink-400">
                                <Mail className="w-5 h-5 animate-pulse" />
                              </div>
                              <div>
                                <h4 className={`text-xs font-black ${theme.textPrimary} truncate max-w-[120px]`}>{mainTitle}</h4>
                                <span className={`text-[8px] font-black uppercase text-pink-400 block mt-0.5`}>Read Note</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Write / Schedule form */}
                <div className="space-y-3 pt-2">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textSecondary} px-1`}>
                    Write a Love Note
                  </h3>
                  <form onSubmit={handleSendLoveNote} className={`rounded-3xl p-5 border ${theme.card} ${theme.border} ${theme.shadow} space-y-4`}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-[9px] font-bold uppercase tracking-wider ${theme.textSecondary} mb-1`}>Note Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Sleep Time"
                          value={loveNoteTitle}
                          onChange={e => setLoveNoteTitle(e.target.value)}
                          className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border outline-none focus:ring-1 focus:ring-[#EC708B] bg-transparent ${theme.border} ${theme.textPrimary}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[9px] font-bold uppercase tracking-wider ${theme.textSecondary} mb-1`}>Time</label>
                        <input
                          type="time"
                          required
                          value={loveNoteTime}
                          onChange={e => setLoveNoteTime(e.target.value)}
                          className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border outline-none focus:ring-1 focus:ring-[#EC708B] bg-transparent ${theme.border} ${theme.textPrimary}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-[9px] font-bold uppercase tracking-wider ${theme.textSecondary} mb-1`}>Your Message</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Type a heartwarming note that rings on her phone..."
                        value={loveNoteContent}
                        onChange={e => setLoveNoteContent(e.target.value)}
                        className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border outline-none focus:ring-1 focus:ring-[#EC708B] bg-transparent ${theme.border} ${theme.textPrimary}`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sendingLoveNote}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold text-xs shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                    >
                      {sendingLoveNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Schedule Note"}
                    </button>
                    
                    {loveNoteSuccess && (
                      <p className="text-[10px] font-bold text-center text-emerald-400 animate-pulse">
                        Note scheduled successfully!
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Visual Navigation Arrow Hints at the Bottom */}
      {isAuthorized && (
        <div className="flex justify-center mt-6 select-none">
          <button
            onClick={() => setActiveSubTab(activeSubTab === 0 ? 1 : 0)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all active:scale-95 shadow-sm text-xs font-black ${
              activeSubTab === 0 
                ? "bg-[#EC708B]/10 border-[#EC708B]/35 text-[#EC708B] hover:bg-[#EC708B]/15" 
                : "bg-white/5 border-white/10 text-gray-400 hover:text-[#EC708B] hover:border-[#EC708B]/30"
            }`}
          >
            {activeSubTab === 0 ? (
              <>
                <span>Planner & Notes</span>
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Alarms & Clock</span>
              </>
            )}
          </button>
        </div>
      )}


      {/* Preset Custom Time Selection Modal */}
      {activePreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <motion.div initial={{ opacity:0, scale:0.93 }} animate={{ opacity:1, scale:1 }}
            className={`w-full max-w-xs rounded-3xl p-6 ${theme.card} border ${theme.border} shadow-2xl space-y-4`}
          >
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 inline-block">
                  {activePreset.type === 'medicine' ? <Pill className="w-8 h-8 text-emerald-400" /> : activePreset.type === 'prayer' ? <Compass className="w-8 h-8 text-amber-400" /> : <Droplet className="w-8 h-8 text-blue-400" />}
                </div>
              </div>
              <h3 className={`text-base font-black ${theme.textPrimary} mt-2`}>Schedule {activePreset.title}</h3>
              <p className={`text-xs ${theme.textSecondary} mt-1`}>Select alarm time for your daily routine:</p>
            </div>
            
            <div className="flex justify-center">
              <input
                type="time"
                value={presetTime}
                onChange={e => setPresetTime(e.target.value)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-bold text-center w-36 outline-none focus:ring-2 focus:ring-[#EC708B]/40 transition-all ${theme.border} bg-transparent ${theme.textPrimary}`}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setActivePreset(null)}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl border ${theme.border} ${theme.textSecondary} active:scale-95 transition-transform`}>
                Cancel
              </button>
              <button
                disabled={addingPreset}
                onClick={() => handleCreatePreset(activePreset.title, activePreset.type, activePreset.note)}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-[#EC708B] hover:bg-[#db5d78] rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {addingPreset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Schedule"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Love Letter Display Modal Overlay */}
      {openedLoveNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none">
          <motion.div
            initial={{ opacity:0, y:30, scale:0.95 }}
            animate={{ opacity:1, y:0, scale:1 }}
            className="w-full max-w-sm rounded-[32px] p-6 bg-[#FCF8F2] border-2 border-amber-400/30 shadow-[0_8px_32px_rgba(252,211,77,0.2)] text-gray-800 font-serif relative"
          >
            <button
              onClick={() => setOpenedLoveNote(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-all active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="space-y-4 text-center">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-xl mx-auto shadow-sm animate-bounce text-amber-800">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest font-sans">
                  Love note from Him
                </h4>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">Scheduled Daily</p>
              </div>
              <hr className="border-t border-dashed border-amber-900/10" />
              <p className="text-sm leading-relaxed text-amber-950 italic whitespace-pre-line px-2">
                "{openedLoveNote}"
              </p>
              <hr className="border-t border-dashed border-amber-900/10" />
              <div className="flex justify-center gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} className="w-3.5 h-3.5 text-red-500 fill-current animate-pulse" />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ════════ DELETE CONFIRM ════════ */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity:0, scale:0.93 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.93 }}
              className={`w-full max-w-xs rounded-3xl p-6 ${theme.card} border ${theme.border} shadow-2xl space-y-4`}>
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <h3 className={`text-sm font-bold ${theme.textPrimary}`}>Remove this reminder?</h3>
                <p className={`text-xs ${theme.textSecondary} mt-1`}>You won't be notified for this anymore.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeletingId(null)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl border ${theme.border} ${theme.textSecondary} active:scale-95 transition-transform`}>
                  Keep it
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
