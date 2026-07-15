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
const TYPE_META: Record<Reminder["type"], { icon: string; gradient: string; label: string; border: string }> = {
  anniversary: { icon: "💖", gradient: "from-pink-500 to-rose-500",   label: "Anniversary", border: "border-pink-400/30" },
  birthday:    { icon: "🎂", gradient: "from-amber-400 to-orange-500",label: "Birthday",    border: "border-amber-400/30" },
  prayer:      { icon: "🙏", gradient: "from-teal-400 to-cyan-500",   label: "Prayer",      border: "border-teal-400/30" },
  medicine:    { icon: "💊", gradient: "from-blue-400 to-indigo-500", label: "Medicine",    border: "border-blue-400/30" },
  custom:      { icon: "🌸", gradient: "from-purple-400 to-violet-500",label: "General",    border: "border-purple-400/30" },
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
          {TYPE_OPTS.map(t => <option key={t} value={t}>{TYPE_META[t].icon} {TYPE_META[t].label}</option>)}
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

  // Active alarm
  const [activeAlarm, setActiveAlarm] = useState<Reminder | null>(null);
  const alarmStopRef = useRef<(() => void) | null>(null);
  const triggeredRef = useRef<Record<string, string>>({});

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
    if (hr < 12) return "Good morning 🌸";
    if (hr < 17) return "Good afternoon ✨";
    return "Good evening 💕";
  }, []);

  // ── Alarm checker (runs every 30s) ──
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      const ymd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      const key = `${ymd}-${hhmm}`;

      reminders.forEach(r => {
        if (!r.isActive || r.time !== hhmm) return;
        if (triggeredRef.current[r.id] === key) return;

        let match = false;
        if (r.repeat === "none")    match = !r.date || r.date === ymd;
        if (r.repeat === "daily")   match = true;
        if (r.repeat === "weekly")  match = now.getDay() === new Date(r.date || r.createdAt).getDay();
        if (r.repeat === "monthly") match = now.getDate() === new Date(r.date || r.createdAt).getDate();
        if (r.repeat === "yearly") {
          const bd = new Date(r.date || r.createdAt);
          match = now.getMonth() === bd.getMonth() && now.getDate() === bd.getDate();
        }

        if (match) {
          triggeredRef.current[r.id] = key;
          setActiveAlarm(r);
          alarmStopRef.current = playMelodiousAlarm(4);
          sendNotification(`⏰ ${r.title}`, `Your ${TYPE_META[r.type].label} reminder is ringing!`);
        }
      });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [reminders]);

  const stopAlarm = useCallback(() => {
    alarmStopRef.current?.();
    alarmStopRef.current = null;
    setActiveAlarm(null);
  }, []);

  const snoozeAlarm = useCallback(() => {
    stopAlarm();
    if (!activeAlarm) return;
    const snoozeAt = new Date(Date.now() + 5 * 60 * 1000);
    const hhmm = `${String(snoozeAt.getHours()).padStart(2,"0")}:${String(snoozeAt.getMinutes()).padStart(2,"0")}`;
    API.createReminder({ title: `${activeAlarm.title} (Snoozed 5m)`, time: hhmm, repeat: "none", type: activeAlarm.type })
      .then(onRefreshReminders).catch(() => {});
  }, [activeAlarm, stopAlarm, onRefreshReminders]);

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

  // ─────────────────────────────────── RENDER ─────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-5 pt-4 pb-28">

      {/* ════════ HEADER ════════ */}
      <div className="text-center mb-6 mt-2">
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${theme.textPrimary}`}>
          ⏰ Reminders
        </h1>
        <p className={`text-xs mt-1 ${theme.textSecondary} italic`}>{greeting}</p>
      </div>

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
                  <span className="text-2xl">{TYPE_META[aiSuggestion.type as Reminder["type"]]?.icon}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${theme.textPrimary}`}>{aiSuggestion.title}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold text-white/70">
                        🕒 {aiSuggestion.time}
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
                    {TYPE_OPTS.map(t => <option key={t} value={t}>{TYPE_META[t].icon} {TYPE_META[t].label}</option>)}
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
              {f === "all" ? "All 🌸" : f === "active" ? "🔔 Active" : `${TYPE_META[f as Reminder["type"]]?.icon} ${TYPE_META[f as Reminder["type"]]?.label}`}
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
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-xl shadow-md shrink-0 transition-all duration-300 ${!r.isActive ? "grayscale opacity-40" : ""}`}>
                      {meta.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate transition-all ${r.isActive ? theme.textPrimary : "text-gray-500 line-through"}`}>
                        {r.title}
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
                            className={`w-5 h-5 rounded-full shadow-md flex items-center justify-center text-[8px] font-black transition-colors ${
                              r.isActive ? "bg-white text-emerald-600" : "bg-gray-400 text-gray-600"
                            }`}>
                            {r.isActive ? "✓" : "✕"}
                          </motion.div>
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

      {/* ════════ ACTIVE ALARM OVERLAY ════════ */}
      <AnimatePresence>
        {activeAlarm && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale:0.8, y:60 }} animate={{ scale:1, y:0 }} exit={{ scale:0.8, y:60 }}
              transition={{ type:"spring", stiffness:320, damping:26 }}
              className="w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
              style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)" }}
            >
              {/* Pulsing ring */}
              <div className="relative flex flex-col items-center pt-10 pb-6 px-6 text-center space-y-5">
                <motion.div
                  animate={{ scale:[1, 1.15, 1] }}
                  transition={{ duration:1.2, repeat:Infinity, ease:"easeInOut" }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-2xl text-5xl"
                >
                  {TYPE_META[activeAlarm.type].icon}
                </motion.div>

                {/* Pulse rings */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2">
                  {[1,2,3].map(i => (
                    <motion.div key={i}
                      animate={{ scale:[1, 2.5+i*0.3], opacity:[0.5, 0] }}
                      transition={{ duration:2, repeat:Infinity, delay:i*0.4, ease:"easeOut" }}
                      className="absolute w-24 h-24 rounded-full border-2 border-pink-400/40 -translate-x-1/2 -translate-y-0" />
                  ))}
                </div>

                <div>
                  <p className="text-xs text-violet-300 font-bold uppercase tracking-widest mb-1">
                    {TYPE_META[activeAlarm.type].label} Reminder
                  </p>
                  <h2 className="text-2xl font-black text-white tracking-tight">{activeAlarm.title}</h2>
                  <p className="text-violet-300/70 text-xs mt-1">🕒 {activeAlarm.time}</p>
                </div>

                <div className="flex gap-3 w-full">
                  <button onClick={snoozeAlarm}
                    className="flex-1 py-3 rounded-2xl bg-white/10 border border-white/15 text-white text-xs font-black active:scale-95 transition-transform">
                    😴 Snooze 5m
                  </button>
                  <button onClick={stopAlarm}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-black shadow-lg active:scale-95 transition-transform">
                    ✓ Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
