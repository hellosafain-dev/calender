/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Heart, CloudSun, Music, Tag, Calendar as CalendarIcon, MapPin, Sparkles, X, Plus, Sprout, Lock, Flower2 } from "lucide-react";
import { Memory, Reminder } from "../types.js";
import { ThemeConfig, FLOWERS } from "../lib/themes.js";
import { API, Session } from "../lib/api.js";
import { fetchCurrentWeather, WeatherInfo } from "../lib/weather.js";
import { useToggleFavorite } from "../lib/hooks.js";

function BirthdayCountdownCard({ theme }: { theme: ThemeConfig }) {
  const calculateTimeLeft = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const target = new Date(currentYear, 6, 17, 23, 59, 0).getTime(); // 17 July 11:59 PM
    const diff = target - now.getTime();
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    
    return { days, hours, minutes, seconds };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl p-5 border relative overflow-hidden bg-[#291B3E]/60 backdrop-blur-xl border-[#D97706]/20 shadow-[0_8px_32px_rgba(28,18,44,0.3)] text-center"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#C084FC] flex items-center gap-1.5 animate-pulse mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-[#FCD34D]" />
            A Magical Surprise Awaits
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 select-none">
          {[
            { label: "Days", val: timeLeft.days },
            { label: "Hours", val: timeLeft.hours },
            { label: "Mins", val: timeLeft.minutes },
            { label: "Secs", val: timeLeft.seconds }
          ].map((item, idx) => (
            <div key={idx} className="bg-white/5 border border-[#D97706]/10 rounded-2xl p-2 sm:p-2.5 shadow-sm">
              <span className="block text-sm sm:text-lg font-black text-[#FDE047] tracking-tight tabular-nums">
                {String(item.val).padStart(2, "0")}
              </span>
              <span className="block text-[7px] sm:text-[8px] font-extrabold uppercase tracking-widest text-[#C084FC] mt-0.5">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function BirthdaySurpriseCard({ theme }: { theme: ThemeConfig }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-5 border relative overflow-hidden bg-gradient-to-br from-[#291B3E] via-[#3d2460] to-[#1c122c] border-[#FCD34D]/30 shadow-[0_0_30px_rgba(252,211,77,0.25)] text-center"
    >
      <div className="relative z-10 space-y-4">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg animate-bounce">
          <Sparkles className="w-5.5 h-5.5 text-white" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
            Happy Birthday, My Princess!
          </h3>
          <p className="text-[10px] sm:text-[11px] text-[#C084FC] leading-relaxed">
            The lanterns are glowing, the stars are shining, and the entire garden is blooming just for you today. You make my world magical.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

interface CalendarPageProps {
  memories: Memory[];
  theme: ThemeConfig;
  session: Session;
  onNavigateToSettingsWithDate: (dateStr: string) => void;
  onClickDate?: (dateStr: string) => void;
  customGreeting?: string;
}

export default function CalendarPage({
  memories,
  theme,
  session,
  onNavigateToSettingsWithDate,
  onClickDate,
  customGreeting
}: CalendarPageProps) {
  const { mutateAsync: toggleFavorite } = useToggleFavorite();
  // Current month being viewed on the calendar
  const today = new Date();
  const currentYearOfToday = 2025; // Base year set to 2025 as requested
  const minDate = new Date(currentYearOfToday, 9, 18); // October 18, 2025
  const maxDate = new Date(currentYearOfToday + 30, 9, 18); // October 18, 2055

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

  const checkIsBeforeBirthday = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const target = new Date(currentYear, 6, 17, 23, 59, 0).getTime();
    return now.getTime() < target;
  };

  const isBeforeBirthday = checkIsBeforeBirthday();

  // Initialize view to minDate if current date is before minDate, maxDate if after maxDate, else today
  const [currentYear, setCurrentYear] = useState(() => {
    const initDate = today < minDate ? minDate : (today > maxDate ? maxDate : today);
    return initDate.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const initDate = today < minDate ? minDate : (today > maxDate ? maxDate : today);
    return initDate.getMonth(); // 0-indexed
  });

  // State for currently expanded memory details
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Clicked empty/out-of-range date info
  const [clickedEmptyDate, setClickedEmptyDate] = useState<{ dateStr: string; isWithinRange: boolean } | null>(null);

  // Gemini Poetic Quote State
  const [poeticQuote, setPoeticQuote] = useState({
    quote: "Love is a garden where sweet memories quietly bloom day by day.",
    sentiment: "The rose tells a story of endless devotion."
  });
  const [loadingQuote, setLoadingQuote] = useState(false);

  // Smart Weather Forecast State
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  // Load a beautiful quote from Gemini based on the latest memory's flower and mood
  useEffect(() => {
    async function loadQuote() {
      setLoadingQuote(true);
      try {
        let mood = "peaceful";
        let flowerName = "rose";

        if (memories.length > 0) {
          const nonDrafts = [...memories]
            .filter((m) => !m.isDraft)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          if (nonDrafts.length > 0) {
            mood = nonDrafts[0].mood || "peaceful";
            flowerName = FLOWERS[nonDrafts[0].flowerId]?.name || "rose";
          }
        }

        const quote = await API.getGeminiQuote(mood, flowerName);
        setPoeticQuote(quote);
      } catch (err) {
        console.error("Failed to load Gemini quote:", err);
      } finally {
        setLoadingQuote(false);
      }
    }
    loadQuote();
  }, [memories]);

  // Load current weather on mount
  useEffect(() => {
    async function loadWeather() {
      try {
        const info = await fetchCurrentWeather();
        setWeather(info);
      } catch (err) {
        console.error("Failed to load weather forecast:", err);
      }
    }
    loadWeather();
  }, []);

  // Convert a YYYY-MM-DD string to a unique day index (relative to October 18, currentYear)
  const getDayIndex = (dateStr: string): number => {
    const d = new Date(dateStr + "T00:00:00");
    const start = new Date(currentYearOfToday, 9, 18);
    const diffTime = d.getTime() - start.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Convert a unique day index back to a YYYY-MM-DD string
  const getDateStrFromIndex = (index: number): string => {
    const start = new Date(currentYearOfToday, 9, 18);
    const d = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Fetch calendar days
  const getDaysInMonth = (year: number, month: number) => {
    const startDayOfWeek = new Date(year, month, 1).getDay();
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    
    const days = [];
    
    // Fill previous month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        dayIndex: getDayIndex(dateStr),
      });
    }
    
    // Fill current month days
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        dayIndex: getDayIndex(dateStr),
      });
    }
    
    // Fill next month leading days to complete grid of 42 (6 rows)
    const remainingSlots = 42 - days.length;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let i = 1; i <= remainingSlots; i++) {
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        dayIndex: getDayIndex(dateStr),
      });
    }
    
    return days;
  };

  const calendarDays = getDaysInMonth(currentYear, currentMonth);

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const nextMonthHandler = () => {
    const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    // Limit to maxDate (October 18, currentYear + 30)
    if (nextY > maxDate.getFullYear() || (nextY === maxDate.getFullYear() && nextM > maxDate.getMonth())) {
      return;
    }
    setCurrentMonth(nextM);
    setCurrentYear(nextY);
  };

  const prevMonthHandler = () => {
    const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Limit to minDate (October 18, currentYear)
    if (prevY < minDate.getFullYear() || (prevY === minDate.getFullYear() && prevM < minDate.getMonth())) {
      return;
    }
    setCurrentMonth(prevM);
    setCurrentYear(prevY);
  };

  const getGreeting = () => {
    const hrs = today.getHours();
    
    let name = "love";
    if (session.role === 'viewer') {
      const nicknames = [
        "my butterfly", "my beautiful flower", "my chamcham", "my rasmalai",
        "my kaju katli", "my gudiya", "my sweetheart", "my love", 
        "my cutiepie", "my sunshine", "my rainbow", "mine love"
      ];
      // Use the day of the year so it changes exactly once per day
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      name = nicknames[dayOfYear % nicknames.length];
    } else {
      name = session.username ? session.username.split(" ")[0] : "love";
    }

    if (hrs >= 0 && hrs < 4) return `Good night, ${name}`;
    if (hrs >= 4 && hrs < 12) return `Good morning, ${name}`;
    if (hrs >= 12 && hrs < 17) return `Good afternoon, ${name}`;
    if (hrs >= 17 && hrs < 22) return `Good evening, ${name}`;
    return `Good night, ${name}`;
  };

  // Check if date str has a memory
  const getMemoryForDate = (dateStr: string) => {
    return memories.find(m => m.date === dateStr && !m.isDraft);
  };

  // Memoize sorted memories for navigation
  const sortedMemories = React.useMemo(() => {
    return [...memories]
      .filter(m => !m.isDraft)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [memories]);

  const currentMemoryIndex = selectedMemory 
    ? sortedMemories.findIndex(m => m.id === selectedMemory.id) 
    : -1;

  const hasPrevMemory = currentMemoryIndex > 0;
  const hasNextMemory = currentMemoryIndex !== -1 && currentMemoryIndex < sortedMemories.length - 1;

  // Toggle favorite from detailed card
  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const result = await toggleFavorite(id);
      if (result.success) {
        if (selectedMemory && selectedMemory.id === id) {
          setSelectedMemory(prev => prev ? { ...prev, isFavorite: result.isFavorite } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Navigation inside detailed memory card
  const handlePrevMemory = () => {
    if (hasPrevMemory) {
      setSelectedMemory(sortedMemories[currentMemoryIndex - 1]);
      setActivePhotoIndex(0);
    }
  };

  const handleNextMemory = () => {
    if (hasNextMemory) {
      setSelectedMemory(sortedMemories[currentMemoryIndex + 1]);
      setActivePhotoIndex(0);
    }
  };

  // Today's memory preview check
  const localYear = today.getFullYear();
  const localMonth = String(today.getMonth() + 1).padStart(2, "0");
  const localDay = String(today.getDate()).padStart(2, "0");
  const todayDateStr = `${localYear}-${localMonth}-${localDay}`;
  const todayMemory = getMemoryForDate(todayDateStr);

  const isPrevDisabled = currentYear < minDate.getFullYear() || (currentYear === minDate.getFullYear() && currentMonth <= minDate.getMonth());
  const isNextDisabled = currentYear > maxDate.getFullYear() || (currentYear === maxDate.getFullYear() && currentMonth >= maxDate.getMonth());

  return (
    <div className="w-full max-w-4xl mx-auto px-1.5 xs:px-4 pt-4 pb-32">
      {/* Main Grid: Calendar & Today Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Calendar Card (Takes 2 cols on desktop) */}
        <div className="md:col-span-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={`rounded-3xl p-2 xs:p-4 sm:p-5 ${theme.card} ${theme.shadow} border overflow-hidden`}
          >
            {/* Samsung Calendar Header */}
            <div className="flex items-center justify-between mb-4 px-1 xs:px-2">
              <div className="flex flex-col min-w-0">
                <h2 className={`text-base xs:text-xl sm:text-2xl font-bold font-sans truncate ${theme.textPrimary}`}>
                  {monthsList[currentMonth]} {currentYear}
                </h2>
                <span className={`text-[9px] xs:text-[10px] uppercase tracking-wider ${theme.textSecondary}`}>
                  Memory Tracker
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  id="calendar-prev-month"
                  disabled={isPrevDisabled}
                  onClick={prevMonthHandler}
                  className={`p-1.5 xs:p-2 rounded-xl transition-colors hover:${theme.accentLight} disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer text-gray-500 hover:${theme.textPrimary}`}
                >
                  <ChevronLeft className="w-4 h-4 xs:w-5 xs:h-5" />
                </button>
                <button
                  id="calendar-next-month"
                  disabled={isNextDisabled}
                  onClick={nextMonthHandler}
                  className={`p-1.5 xs:p-2 rounded-xl transition-colors hover:${theme.accentLight} disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer text-gray-500 hover:${theme.textPrimary}`}
                >
                  <ChevronRight className="w-4 h-4 xs:w-5 xs:h-5" />
                </button>
              </div>
            </div>

            {/* Week Labels */}
            <div className="grid grid-cols-7 gap-0.5 xs:gap-1 text-center mb-2 font-semibold">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                <span 
                  key={idx} 
                  className={`text-[9px] xs:text-xs py-1 ${idx === 0 || idx === 6 ? "text-[#EC708B]" : theme.textSecondary}`}
                >
                  {day}
                </span>
              ))}
            </div>

            {/* Date Grid */}
            <div className="grid grid-cols-7 gap-0.5 xs:gap-1 text-center">
              {calendarDays.map((day, idx) => {
                const memory = getMemoryForDate(day.dateStr);
                const flower = memory ? FLOWERS[memory.flowerId] : null;
                const isToday = day.dateStr === todayDateStr;

                // Determine if date is within October 18, currentYear to October 18, currentYear + 30
                const dayDate = new Date(day.dateStr + "T00:00:00");
                const minMidnight = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                const maxMidnight = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
                const isWithinRange = dayDate >= minMidnight && dayDate <= maxMidnight;

                return (
                  <button
                    key={idx}
                    id={`calendar-day-idx-${day.dayIndex}`}
                    data-date={day.dateStr}
                    onClick={() => {
                      if (onClickDate) {
                        onClickDate(day.dateStr);
                      }
                      if (memory) {
                        setSelectedMemory(memory);
                        setActivePhotoIndex(0);
                      } else {
                        setClickedEmptyDate({
                          dateStr: day.dateStr,
                          isWithinRange
                        });
                      }
                    }}
                    className={`relative aspect-square rounded-xl xs:rounded-2xl flex flex-col items-center justify-center p-0.5 xs:p-1 cursor-pointer select-none transition-all duration-300 outline-none ${
                      day.isCurrentMonth ? "" : "opacity-30"
                    } ${
                      isToday 
                        ? `bg-gradient-to-tr from-[#EC708B] to-pink-400 text-white font-extrabold shadow-[0_0_15px_3px_rgba(236,112,139,0.5)] ring-1 xs:ring-2 sm:ring-4 ring-[#EC708B] ring-offset-1 sm:ring-offset-2 dark:ring-offset-gray-900 z-10 hover:scale-105 active:scale-95 border border-white/40` 
                        : "hover:bg-pink-50/50 dark:hover:bg-pink-950/20"
                    } ${
                      !isWithinRange ? "opacity-35" : ""
                    }`}
                  >
                    {/* Today Badge */}
                    {isToday && (
                      <span className="absolute -top-1 px-1 py-0.5 rounded-full text-[5px] xs:text-[7px] font-extrabold tracking-wider bg-white text-pink-500 shadow-sm border border-pink-100 uppercase scale-75 xs:scale-90 z-10 leading-none">
                        Today
                      </span>
                    )}

                    {/* Day number */}
                    <span 
                      className={`text-[9px] xs:text-xs sm:text-sm font-semibold block ${
                        isToday 
                          ? "text-white font-extrabold" 
                          : memory 
                            ? "font-bold text-gray-900 dark:text-white" 
                            : theme.textSecondary
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    {/* Flower Blooming Indicator */}
                    <div className="h-3 xs:h-5 flex items-center justify-center mt-0.5">
                      {flower ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="select-none filter drop-shadow-sm"
                          title={`${flower.name} - ${flower.emotion}`}
                        >
                          <Flower2 className={`w-3.5 h-3.5 ${flower.iconColor}`} />
                        </motion.div>
                      ) : (
                        <div className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 opacity-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Today Quote & Preview Column */}
        <div className="space-y-6">
          {/* Birthday Countdown / Surprise Cards */}
          {isBeforeBirthday && !isBirthday && <BirthdayCountdownCard theme={theme} />}
          {isBirthday && <BirthdaySurpriseCard theme={theme} />}

          {/* Greeting Card */}
          <motion.div
            data-companion-target="true"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`rounded-3xl p-5 ${theme.card} ${theme.shadow} border flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                  {today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </span>
                <h3 className={`text-xl font-bold font-sans mt-1 ${theme.textPrimary}`}>
                  {customGreeting ? customGreeting : getGreeting()}
                </h3>
              </div>
              {weather && (
                <div className="text-right shrink-0 flex flex-col items-end select-none">
                  <span className="text-3xl filter drop-shadow hover:scale-110 active:scale-95 transition-all duration-300 cursor-help" title={weather.description}>
                    {weather.symbol}
                  </span>
                  <span className={`text-[10px] font-bold ${theme.textSecondary} mt-0.5`}>
                    {weather.temp}°C
                  </span>
                </div>
              )}
            </div>
            
            {/* Quote of the Day */}
            <div className="mt-4 pt-4 border-t border-dashed border-rose-100">
              {loadingQuote ? (
                <div className="h-16 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[#EC708B] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className={`text-sm italic font-medium leading-relaxed text-gray-800 dark:text-gray-200`}>
                    "{poeticQuote.quote}"
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-[#EC708B] font-semibold">
                    <Sparkles className="w-3 h-3 inline-block mr-1" />{poeticQuote.sentiment}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Today's Memory Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`rounded-3xl p-5 ${theme.card} ${theme.shadow} border`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSecondary} block mb-2`}>
              Today's Sanctuary
            </span>

            {todayMemory ? (
              <div 
                id="today-memory-preview-card"
                data-companion-target="true"
                onClick={() => {
                  setSelectedMemory(todayMemory);
                  setActivePhotoIndex(0);
                }}
                className="group cursor-pointer space-y-3"
              >
                {todayMemory.photos[0] && (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden relative">
                    <motion.img
                      layoutId={`memory-img-${todayMemory.id}`}
                      src={todayMemory.photos[0]}
                      alt="Today"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-800 flex items-center gap-1.5 shadow">
                      <Flower2 className={`w-3.5 h-3.5 ${FLOWERS[todayMemory.flowerId]?.iconColor}`} />
                      <span>{FLOWERS[todayMemory.flowerId]?.name}</span>
                    </div>
                  </div>
                )}
                <div>
                  <h4 className={`font-bold text-sm ${theme.textPrimary} group-hover:${theme.accentText} transition-colors`}>
                    {todayMemory.title}
                  </h4>
                  <p className={`text-xs ${theme.textSecondary} line-clamp-2 mt-1 leading-relaxed`}>
                    {todayMemory.note}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 px-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl space-y-3">
                <Sprout className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className={`text-xs ${theme.textSecondary} leading-relaxed`}>
                  No memory planted for today yet. Shall we make this day blossom?
                </p>
                {session.role !== null && (
                  <button
                    id="plant-today-btn"
                    onClick={() => onNavigateToSettingsWithDate(todayDateStr)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white ${theme.accent} ${theme.accentHover} shadow-sm transition-all cursor-pointer`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Plant Today's Memory
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Expandable Memory Card View (AnimatePresence) */}
      <AnimatePresence>
        {selectedMemory && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-2xl" onClick={() => setSelectedMemory(null)}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={e => e.stopPropagation()}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80) setSelectedMemory(null);
              }}
              className={`w-full sm:max-w-lg rounded-none sm:rounded-[28px] overflow-hidden ${theme.card} border-0 sm:border border-white/10 shadow-2xl flex flex-col cursor-grab active:cursor-grabbing select-none h-[100dvh] sm:h-auto sm:max-h-[92dvh]`}
            >
              {/* Drag indicator */}
              <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
                <div className="w-9 h-1 rounded-full bg-white/25" />
              </div>

              {/* Photo Section */}
              {selectedMemory.photos.length > 0 ? (
                <div className="relative w-full bg-black/40 overflow-hidden flex items-center justify-center flex-1 sm:max-h-[60dvh]">
                  <motion.img
                    layoutId={`memory-img-${selectedMemory.id}`}
                    src={selectedMemory.photos[activePhotoIndex]}
                    alt={selectedMemory.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain mx-auto"
                    drag={selectedMemory.photos.length > 1 ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -40) {
                        setActivePhotoIndex(prev => prev < selectedMemory.photos.length - 1 ? prev + 1 : 0);
                      } else if (info.offset.x > 40) {
                        setActivePhotoIndex(prev => prev > 0 ? prev - 1 : selectedMemory.photos.length - 1);
                      }
                    }}
                  />
                  
                  {/* Photo Swipe Controllers */}
                  {selectedMemory.photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setActivePhotoIndex(prev => prev > 0 ? prev - 1 : selectedMemory.photos.length - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-md text-white active:scale-90 transition-transform"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActivePhotoIndex(prev => prev < selectedMemory.photos.length - 1 ? prev + 1 : 0)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-md text-white active:scale-90 transition-transform"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Dots */}
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                        {selectedMemory.photos.map((_, pIdx) => (
                          <button 
                            key={pIdx}
                            onClick={() => setActivePhotoIndex(pIdx)}
                            className={`rounded-full transition-all duration-300 ${
                              activePhotoIndex === pIdx ? "bg-white w-5 h-1.5" : "bg-white/40 w-1.5 h-1.5"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Header overlay: count + fav + close */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-bold tracking-wide">
                      {activePhotoIndex + 1} / {selectedMemory.photos.length}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => handleToggleFavorite(e, selectedMemory.id)}
                        className={`p-2 rounded-full backdrop-blur-md cursor-pointer shadow transition-transform active:scale-90 ${
                          selectedMemory.isFavorite 
                            ? "bg-rose-500 text-white" 
                            : "bg-black/40 text-white/80"
                        }`}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        onClick={() => setSelectedMemory(null)}
                        className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white cursor-pointer active:scale-90 transition-transform"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 pt-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-pink-400" />
                    <span className={`font-bold text-sm ${theme.textPrimary}`}>{selectedMemory.date}</span>
                  </div>
                  <button
                    onClick={() => setSelectedMemory(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Memory Details - Scrollable */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 max-h-[45dvh] sm:max-h-[40dvh]">
                {/* Flower Badge & Date Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center shrink-0 border border-pink-100/20">
                      <Flower2 className={`w-5 h-5 ${FLOWERS[selectedMemory.flowerId]?.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-sm font-bold ${theme.textPrimary} truncate`}>
                        {FLOWERS[selectedMemory.flowerId]?.name}
                      </h4>
                      <p className="text-[10px] text-pink-500 font-semibold">
                        {FLOWERS[selectedMemory.flowerId]?.emotion}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[11px] font-semibold ${theme.textSecondary}`}>
                      {new Date(selectedMemory.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    {selectedMemory.mood && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/20 text-[9px] font-semibold text-pink-500 capitalize">
                        {selectedMemory.mood}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content text */}
                <div className="space-y-1.5">
                  <h3 className={`text-lg font-extrabold ${theme.textPrimary} tracking-tight font-sans leading-snug`}>
                    {selectedMemory.title}
                  </h3>
                  <p className={`text-[13px] leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap`}>
                    {selectedMemory.note}
                  </p>
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap gap-2">
                  {selectedMemory.weather && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-100/20 text-amber-600 dark:text-amber-300 text-[10px] font-bold">
                      <CloudSun className="w-3 h-3" /> {selectedMemory.weather}
                    </span>
                  )}
                  {selectedMemory.music && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/20 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold">
                      <Music className="w-3 h-3" /> {selectedMemory.music}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {selectedMemory.tags && selectedMemory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMemory.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/20 text-[10px] font-bold text-pink-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Flower sentiment */}
                <div className={`p-3 rounded-2xl border border-dashed text-[11px] italic leading-relaxed ${theme.textSecondary}`}
                  style={{ borderColor: "rgba(236,112,139,0.15)", background: "rgba(236,112,139,0.03)" }}
                >
                  <strong>{FLOWERS[selectedMemory.flowerId]?.name}:</strong> {FLOWERS[selectedMemory.flowerId]?.meaning}
                </div>

                {/* Admin edit */}
                {session.role !== null && (
                  <button
                    onClick={() => {
                      onNavigateToSettingsWithDate(selectedMemory.date);
                      setSelectedMemory(null);
                    }}
                    className={`w-full py-2.5 rounded-2xl text-xs font-bold text-white ${theme.accent} ${theme.accentHover} shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer`}
                  >
                    <Plus className="w-4 h-4" />
                    Edit This Memory
                  </button>
                )}

                {/* Prev & Next Controllers */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100/10">
                  <button
                    onClick={handlePrevMemory}
                    disabled={!hasPrevMemory}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#EC708B] disabled:opacity-25 cursor-pointer active:scale-95 transition-transform"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <span className={`text-[9px] font-bold tracking-widest ${theme.textSecondary}`}>
                    Swipe to navigate
                  </span>
                  <button
                    onClick={handleNextMemory}
                    disabled={!hasNextMemory}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#EC708B] disabled:opacity-25 cursor-pointer active:scale-95 transition-transform"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Empty Date details modal */}
      <AnimatePresence>
        {clickedEmptyDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`w-full max-w-md rounded-3xl overflow-hidden ${theme.card} ${theme.shadow} border p-4 sm:p-6 space-y-4 sm:space-y-6 text-center max-h-[90vh] overflow-y-auto`}
            >
              {/* Header with Close button */}
              <div className="flex items-center justify-between border-b pb-3 text-left">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-pink-400" />
                  <span className={`font-bold text-sm ${theme.textPrimary}`}>
                    {new Date(clickedEmptyDate.dateStr + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <button
                  onClick={() => setClickedEmptyDate(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Graphic & Content */}
              <div className="space-y-4">
                <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-2xl sm:text-3xl animate-bounce">
                  {clickedEmptyDate.isWithinRange ? <Sprout className="w-7 h-7 text-emerald-400" /> : <Lock className="w-7 h-7 text-gray-400" />}
                </div>
                
                <div className="space-y-2">
                  <h3 className={`text-lg sm:text-xl font-extrabold ${theme.textPrimary} tracking-tight font-sans`}>
                    {clickedEmptyDate.isWithinRange ? "An Unwritten Page" : "Outside Sacred Range"}
                  </h3>
                  <p className={`text-xs sm:text-sm leading-relaxed ${theme.textSecondary}`}>
                    {clickedEmptyDate.isWithinRange ? (
                      "There is no memory flower planted on this day yet. Every single day of our 30-year journey is a beautiful, dedicated slot waiting to hold our laughter, adventures, and quiet moments."
                    ) : (
                      `This date falls outside our custom 30-year memory sanctuary (October 18, ${currentYearOfToday} - October 18, ${currentYearOfToday + 30}). Please select an active date within our sacred timeline.`
                    )}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t flex flex-col gap-2 border-white/10">
                {clickedEmptyDate.isWithinRange ? (
                  session.role !== null ? (
                    <button
                      onClick={() => {
                        onNavigateToSettingsWithDate(clickedEmptyDate.dateStr);
                        setClickedEmptyDate(null);
                      }}
                      className={`w-full py-3 rounded-2xl text-xs font-bold text-white ${theme.accent} ${theme.accentHover} shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2`}
                    >
                      <Plus className="w-4 h-4" />
                      Plant a Memory Flower
                    </button>
                  ) : (
                    <div className="p-3 bg-pink-50/50 dark:bg-pink-950/10 rounded-2xl border border-pink-100/10 text-xs text-pink-500 font-medium">
                      Please enter a passcode in Settings to plant memory flowers and access this digital garden.
                    </div>
                  )
                ) : null}
                
                <button
                  onClick={() => setClickedEmptyDate(null)}
                  className={`w-full py-2.5 rounded-2xl text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer`}
                >
                  Back to Garden
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
