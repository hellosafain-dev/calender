/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Memory, Reminder, ThemeType } from "./types.js";
import { THEMES } from "./lib/themes.js";
import { API, getSession, clearSession, Session } from "./lib/api.js";
import BottomNav from "./components/BottomNav.js";
import CalendarPage from "./components/CalendarPage.js";
import TimelinePage from "./components/TimelinePage.js";
import ClockPage from "./components/ClockPage.js";
import SettingsPage from "./components/SettingsPage.js";
import ErrorBoundary from "./components/ErrorBoundary.js";
import { Flower, ShieldAlert, Heart, Award, Compass, Pill, Activity, Mail } from "lucide-react";
import GlowingLanterns from "./components/GlowingLanterns.js";
import BirthdaySurprise from "./components/BirthdaySurprise.js";

// ─── Constants & Alarm Utils ───────────────────────────────────────────────
const TYPE_META: Record<string, { gradient: string; label: string; border: string }> = {
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

function playMelodiousAlarm(loops = 3) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx = new Ctx();
    // Beautiful ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1479.98, 1760, 2093];
    let t = ctx.currentTime;
    for (let loop = 0; loop < loops; loop++) {
      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 15, // 15 seconds
      retry: 2,
    },
  },
});

function playBirthdayChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx = new Ctx();
    
    // Play celestial chime arpeggios
    const playArpeggio = (timeOffset: number) => {
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98, 1975.53];
      let t = ctx.currentTime + timeOffset;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.3);
        t += 0.15;
      });
    };

    // Loop chime arpeggio every 2.5 seconds
    const interval = setInterval(() => {
      playArpeggio(0);
    }, 2500);
    
    playArpeggio(0);

    // Stop after exactly 15 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      try { ctx.close(); } catch {}
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      try { ctx.close(); } catch {}
    };
  } catch {
    return () => {};
  }
}

function sendBirthdayNotification() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    const n = new Notification("A Magical Surprise Awaits...", {
      body: "Happy Birthday, My Sweetheart! Open the app to see your surprise.",
      icon: "/icons/icon-192.png",
      tag: "birthday-surprise",
      requireInteraction: true
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  }
}

export default function App() {
  // Navigation active tab index (0: Calendar, 1: Timeline, 2: Reminders, 3: Settings)
  const [activeTab, setActiveTab] = useState(0);

  // Application Data States
  const [memories, setMemories] = useState<Memory[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedThemeName, setSelectedThemeName] = useState<ThemeType>("cherry");
  const [autoCycle, setAutoCycle] = useState(false);
  const [diaryTitle, setDiaryTitle] = useState("Bloom Diary");
  const [customGreeting, setCustomGreeting] = useState("");

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User Authentication & Roles (Admin, Viewer, Guest)
  const [session, setSession] = useState<Session>({ role: null, username: null });

  // Navigation Callback dates (e.g. tapping empty calendar date takes Admin to Write entry with that pre-selected date)
  const [preSelectedDate, setPreSelectedDate] = useState<string | null>(null);

  // Check if today is the special birthday window (July 17, 23:59:00 to July 18, 23:59:59)
  // or if simulate_birthday=true query param is set
  const checkIsBirthday = () => {
    const isSimulated = new URLSearchParams(window.location.search).get("simulate_birthday") === "true";
    if (isSimulated) return true;

    const now = new Date();
    const currentYear = now.getFullYear();
    const bdayStart = new Date(currentYear, 6, 17, 23, 59, 0).getTime();
    const bdayEnd = new Date(currentYear, 6, 18, 23, 59, 59).getTime();
    const nowTime = now.getTime();
    return nowTime >= bdayStart && nowTime <= bdayEnd;
  };

  const isBirthday = checkIsBirthday();

  const [letterRead, setLetterRead] = useState(() => {
    const isSimulated = new URLSearchParams(window.location.search).get("simulate_birthday") === "true";
    if (isSimulated) return false;
    return localStorage.getItem("bloom_birthday_letter_read") === "true";
  });

  const themeKeys: ThemeType[] = [
    'light', 'dark', 'autumn', 'spring', 'lavender', 'cherry', 'forest', 'ocean',
    'rapunzel', 'barbie', 'oswald', 'butterfly', 'sunshine', 'gilded_rose', 'midnight_forest', 'cosmic_stardust'
  ];
  const activeThemeName = isBirthday
    ? 'rapunzel'
    : autoCycle
      ? themeKeys[(new Date().getDate() - 1) % themeKeys.length]
      : selectedThemeName;
  const currentTheme = THEMES[activeThemeName];

  // Triggered reminders tracking
  const [triggeredToday, setTriggeredToday] = useState<{[reminderId: string]: string}>({});
  const [activeTriggeredReminder, setActiveTriggeredReminder] = useState<Reminder | null>(null);

  const [activeAlarmStop, setActiveAlarmStop] = useState<(() => void) | null>(null);

  // Background check for active reminders
  useEffect(() => {
    const checkActiveReminders = () => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      
      const localYear = now.getFullYear();
      const localMonth = String(now.getMonth() + 1).padStart(2, "0");
      const localDay = String(now.getDate()).padStart(2, "0");
      const currentLocalYYYYMMDD = `${localYear}-${localMonth}-${localDay}`;
      const timeKey = `${currentLocalYYYYMMDD}-${currentHHMM}`;

      reminders.forEach((reminder) => {
        if (!reminder.isActive) return;
        if (reminder.time !== currentHHMM) return;

        // Check if already triggered during this exact minute
        if (triggeredToday[reminder.id] === timeKey) return;

        // Verify date/repeat criteria
        let isMatched = false;
        const baseDate = new Date(reminder.date || reminder.createdAt);

        if (reminder.repeat === "none") {
          if (reminder.date) {
            isMatched = reminder.date === currentLocalYYYYMMDD;
          } else {
            isMatched = true; // Trigger today at specified HH:MM
          }
        } else if (reminder.repeat === "daily") {
          isMatched = true;
        } else if (reminder.repeat === "weekly") {
          isMatched = now.getDay() === baseDate.getDay();
        } else if (reminder.repeat === "monthly") {
          isMatched = now.getDate() === baseDate.getDate();
        } else if (reminder.repeat === "yearly") {
          isMatched = now.getMonth() === baseDate.getMonth() && now.getDate() === baseDate.getDate();
        }

        if (isMatched) {
          const stopAudio = playMelodiousAlarm(4);
          setActiveAlarmStop(() => stopAudio);
          setActiveTriggeredReminder(reminder);
          setTriggeredToday(prev => ({ ...prev, [reminder.id]: timeKey }));
          
          if ("Notification" in window && Notification.permission === "granted") {
            const cleanTitle = reminder.title.split("|")[0].trim();
            new Notification(cleanTitle, {
              body: `Your ${TYPE_META[reminder.type]?.label || 'reminder'} is ringing!`,
              icon: "/icons/icon-192.png"
            });
          }
        }
      });
    };

    const interval = setInterval(checkActiveReminders, 10000);
    checkActiveReminders();

    return () => clearInterval(interval);
  }, [reminders, triggeredToday]);

// Helper to convert base64 URL to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported on this browser/device.');
    return;
  }

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      console.log('Notification permission not granted.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Get public VAPID key from backend
    const { publicKey } = await API.getVapidPublicKey();
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);

    // Subscribe browser to Web Push
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // Send subscription info to backend to register device
    const subJSON = subscription.toJSON();
    if (subJSON.endpoint && subJSON.keys) {
      await API.subscribePush({
        endpoint: subJSON.endpoint,
        keys: {
          p256dh: subJSON.keys.p256dh,
          auth: subJSON.keys.auth
        }
      });
      console.log('Successfully registered device for background push notifications!');
    }
  } catch (err) {
    console.error('Failed to initialize push notifications:', err);
  }
}

  // Load all server-side data on mount (with optional visible spinner)
  const loadAllData = async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      setError(null);
 
      // Fetch active settings & themes
      const sData = await API.getSettings();
      setSelectedThemeName(sData.theme);
      setDiaryTitle(sData.title);
      setAutoCycle(!!sData.autoCycle);
      setCustomGreeting(sData.customGreeting || "");
 
      // Fetch memories & reminders
      const [mList, rList] = await Promise.all([
        API.getMemories(),
        API.getReminders()
      ]);
 
      setMemories(mList);
      setReminders(rList);
    } catch (err: any) {
      console.error("Failed to fetch full-stack server state:", err);
      if (showSpinner) {
        setError("Failed to coordinate data with our digital garden server. Please refresh.");
      }
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };
 
  useEffect(() => {
    // Read session from local storage on bootstrap
    const activeSession = getSession();
    setSession(activeSession);
    
    loadAllData(true);
    initPushNotifications();

    // Regularly update data in the background every 2 minutes (120000ms)
    const intervalId = setInterval(() => {
      loadAllData(false);
    }, 120000);

    return () => clearInterval(intervalId);
  }, []);

  // Trigger birthday alarm sound & alert notification when timer ends
  useEffect(() => {
    if (!isBirthday) return;
    
    // Ensure it only triggers once per session
    if (window.sessionStorage.getItem("bloom_birthday_alarm_played") === "true") return;
    window.sessionStorage.setItem("bloom_birthday_alarm_played", "true");

    let stopAudio: (() => void) | null = null;

    // Send notification immediately if already granted
    if (Notification.permission === "granted") {
      sendBirthdayNotification();
    }

    const startBirthdayEffects = () => {
      // 1. Play celestial chime
      if (!stopAudio) {
        stopAudio = playBirthdayChime();
      }

      // 2. Request notification permission (or trigger if granted)
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            sendBirthdayNotification();
          }
        });
      } else if (Notification.permission === "granted") {
        sendBirthdayNotification();
      }
    };

    // Trigger immediately by default when the timer stops
    startBirthdayEffects();

    // Listen to first click/touch on the window as fallback to play audio and trigger notification if blocked
    const onUserInteraction = () => {
      startBirthdayEffects();
      window.removeEventListener("click", onUserInteraction);
      window.removeEventListener("touchstart", onUserInteraction);
    };

    window.addEventListener("click", onUserInteraction);
    window.addEventListener("touchstart", onUserInteraction);

    return () => {
      window.removeEventListener("click", onUserInteraction);
      window.removeEventListener("touchstart", onUserInteraction);
      if (stopAudio) stopAudio();
    };
  }, [isBirthday]);

  // Update document body style when active theme transitions
  useEffect(() => {
    const currentTheme = THEMES[activeThemeName];
    // Remove all possible bg classes
    const body = document.body;
    if (body) {
      body.className = `${currentTheme.bg} transition-colors duration-500 font-sans antialiased text-gray-800 selection:bg-pink-150`;
    }
  }, [activeThemeName]);

  // Update browser favicon dynamically to match the current date and active theme
  useEffect(() => {
    const today = new Date();
    const day = today.getDate();

    const themeColors: Record<string, string> = {
      light: "#C49A45",
      dark: "#A78BFA",
      autumn: "#D96B27",
      spring: "#719E6E",
      lavender: "#8E79CD",
      cherry: "#EC708B",
      forest: "#4AA685",
      ocean: "#4FADD2",
      elegant_dark: "#FFFFFF",
      rapunzel: "#FCD34D",
    };

    const accentColor = themeColors[activeThemeName] || "#EC708B";
    const textColor = activeThemeName === "elegant_dark" ? "#000000" : accentColor;

    // Render an SVG favicon representing the calendar icon with the correct date
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <rect width="512" height="512" rx="140" fill="${accentColor.replace('#', '%23')}" />
        <rect x="75" y="75" width="362" height="362" rx="75" fill="%23FFFFFF" />
        <rect x="160" y="110" width="32" height="50" rx="16" fill="rgba(0,0,0,0.15)" />
        <rect x="320" y="110" width="32" height="50" rx="16" fill="rgba(0,0,0,0.15)" />
        <text x="256" y="325" 
              font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif" 
              font-size="200" 
              font-weight="900" 
              fill="${textColor.replace('#', '%23')}" 
              text-anchor="middle"
              letter-spacing="-8">
          ${day}
        </text>
      </svg>
    `.trim();

    // Dynamic favicon update
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = `data:image/svg+xml;utf8,${svg}`;

    // Dynamic apple-touch-icon update
    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = `data:image/svg+xml;utf8,${svg}`;
  }, [activeThemeName]);


  const handleThemeChange = async (themeName: ThemeType) => {
    try {
      setSelectedThemeName(themeName);
      setAutoCycle(false);
      await API.updateSettings({ theme: themeName, autoCycle: false });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAutoCycle = async () => {
    const nextVal = !autoCycle;
    setAutoCycle(nextVal);
    try {
      await API.updateSettings({ autoCycle: nextVal });
    } catch (err) {
      console.error("Failed to update auto cycle settings:", err);
    }
  };

  const handleLoginSuccess = (newSession: Session) => {
    setSession(newSession);
  };

  const handleLogout = () => {
    clearSession();
    setSession({ role: null, username: null });
    setActiveTab(0);
  };

  const handleNavigateToSettingsWithDate = (dateStr: string) => {
    setPreSelectedDate(dateStr);
    setActiveTab(3); // Switch to Settings tab
  };



  if (loading && !memories.length) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#FDF8F8] text-[#855D5D] gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <Flower className="w-12 h-12 text-[#EC708B] animate-pulse" />
        </motion.div>
        <span className="text-sm font-medium tracking-widest uppercase animate-pulse">
          Bloom Diary Loading...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center bg-red-50 text-red-600 space-y-4">
        <ShieldAlert className="w-12 h-12" />
        <div>
          <h2 className="text-xl font-bold">Garden Server Offline</h2>
          <p className="text-sm text-red-500 max-w-md mt-2">{error}</p>
        </div>
        <button
          onClick={() => loadAllData(true)}
          className="px-5 py-2.5 rounded-full bg-red-600 text-white font-bold text-xs shadow-md cursor-pointer hover:bg-red-700 active:scale-95 transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary fallbackMessage="Garden encountered an error">
    <div className={`min-h-screen ${currentTheme.bg} pb-24 transition-colors duration-500 relative overflow-x-hidden`}>
      {/* Dynamic Blurred Theme Background Image */}
      {currentTheme.bgImage && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-1000"
          style={{ 
            backgroundImage: `url(${currentTheme.bgImage})`,
            filter: 'blur(8px) brightness(0.85) saturate(1.2)',
            transform: 'scale(1.05)' // slight zoom to hide edge artifacts from blur
          }} 
        />
      )}

      {/* Elegant Dark Ambient Glows */}
      {selectedThemeName === "elegant_dark" && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-rose-950/20 rounded-full blur-[130px] opacity-75" />
          <div className="absolute top-1/4 -right-40 w-[400px] h-[400px] bg-amber-950/15 rounded-full blur-[110px] opacity-60" />
          <div className="absolute bottom-10 left-1/3 w-[450px] h-[450px] bg-red-950/10 rounded-full blur-[120px] opacity-50" />
        </div>
      )}

      {/* Rapunzel Birthday Glowing Lanterns background overlay */}
      {isBirthday && <GlowingLanterns />}

      {/* Birthday Surprise Cinematic overlay */}
      {isBirthday && !letterRead && (
        <BirthdaySurprise onClose={() => { setLetterRead(true); localStorage.setItem("bloom_birthday_letter_read", "true"); }} />
      )}

      {/* Dynamic Tab Mounting */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 0 && (
            <motion.div
              key="tab-calendar"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <CalendarPage
                memories={memories}
                onRefreshMemories={loadAllData}
                theme={currentTheme}
                session={session}
                onNavigateToSettingsWithDate={handleNavigateToSettingsWithDate}
                customGreeting={customGreeting}
              />
            </motion.div>
          )}

          {activeTab === 1 && (
            <motion.div
              key="tab-timeline"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <TimelinePage
                memories={memories}
                theme={currentTheme}
              />
            </motion.div>
          )}

          {activeTab === 2 && (
            <motion.div
              key="tab-clock"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <ClockPage
                reminders={reminders}
                onRefreshReminders={loadAllData}
                theme={currentTheme}
              />
            </motion.div>
          )}

          {activeTab === 3 && (
            <motion.div
              key="tab-settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <SettingsPage
                memories={memories}
                onRefreshMemories={loadAllData}
                theme={currentTheme}
                selectedThemeName={selectedThemeName}
                onChangeTheme={handleThemeChange}
                session={session}
                onLoginSuccess={handleLoginSuccess}
                onLogout={handleLogout}
                preSelectedDate={preSelectedDate}
                clearPreSelectedDate={() => setPreSelectedDate(null)}
                autoCycle={autoCycle}
                onToggleAutoCycle={handleToggleAutoCycle}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Dock */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={currentTheme}
      />

      {/* Real-time Triggered Reminder Modal */}
      <AnimatePresence>
        {activeTriggeredReminder && (
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
              <div className="relative flex flex-col items-center pt-10 pb-6 px-6 text-center space-y-5">
                <motion.div
                  animate={{ scale:[1, 1.15, 1] }}
                  transition={{ duration:1.2, repeat:Infinity, ease:"easeInOut" }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-2xl"
                >
                  {getReminderIcon(activeTriggeredReminder.type, "w-10 h-10 text-white")}
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
                    {TYPE_META[activeTriggeredReminder.type]?.label || 'General'} Reminder
                  </p>
                  {(() => {
                    const parts = activeTriggeredReminder.title.split("|");
                    const mainTitle = parts[0].trim();
                    const loveNote = parts[1]?.trim();
                    return (
                      <>
                        <h2 className="text-2xl font-black text-white tracking-tight">{mainTitle}</h2>
                        {loveNote && (
                          <div className="mt-3 p-4 rounded-2xl bg-white/5 border border-amber-400/20 text-left relative overflow-hidden shadow-inner max-h-36 overflow-y-auto">
                            <div className="absolute top-2 right-3 text-[8px] font-black uppercase text-amber-400 tracking-widest animate-pulse flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5" /> Note
                            </div>
                            <p className="text-amber-200 text-xs italic leading-relaxed mt-1">"{loveNote}"</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <p className="text-violet-300/70 text-xs mt-1.5">{activeTriggeredReminder.time}</p>
                </div>

                <div className="flex gap-3 w-full">
                  <button onClick={() => {
                    if (activeAlarmStop) activeAlarmStop();
                    setActiveAlarmStop(null);
                    
                    const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
                    const snoozeHHMM = `${String(snoozeTime.getHours()).padStart(2, "0")}:${String(snoozeTime.getMinutes()).padStart(2, "0")}`;
                    API.createReminder({
                      title: `${activeTriggeredReminder.title.split('|')[0].trim()} (Snoozed 5m)`,
                      time: snoozeHHMM,
                      repeat: "none",
                      type: activeTriggeredReminder.type
                    }).then(() => loadAllData(false)).catch(() => {});
                    
                    setActiveTriggeredReminder(null);
                  }}
                    className="flex-1 py-3 rounded-2xl bg-white/10 border border-white/15 text-white text-xs font-black active:scale-95 transition-transform cursor-pointer">
                    Snooze
                  </button>
                  <button onClick={() => {
                    if (activeAlarmStop) activeAlarmStop();
                    setActiveAlarmStop(null);
                    setActiveTriggeredReminder(null);
                  }}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-black shadow-lg active:scale-95 transition-transform cursor-pointer">
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
