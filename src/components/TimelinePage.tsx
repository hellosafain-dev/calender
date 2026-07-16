/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Music,
  CloudSun,
  Heart,
  SlidersHorizontal,
  Search,
  RotateCcw,
  Leaf,
  Flower2,
} from "lucide-react";
import { Memory } from "../types.js";
import { ThemeConfig, FLOWERS } from "../lib/themes.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getUnsplashFlowerUrl = (flowerId: string): string => {
  const urls: Record<string, string> = {
    rose: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800",
    tulip: "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&q=80&w=800",
    lavender: "https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&q=80&w=800",
    sunflower: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800",
    cherry_blossom: "https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?auto=format&fit=crop&q=80&w=800",
    jasmine: "https://images.unsplash.com/photo-1508784411316-02b8cd4d3a3a?auto=format&fit=crop&q=80&w=800",
    hydrangea: "https://images.unsplash.com/photo-1501949997128-2fdb9f6428f1?auto=format&fit=crop&q=80&w=800",
    peony: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800",
  };
  return urls[flowerId] || "https://images.unsplash.com/photo-1490750916424-856df7a3ad34?auto=format&fit=crop&q=80&w=800";
};

// Generates a deterministic vibrant gradient per memory id
const getIconGradient = (id: string, isFavorite: boolean): string => {
  if (isFavorite) return "linear-gradient(135deg, #f43f7a 0%, #fb923c 100%)";
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
    "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
    "linear-gradient(135deg, #f77062 0%, #fe5196 100%)",
    "linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #5433ff 100%)",
    "linear-gradient(135deg, #f9d976 0%, #f39f86 100%)",
  ];
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

// ─── Lazy Icon with IntersectionObserver ──────────────────────────────────────

interface WatchIconProps {
  memory: Memory;
  index: number;
  onTap: (m: Memory) => void;
  theme: ThemeConfig;
}

function WatchIcon({ memory, index, onTap, theme }: WatchIconProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { rootMargin: "120px", threshold: 0.05 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const d = new Date(memory.date + "T00:00:00");
  const day = d.getDate();
  const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const gradient = getIconGradient(memory.id, !!memory.isFavorite);
  const coverImg = memory.photos[0] || getUnsplashFlowerUrl(memory.flowerId);
  const flower = FLOWERS[memory.flowerId];

  return (
    <div ref={ref} className="flex items-center justify-center">
      {visible ? (
        <motion.button
          layoutId={`watch-icon-${memory.id}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 22,
            delay: Math.min(index * 0.035, 0.5),
          }}
          whileHover={{ scale: 1.15, zIndex: 30 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => onTap(memory)}
          className="relative rounded-full overflow-hidden shadow-xl select-none outline-none"
          style={{
            width: "clamp(64px, 18vw, 90px)",
            height: "clamp(64px, 18vw, 90px)",
            background: gradient,
            boxShadow: memory.isFavorite
              ? "0 0 0 3px rgba(244,63,122,0.6), 0 10px 30px -8px rgba(244,63,122,0.5)"
              : "0 8px 24px -6px rgba(0,0,0,0.35)",
          }}
        >
          {/* Background photo blurred into the icon */}
          <motion.img
            layoutId={`watch-img-${memory.id}`}
            src={coverImg}
            alt=""
            loading="lazy"
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
            style={{ willChange: "transform" }}
          />

          {/* Glossy top-half sheen like iOS/Apple Watch icons */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% -10%, rgba(255,255,255,0.45) 0%, transparent 65%)",
            }}
          />

          {/* Date content */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full leading-none">
            <span
              className="font-black text-white/80 tracking-widest"
              style={{ fontSize: "clamp(7px, 2vw, 10px)", letterSpacing: "0.15em" }}
            >
              {mon}
            </span>
            <span
              className="font-black text-white drop-shadow-sm"
              style={{ fontSize: "clamp(22px, 6vw, 34px)", lineHeight: 1 }}
            >
              {day}
            </span>
            {flower && (
              <Flower2 className={`w-3.5 h-3.5 ${flower.iconColor}`} />
            )}
          </div>

          {/* Favorite crown ring */}
          {memory.isFavorite && (
            <div className="absolute inset-0 rounded-full border-[3px] border-pink-400/80 pointer-events-none" />
          )}
        </motion.button>
      ) : (
        // Skeleton placeholder keeps layout stable during lazy load
        <div
          className="rounded-full bg-white/5 animate-pulse"
          style={{
            width: "clamp(64px, 18vw, 90px)",
            height: "clamp(64px, 18vw, 90px)",
          }}
        />
      )}
    </div>
  );
}

// ─── Main TimelinePage ─────────────────────────────────────────────────────────

interface TimelinePageProps {
  memories: Memory[];
  theme: ThemeConfig;
}

export default function TimelinePage({ memories, theme }: TimelinePageProps) {
  const [activeMemory, setActiveMemory] = useState<Memory | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFlower, setSelectedFlower] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredMemories = useMemo(() => {
    return [...memories]
      .filter((m) => !m.isDraft && new Date(m.date) >= new Date("2025-10-18"))
      .filter((m) => {
        if (showFavoritesOnly && !m.isFavorite) return false;
        if (selectedFlower && m.flowerId !== selectedFlower) return false;
        if (selectedMood && m.mood !== selectedMood) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          if (
            !m.title.toLowerCase().includes(q) &&
            !m.note.toLowerCase().includes(q) &&
            !m.tags?.some((t) => t.toLowerCase().includes(q))
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [memories, showFavoritesOnly, selectedFlower, selectedMood, searchTerm]);

  const activeIndex = useMemo(
    () => (activeMemory ? filteredMemories.findIndex((m) => m.id === activeMemory.id) : -1),
    [activeMemory, filteredMemories]
  );

  const openMemory = useCallback((m: Memory) => {
    setActiveMemory(m);
    setPhotoIndex(0);
  }, []);

  const closeMemory = useCallback(() => setActiveMemory(null), []);

  const goNext = useCallback(() => {
    if (activeIndex < filteredMemories.length - 1) {
      setActiveMemory(filteredMemories[activeIndex + 1]);
      setPhotoIndex(0);
    }
  }, [activeIndex, filteredMemories]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveMemory(filteredMemories[activeIndex - 1]);
      setPhotoIndex(0);
    }
  }, [activeIndex, filteredMemories]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!activeMemory) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") closeMemory();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeMemory, goPrev, goNext, closeMemory]);

  const hasActiveFilters = searchTerm || selectedFlower || selectedMood || showFavoritesOnly;
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedFlower("");
    setSelectedMood("");
    setShowFavoritesOnly(false);
  };

  // ── Render ──
  return (
    <div className="relative min-h-screen w-full select-none overflow-x-hidden pb-32">

      {/* ── Header ── */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-black tracking-tight ${theme.textPrimary}`}>
            Memory Garden
          </h2>
          <p className={`text-xs font-semibold mt-0.5 ${theme.textSecondary}`}>
            {filteredMemories.length} moment{filteredMemories.length !== 1 ? "s" : ""} bloomed
          </p>
        </div>
        <button
          onClick={() => setIsFilterOpen((v) => !v)}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${
            hasActiveFilters
              ? "bg-pink-500 text-white"
              : "bg-white/20 backdrop-blur-md border border-white/20 " + theme.textPrimary
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* ── Filter Drawer ── */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="overflow-hidden px-5"
          >
            <div className={`rounded-3xl p-5 ${theme.card} border border-white/15 backdrop-blur-2xl shadow-2xl space-y-4 mb-4`}>
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search memories…"
                  className="w-full pl-8 pr-3 py-2 rounded-full text-xs border border-white/15 bg-white/10 outline-none focus:border-pink-400 placeholder-gray-400 text-inherit"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={selectedFlower}
                  onChange={(e) => setSelectedFlower(e.target.value)}
                  className="px-3 py-2 rounded-full text-xs border border-white/15 bg-white/10 outline-none focus:border-pink-400 text-inherit"
                >
                  <option value="">All Flowers</option>
                  {Object.values(FLOWERS).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="px-3 py-2 rounded-full text-xs border border-white/15 bg-white/10 outline-none focus:border-pink-400 text-inherit"
                >
                  <option value="">All Moods</option>
                  <option value="grateful">Grateful</option>
                  <option value="joyful">Joyful</option>
                  <option value="reflective">Reflective</option>
                  <option value="serene">Serene</option>
                  <option value="romantic">Romantic</option>
                  <option value="peaceful">Peaceful</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${theme.textPrimary}`}>Favorites only</span>
                <button
                  onClick={() => setShowFavoritesOnly((v) => !v)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 ${showFavoritesOnly ? "bg-pink-500" : "bg-gray-300/40"}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${showFavoritesOnly ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full py-2 rounded-full border border-dashed border-pink-400/50 text-pink-400 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ── */}
      {filteredMemories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xs mx-auto mt-16 text-center py-12 px-6 rounded-[32px] bg-white/10 backdrop-blur-md border border-white/15 space-y-4"
        >
          <div className="flex items-center justify-center"><Leaf className="w-12 h-12 text-green-400/80" /></div>
          <h3 className={`text-base font-bold ${theme.textPrimary}`}>
            {hasActiveFilters ? "No matches" : "Garden is waiting"}
          </h3>
          <p className={`text-xs ${theme.textSecondary} leading-relaxed`}>
            {hasActiveFilters
              ? "Try adjusting your filters."
              : "Your first memory will appear here from October 18th onwards."}
          </p>
        </motion.div>
      ) : (
        /* ── Apple Watch Honeycomb Grid ── */
        <div className="px-4 pt-2">
          {/* Staggered honeycomb: alternate rows are offset by half an icon width */}
          <div className="flex flex-col gap-3">
            {(() => {
              const COLS = window.innerWidth < 400 ? 3 : 4;
              const rows: Memory[][] = [];
              for (let i = 0; i < filteredMemories.length; i += COLS) {
                rows.push(filteredMemories.slice(i, i + COLS));
              }
              return rows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex gap-3 justify-center"
                  style={{
                    marginLeft: rowIdx % 2 === 1 ? "clamp(34px, 9.5vw, 47px)" : 0,
                  }}
                >
                  {row.map((memory, colIdx) => (
                    <WatchIcon
                      key={memory.id}
                      memory={memory}
                      index={rowIdx * COLS + colIdx}
                      onTap={openMemory}
                      theme={theme}
                    />
                  ))}
                </div>
              ));
            })()}
          </div>

          {/* Legend pill */}
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-gray-400 font-semibold">
              <span>Tap any date to open</span>
              <span className="w-px h-3 bg-white/20" />
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full border-2 border-pink-400" />
                <span>= Favorite</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Premium Memory Modal ── */}
      <AnimatePresence>
        {activeMemory && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMemory}
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-2xl"
            />

            {/* Card — Apple-style bottom sheet on mobile, centered on desktop */}
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 80) closeMemory();
                }}
                className="relative w-full sm:max-w-lg overflow-hidden pointer-events-auto rounded-none sm:rounded-[28px] flex flex-col shadow-2xl cursor-grab active:cursor-grabbing select-none h-[100dvh] sm:h-auto sm:max-h-[92dvh]"
                style={{
                  background: getIconGradient(activeMemory.id, !!activeMemory.isFavorite),
                  willChange: "transform",
                }}
              >
                {/* Drag indicator (mobile) */}
                <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0 relative z-20">
                  <div className="w-9 h-1 rounded-full bg-white/40" />
                </div>

                {/* Hero Image - adaptive height, natural proportions */}
                <div className="relative w-full bg-black/30 overflow-hidden flex items-center justify-center flex-1 sm:max-h-[60dvh]">
                  <motion.img
                    layoutId={`watch-img-${activeMemory.id}`}
                    src={activeMemory.photos[photoIndex] || getUnsplashFlowerUrl(activeMemory.flowerId)}
                    alt={activeMemory.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain mx-auto pointer-events-auto cursor-grab active:cursor-grabbing"
                    style={{ willChange: "transform" }}
                    drag={activeMemory.photos.length > 1 ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, info) => {
                      e.stopPropagation();
                      if (info.offset.x < -40) {
                        setPhotoIndex(p => p < activeMemory.photos.length - 1 ? p + 1 : 0);
                      } else if (info.offset.x > 40) {
                        setPhotoIndex(p => p > 0 ? p - 1 : activeMemory.photos.length - 1);
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                  {/* Photo arrows */}
                  {activeMemory.photos.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPhotoIndex((p) => (p > 0 ? p - 1 : activeMemory.photos.length - 1)); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-md text-white active:scale-90 transition-transform"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPhotoIndex((p) => (p < activeMemory.photos.length - 1 ? p + 1 : 0)); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur-md text-white active:scale-90 transition-transform"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Photo dots */}
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                        {activeMemory.photos.map((_, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => setPhotoIndex(pIdx)}
                            className={`rounded-full transition-all duration-300 ${
                              photoIndex === pIdx ? "bg-white w-5 h-1.5" : "bg-white/40 w-1.5 h-1.5"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Close */}
                  <button
                    onClick={closeMemory}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/15 active:scale-90 transition-transform"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Favorite badge */}
                  {activeMemory.isFavorite && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-pink-500/90 backdrop-blur-md text-white text-[10px] font-extrabold flex items-center gap-1 shadow-lg">
                      <Heart className="w-3 h-3 fill-current" /> Favorite
                    </div>
                  )}

                  {/* Date badge over image */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="absolute bottom-3 left-3 flex flex-col"
                  >
                    <span className="text-white/60 text-[9px] font-extrabold uppercase tracking-widest">
                      {new Date(activeMemory.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}
                    </span>
                    <span className="text-white text-lg font-black leading-tight drop-shadow-md">
                      {new Date(activeMemory.date + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </motion.div>
                </div>

                {/* Content Section - Scrollable */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.3 }}
                  className="overflow-y-auto shrink-0"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(24px)",
                  }}
                >
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Flower accent */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                        <Flower2 className={`w-5 h-5 ${FLOWERS[activeMemory.flowerId]?.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-extrabold text-[15px] truncate">{activeMemory.title}</p>
                        <p className="text-pink-300 text-[10px] font-bold uppercase tracking-wider">
                          {FLOWERS[activeMemory.flowerId]?.name} · {FLOWERS[activeMemory.flowerId]?.emotion}
                        </p>
                      </div>
                    </div>

                    {/* Note */}
                    <p className="text-white/80 text-[13px] leading-relaxed font-medium whitespace-pre-wrap">
                      {activeMemory.note}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {activeMemory.mood && (
                        <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-white/80 text-[10px] font-bold capitalize">
                          {activeMemory.mood}
                        </span>
                      )}
                      {activeMemory.weather && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/20 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                          <CloudSun className="w-3 h-3" /> {activeMemory.weather}
                        </span>
                      )}
                      {activeMemory.music && (
                        <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 text-[10px] font-bold flex items-center gap-1">
                          <Music className="w-3 h-3" /> {activeMemory.music}
                        </span>
                      )}
                    </div>

                    {activeMemory.tags?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {activeMemory.tags.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] font-bold">
                            #{t}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* Flower meaning */}
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/8 text-white/50 text-[11px] italic leading-relaxed">
                      "{FLOWERS[activeMemory.flowerId]?.meaning}"
                    </div>
                  </div>

                  {/* Nav bar */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
                    <button
                      onClick={goPrev}
                      disabled={activeIndex <= 0}
                      className="flex items-center gap-1 px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white text-[11px] font-bold disabled:opacity-25 active:scale-95 transition-transform"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="text-white/35 text-[10px] font-bold tracking-widest">
                      {activeIndex + 1} / {filteredMemories.length}
                    </span>
                    <button
                      onClick={goNext}
                      disabled={activeIndex >= filteredMemories.length - 1}
                      className="flex items-center gap-1 px-3 py-2 rounded-full bg-white/10 border border-white/10 text-white text-[11px] font-bold disabled:opacity-25 active:scale-95 transition-transform"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
