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
  bgImage?: string;
}

export const THEMES: Record<ThemeType, ThemeConfig> = {
  light: {
    name: "Classic Warm Linen",
    bg: "bg-[#FAF7F2]", // Warm parchment off-white
    card: "bg-white/70 backdrop-blur-xl border border-[#EBE6DC]/60",
    cardHover: "hover:bg-white/85 hover:border-[#DFD9CE]",
    textPrimary: "text-[#2D2A26]", // Deep espresso/charcoal
    textSecondary: "text-[#70695E]", // Soft earth
    accent: "bg-[#C49A45] !text-white", // Gold dust
    accentHover: "hover:bg-[#B38936]",
    accentLight: "bg-[#FAF1DF]/75",
    accentText: "text-[#9E7828]",
    border: "border-[#EBE6DC]/60",
    shadow: "shadow-[0_8px_30px_rgba(196,183,164,0.12)]",
    glow: "shadow-[0_0_20px_rgba(196,154,69,0.15)]",
    analogClockBg: "bg-white/40 border-[#EBE6DC]",
    analogClockGlow: "shadow-[0_0_15px_rgba(196,154,69,0.1)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#EBE6DC] scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200",
  },
  dark: {
    name: "Velvet Midnight",
    bg: "bg-[#0B0A0F]", // Very deep purple-tinted black
    card: "bg-[#14121F]/70 backdrop-blur-xl border border-[#231E35]/60",
    cardHover: "hover:bg-[#1A1828]/85 hover:border-[#312B47]",
    textPrimary: "text-[#ECE9F2]", // Soft lilac-white
    textSecondary: "text-[#8D88A5]", // Cool slate
    accent: "bg-[#A78BFA] !text-black", // Glowing amethyst
    accentHover: "hover:bg-[#8B5CF6]",
    accentLight: "bg-[#251F3D]/75",
    accentText: "text-[#C4B5FD]",
    border: "border-[#231E35]/60",
    shadow: "shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
    glow: "shadow-[0_0_25px_rgba(167,139,250,0.3)]",
    analogClockBg: "bg-[#14121F]/40 border-[#231E35]",
    analogClockGlow: "shadow-[0_0_20px_rgba(167,139,250,0.2)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#231E35] scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200",
  },
  autumn: {
    name: "Golden Terracotta",
    bg: "bg-[#FAF2EC]", // Soft warm pumpkin-cream
    card: "bg-white/70 backdrop-blur-xl border border-[#F2DFCE]/60",
    cardHover: "hover:bg-white/85 hover:border-[#E8CAA6]",
    textPrimary: "text-[#3E2412]", // Deep roasted pecan
    textSecondary: "text-[#85654B]", // Warm clay
    accent: "bg-[#D96B27] !text-white", // Burnt amber/terracotta
    accentHover: "hover:bg-[#BE571C]",
    accentLight: "bg-[#FDF0E6]/75",
    accentText: "text-[#D96B27]",
    border: "border-[#F2DFCE]/60",
    shadow: "shadow-[0_8px_30px_rgba(217,107,39,0.06)]",
    glow: "shadow-[0_0_20px_rgba(217,107,39,0.15)]",
    analogClockBg: "bg-white/40 border-[#F2DFCE]",
    analogClockGlow: "shadow-[0_0_15px_rgba(217,107,39,0.1)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#F2DFCE] scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200",
  },
  spring: {
    name: "Meadow Whisper",
    bg: "bg-[#F3F6F2]", // Soft light green dew
    card: "bg-white/70 backdrop-blur-xl border border-[#E1EAE0]/60",
    cardHover: "hover:bg-white/85 hover:border-[#D1DFCF]",
    textPrimary: "text-[#1F2D1E]", // Forest moss
    textSecondary: "text-[#586A56]", // Soft fern
    accent: "bg-[#719E6E] !text-white", // Fresh leaf green
    accentHover: "hover:bg-[#598457]",
    accentLight: "bg-[#EDF4EC]/75",
    accentText: "text-[#5A8757]",
    border: "border-[#E1EAE0]/60",
    shadow: "shadow-[0_8px_30px_rgba(113,158,110,0.06)]",
    glow: "shadow-[0_0_20px_rgba(113,158,110,0.15)]",
    analogClockBg: "bg-white/40 border-[#E1EAE0]",
    analogClockGlow: "shadow-[0_0_15px_rgba(113,158,110,0.1)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#E1EAE0] scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=1200",
  },
  lavender: {
    name: "Provence Dream",
    bg: "bg-[#F6F4FC]", // Warm lavender field mist
    card: "bg-white/70 backdrop-blur-xl border border-[#EBE4F6]/60",
    cardHover: "hover:bg-white/85 hover:border-[#DDD0EE]",
    textPrimary: "text-[#281E3D]", // Royal purple midnight
    textSecondary: "text-[#6E5D87]", // Dusty mauve
    accent: "bg-[#8E79CD] !text-white", // Vibrant French Lavender
    accentHover: "hover:bg-[#7861BD]",
    accentLight: "bg-[#F1ECFB]/75",
    accentText: "text-[#7B63C1]",
    border: "border-[#EBE4F6]/60",
    shadow: "shadow-[0_8px_30px_rgba(142,121,205,0.06)]",
    glow: "shadow-[0_0_20px_rgba(142,121,205,0.2)]",
    analogClockBg: "bg-white/40 border-[#EBE4F6]",
    analogClockGlow: "shadow-[0_0_15px_rgba(142,121,205,0.1)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#EBE4F6] scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&q=80&w=1200",
  },
  cherry: {
    name: "Sakura Petals", // DEFAULT theme
    bg: "bg-[#FDF8F8]", // Delicate rosy parchment
    card: "bg-white/60 backdrop-blur-xl border border-[#F8E1E1]/60",
    cardHover: "hover:bg-white/85 hover:border-[#ECC2C2]",
    textPrimary: "text-[#3D1E1E]", // Deep cocoa/crimson
    textSecondary: "text-[#855D5D]", // Warm clay-pink
    accent: "bg-[#EC708B] !text-white", // Soft sakura red-pink
    accentHover: "hover:bg-[#D75471]",
    accentLight: "bg-[#FCEDEE]/75",
    accentText: "text-[#E05474]",
    border: "border-[#F8E1E1]/60",
    shadow: "shadow-[0_8px_30px_rgba(236,112,139,0.06)]",
    glow: "shadow-[0_0_25px_rgba(236,112,139,0.2)]",
    analogClockBg: "bg-white/40 border-[#F8E1E1]",
    analogClockGlow: "shadow-[0_0_20px_rgba(236,112,139,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#F8E1E1] scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?auto=format&fit=crop&q=80&w=1200",
  },
  forest: {
    name: "Redwood Canopy",
    bg: "bg-[#0E1511]", // Deepest evergreen pine needles
    card: "bg-[#15201B]/70 backdrop-blur-xl border border-[#203129]/60",
    cardHover: "hover:bg-[#1D2B24]/85 hover:border-[#2C453A]",
    textPrimary: "text-[#EDF4F1]", // Sage silver
    textSecondary: "text-[#7C978D]", // Pale cedar
    accent: "bg-[#4AA685] !text-black", // Emerald dew
    accentHover: "hover:bg-[#39896B]",
    accentLight: "bg-[#12281F]/75",
    accentText: "text-[#59C19E]",
    border: "border-[#203129]/60",
    shadow: "shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
    glow: "shadow-[0_0_25px_rgba(74,166,133,0.25)]",
    analogClockBg: "bg-[#15201B]/40 border-[#203129]",
    analogClockGlow: "shadow-[0_0_20px_rgba(74,166,133,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#203129] scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=1200",
  },
  ocean: {
    name: "Misty Seafoam",
    bg: "bg-[#091118]", // Bioluminescent deep ocean
    card: "bg-[#111C28]/70 backdrop-blur-xl border border-[#192D3E]/60",
    cardHover: "hover:bg-[#172637]/85 hover:border-[#25425B]",
    textPrimary: "text-[#ECF3FA]", // Ice cap silver
    textSecondary: "text-[#7693A9]", // Slate ocean
    accent: "bg-[#4FADD2] !text-black", // Luminous seafoam blue
    accentHover: "hover:bg-[#3495BB]",
    accentLight: "bg-[#0F2E3E]/75",
    accentText: "text-[#62C3E9]",
    border: "border-[#192D3E]/60",
    shadow: "shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
    glow: "shadow-[0_0_25px_rgba(79,173,210,0.25)]",
    analogClockBg: "bg-[#111C28]/40 border-[#192D3E]",
    analogClockGlow: "shadow-[0_0_20px_rgba(79,173,210,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#192D3E] scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&q=80&w=1200",
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
    bgImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200",
  },
  rapunzel: {
    name: "Rapunzel's Tower",
    bg: "bg-[#1C122C]", // Royal amethyst deep purple
    card: "bg-[#291B3E]/60 backdrop-blur-xl border border-[#D97706]/20",
    cardHover: "hover:bg-[#34224F]/80 hover:border-[#D97706]/40",
    textPrimary: "text-[#FDF2F8]", // Pinkish white
    textSecondary: "text-[#C084FC]", // Lilac
    accent: "bg-[#FCD34D] !text-black", // Lantern gold
    accentHover: "hover:bg-[#FBBF24]",
    accentLight: "bg-[#F3E8FF]/10",
    accentText: "text-[#FDE047]",
    border: "border-[#D97706]/20",
    shadow: "shadow-[0_8px_32px_rgba(28,18,44,0.6)]",
    glow: "shadow-[0_0_25px_rgba(252,211,77,0.35)]",
    analogClockBg: "bg-[#291B3E]/40 border-[#34224F]",
    analogClockGlow: "shadow-[0_0_20px_rgba(252,211,77,0.2)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#FCD34D]/20 scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=1200"
  },
  barbie: {
    name: "Barbie Dreamworld",
    bg: "bg-[#FFF1F2]", // Pastel blush pink
    card: "bg-white/60 backdrop-blur-xl border border-[#FDA4AF]/40",
    cardHover: "hover:bg-white/80 hover:border-[#F43F5E]",
    textPrimary: "text-[#881337]", // Royal rose pink
    textSecondary: "text-[#FB7185]", // Barbie pink
    accent: "bg-[#F43F5E] !text-white", // Pop magenta
    accentHover: "hover:bg-[#E11D48]",
    accentLight: "bg-[#FFE4E6]/80",
    accentText: "text-[#E11D48]",
    border: "border-[#FDA4AF]/40",
    shadow: "shadow-[0_8px_30px_rgba(244,63,94,0.08)]",
    glow: "shadow-[0_0_25px_rgba(244,63,94,0.3)]",
    analogClockBg: "bg-white/40 border-[#FFE4E6]",
    analogClockGlow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#FB7185]/20 scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=1200"
  },
  oswald: {
    name: "Oswald's Inkwell",
    bg: "bg-[#18181B]", // Classic charcoal black
    card: "bg-[#27272A]/75 backdrop-blur-xl border border-[#3F3F46]/50",
    cardHover: "hover:bg-[#3F3F46]/85 hover:border-[#71717A]",
    textPrimary: "text-[#F4F4F5]", // Newspaper white
    textSecondary: "text-[#A1A1AA]", // Vintage gray
    accent: "bg-[#38BDF8] !text-black", // Oswald vintage blue
    accentHover: "hover:bg-[#0EA5E9]",
    accentLight: "bg-[#172554]/50",
    accentText: "text-[#38BDF8]",
    border: "border-[#3F3F46]/50",
    shadow: "shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
    glow: "shadow-[0_0_25px_rgba(56,189,248,0.25)]",
    analogClockBg: "bg-[#27272A]/40 border-[#3F3F46]",
    analogClockGlow: "shadow-[0_0_20px_rgba(56,189,248,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#3F3F46] scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=1200"
  },
  butterfly: {
    name: "Butterfly Sanctuary",
    bg: "bg-[#ECFDF5]", // Ethereal mint green
    card: "bg-white/60 backdrop-blur-xl border border-[#A7F3D0]/40",
    cardHover: "hover:bg-white/80 hover:border-[#10B981]",
    textPrimary: "text-[#064E3B]", // Emerald green
    textSecondary: "text-[#34D399]", // Soft jade
    accent: "bg-[#059669] !text-white", // Butterfly teal
    accentHover: "hover:bg-[#047857]",
    accentLight: "bg-[#D1FAE5]/80",
    accentText: "text-[#059669]",
    border: "border-[#A7F3D0]/40",
    shadow: "shadow-[0_8px_30px_rgba(5,150,105,0.06)]",
    glow: "shadow-[0_0_25px_rgba(5,150,105,0.25)]",
    analogClockBg: "bg-white/40 border-[#D1FAE5]",
    analogClockGlow: "shadow-[0_0_20px_rgba(5,150,105,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#34D399]/20 scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200"
  },
  sunshine: {
    name: "Sunshine Meadow",
    bg: "bg-[#FFFBEB]", // Bright butter yellow
    card: "bg-white/65 backdrop-blur-xl border border-[#FDE68A]/40",
    cardHover: "hover:bg-white/80 hover:border-[#F59E0B]",
    textPrimary: "text-[#78350F]", // Golden honey amber
    textSecondary: "text-[#F59E0B]", // Marigold
    accent: "bg-[#D97706] !text-white", // Sunlight orange
    accentHover: "hover:bg-[#B45309]",
    accentLight: "bg-[#FEF3C7]/80",
    accentText: "text-[#D97706]",
    border: "border-[#FDE68A]/40",
    shadow: "shadow-[0_8px_30px_rgba(217,119,6,0.06)]",
    glow: "shadow-[0_0_25px_rgba(217,119,6,0.25)]",
    analogClockBg: "bg-white/40 border-[#FEF3C7]",
    analogClockGlow: "shadow-[0_0_20px_rgba(217,119,6,0.15)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#F59E0B]/20 scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=1200"
  },
  gilded_rose: {
    name: "Gilded Crimson Rose",
    bg: "bg-[#1C0A0E]", // Deep dark velvet maroon
    card: "bg-[#2C1117]/70 backdrop-blur-xl border border-[#EF4444]/20",
    cardHover: "hover:bg-[#3D1821]/85 hover:border-[#EF4444]/40",
    textPrimary: "text-[#FFE4E6]", // Delicate rose-white
    textSecondary: "text-[#F43F5E]", // Vibrant crimson
    accent: "bg-[#E11D48] !text-white", // Rich rose red
    accentHover: "hover:bg-[#BE123C]",
    accentLight: "bg-[#4C1D24]/75",
    accentText: "text-[#FDA4AF]",
    border: "border-[#EF4444]/20",
    shadow: "shadow-[0_8px_32px_rgba(28,10,14,0.65)]",
    glow: "shadow-[0_0_25px_rgba(225,29,72,0.35)]",
    analogClockBg: "bg-[#2C1117]/40 border-[#3D1821]",
    analogClockGlow: "shadow-[0_0_20px_rgba(225,29,72,0.25)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#E11D48]/20 scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200"
  },
  midnight_forest: {
    name: "Midnight Forest",
    bg: "bg-[#060D0A]", // Charcoal spruce green
    card: "bg-[#0C1A14]/75 backdrop-blur-xl border border-[#059669]/15",
    cardHover: "hover:bg-[#122A20]/85 hover:border-[#059669]/35",
    textPrimary: "text-[#ECFDF5]", // Mint silver
    textSecondary: "text-[#10B981]", // Fern green
    accent: "bg-[#10B981] !text-black", // Firefly green
    accentHover: "hover:bg-[#059669]",
    accentLight: "bg-[#064E3B]/75",
    accentText: "text-[#34D399]",
    border: "border-[#059669]/15",
    shadow: "shadow-[0_8px_32px_rgba(6,13,10,0.7)]",
    glow: "shadow-[0_0_25px_rgba(16,185,129,0.3)]",
    analogClockBg: "bg-[#0C1A14]/40 border-[#122A20]",
    analogClockGlow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#10B981]/20 scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=1200"
  },
  cosmic_stardust: {
    name: "Cosmic Stardust",
    bg: "bg-[#050314]", // Deep space void
    card: "bg-[#0D0B24]/75 backdrop-blur-xl border border-[#8B5CF6]/20",
    cardHover: "hover:bg-[#15123A]/85 hover:border-[#8B5CF6]/45",
    textPrimary: "text-[#F5F3FF]", // Star white
    textSecondary: "text-[#A78BFA]", // Ethereal violet
    accent: "bg-[#C084FC] !text-black", // Supernova purple
    accentHover: "hover:bg-[#A855F7]",
    accentLight: "bg-[#2E1065]/50",
    accentText: "text-[#C084FC]",
    border: "border-[#8B5CF6]/20",
    shadow: "shadow-[0_8px_32px_rgba(5,3,20,0.8)]",
    glow: "shadow-[0_0_25px_rgba(192,132,252,0.35)]",
    analogClockBg: "bg-[#0D0B24]/40 border-[#15123A]",
    analogClockGlow: "shadow-[0_0_20px_rgba(192,132,252,0.25)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#C084FC]/20 scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=1200"
  },
  obsidian_gold: {
    name: "Obsidian Gold",
    bg: "bg-[#080808]", // Deep true black
    card: "bg-[#111111]/80 backdrop-blur-2xl border border-[#D4AF37]/20",
    cardHover: "hover:bg-[#1A1A1A]/90 hover:border-[#D4AF37]/50",
    textPrimary: "text-[#F5F5F5]", // Crisp white
    textSecondary: "text-[#A3A3A3]", // Silver grey
    accent: "bg-[#D4AF37] !text-black", // Pure gold
    accentHover: "hover:bg-[#F3E5AB]",
    accentLight: "bg-[#D4AF37]/10",
    accentText: "text-[#D4AF37]",
    border: "border-[#D4AF37]/20",
    shadow: "shadow-[0_8px_30px_rgba(212,175,55,0.08)]",
    glow: "shadow-[0_0_20px_rgba(212,175,55,0.15)]",
    analogClockBg: "bg-[#111111]/60 border-[#D4AF37]/30",
    analogClockGlow: "shadow-[0_0_15px_rgba(212,175,55,0.2)]",
    scrollbar: "scrollbar-thin scrollbar-thumb-[#D4AF37]/30 scrollbar-track-transparent",
    bgImage: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80&w=1200"
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
  iconColor: string;
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
    gradient: "from-red-500 to-rose-600",
    iconColor: "text-rose-500"
  },
  tulip: {
    id: "tulip",
    name: "Tulip",
    emotion: "Hope & Dreams",
    color: "text-amber-500 bg-amber-100",
    emoji: "🌷",
    symbol: "🌷",
    meaning: "Stands for a beautiful tomorrow, optimism, warmth, and fresh possibilities.",
    gradient: "from-amber-400 to-pink-500",
    iconColor: "text-orange-400"
  },
  lavender: {
    id: "lavender",
    name: "Lavender",
    emotion: "Peace & Serenity",
    color: "text-violet-500 bg-violet-100",
    emoji: "🌸", 
    symbol: "🌸",
    meaning: "Brings calming thoughts, tranquility, safety, and a quiet sense of comfort.",
    gradient: "from-violet-400 to-purple-500",
    iconColor: "text-purple-400"
  },
  sunflower: {
    id: "sunflower",
    name: "Sunflower",
    emotion: "Joy & Brightness",
    color: "text-yellow-500 bg-yellow-100",
    emoji: "🌻",
    symbol: "🌻",
    meaning: "Glows with radiating happiness, warmth, positive energy, and laughter.",
    gradient: "from-yellow-400 to-amber-500",
    iconColor: "text-amber-400"
  },
  cherry_blossom: {
    id: "cherry_blossom",
    name: "Cherry Blossom",
    emotion: "New Beginnings",
    color: "text-pink-500 bg-pink-100",
    emoji: "🌸",
    symbol: "🌸",
    meaning: "Expresses fresh starts, the precious fleeting beauty of life, and sweet promises.",
    gradient: "from-pink-400 to-rose-500",
    iconColor: "text-pink-400"
  },
  jasmine: {
    id: "jasmine",
    name: "Jasmine",
    emotion: "Pure Grace",
    color: "text-slate-400 bg-slate-100",
    emoji: "🤍",
    symbol: "🤍",
    meaning: "Represents pure grace, sweet innocence, elegance, and silent deep love.",
    gradient: "from-slate-200 to-[#FAF7F2]",
    iconColor: "text-slate-350"
  },
  hydrangea: {
    id: "hydrangea",
    name: "Hydrangea",
    emotion: "Gratitude & Caring",
    color: "text-teal-500 bg-teal-100",
    emoji: "🌼",
    symbol: "🌼",
    meaning: "Shows sincere appreciation, deep understanding, care, and family bonds.",
    gradient: "from-teal-400 to-blue-500",
    iconColor: "text-sky-400"
  },
  peony: {
    id: "peony",
    name: "Peony",
    emotion: "Warm Comfort",
    color: "text-rose-400 bg-rose-500/10",
    emoji: "🌺",
    symbol: "🌺",
    meaning: "Symbolizes prosperity, cozy comfort, honor, and gentle protective warmth.",
    gradient: "from-rose-300 to-pink-500",
    iconColor: "text-rose-400"
  }
};
