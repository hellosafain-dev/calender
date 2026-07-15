/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Lock, LogOut, Check, Sparkles, Image as ImageIcon, Upload, Save, Trash2, Copy, FileCode, Sliders, Palette, Calendar, Eye, FileText, Music, CloudSun, UserCheck, RefreshCw, X, Download } from "lucide-react";
import { Memory, ThemeType } from "../types.js";
import { ThemeConfig, THEMES, FLOWERS } from "../lib/themes.js";
import { API, Session } from "../lib/api.js";

interface SettingsPageProps {
  memories: Memory[];
  onRefreshMemories: () => void;
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
  onRefreshMemories,
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
  // Authentication Passcode State
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

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
      alert("To install Bloom Diary on iOS: tap the 'Share' icon at the bottom of Safari and select 'Add to Home Screen'.");
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("App is either already installed, or your browser doesn't support automatic installation. Try 'Add to Home Screen' in your browser menu!");
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

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (preSelectedDate) {
      setFormDate(preSelectedDate);
    }
  }, [preSelectedDate]);

  // Handle Authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;
    setAuthLoading(true);
    setAuthError("");
    
    try {
      const result = await API.login(passcode);
      if (result.success && result.role) {
        onLoginSuccess({ role: result.role, username: result.username || null });
        setPasscode("");
      } else {
        setAuthError(result.error || "Incorrect credentials");
      }
    } catch (err) {
      console.error(err);
      setAuthError("Failed to connect to authentication server.");
    } finally {
      setAuthLoading(false);
    }
  };

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
        const res = await API.updateMemory(editingMemory.id, payload);
        if (res.success) {
          setEditingMemory(null);
          setToastMessage({ text: "Memory blossom successfully updated in your garden!" });
        }
      } else {
        await API.createMemory(payload);
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
      onRefreshMemories();
    } catch (err) {
      console.error(err);
      setToastMessage({ text: "Failed to save memory blossom.", isError: true });
    }
  };

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

  // Duplicate Memory
  const handleDuplicateMemory = async (memory: Memory) => {
    try {
      const duplicateDate = `${memory.date}-dup`; // Let user change the date later
      await API.createMemory({
        date: duplicateDate,
        title: `${memory.title} (Copy)`,
        note: memory.note,
        flowerId: memory.flowerId,
        mood: memory.mood,
        weather: memory.weather,
        music: memory.music,
        tags: [...memory.tags, "duplicate"],
        photos: memory.photos,
        isDraft: true // Default to draft to prevent double timelines
      });
      onRefreshMemories();
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
      const res = await API.deleteMemory(deletingMemoryId);
      if (res.success) {
        onRefreshMemories();
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
          setToastMessage({ text: "Database restored successfully! Your memories have blossomed." });
          onRefreshMemories();
        }
      } catch (err) {
        setToastMessage({ text: "Failed to restore backup: Invalid JSON structure.", isError: true });
      }
    };
    reader.readAsText(file);
  };

  // Gated Entrance Lockscreen UI
  if (!session.role) {
    return (
      <div className="w-full max-w-md mx-auto px-4 pt-16 pb-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className={`rounded-3xl p-6 ${theme.card} ${theme.shadow} border text-center space-y-6`}
        >
          <div className={`mx-auto w-16 h-16 rounded-full ${theme.accentLight} flex items-center justify-center border ${theme.border} shadow-inner`}>
            <Lock className={`w-6 h-6 ${theme.accentText}`} />
          </div>

          <div className="space-y-1">
            <h2 className={`text-2xl font-bold font-sans ${theme.textPrimary}`}>
              Private Sanctuary
            </h2>
            <p className={`text-xs ${theme.textSecondary} px-4 leading-relaxed`}>
              Bloom Diary is completely private. Please enter your passcode to access this digital garden.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl border ${theme.border} ${theme.card} text-center text-sm tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-transparent placeholder-neutral-400 dark:placeholder-neutral-600 ${theme.textPrimary}`}
              />
            </div>

            {authError && (
              <p className="text-[11px] font-semibold text-red-500 animate-pulse">
                ⚠️ {authError}
              </p>
            )}

            <button
              id="login-btn"
              type="submit"
              disabled={authLoading}
              className={`w-full py-3 rounded-2xl text-white font-bold text-sm ${theme.accent} ${theme.accentHover} shadow-sm transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-1.5`}
            >
              {authLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Enter Garden
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Logged-in view
  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-32">
      {/* Upper Status row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white/40 p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">
            {session.role === "admin" ? "✍️" : "🌸"}
          </div>
          <div>
            <h3 className={`text-sm font-bold ${theme.textPrimary}`}>
              {session.username}
            </h3>
            <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wider">
              Connected as {session.role === "admin" ? "Administrator" : "Viewer"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(!isIOS || deferredPrompt) && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
          )}

          <button
            id="logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Settings Navigation Sub-Tabs */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 mb-6 overflow-x-auto select-none">
        {session.role !== null && (
          <button
            id="subtab-dashboard"
            onClick={() => setActiveSubTab("dashboard")}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === "dashboard"
                ? `${theme.accent} text-white shadow-sm`
                : `${theme.textSecondary} hover:${theme.textPrimary}`
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Write Entry
          </button>
        )}
        
        <button
          id="subtab-themes"
          onClick={() => setActiveSubTab("themes")}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
            activeSubTab === "themes"
              ? `${theme.accent} text-white shadow-sm`
              : `${theme.textSecondary} hover:${theme.textPrimary}`
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          App Themes
        </button>

        {session.role !== null && (
          <button
            id="subtab-memories"
            onClick={() => setActiveSubTab("memories")}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === "memories"
                ? `${theme.accent} text-white shadow-sm`
                : `${theme.textSecondary} hover:${theme.textPrimary}`
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Media & Memories
          </button>
        )}

        <button
          id="subtab-security"
          onClick={() => setActiveSubTab("security")}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
            activeSubTab === "security"
              ? `${theme.accent} text-white shadow-sm`
              : `${theme.textSecondary} hover:${theme.textPrimary}`
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
            className={`rounded-3xl p-6 ${theme.card} ${theme.shadow} border`}
          >
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className={`text-xl font-bold font-sans ${theme.textPrimary}`}>
                {editingMemory ? "Edit Memory Blossom" : "Plant a New Memory Flower"}
              </h3>
              {editingMemory && (
                <button
                  id="cancel-edit-btn"
                  onClick={() => {
                    setEditingMemory(null);
                    setFormTitle("");
                    setFormNote("");
                    setFormFlower("rose");
                    setFormMood("peaceful");
                    setFormWeather("sunny");
                    setFormMusic("");
                    setFormTags("");
                    setFormPhotos([]);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold ${theme.textSecondary} bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer`}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} ${theme.card} focus:ring-2 focus:ring-pink-500/20 outline-none transition-all`}
                  />
                </div>
                <div>
                  <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>Memory Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Short title capturing the moment..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} ${theme.card} focus:ring-2 focus:ring-pink-500/20 outline-none transition-all`}
                  />
                </div>
              </div>

              {/* Note / Markdown Editor */}
              <div>
                <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>Sweet Note</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tell our story here..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className={`w-full px-4 py-3 text-xs rounded-xl border ${theme.border} ${theme.card} focus:ring-2 focus:ring-pink-500/20 outline-none transition-all leading-relaxed font-sans`}
                />
              </div>

              {/* Attributes: Flower selection, Mood, Weather */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>Select Flower</label>
                  <select
                    value={formFlower}
                    onChange={(e) => setFormFlower(e.target.value)}
                    className={`w-full px-3 py-2.5 text-xs rounded-xl border ${theme.border} ${theme.card} outline-none`}
                  >
                    {Object.entries(FLOWERS).map(([fId, fObj]) => (
                      <option key={fId} value={fId}>
                        {fObj.emoji} {fObj.name} ({fObj.emotion})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>Mood</label>
                  <select
                    value={formMood}
                    onChange={(e) => setFormMood(e.target.value)}
                    className={`w-full px-3 py-2.5 text-xs rounded-xl border ${theme.border} ${theme.card} outline-none`}
                  >
                    <option value="peaceful">Peaceful 🌸</option>
                    <option value="joyful">Joyful 🌻</option>
                    <option value="nostalgic">Nostalgic 🕰️</option>
                    <option value="romantic">Romantic 💖</option>
                    <option value="grateful">Grateful 🙏</option>
                    <option value="calm">Calm 🤍</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>Weather</label>
                  <select
                    value={formWeather}
                    onChange={(e) => setFormWeather(e.target.value)}
                    className={`w-full px-3 py-2.5 text-xs rounded-xl border ${theme.border} ${theme.card} outline-none`}
                  >
                    <option value="sunny">Sunny ☀️</option>
                    <option value="rainy">Rainy 🌧️</option>
                    <option value="cloudy">Cloudy ☁️</option>
                    <option value="snowy">Snowy ❄️</option>
                    <option value="windy">Windy 💨</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>Soundtrack</label>
                  <input
                    type="text"
                    placeholder="e.g. Lofi Café"
                    value={formMusic}
                    onChange={(e) => setFormMusic(e.target.value)}
                    className={`w-full px-3 py-2.5 text-xs rounded-xl border ${theme.border} ${theme.card} outline-none`}
                  />
                </div>
              </div>

              {/* Tags, separated by comma */}
              <div>
                <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. surprise, anniversary, twilight"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} ${theme.card} outline-none`}
                />
              </div>

              {/* Photo Upload: Drag & Drop + File selection */}
              <div>
                <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>Upload Photos</label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    dragActive 
                      ? "border-pink-500 bg-pink-50/50 dark:bg-pink-900/10" 
                      : `${theme.border} hover:border-pink-300 ${theme.card}`
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
                  <Upload className={`w-8 h-8 ${theme.textSecondary} mx-auto mb-3`} />
                  <p className={`text-xs ${theme.textSecondary}`}>
                    Drag and drop your photos here, or <span className={`${theme.accentText} font-bold`}>browse</span>
                  </p>
                  <p className="text-[10px] opacity-60 mt-1">Supports PNG, JPEG up to 10MB</p>
                </div>

                {/* Previews */}
                {formPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {formPhotos.map((p, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden shadow border border-neutral-200 dark:border-neutral-700 group">
                        <img src={p} alt="upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="checkbox-draft"
                    checked={formDraft}
                    onChange={(e) => setFormDraft(e.target.checked)}
                    className="rounded border-gray-300 text-pink-500 focus:ring-pink-300"
                  />
                  <label htmlFor="checkbox-draft" className="text-xs font-semibold text-gray-600 cursor-pointer">
                    Save as Draft (Private, not on Calendar)
                  </label>
                </div>

                <button
                  id="submit-memory-btn"
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl text-white font-bold text-xs ${theme.accent} ${theme.accentHover} shadow-lg shadow-pink-500/20 cursor-pointer flex items-center gap-2 transition-all active:scale-95`}
                >
                  <Save className="w-4 h-4" />
                  {editingMemory ? "Update Blossom" : "Plant Memory"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* SUBTAB 2: THEME SELECTOR (Both roles can view) */}
        {activeSubTab === "themes" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className={`rounded-3xl p-6 ${theme.card} border ${theme.shadow}`}>
              <h3 className={`text-xl font-bold font-sans mb-1 ${theme.textPrimary}`}>
                Choose Garden Vibe
              </h3>
              <p className={`text-xs ${theme.textSecondary} mb-6`}>
                Shift the emotional ambiance of Bloom Diary instantly.
              </p>

              {/* Dynamic Auto Cycle Toggle */}
              <div className="flex items-center justify-between p-4 mb-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-neutral-200/20 dark:border-neutral-800/40">
                <div className="pr-4">
                  <span className={`text-xs font-bold ${theme.textPrimary} flex items-center gap-1.5`}>
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    Daily Dynamic Theme Cycle
                  </span>
                  <p className={`text-[10px] ${theme.textSecondary} mt-0.5 leading-normal`}>
                    Automatically cycle through Rapunzel, Barbie, Oswald, and all 17 themes day-by-day!
                  </p>
                </div>
                <button
                  onClick={onToggleAutoCycle}
                  className={`w-10 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 shrink-0 ${
                    autoCycle ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <motion.div
                    layout
                    className="bg-white w-5 h-5 rounded-full shadow-md"
                    animate={{ x: autoCycle ? 16 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(THEMES).map(([tName, tObj]) => {
                  const isSelected = selectedThemeName === tName;
                  
                  return (
                    <button
                      key={tName}
                      id={`theme-btn-${tName}`}
                      onClick={() => onChangeTheme(tName as ThemeType)}
                      className={`rounded-2xl p-4 border text-left cursor-pointer transition-all hover:scale-[1.02] ${tObj.bg} ${tObj.border} ${tObj.shadow} ${
                        isSelected 
                          ? "ring-2 ring-pink-500 ring-offset-2 dark:ring-offset-black" 
                          : "opacity-90 hover:opacity-100"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-xs font-bold ${tObj.textPrimary}`}>{tObj.name}</span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Little preview block */}
                      <div className="flex gap-1.5 mt-2">
                        <div className={`w-5 h-5 rounded-md ${tObj.card} border ${tObj.border}`} />
                        <div className={`w-5 h-5 rounded-md ${tObj.accent} border ${tObj.border}`} />
                        {tObj.bgImage ? (
                          <div 
                            className="w-5 h-5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-cover bg-center shrink-0" 
                            style={{ backgroundImage: `url(${tObj.bgImage})` }} 
                          />
                        ) : (
                          <div className={`w-5 h-5 rounded-md ${tObj.accentLight} border ${tObj.border} flex items-center justify-center text-[10px]`}>
                            🌸
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

        {/* SUBTAB 3: MEDIA & MEMORIES LIST */}
        {activeSubTab === "memories" && session.role !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl p-6 ${theme.card} ${theme.shadow} border`}
          >
            <h3 className={`text-xl font-bold font-sans mb-4 ${theme.textPrimary}`}>
              Memory Inventory & Actions
            </h3>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {memories.map((m) => {
                const flower = FLOWERS[m.flowerId];
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl ${theme.accentLight} w-10 h-10 rounded-full flex items-center justify-center`}>
                        {flower?.emoji}
                      </span>
                      <div>
                        <h4 className={`text-xs font-bold ${theme.textPrimary} flex items-center gap-2`}>
                          {m.title}
                          {m.isDraft && (
                            <span className="bg-amber-100 text-amber-600 px-1.5 py-0.2 rounded text-[8px] font-semibold">
                              Draft
                            </span>
                          )}
                        </h4>
                        <p className={`text-[10px] ${theme.textSecondary} font-medium mt-0.5`}>
                          📅 {m.date} | 🏷️ {flower?.name} Flower | {m.photos.length} Photos
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {/* Edit */}
                      <button
                        id={`edit-memory-${m.id}`}
                        onClick={() => startEditMemory(m)}
                        className={`p-2 ${theme.textSecondary} hover:${theme.accentText} hover:${theme.accentLight} rounded-xl cursor-pointer transition-colors`}
                        title="Edit entry"
                      >
                        <Save className="w-4 h-4" />
                      </button>

                      {/* Duplicate */}
                      <button
                        id={`duplicate-memory-${m.id}`}
                        onClick={() => handleDuplicateMemory(m)}
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-500/10 rounded-xl cursor-pointer transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        id={`delete-memory-${m.id}`}
                        onClick={() => handleDeleteMemory(m.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
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
            {/* Passcode Updates */}
            {session.role === "admin" && (
              <div className={`rounded-3xl p-6 ${theme.card} ${theme.shadow} border`}>
                <h3 className={`text-lg font-bold font-sans mb-1 ${theme.textPrimary}`}>
                  Manage Passcodes
                </h3>
                <p className={`text-xs ${theme.textSecondary} mb-4`}>
                  Secure access for the Admin (You) and the Viewer (Her).
                </p>

                <form onSubmit={handleUpdateSecurity} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>
                        Admin Passcode
                      </label>
                      <input
                        type="password"
                        placeholder="New Admin passcode"
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                        className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} ${theme.card} outline-none transition-all ${theme.textPrimary}`}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-wider block mb-1`}>
                        Viewer Passcode (Her)
                      </label>
                      <input
                        type="password"
                        placeholder="New Viewer passcode"
                        value={viewerPass}
                        onChange={(e) => setViewerPass(e.target.value)}
                        className={`w-full px-4 py-2.5 text-xs rounded-xl border ${theme.border} ${theme.card} outline-none transition-all ${theme.textPrimary}`}
                      />
                    </div>
                  </div>

                  {securitySuccess && (
                    <p className="text-[10px] font-bold text-green-500">
                      ✅ {securitySuccess}
                    </p>
                  )}

                  <button
                    id="update-passcodes-btn"
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-white font-bold text-xs ${theme.accent} ${theme.accentHover} shadow cursor-pointer`}
                  >
                    Update Passcodes
                  </button>
                </form>
              </div>
            )}

            {/* Backups Export & Restore */}
            <div className={`rounded-3xl p-6 ${theme.card} ${theme.shadow} border`}>
              <h3 className={`text-lg font-bold font-sans mb-1 ${theme.textPrimary}`}>
                Backup & Portability
              </h3>
              <p className={`text-xs ${theme.textSecondary} mb-4`}>
                Download a JSON copy of all memories, flowers, and reminders to keep them safe forever.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  id="export-backup-btn"
                  onClick={handleExportBackup}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border ${theme.border} ${theme.card} text-xs font-bold shadow-sm cursor-pointer hover:opacity-90 transition-all ${theme.textPrimary}`}
                >
                  <FileCode className="w-4 h-4 text-pink-500" />
                  Export JSON Backup
                </button>

                {session.role === "admin" && (
                  <label className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border ${theme.border} ${theme.card} text-xs font-bold shadow-sm cursor-pointer hover:opacity-90 transition-all ${theme.textPrimary}`}>
                    <Upload className="w-4 h-4 text-green-500" />
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
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 animate-pulse">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border text-xs font-bold ${
            toastMessage.isError 
              ? "bg-red-50 text-red-600 border-red-200" 
              : "bg-green-50 text-green-700 border-green-200"
          }`}>
            <span>{toastMessage.isError ? "⚠️" : "✨"}</span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Delete Memory Confirmation Modal */}
      {deletingMemoryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-sm rounded-3xl p-6 ${theme.card} border border-pink-100/10 ${theme.shadow} space-y-4`}
          >
            <h3 className={`text-lg font-bold ${theme.textPrimary}`}>
              Dig up memory flower?
            </h3>
            <p className={`text-xs ${theme.textSecondary}`}>
              Are you sure you want to delete this memory? This action is permanent and will remove the flower from your garden forever.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                id="cancel-delete-memory-btn"
                onClick={() => setDeletingMemoryId(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-memory-btn"
                onClick={confirmDeleteMemory}
                className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer"
              >
                Delete Forever
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
