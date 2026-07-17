import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { ThemeConfig } from "../lib/themes.js";
import { API, Session } from "../lib/api.js";

interface LockScreenProps {
  theme: ThemeConfig;
  onLoginSuccess: (session: Session) => void;
}

export default function LockScreen({ theme, onLoginSuccess }: LockScreenProps) {
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

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

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 25 }}
        className={`w-full max-w-md rounded-3xl p-8 ${theme.card} ${theme.shadow} border ${theme.border} backdrop-blur-xl text-center space-y-6 relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-violet-500/5 pointer-events-none" />
        
        <div className={`mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-violet-500 flex items-center justify-center shadow-lg relative z-10`}>
          <Lock className="w-6 h-6 text-white" />
        </div>

        <div className="space-y-2 relative z-10">
          <h2 className={`text-2xl font-black tracking-tight ${theme.textPrimary}`}>
            Private Sanctuary
          </h2>
          <p className={`text-xs ${theme.textSecondary} px-2 leading-relaxed`}>
            Bloom Diary is protected with end-to-end security. Please enter your passcode to access this digital garden.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <input
            type="password"
            required
            autoFocus
            placeholder="••••••••"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className={`w-full px-4 py-3.5 rounded-2xl border ${theme.border} bg-white/5 text-center text-lg tracking-widest font-black focus:outline-none focus:border-pink-500 transition-colors placeholder-neutral-500 ${theme.textPrimary}`}
          />

          {authError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] font-bold text-red-400 flex items-center gap-1 justify-center">
              <AlertTriangle className="w-3 h-3" /> {authError}
            </motion.p>
          )}

          <button
            id="login-btn"
            type="submit"
            disabled={authLoading}
            className={`w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 shadow-lg active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2`}
          >
            {authLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
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
