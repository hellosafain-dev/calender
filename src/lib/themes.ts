/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeType } from "../types.js";

export interface ThemeConfig {
  name: string;
  bg: string;
  card: string;
  cardHover: string;
  textPrimary: string;
  textSecondary: string;
  accent: string; // Tailwind color name (e.g. "rose-500")
  accentHover: string;
  accentLight: string; // Soft background accent tint
  accentText: string;
  border: string;
  shadow: string;
  glow: string;
  analogClockBg: string;
  analogClockGlow: string;
  scrollbar: string;
}

export const THEMES: Record<ThemeType, ThemeConfig> = {
  light: {
    name: "Classic Warm Linen",
    bg: "bg-[#FAF7F2]", // Warm parchment off-white
    card: "bg-white/80 backdrop-blur-md border border-[#EBE6DC]",
    cardHover: "hover:bg-white/95 hover:border-[#DFD9CE]",
    textPrimary: "text-[#2D2A26]", // Deep espresso/charcoal
    textSecondary: "text-[#70695E]", // Soft earth
    accent: "bg-[#C49A45]", // Gold dust
    accentHover: "hover:bg-[#B38936]",
    accentLight: "bg-[#FAF1DF]",
    accentText: "text-[#9E7828]",
    border: "border-[#EBE6DC]",
    shadow: "shadow-[0_8px_30px_rgb(196,183,164,0.15)]",
    glow: "shadow-[0_0_20px_rgba(196,154,69,0.2)]",
    analogClockBg: "bg-white/50 border-[#EBE6DC]",
    analogClockGlow: "shadow-[0_0_15px_rgba(196,154,69,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#EBE6DC] scrollbar-track-transparent",
  },
  dark: {
    name: "Velvet Midnight",
    bg: "bg-[#0B0A0F]", // Very deep purple-tinted black
    card: "bg-[#14121F]/80 backdrop-blur-md border border-[#231E35]",
    cardHover: "hover:bg-[#1A1828]/90 hover:border-[#312B47]",
    textPrimary: "text-[#ECE9F2]", // Soft lilac-white
    textSecondary: "text-[#8D88A5]", // Cool slate
    accent: "bg-[#A78BFA]", // Glowing amethyst
    accentHover: "hover:bg-[#8B5CF6]",
    accentLight: "bg-[#251F3D]",
    accentText: "text-[#C4B5FD]",
    border: "border-[#231E35]",
    shadow: "shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
    glow: "shadow-[0_0_25px_rgba(167,139,250,0.4)]",
    analogClockBg: "bg-[#14121F]/60 border-[#231E35]",
    analogClockGlow: "shadow-[0_0_20px_rgba(167,139,250,0.3)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#231E35] scrollbar-track-transparent",
  },
  autumn: {
    name: "Golden Terracotta",
    bg: "bg-[#FAF2EC]", // Soft warm pumpkin-cream
    card: "bg-white/80 backdrop-blur-md border border-[#F2DFCE]",
    cardHover: "hover:bg-white/95 hover:border-[#E8CAA6]",
    textPrimary: "text-[#3E2412]", // Deep roasted pecan
    textSecondary: "text-[#85654B]", // Warm clay
    accent: "bg-[#D96B27]", // Burnt amber/terracotta
    accentHover: "hover:bg-[#BE571C]",
    accentLight: "bg-[#FDF0E6]",
    accentText: "text-[#D96B27]",
    border: "border-[#F2DFCE]",
    shadow: "shadow-[0_8px_30px_rgba(217,107,39,0.08)]",
    glow: "shadow-[0_0_20px_rgba(217,107,39,0.2)]",
    analogClockBg: "bg-white/50 border-[#F2DFCE]",
    analogClockGlow: "shadow-[0_0_15px_rgba(217,107,39,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#F2DFCE] scrollbar-track-transparent",
  },
  spring: {
    name: "Meadow Whisper",
    bg: "bg-[#F3F6F2]", // Soft light green dew
    card: "bg-white/80 backdrop-blur-md border border-[#E1EAE0]",
    cardHover: "hover:bg-white/95 hover:border-[#D1DFCF]",
    textPrimary: "text-[#1F2D1E]", // Forest moss
    textSecondary: "text-[#586A56]", // Soft fern
    accent: "bg-[#719E6E]", // Fresh leaf green
    accentHover: "hover:bg-[#598457]",
    accentLight: "bg-[#EDF4EC]",
    accentText: "text-[#5A8757]",
    border: "border-[#E1EAE0]",
    shadow: "shadow-[0_8px_30px_rgba(113,158,110,0.08)]",
    glow: "shadow-[0_0_20px_rgba(113,158,110,0.2)]",
    analogClockBg: "bg-white/50 border-[#E1EAE0]",
    analogClockGlow: "shadow-[0_0_15px_rgba(113,158,110,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#E1EAE0] scrollbar-track-transparent",
  },
  lavender: {
    name: "Provence Dream",
    bg: "bg-[#F6F4FC]", // Warm lavender field mist
    card: "bg-white/80 backdrop-blur-md border border-[#EBE4F6]",
    cardHover: "hover:bg-white/95 hover:border-[#DDD0EE]",
    textPrimary: "text-[#281E3D]", // Royal purple midnight
    textSecondary: "text-[#6E5D87]", // Dusty mauve
    accent: "bg-[#8E79CD]", // Vibrant French Lavender
    accentHover: "hover:bg-[#7861BD]",
    accentLight: "bg-[#F1ECFB]",
    accentText: "text-[#7B63C1]",
    border: "border-[#EBE4F6]",
    shadow: "shadow-[0_8px_30px_rgba(142,121,205,0.08)]",
    glow: "shadow-[0_0_20px_rgba(142,121,205,0.25)]",
    analogClockBg: "bg-white/50 border-[#EBE4F6]",
    analogClockGlow: "shadow-[0_0_15px_rgba(142,121,205,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#EBE4F6] scrollbar-track-transparent",
  },
  cherry: {
    name: "Sakura Petals", // DEFAULT theme
    bg: "bg-[#FDF8F8]", // Delicate rosy parchment
    card: "bg-white/70 backdrop-blur-md border border-[#F8E1E1]",
    cardHover: "hover:bg-white/90 hover:border-[#ECC2C2]",
    textPrimary: "text-[#3D1E1E]", // Deep cocoa/crimson
    textSecondary: "text-[#855D5D]", // Warm clay-pink
    accent: "bg-[#EC708B]", // Soft sakura red-pink
    accentHover: "hover:bg-[#D75471]",
    accentLight: "bg-[#FCEDEE]",
    accentText: "text-[#E05474]",
    border: "border-[#F8E1E1]",
    shadow: "shadow-[0_8px_30px_rgba(236,112,139,0.08)]",
    glow: "shadow-[0_0_25px_rgba(236,112,139,0.3)]",
    analogClockBg: "bg-white/50 border-[#F8E1E1]",
    analogClockGlow: "shadow-[0_0_20px_rgba(236,112,139,0.2)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#F8E1E1] scrollbar-track-transparent",
  },
  forest: {
    name: "Redwood Canopy",
    bg: "bg-[#0E1511]", // Deepest evergreen pine needles
    card: "bg-[#15201B]/80 backdrop-blur-md border border-[#203129]",
    cardHover: "hover:bg-[#1D2B24]/90 hover:border-[#2C453A]",
    textPrimary: "text-[#EDF4F1]", // Sage silver
    textSecondary: "text-[#7C978D]", // Pale cedar
    accent: "bg-[#4AA685]", // Emerald dew
    accentHover: "hover:bg-[#39896B]",
    accentLight: "bg-[#12281F]",
    accentText: "text-[#59C19E]",
    border: "border-[#203129]",
    shadow: "shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
    glow: "shadow-[0_0_25px_rgba(74,166,133,0.3)]",
    analogClockBg: "bg-[#15201B]/60 border-[#203129]",
    analogClockGlow: "shadow-[0_0_20px_rgba(74,166,133,0.2)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#203129] scrollbar-track-transparent",
  },
  ocean: {
    name: "Misty Seafoam",
    bg: "bg-[#091118]", // Bioluminescent deep ocean
    card: "bg-[#111C28]/80 backdrop-blur-md border border-[#192D3E]",
    cardHover: "hover:bg-[#172637]/90 hover:border-[#25425B]",
    textPrimary: "text-[#ECF3FA]", // Ice cap silver
    textSecondary: "text-[#7693A9]", // Slate ocean
    accent: "bg-[#4FADD2]", // Luminous seafoam blue
    accentHover: "hover:bg-[#3495BB]",
    accentLight: "bg-[#0F2E3E]",
    accentText: "text-[#62C3E9]",
    border: "border-[#192D3E]",
    shadow: "shadow-[0_8px_32px_rgba(0,0,0,0.55)]",
    glow: "shadow-[0_0_25px_rgba(79,173,210,0.3)]",
    analogClockBg: "bg-[#111C28]/60 border-[#192D3E]",
    analogClockGlow: "shadow-[0_0_20px_rgba(79,173,210,0.2)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#192D3E] scrollbar-track-transparent",
  },
  elegant_dark: {
    name: "Elegant Dark",
    bg: "bg-[#0D0D0D]",
    card: "bg-white/5 border border-white/10 backdrop-blur-xl rounded-[32px]",
    cardHover: "hover:bg-white/10 hover:border-white/20",
    textPrimary: "text-[#E0E0E0]",
    textSecondary: "text-white/60",
    accent: "bg-white !text-black",
    accentHover: "hover:bg-white/90",
    accentLight: "bg-white/10",
    accentText: "text-white",
    border: "border-white/10",
    shadow: "shadow-2xl",
    glow: "shadow-[0_0_30px_rgba(255,255,255,0.15)]",
    analogClockBg: "bg-white/5 border-white/10",
    analogClockGlow: "shadow-[0_0_20px_rgba(255,255,255,0.08)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
  }
};

export interface FlowerSystemConfig {
  id: string;
  name: string;
  emotion: string;
  color: string;
  emoji: string;
  symbol: string;
  meaning: string;
  gradient: string;
}

export const FLOWERS: Record<string, FlowerSystemConfig> = {
  rose: {
    id: "rose",
    name: "Rose",
    emotion: "Love & Devotion",
    color: "text-red-500 bg-red-100",
    emoji: "🌹",
    symbol: "🌹",
    meaning: "The classic symbol of deep affection, longing, and unforgettable devotion.",
    gradient: "from-red-500 to-rose-600"
  },
  tulip: {
    id: "tulip",
    name: "Tulip",
    emotion: "Hope & Dreams",
    color: "text-amber-500 bg-amber-100",
    emoji: "🌷",
    symbol: "🌷",
    meaning: "Stands for a beautiful tomorrow, optimism, warmth, and fresh possibilities.",
    gradient: "from-amber-400 to-pink-500"
  },
  lavender: {
    id: "lavender",
    name: "Lavender",
    emotion: "Peace & Serenity",
    color: "text-violet-500 bg-violet-100",
    emoji: "🌸", // We can use purple colored emojis
    symbol: "🌸",
    meaning: "Brings calming thoughts, tranquility, safety, and a quiet sense of comfort.",
    gradient: "from-violet-400 to-purple-500"
  },
  sunflower: {
    id: "sunflower",
    name: "Sunflower",
    emotion: "Joy & Brightness",
    color: "text-yellow-500 bg-yellow-100",
    emoji: "🌻",
    symbol: "🌻",
    meaning: "Glows with radiating happiness, warmth, positive energy, and laughter.",
    gradient: "from-yellow-400 to-amber-500"
  },
  cherry_blossom: {
    id: "cherry_blossom",
    name: "Cherry Blossom",
    emotion: "New Beginnings",
    color: "text-pink-500 bg-pink-100",
    emoji: "🌸",
    symbol: "🌸",
    meaning: "Expresses fresh starts, the precious fleeting beauty of life, and sweet promises.",
    gradient: "from-pink-400 to-rose-500"
  },
  jasmine: {
    id: "jasmine",
    name: "Jasmine",
    emotion: "Pure Grace",
    color: "text-slate-400 bg-slate-100",
    emoji: "🤍",
    symbol: "🤍",
    meaning: "Represents pure grace, sweet innocence, elegance, and silent deep love.",
    gradient: "from-slate-200 to-[#FAF7F2]"
  },
  hydrangea: {
    id: "hydrangea",
    name: "Hydrangea",
    emotion: "Gratitude & Caring",
    color: "text-teal-500 bg-teal-100",
    emoji: "🌼",
    symbol: "🌼",
    meaning: "Shows sincere appreciation, deep understanding, care, and family bonds.",
    gradient: "from-teal-400 to-blue-500"
  },
  peony: {
    id: "peony",
    name: "Peony",
    emotion: "Warm Comfort",
    color: "text-rose-400 bg-rose-500/10",
    emoji: "🌺",
    symbol: "🌺",
    meaning: "Symbolizes prosperity, cozy comfort, honor, and gentle protective warmth.",
    gradient: "from-rose-300 to-pink-500"
  }
};
