/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock, LogOut, Check, Sparkles, Image as ImageIcon, Upload, Save, Trash2, Copy, FileCode,
  Sliders, Palette, Calendar, Eye, FileText, Music, CloudSun, UserCheck, RefreshCw, X, Download,
  FolderHeart, Key, AlertTriangle, ShieldCheck, Loader2, Pencil, Flower2, Tag, Bell
} from "lucide-react";
import { Memory, ThemeType } from "../types.js";
import { ThemeConfig, THEMES, FLOWERS } from "../lib/themes.js";
import { API, Session } from "../lib/api.js";
import { useQueryClient } from "@tanstack/react-query";
import { useAddMemory, useUpdateMemory, useDeleteMemory } from "../lib/hooks.js";
import { requestAndInitPushNotifications } from "../lib/pushUtils.js";

interface SettingsPageProps {
  memories: Memory[];
  theme: ThemeConfig;
  selectedThemeName: ThemeType;
  onChangeTheme: (themeName: ThemeType) => void;
  session: Session;
  onLoginSuccess: (session: Session) => void;
  onLogout: () => void;
  preSelectedDate?: string | null;
  clearPreSelectedDate?: () => void;
  autoCycle?: boolean;
  onToggleAutoCycle?: () => void;
}

export default function SettingsPage({
  memories,
  theme,
  selectedThemeName,
  onChangeTheme,
  session,
  onLoginSuccess,
  onLogout,
  preSelectedDate,
  clearPreSelectedDate,
  autoCycle = false,
  onToggleAutoCycle = () => {}
}: SettingsPageProps) {
  const { mutateAsync: addMemory } = useAddMemory();
  const { mutateAsync: updateMemory } = useUpdateMemory();
  const { mutateAsync: deleteMemory } = useDeleteMemory();
  const queryClient = useQueryClient();

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    if (isIOSDevice && !isStandalone) {
      setIsIOS(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setToastMessage({ text: "To install on iOS: tap the 'Share' icon at the bottom of Safari and select 'Add to Home Screen'." });
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setToastMessage({ text: "App is already installed, or you need to tap your browser menu (3 dots) and select 'Install app'." });
    }
  };

  // Settings Sub-Tabs: "dashboard", "themes", "memories", "security"
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "themes" | "memories" | "security">("dashboard");

  // Form State for creating/editing a memory
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [formDate, setFormDate] = useState(preSelectedDate || new Date().toISOString().split("T")[0]);
  const [formTitle, setFormTitle] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formFlower, setFormFlower] = useState("rose");
  const [formMood, setFormMood] = useState("peaceful");
  const [formWeather, setFormWeather] = useState("sunny");
  const [formMusic, setFormMusic] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formDraft, setFormDraft] = useState(false);
  
  // File drag & drop feedback
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Update States
  const [adminPass, setAdminPass] = useState("");
  const [viewerPass, setViewerPass] = useState("");
  const [securitySuccess, setSecuritySuccess] = useState("");

  // Custom interactive feedbacks (Toasts & Confirmation modals)
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Greeting Override States
  const [greetingInput, setGreetingInput] = useState("");
  const [greetingSuccess, setGreetingSuccess] = useState("");

  useEffect(() => {
    if (session.role === "admin") {
      API.getSettings().then((s) => {
        setGreetingInput(s.customGreeting || "");
      }).catch(console.error);
    }
  }, [session.role]);

  const handleUpdateGreeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setGreetingSuccess("");
    try {
      await API.updateSettings({ customGreeting: greetingInput });
      setGreetingSuccess("Sanctuary greeting updated successfully!");
      setToastMessage({ text: "Custom greeting has been securely updated." });
      queryClient.invalidateQueries({ queryKey: ['settings'] }); // Refresh settings
    } catch (err: any) {
      console.error(err);
      setToastMessage({ text: "Failed to update greeting.", isError: true });
    }
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Pre-fill memory for editing
  const startEditMemory = (memory: Memory) => {
    setEditingMemory(memory);
    setFormDate(memory.date);
    setFormTitle(memory.title);
    setFormNote(memory.note);
    setFormFlower(memory.flowerId);
    setFormMood(memory.mood || "peaceful");
    setFormWeather(memory.weather || "sunny");
    setFormMusic(memory.music || "");
    setFormTags(memory.tags.join(", "));
    setFormPhotos(memory.photos);
    setFormDraft(!!memory.isDraft);
    setActiveSubTab("dashboard");
  };

  useEffect(() => {
    if (preSelectedDate) {
      setFormDate(preSelectedDate);
      const existingMemory = memories.find(m => m.date === preSelectedDate && !m.isDraft);
      if (existingMemory) {
        startEditMemory(existingMemory);
      } else {
        setEditingMemory(null);
        setFormTitle("");
        setFormNote("");
        setFormFlower("rose");
        setFormMood("peaceful");
        setFormWeather("sunny");
        setFormMusic("");
        setFormTags("");
        setFormPhotos([]);
        setFormDraft(false);
      }
    }
  }, [preSelectedDate, memories]);

  // Upload files and store their URL references
  const processFiles = (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      setToastMessage({ text: `Uploading ${file.name}...` });

      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === "string") {
          try {
            const res = await API.uploadPhoto(reader.result, file.name);
            if (res.success && res.url) {
              setFormPhotos(prev => [...prev, res.url]);
              setToastMessage({ text: `${file.name} uploaded successfully!` });
            }
          } catch (err) {
            console.error("Upload error:", err);
            setToastMessage({ text: `Failed to upload ${file.name}`, isError: true });
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (idx: number) => {
    setFormPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  // Plant / Save Memory Form Submission
  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formTitle || !formNote) return;

    const tagsArray = formTags
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const payload = {
      date: formDate,
      title: formTitle,
      note: formNote,
      flowerId: formFlower,
      mood: formMood,
      weather: formWeather,
      music: formMusic || undefined,
      tags: tagsArray,
      photos: formPhotos,
      isDraft: formDraft,
    };

    try {
      if (editingMemory) {
        const res = await updateMemory({ id: editingMemory.id, payload });
        if (res.success) {
          setEditingMemory(null);
          setToastMessage({ text: "Memory blossom successfully updated in your garden!" });
        }
      } else {
        await addMemory(payload);
        setToastMessage({ text: "A beautiful new memory flower has been planted!" });
      }
      
      // Clear out
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormTitle("");
      setFormNote("");
      setFormFlower("rose");
      setFormMood("peaceful");
      setFormWeather("sunny");
      setFormMusic("");
      setFormTags("");
      setFormPhotos([]);
      setFormDraft(false);
      
      if (clearPreSelectedDate) clearPreSelectedDate();
    } catch (err) {
      console.error(err);
      setToastMessage({ text: "Failed to save memory blossom.", isError: true });
    }
  };

  // Duplicate Memory
  const handleDuplicateMemory = async (memory: Memory) => {
    try {
      const duplicateDate = `${memory.date}-dup`;
      await addMemory({
        date: duplicateDate,
        title: `${memory.title} (Copy)`,
        note: memory.note,
        flowerId: memory.flowerId,
        mood: memory.mood,
        weather: memory.weather,
        music: memory.music,
        tags: [...memory.tags, "duplicate"],
        photos: memory.photos,
        isDraft: true
      });
      setToastMessage({ text: "Memory successfully duplicated!" });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Memory
  const handleDeleteMemory = (id: string) => {
    setDeletingMemoryId(id);
  };

  const confirmDeleteMemory = async () => {
    if (!deletingMemoryId) return;
    try {
      const res = await deleteMemory(deletingMemoryId);
      if (res.success) {
        setToastMessage({ text: "Memory flower successfully removed from your garden." });
      }
    } catch (err) {
      console.error("Deletion error:", err);
      setToastMessage({ text: "Failed to delete memory.", isError: true });
    } finally {
      setDeletingMemoryId(null);
    }
  };

  // Update Security settings
  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySuccess("");
    if (!adminPass && !viewerPass) {
      setToastMessage({ text: "Please enter a passcode to update.", isError: true });
      return;
    }
    const payload: any = {};
    if (adminPass) payload.passwordHash = adminPass;
    if (viewerPass) payload.viewerPasswordHash = viewerPass;

    try {
      await API.updateSettings(payload);
      setAdminPass("");
      setViewerPass("");
      setSecuritySuccess("Passcodes updated successfully!");
      setToastMessage({ text: "Passcodes updated successfully! Your garden remains secure." });
    } catch (err) {
      console.error(err);
      setToastMessage({ text: "Failed to update security passcodes.", isError: true });
    }
  };

  // JSON Export / Backup helper
  const handleExportBackup = async () => {
    try {
      const data = await API.exportBackup();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `bloom_diary_backup_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const res = await API.restoreBackup(parsed);
        if (res.success) {
          setToastMessage({ text: "Backup restored successfully! Welcome back to your garden." });
          queryClient.invalidateQueries(); // Refresh everything
        }
      } catch (err) {
        setToastMessage({ text: "Failed to restore backup: Invalid JSON structure.", isError: true });
      }
    };
    reader.readAsText(file);
  };

  // Logged-in view
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 pt-4 pb-28">
      {/* Upper Status row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white/5 p-4 rounded-3xl border border-white/10 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-violet-500/20 flex items-center justify-center border border-white/10 shrink-0">
            {session.role === "admin" ? <Pencil className="w-5 h-5 text-pink-400" /> : <Flower2 className="w-5 h-5 text-pink-400" />}
          </div>
          <div>
            <h3 className={`text-sm font-black ${theme.textPrimary}`}>
              {session.username}
            </h3>
            <p className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {session.role === "admin" ? "Administrator" : "Viewer"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {(!isIOS || deferredPrompt) && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-black transition-all active:scale-95 text-pink-400"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          )}

          <button
            onClick={async () => {
              const res = await requestAndInitPushNotifications();
              if (res.success) setToastMessage({ text: "Push notifications successfully enabled!" });
              else setToastMessage({ text: res.error || "Please allow notifications in browser settings.", isError: true });
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-black transition-all active:scale-95 text-pink-400"
          >
            <Bell className="w-3.5 h-3.5" />
            Enable Notifications
          </button>

          <button
            id="logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-500/25 bg-red-500/10 hover:bg-red-500/15 text-red-400 text-xs font-black transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* Settings Navigation Sub-Tabs */}
      <div className="flex gap-1.5 border-b border-white/15 pb-3 mb-6 overflow-x-auto select-none scrollbar-none">
        {session.role !== null && (
          <button
            id="subtab-dashboard"
            onClick={() => setActiveSubTab("dashboard")}
            className={`px-4.5 py-2 rounded-full text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
              activeSubTab === "dashboard"
                ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-500/15"
                : `bg-white/5 border ${theme.border} ${theme.textSecondary} hover:${theme.textPrimary}`
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Write Entry
          </button>
        )}
        
        <button
          id="subtab-themes"
          onClick={() => setActiveSubTab("themes")}
          className={`px-4.5 py-2 rounded-full text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
            activeSubTab === "themes"
              ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-500/15"
              : `bg-white/5 border ${theme.border} ${theme.textSecondary} hover:${theme.textPrimary}`
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          App Themes
        </button>

        {session.role !== null && (
          <button
            id="subtab-memories"
            onClick={() => setActiveSubTab("memories")}
            className={`px-4.5 py-2 rounded-full text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
              activeSubTab === "memories"
                ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-500/15"
                : `bg-white/5 border ${theme.border} ${theme.textSecondary} hover:${theme.textPrimary}`
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Media Inventory
          </button>
        )}

        <button
          id="subtab-security"
          onClick={() => setActiveSubTab("security")}
          className={`px-4.5 py-2 rounded-full text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
            activeSubTab === "security"
              ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-500/15"
              : `bg-white/5 border ${theme.border} ${theme.textSecondary} hover:${theme.textPrimary}`
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Security & Backup
        </button>
      </div>

      {/* Sub-Tab Contents */}
      <div className="min-h-[400px]">
        {/* SUBTAB 1: WRITE ENTRY DASHBOARD */}
        {activeSubTab === "dashboard" && session.role !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl p-4 sm:p-6 ${theme.card} ${theme.shadow} border ${theme.border} space-y-6`}
          >
            <div className="flex justify-between items-center pb-4 border-b border-white/10 gap-3">
              <h3 className={`text-base font-black ${theme.textPrimary} flex items-center gap-2`}>
                <Sparkles className="w-4 h-4 text-pink-400" />
                {editingMemory ? "Edit Memory Blossom" : "Plant a New Memory Flower"}
              </h3>
              {editingMemory && (
                <button
                  id="cancel-edit-btn"
                  onClick={() => {
                    setEditingMemory(null);
                    setFormDate(new Date().toISOString().split("T")[0]);
                    setFormTitle("");
                    setFormNote("");
                    setFormFlower("rose");
                    setFormMood("peaceful");
                    setFormWeather("sunny");
                    setFormMusic("");
                    setFormTags("");
                    setFormPhotos([]);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black ${theme.textSecondary} bg-white/5 border ${theme.border} hover:bg-white/10 transition-colors cursor-pointer`}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none focus:border-pink-500 transition-colors ${theme.textPrimary}`}
                  />
                </div>
                <div>
                  <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>Memory Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Capture the heart of this moment..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none focus:border-pink-500 transition-colors placeholder-gray-500 ${theme.textPrimary}`}
                  />
                </div>
              </div>

              {/* Note Editor */}
              <div>
                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>Sweet Note</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Pour your feelings and stories here. Tell me everything..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className={`w-full px-4 py-3 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none focus:border-pink-500 transition-colors leading-relaxed font-sans placeholder-gray-500 ${theme.textPrimary}`}
                />
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>Select Flower</label>
                  <select
                    value={formFlower}
                    onChange={(e) => setFormFlower(e.target.value)}
                    className={`w-full px-3 py-2.5 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none text-gray-800 dark:text-gray-200 focus:border-pink-500`}
                  >
                    {Object.entries(FLOWERS).map(([fId, fObj]) => (
                      <option key={fId} value={fId} className="bg-neutral-900 text-white">
                        {fObj.name} ({fObj.emotion})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>Mood</label>
                  <select
                    value={formMood}
                    onChange={(e) => setFormMood(e.target.value)}
                    className={`w-full px-3 py-2.5 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none text-gray-800 dark:text-gray-200 focus:border-pink-500`}
                  >
                    <option value="peaceful" className="bg-neutral-900 text-white">Peaceful</option>
                    <option value="joyful" className="bg-neutral-900 text-white">Joyful</option>
                    <option value="nostalgic" className="bg-neutral-900 text-white">Nostalgic</option>
                    <option value="romantic" className="bg-neutral-900 text-white">Romantic</option>
                    <option value="grateful" className="bg-neutral-900 text-white">Grateful</option>
                    <option value="calm" className="bg-neutral-900 text-white">Calm</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>Weather</label>
                  <select
                    value={formWeather}
                    onChange={(e) => setFormWeather(e.target.value)}
                    className={`w-full px-3 py-2.5 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none text-gray-800 dark:text-gray-200 focus:border-pink-500`}
                  >
                    <option value="sunny" className="bg-neutral-900 text-white">Sunny</option>
                    <option value="rainy" className="bg-neutral-900 text-white">Rainy</option>
                    <option value="cloudy" className="bg-neutral-900 text-white">Cloudy</option>
                    <option value="snowy" className="bg-neutral-900 text-white">Snowy</option>
                    <option value="windy" className="bg-neutral-900 text-white">Windy</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>Soundtrack</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunset Lover"
                    value={formMusic}
                    onChange={(e) => setFormMusic(e.target.value)}
                    className={`w-full px-3 py-2.5 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none focus:border-pink-500 transition-colors placeholder-gray-500 ${theme.textPrimary}`}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. date-night, warm-cocoa, beach"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none focus:border-pink-500 transition-colors placeholder-gray-500 ${theme.textPrimary}`}
                />
              </div>

              {/* Premium Drag & Drop Uploader */}
              <div className="space-y-3">
                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-0.5`}>Photos</label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                    dragActive 
                      ? "border-pink-500 bg-pink-500/10" 
                      : `border-white/10 hover:border-pink-500/60 bg-white/5`
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="mx-auto w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-pink-400" />
                  </div>
                  <p className={`text-xs font-bold ${theme.textPrimary}`}>
                    Drag and drop photos here, or <span className="text-pink-400">browse</span>
                  </p>
                  <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">Max 10MB per image</p>
                </div>

                {/* Previews Grid */}
                <AnimatePresence>
                  {formPhotos.length > 0 && (
                    <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} className="flex flex-wrap gap-2.5 pt-2">
                      {formPhotos.map((p, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden shadow-md border border-white/10 group">
                          <img src={p} alt="upload preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit panel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="checkbox-draft"
                    checked={formDraft}
                    onChange={(e) => setFormDraft(e.target.checked)}
                    className="w-4.5 h-4.5 rounded-lg border-white/20 text-pink-500 bg-white/5 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <label htmlFor="checkbox-draft" className={`text-xs font-semibold ${theme.textSecondary} cursor-pointer select-none`}>
                    Save as Draft (Private, doesn't bloom on Calendar)
                  </label>
                </div>

                <button
                  id="submit-memory-btn"
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-white font-black text-xs uppercase tracking-wider bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {editingMemory ? "Update Blossom" : "Plant Memory"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* SUBTAB 2: THEME SELECTOR */}
        {activeSubTab === "themes" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className={`rounded-3xl p-4 sm:p-6 ${theme.card} border ${theme.border} ${theme.shadow} space-y-6`}>
              <div>
                <h3 className={`text-base font-black ${theme.textPrimary}`}>
                  Choose Garden Vibe
                </h3>
                <p className={`text-xs ${theme.textSecondary} mt-0.5`}>
                  Shift the emotional atmosphere of your diary instantly.
                </p>
              </div>

              {/* Auto Cycle Card */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                <div>
                  <span className={`text-xs font-black ${theme.textPrimary} flex items-center gap-1.5`}>
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    Daily Dynamic Theme Cycle
                  </span>
                  <p className={`text-[10px] ${theme.textSecondary} mt-1 leading-relaxed`}>
                    Automatically cycles through Rapunzel, Barbie, Oswald, and all 17 premium styles day-by-day!
                  </p>
                </div>
                <button
                  onClick={onToggleAutoCycle}
                  style={{ width:46, height:26, padding:"3px" }}
                  className={`relative flex items-center rounded-full cursor-pointer transition-colors duration-300 shrink-0 ${
                    autoCycle ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-gray-700'
                  }`}
                >
                  <motion.div
                    layout
                    className="bg-white w-5 h-5 rounded-full shadow-md"
                    animate={{ x: autoCycle ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 35 }}
                  />
                </button>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(THEMES).map(([tName, tObj]) => {
                  const isSelected = selectedThemeName === tName;
                  
                  return (
                    <button
                      key={tName}
                      id={`theme-btn-${tName}`}
                      onClick={() => onChangeTheme(tName as ThemeType)}
                      className={`group rounded-2xl p-4 border text-left cursor-pointer transition-all duration-300 hover:scale-[1.015] ${tObj.bg} ${tObj.border} ${tObj.shadow} ${
                        isSelected 
                          ? "ring-2 ring-pink-500 ring-offset-2 dark:ring-offset-black" 
                          : "opacity-85 hover:opacity-100"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className={`text-xs font-black ${tObj.textPrimary}`}>{tObj.name}</span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Theme Colors Preview */}
                      <div className="flex gap-1.5">
                        <div className={`w-6 h-6 rounded-lg ${tObj.card} border ${tObj.border} shadow-sm shrink-0`} />
                        <div className={`w-6 h-6 rounded-lg ${tObj.accent} border ${tObj.border} shadow-sm shrink-0`} />
                        {tObj.bgImage ? (
                          <div 
                            className="w-6 h-6 rounded-lg border border-white/20 bg-cover bg-center shrink-0 shadow-sm" 
                            style={{ backgroundImage: `url(${tObj.bgImage})` }} 
                          />
                        ) : (
                          <div className={`w-6 h-6 rounded-lg ${tObj.accentLight} border ${tObj.border} flex items-center justify-center text-xs shrink-0 shadow-sm`}>
                            <Flower2 className="w-3 h-3 text-pink-400" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBTAB 3: MEDIA & MEMORIES INVENTORY */}
        {activeSubTab === "memories" && session.role !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl p-4 sm:p-6 ${theme.card} ${theme.shadow} border ${theme.border} space-y-5`}
          >
            <div>
              <h3 className={`text-base font-black ${theme.textPrimary}`}>
                Memory Inventory
              </h3>
              <p className={`text-xs ${theme.textSecondary} mt-0.5`}>
                View, duplicate, edit, or delete items inside your garden sanctuary.
              </p>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1.5 custom-scrollbar">
              {memories.map((m) => {
                const flower = FLOWERS[m.flowerId];
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${theme.border} bg-white/5 transition-all hover:bg-white/10`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0`}>
                        {flower && <Flower2 className={`w-5 h-5 ${flower.iconColor}`} />}
                      </span>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-black ${theme.textPrimary} flex items-center gap-2 truncate`}>
                          {m.title}
                          {m.isDraft && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase tracking-wider">
                              Draft
                            </span>
                          )}
                        </h4>
                        <p className={`text-[10px] ${theme.textSecondary} font-semibold mt-1 flex items-center gap-1`}>
                          <Calendar className="w-3 h-3 inline" /> {m.date} | <Tag className="w-3 h-3 inline" /> {flower?.name} | {m.photos.length} Photos
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      {/* Edit */}
                      <button
                        id={`edit-memory-${m.id}`}
                        onClick={() => startEditMemory(m)}
                        className={`p-2 ${theme.textSecondary} hover:text-pink-400 hover:bg-pink-500/10 rounded-xl cursor-pointer transition-colors active:scale-90`}
                        title="Edit memory"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        id={`duplicate-memory-${m.id}`}
                        onClick={() => handleDuplicateMemory(m)}
                        className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl cursor-pointer transition-colors active:scale-90"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        id={`delete-memory-${m.id}`}
                        onClick={() => handleDeleteMemory(m.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors active:scale-90"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* SUBTAB 4: SECURITY & BACKUPS */}
        {activeSubTab === "security" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Custom Greeting Override (Admin only) */}
            {session.role === "admin" && (
              <div className={`rounded-3xl p-4 sm:p-6 ${theme.card} ${theme.shadow} border ${theme.border} space-y-5`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                  </div>
                  <div>
                    <h3 className={`text-base font-black ${theme.textPrimary}`}>
                      Sanctuary Greeting Override
                    </h3>
                    <p className={`text-xs ${theme.textSecondary} mt-0.5`}>
                      Set an optional custom greeting or status message to be displayed on the main dashboard card. Leave blank to show the time-based greeting and dynamic AI romantic quotes.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateGreeting} className="space-y-4">
                  <div>
                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>
                      Greeting / Status Override (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Good night sweetheart, thinking of you always"
                      value={greetingInput}
                      onChange={(e) => setGreetingInput(e.target.value)}
                      className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none focus:border-pink-500 transition-colors placeholder-gray-500 ${theme.textPrimary}`}
                    />
                  </div>

                  {greetingSuccess && (
                    <p className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {greetingSuccess}
                    </p>
                  )}

                  <button
                    id="update-greeting-btn"
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-wider bg-gradient-to-r from-pink-500 to-violet-500 shadow-md active:scale-95 transition-transform cursor-pointer"
                  >
                    Update Greeting
                  </button>
                </form>
              </div>
            )}

            {/* Passcode Updates */}
            {session.role === "admin" && (
              <div className={`rounded-3xl p-4 sm:p-6 ${theme.card} ${theme.shadow} border ${theme.border} space-y-5`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4 text-pink-400" />
                  </div>
                  <div>
                    <h3 className={`text-base font-black ${theme.textPrimary}`}>
                      Security Passcodes
                    </h3>
                    <p className={`text-xs ${theme.textSecondary} mt-0.5`}>
                      Update access gates for both Admin (You) and Viewer (Her).
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateSecurity} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>
                        Admin Passcode
                      </label>
                      <input
                        type="password"
                        placeholder="Enter new admin code"
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                        className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none focus:border-pink-500 transition-colors placeholder-gray-500 ${theme.textPrimary}`}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-wider block mb-1.5`}>
                        Viewer Passcode (Her)
                      </label>
                      <input
                        type="password"
                        placeholder="Enter new viewer code"
                        value={viewerPass}
                        onChange={(e) => setViewerPass(e.target.value)}
                        className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} bg-white/5 outline-none focus:border-pink-500 transition-colors placeholder-gray-500 ${theme.textPrimary}`}
                      />
                    </div>
                  </div>

                  {securitySuccess && (
                    <p className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {securitySuccess}
                    </p>
                  )}

                  <button
                    id="update-passcodes-btn"
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-wider bg-gradient-to-r from-pink-500 to-violet-500 shadow-md active:scale-95 transition-transform cursor-pointer"
                  >
                    Update Passcodes
                  </button>
                </form>
              </div>
            )}

            {/* Backups Export & Restore */}
            <div className={`rounded-3xl p-4 sm:p-6 ${theme.card} ${theme.shadow} border ${theme.border} space-y-5`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <FileCode className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${theme.textPrimary}`}>
                    Backup & Portability
                  </h3>
                  <p className={`text-xs ${theme.textSecondary} mt-0.5`}>
                    Keep your memories safe forever by exporting database archives.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  id="export-backup-btn"
                  onClick={handleExportBackup}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl border ${theme.border} bg-white/5 text-xs font-black shadow-sm cursor-pointer hover:bg-white/10 transition-colors text-pink-400`}
                >
                  <FileCode className="w-4 h-4" />
                  Export JSON Backup
                </button>

                {session.role === "admin" && (
                  <label className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl border ${theme.border} bg-white/5 text-xs font-black shadow-sm cursor-pointer hover:bg-white/10 transition-colors text-emerald-400`}>
                    <Upload className="w-4 h-4" />
                    Restore Database
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 right-6 z-50"
          >
            <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border text-xs font-bold ${
              toastMessage.isError 
                ? "bg-red-500/10 text-red-400 border-red-500/25 backdrop-blur-md" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 backdrop-blur-md"
            }`}>
              <span>{toastMessage.isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}</span>
              <span>{toastMessage.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Memory Confirmation Modal */}
      <AnimatePresence>
        {deletingMemoryId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className={`w-full max-w-sm rounded-[28px] p-6 ${theme.card} border ${theme.border} ${theme.shadow} space-y-4`}
            >
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className={`text-base font-black ${theme.textPrimary}`}>
                  Remove memory flower?
                </h3>
                <p className={`text-xs ${theme.textSecondary} leading-relaxed`}>
                  This action is permanent. This flower and all of its photos will be removed from your garden sanctuary forever.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  id="cancel-delete-memory-btn"
                  onClick={() => setDeletingMemoryId(null)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl border ${theme.border} ${theme.textSecondary} active:scale-95 transition-transform`}
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-memory-btn"
                  onClick={confirmDeleteMemory}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl active:scale-95 transition-transform"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
