/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Calendar,
  Heart,
  Music,
  CloudSun,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Smile,
  RotateCcw,
  BookOpen,
  Compass,
  ArrowRight
} from "lucide-react";
import { Memory } from "../types.js";
import { ThemeConfig, FLOWERS } from "../lib/themes.js";

// Helper to provide breathtaking fallback flower imagery matching the botanical theme
const getUnsplashFlowerUrl = (flowerId: string): string => {
  const urls: Record<string, string> = {
    rose: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600",
    tulip: "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&q=80&w=600",
    lavender: "https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&q=80&w=600",
    sunflower: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=600",
    cherry_blossom: "https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?auto=format&fit=crop&q=80&w=600",
    jasmine: "https://images.unsplash.com/photo-1508784411316-02b8cd4d3a3a?auto=format&fit=crop&q=80&w=600",
    hydrangea: "https://images.unsplash.com/photo-1501949997128-2fdb9f6428f1?auto=format&fit=crop&q=80&w=600",
    peony: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=600",
  };
  return urls[flowerId] || "https://images.unsplash.com/photo-1490750916424-856df7a3ad34?auto=format&fit=crop&q=80&w=600";
};

// Types of Card Sizes for Visual Rhythm
type CardSize = "small" | "medium" | "large";

interface TimelinePageProps {
  memories: Memory[];
  theme: ThemeConfig;
}

export default function TimelinePage({ memories, theme }: TimelinePageProps) {
  // Navigation & detailed preview state
  const [activeMemory, setActiveMemory] = useState<Memory | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFlower, setSelectedFlower] = useState<string>("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Responsive layout columns state
  const [columnsCount, setColumnsCount] = useState(4);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) setColumnsCount(2);      // Mobile
      else if (width < 1024) setColumnsCount(3); // Tablet
      else if (width < 1280) setColumnsCount(4); // Desktop MD
      else setColumnsCount(5);                  // Large screens
    };
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  // Filter memories beginning from October 18, 2025 onwards (the sacred date)
  const filteredMemories = useMemo(() => {
    return [...memories]
      .filter((m) => !m.isDraft && new Date(m.date) >= new Date("2025-10-18"))
      .filter((m) => {
        if (showFavoritesOnly && !m.isFavorite) return false;
        if (selectedFlower && m.flowerId !== selectedFlower) return false;
        if (selectedMood && m.mood !== selectedMood) return false;
        if (searchTerm) {
          const query = searchTerm.toLowerCase();
          const titleMatch = m.title.toLowerCase().includes(query);
          const noteMatch = m.note.toLowerCase().includes(query);
          const tagsMatch = m.tags?.some((t) => t.toLowerCase().includes(query));
          if (!titleMatch && !noteMatch && !tagsMatch) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [memories, showFavoritesOnly, selectedFlower, selectedMood, searchTerm]);

  // Divide the memories organically into responsive columns to prevent vertical masonry gaps & layout shifts
  const memoryColumns = useMemo(() => {
    const cols: Memory[][] = Array.from({ length: columnsCount }, () => []);
    filteredMemories.forEach((item, index) => {
      cols[index % columnsCount].push(item);
    });
    return cols;
  }, [filteredMemories, columnsCount]);

  // Floating ambient petals in the background
  const floatingPetals = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: `${3 + Math.random() * 94}%`,
      delay: Math.random() * 14,
      duration: 15 + Math.random() * 18,
      scale: 0.4 + Math.random() * 0.7,
      rotate: Math.random() * 360,
    }));
  }, []);

  // Keyboard navigation helpers inside active card viewer
  const activeIndex = useMemo(() => {
    if (!activeMemory) return -1;
    return filteredMemories.findIndex((m) => m.id === activeMemory.id);
  }, [activeMemory, filteredMemories]);

  const handlePrevMemory = () => {
    if (activeIndex > 0) {
      setActiveMemory(filteredMemories[activeIndex - 1]);
      setPhotoIndex(0);
    }
  };

  const handleNextMemory = () => {
    if (activeIndex < filteredMemories.length - 1) {
      setActiveMemory(filteredMemories[activeIndex + 1]);
      setPhotoIndex(0);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeMemory) return;
      if (e.key === "ArrowLeft") handlePrevMemory();
      if (e.key === "ArrowRight") handleNextMemory();
      if (e.key === "Escape") setActiveMemory(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMemory, activeIndex, filteredMemories]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedFlower("");
    setSelectedMood("");
    setShowFavoritesOnly(false);
  };

  const hasActiveFilters = searchTerm || selectedFlower || selectedMood || showFavoritesOnly;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-32 relative min-h-screen font-sans select-none overflow-x-hidden">
      
      {/* Floating Ambient Falling Petals */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {floatingPetals.map((petal) => (
          <motion.div
            key={petal.id}
            initial={{ y: -60, x: 0, opacity: 0, rotate: petal.rotate }}
            animate={{
              y: "110vh",
              x: [0, 40, -40, 20],
              opacity: [0, 0.45, 0.45, 0],
              rotate: petal.rotate + 360,
            }}
            transition={{
              duration: petal.duration,
              repeat: Infinity,
              delay: petal.delay,
              ease: "linear",
            }}
            className="absolute text-pink-300/40 dark:text-pink-400/25 text-xl select-none filter drop-shadow-sm"
            style={{ left: petal.left }}
          >
            🌸
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredMemories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto text-center py-16 px-8 rounded-[32px] bg-white/40 dark:bg-black/20 border border-white/20 shadow-xl backdrop-blur-md z-10 relative space-y-6"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-4xl shadow-inner border border-pink-100 dark:border-pink-900/30">
            🌿
          </div>
          <div className="space-y-2">
            <h3 className={`text-lg font-bold ${theme.textPrimary}`}>
              {hasActiveFilters ? "No matches found" : "The garden is waiting"}
            </h3>
            <p className={`text-xs ${theme.textSecondary} leading-relaxed`}>
              {hasActiveFilters
                ? "Try clearing or tweaking your search filters to find those specific moments."
                : "Your memory journal begins on October 18th. Plant a heartfelt moment starting from this date and watch your garden grow!"}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-5 py-2 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 mx-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}
        </motion.div>
      ) : (
        /* ==================== ADAPTIVE ORGANIC FLOATING GALLERY ==================== */
        <div className="relative z-10 w-full">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-4 sm:gap-6 md:gap-8 items-start">
            {memoryColumns.map((colItems, colIdx) => (
              <div key={`col-${colIdx}`} className="flex flex-col gap-6 sm:gap-8 relative">
                
                {colItems.map((memory, memIdx) => {
                  const flower = FLOWERS[memory.flowerId];
                  const tileImg = memory.photos[0] || getUnsplashFlowerUrl(memory.flowerId);
                  
                  // Dynamically assign card size class to create organic visual rhythm
                  let cardSize: CardSize = "medium";
                  if (memory.isFavorite || memory.id === "mem-best-life") {
                    cardSize = "large";
                  } else if (memIdx % 3 === 0) {
                    cardSize = "small";
                  }

                  const aspectClass = 
                    cardSize === "large" ? "aspect-[4/5]" : 
                    cardSize === "small" ? "aspect-square" : "aspect-[3/4]";

                  // Create independent floating loops for an organic "alive" feel
                  const floatY = [0, -3 - (memIdx % 3) * 1.5, 0];
                  const floatScale = [1, 1.004 + (memIdx % 2) * 0.002, 1];
                  const duration = 5 + (memIdx % 4) * 1.5;

                  return (
                    <div key={memory.id} className="relative group">
                      
                      {/* Connection Vine Path behind the card linking to the next card in this column */}
                      {memIdx < colItems.length - 1 && (
                        <div className="absolute left-1/2 -bottom-10 -translate-x-1/2 w-8 h-10 pointer-events-none -z-10 overflow-visible hidden sm:block">
                          <svg className="w-full h-full" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                            <motion.path
                              d="M 20 0 Q 35 20, 20 40"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeDasharray="4 6"
                              className="text-pink-300/40 dark:text-pink-900/30"
                              initial={{ pathLength: 0.3, opacity: 0.2 }}
                              whileInView={{ pathLength: 1, opacity: 0.6 }}
                              viewport={{ once: false, margin: "-100px" }}
                              transition={{ duration: 1.5, ease: "easeInOut" }}
                            />
                            <motion.text
                              x="18"
                              y="22"
                              className="text-[10px] select-none opacity-40"
                              initial={{ scale: 0.7, opacity: 0 }}
                              whileInView={{ scale: 1, opacity: 0.4 }}
                              viewport={{ once: false }}
                              transition={{ delay: 0.5 }}
                            >
                              🍃
                            </motion.text>
                          </svg>
                        </div>
                      )}

                      {/* Floating Loop Card Container */}
                      <motion.div
                        initial={{ opacity: 0, y: 35, scale: 0.94, filter: "blur(4px)" }}
                        whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        viewport={{ once: true, margin: "-40px" }}
                        animate={{
                          y: floatY,
                          scale: floatScale,
                        }}
                        transition={{
                          y: { duration, repeat: Infinity, ease: "easeInOut" },
                          scale: { duration, repeat: Infinity, ease: "easeInOut" },
                          default: { type: "spring", stiffness: 220, damping: 20 }
                        }}
                        whileHover={{
                          y: -6,
                          scale: 1.03,
                          boxShadow: "0 25px 40px -15px rgba(236,112,139, 0.35)",
                          zIndex: 20,
                        }}
                        onClick={() => {
                          setActiveMemory(memory);
                          setPhotoIndex(0);
                        }}
                        className={`w-full rounded-[28px] sm:rounded-[32px] overflow-hidden ${theme.card} border border-white/20 dark:border-white/10 shadow-lg cursor-pointer flex flex-col relative transition-shadow duration-300 select-none`}
                        style={{
                          boxShadow: "0 10px 25px -10px rgba(0,0,0,0.06)"
                        }}
                      >
                        {/* Premium Soft Overlay Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10" />

                        {/* Card Image Block */}
                        <div className={`relative ${aspectClass} w-full overflow-hidden bg-gray-50 dark:bg-zinc-900/40 shrink-0`}>
                          <img
                            src={tileImg}
                            alt={memory.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-[1.2s] group-hover:scale-105 select-none pointer-events-none"
                            loading="lazy"
                          />
                          
                          {/* Rich bottom gradient on image */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-70 pointer-events-none" />

                          {/* Float Glass Date Badge */}
                          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 px-2.5 py-1 rounded-full bg-white/40 dark:bg-black/40 border border-white/20 backdrop-blur-md text-[9px] sm:text-[10px] font-extrabold text-gray-900 dark:text-white shadow-sm tracking-wider">
                            {new Date(memory.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                          </div>

                          {/* Heart Icon if Favorite */}
                          {memory.isFavorite && (
                            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs shadow-md border border-white/20">
                              <Heart className="w-3.5 h-3.5 fill-current" />
                            </div>
                          )}

                          {/* Bottom Flower Badge inside the photo frame */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-[9px] sm:text-[10px] font-bold">
                            <motion.span 
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            >
                              {flower?.emoji || "🌸"}
                            </motion.span>
                            <span className="truncate max-w-[90px]">{flower?.name}</span>
                          </div>

                          {/* Gentle breathing Wink trigger */}
                          <motion.div
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            className="absolute bottom-3 right-3 w-6 h-6 rounded-full bg-white/90 dark:bg-zinc-800/90 text-pink-500 border border-pink-100 dark:border-pink-900/50 flex items-center justify-center shadow-sm"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </motion.div>
                        </div>

                        {/* Premium Text Content Area */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-2 bg-gradient-to-b from-transparent to-white/5 dark:to-black/5">
                          <div className="space-y-1">
                            <h4 className={`font-bold text-xs sm:text-sm md:text-base ${theme.textPrimary} group-hover:text-pink-500 transition-colors tracking-tight line-clamp-1`}>
                              {memory.title}
                            </h4>
                            <p className={`text-[11px] sm:text-xs ${theme.textSecondary} line-clamp-2 leading-relaxed font-medium`}>
                              {memory.note}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 font-extrabold border-t border-gray-100/10 mt-1 uppercase tracking-wider">
                            <span>
                              Mood: <span className="text-pink-500 dark:text-pink-400 font-bold">{memory.mood}</span>
                            </span>
                            {memory.weather && (
                              <span className="flex items-center gap-0.5 capitalize">
                                <CloudSun className="w-3 h-3 text-amber-500" />
                                {memory.weather}
                              </span>
                            )}
                          </div>
                        </div>

                      </motion.div>
                    </div>
                  );
                })}

              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== FLOATING CONTROL HUB (UI ONLY) ==================== */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
        <AnimatePresence>
          {isFilterPanelOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="w-[calc(100vw-2rem)] sm:w-80 p-6 rounded-[32px] bg-white/85 dark:bg-zinc-900/85 border border-white/30 dark:border-white/10 shadow-2xl backdrop-blur-2xl text-sm space-y-4 max-w-sm pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/50 pb-2">
                <span className={`font-bold ${theme.textPrimary} flex items-center gap-1.5`}>
                  <SlidersHorizontal className="w-4 h-4 text-pink-500" />
                  Filter Garden
                </span>
                <button
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Text Search */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Keyword Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search titles, notes, tags..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs border border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-black/20 outline-none focus:border-pink-400 dark:focus:border-pink-600 text-gray-800 dark:text-gray-100"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Flower Selector */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Flower Blooms</label>
                <select
                  value={selectedFlower}
                  onChange={(e) => setSelectedFlower(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-full text-xs border border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-black/20 text-gray-700 dark:text-gray-200 outline-none focus:border-pink-400 dark:focus:border-pink-600"
                >
                  <option value="">All Flower Accents</option>
                  {Object.values(FLOWERS).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.emoji} {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mood Selector */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Moods & Emotions</label>
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-full text-xs border border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-black/20 text-gray-700 dark:text-gray-200 outline-none focus:border-pink-400 dark:focus:border-pink-600"
                >
                  <option value="">All Moods</option>
                  <option value="grateful">Grateful 🙏</option>
                  <option value="joyful">Joyful 🎉</option>
                  <option value="reflective">Reflective 💭</option>
                  <option value="serene">Serene 🌊</option>
                  <option value="romantic">Romantic 💖</option>
                  <option value="peaceful">Peaceful 🕊️</option>
                </select>
              </div>

              {/* Favorites only */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">Favorites Only 💖</span>
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 outline-none ${
                    showFavoritesOnly ? "bg-pink-500" : "bg-gray-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      showFavoritesOnly ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Reset Panel */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full py-2 rounded-full border border-dashed border-pink-300 dark:border-pink-900/50 text-pink-500 dark:text-pink-400 text-xs font-semibold hover:bg-pink-500/10 transition-colors flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Garden Filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Button Trigger */}
        <button
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 text-white pointer-events-auto ${
            hasActiveFilters ? "bg-pink-500 hover:bg-pink-600" : "bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700"
          }`}
        >
          {hasActiveFilters ? (
            <div className="relative">
              <SlidersHorizontal className="w-5 h-5" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-pink-500" />
            </div>
          ) : (
            <SlidersHorizontal className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* ==================== EXPAND INTERACTION (SHARED ELEMENT IMMERSIVE VIEWER) ==================== */}
      <AnimatePresence>
        {activeMemory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xl overflow-y-auto">
            {/* Click backdrop to close */}
            <div className="absolute inset-0" onClick={() => setActiveMemory(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 35 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 35 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                const swipeThreshold = 55;
                if (info.offset.x < -swipeThreshold) {
                  handleNextMemory();
                } else if (info.offset.x > swipeThreshold) {
                  handlePrevMemory();
                }
              }}
              className={`relative w-full max-w-2xl rounded-3xl overflow-hidden ${theme.card} ${theme.shadow} border border-white/20 dark:border-white/10 my-4 flex flex-col max-h-[92vh] cursor-grab active:cursor-grabbing select-none z-10`}
            >
              
              {/* Large Cover Hero Image with Smooth Fade-in */}
              <div className="relative aspect-[2/1] sm:aspect-video w-full bg-zinc-950/20 overflow-hidden shrink-0">
                <img
                  src={activeMemory.photos[photoIndex] || getUnsplashFlowerUrl(activeMemory.flowerId)}
                  alt={activeMemory.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover pointer-events-none"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                {/* Switcher for multiple photos */}
                {activeMemory.photos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoIndex((prev) => (prev > 0 ? prev - 1 : activeMemory.photos.length - 1));
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-md shadow text-gray-800 dark:text-white active:scale-90 transition-transform"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoIndex((prev) => (prev < activeMemory.photos.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-md shadow text-gray-800 dark:text-white active:scale-90 transition-transform"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Top Glass Badge Overlays */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none max-w-[75%]">
                  <div className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-white text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                    {new Date(activeMemory.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric" })}
                  </div>
                  {activeMemory.isFavorite && (
                    <div className="px-3 py-1 rounded-full bg-pink-500 text-white text-[9px] sm:text-[10px] font-extrabold shadow-sm flex items-center gap-1 border border-white/20">
                      <Heart className="w-3 h-3 fill-current" /> Favorite
                    </div>
                  )}
                </div>

                {/* Close Button overlay */}
                <button
                  onClick={() => setActiveMemory(null)}
                  className="absolute top-4 right-4 p-2.5 rounded-full bg-black/45 hover:bg-black/65 text-white backdrop-blur-md border border-white/15 active:scale-90 transition-all z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Editorial Journal Content Frame */}
              <div className="p-5 sm:p-8 space-y-6 overflow-y-auto flex-1">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-100/10 pb-4">
                  
                  {/* Flower Accent specs */}
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl filter drop-shadow">{FLOWERS[activeMemory.flowerId]?.emoji}</span>
                    <div>
                      <h4 className={`text-sm sm:text-base font-extrabold ${theme.textPrimary}`}>
                        {FLOWERS[activeMemory.flowerId]?.name} Accent
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-pink-500 font-extrabold uppercase tracking-widest">
                        Meaning: {FLOWERS[activeMemory.flowerId]?.emotion}
                      </p>
                    </div>
                  </div>

                  {/* Sacred Calendar info */}
                  <div className="text-left sm:text-right">
                    <div className={`text-base sm:text-lg font-bold ${theme.textPrimary}`}>
                      {new Date(activeMemory.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </div>
                    <p className={`text-[9px] sm:text-[10px] ${theme.textSecondary} uppercase tracking-widest font-bold`}>
                      Planted on Day #{Math.max(1, Math.ceil((new Date(activeMemory.date).getTime() - new Date("2025-10-18").getTime()) / (1000 * 60 * 60 * 24)))}
                    </p>
                  </div>

                </div>

                {/* Heartfelt Note block */}
                <div className="space-y-3">
                  <h3 className={`text-2xl sm:text-3xl font-extrabold ${theme.textPrimary} tracking-tight font-sans`}>
                    {activeMemory.title}
                  </h3>
                  <p className={`text-xs sm:text-sm md:text-base leading-relaxed ${theme.textSecondary} whitespace-pre-wrap font-medium font-sans`}>
                    {activeMemory.note}
                  </p>
                </div>

                {/* Weather & Soundtrack Tags */}
                <div className="pt-4 border-t border-gray-100/10 dark:border-zinc-800/20 flex flex-wrap gap-3 text-xs">
                  {activeMemory.weather && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold">
                      <CloudSun className="w-3.5 h-3.5 animate-pulse" />
                      <span className="capitalize">Weather: {activeMemory.weather}</span>
                    </div>
                  )}

                  {activeMemory.music && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-semibold">
                      <Music className="w-3.5 h-3.5 animate-bounce" />
                      <span className="truncate max-w-[180px]">Soundtrack: {activeMemory.music}</span>
                    </div>
                  )}

                  {activeMemory.tags && activeMemory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 w-full items-center pt-2">
                      <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Tags:</span>
                      {activeMemory.tags.map((t) => (
                        <span key={t} className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botanical Sentiment block */}
                <div className="p-4 rounded-2xl bg-pink-50/50 dark:bg-pink-950/10 border border-pink-100/40 dark:border-pink-900/20 text-xs italic text-gray-700 dark:text-pink-300 leading-relaxed font-serif">
                  "The {FLOWERS[activeMemory.flowerId]?.name} flower: {FLOWERS[activeMemory.flowerId]?.meaning}"
                </div>
              </div>

              {/* Navigation Pill controls */}
              <div className="p-4 bg-white/10 dark:bg-zinc-900/20 backdrop-blur-md border-t border-pink-100/15 flex items-center justify-between shrink-0">
                <button
                  onClick={handlePrevMemory}
                  disabled={activeIndex <= 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white/20 dark:bg-white/5 text-gray-800 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10 disabled:opacity-40 transition-all outline-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-extrabold tracking-widest uppercase animate-pulse hidden xs:inline-block">
                  ← Swipe or Drag to Navigate →
                </span>
                <button
                  onClick={handleNextMemory}
                  disabled={activeIndex >= filteredMemories.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white/20 dark:bg-white/5 text-gray-800 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10 disabled:opacity-40 transition-all outline-none"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
