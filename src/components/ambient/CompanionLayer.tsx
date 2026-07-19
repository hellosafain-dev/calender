import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeConfig } from "../../lib/themes.js";

interface CompanionLayerProps {
  theme: ThemeConfig;
  isActive?: boolean;
}

type CompanionState = 'IDLE' | 'ACTION' | 'ATTENTION' | 'ROAMING' | 'HIDE';

export default function CompanionLayer({ theme, isActive = true }: CompanionLayerProps) {
  const [state, setState] = useState<CompanionState>('IDLE');
  const [pos, setPos] = useState({ x: -100, y: -100 }); // Default offscreen
  const [isInitialized, setIsInitialized] = useState(false);
  const [facingLeft, setFacingLeft] = useState(true);

  // Initialize default resting position
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPos({ x: window.innerWidth - 80, y: window.innerHeight - 120 });
      setIsInitialized(true);
    }
  }, []);

  // Main State Machine
  useEffect(() => {
    if (!isActive || !theme.companion || !isInitialized) return;

    let timeout: NodeJS.Timeout;

    const tick = () => {
      if (state === 'HIDE') return;

      if (state === 'IDLE') {
        // Stay idle for a bit, then either perform action or roam
        timeout = setTimeout(() => {
          const rand = Math.random();
          if (rand > 0.5) {
            setState('ROAMING');
          } else {
            setState('ACTION');
          }
        }, Math.random() * 8000 + 4000); // 4-12 seconds
      } else if (state === 'ACTION') {
        // Action lasts 2-4s
        timeout = setTimeout(() => {
          setState('IDLE');
        }, Math.random() * 2000 + 2000);
      } else if (state === 'ATTENTION') {
        timeout = setTimeout(() => {
          setState('IDLE');
        }, 3000);
      } else if (state === 'ROAMING') {
        // Find a target
        const targets = Array.from(document.querySelectorAll('[data-companion-target="true"]'));
        let newX = window.innerWidth - 80;
        let newY = window.innerHeight - 120;
        
        if (targets.length > 0) {
          // Pick random target
          const target = targets[Math.floor(Math.random() * targets.length)];
          const rect = target.getBoundingClientRect();
          // Sit on top of it, slightly offset
          newX = rect.left + rect.width / 2 - 30 + (Math.random() * 20 - 10);
          newY = rect.top - 50; 
          
          // Clamp to screen
          newX = Math.max(10, Math.min(newX, window.innerWidth - 70));
          newY = Math.max(10, Math.min(newY, window.innerHeight - 70));
        } else {
          // Default corner if no targets
          newX = window.innerWidth - 80 + (Math.random() * 20 - 10);
          newY = window.innerHeight - 120;
        }

        // Determine facing direction based on movement
        if (newX < pos.x) setFacingLeft(true);
        else if (newX > pos.x) setFacingLeft(false);

        setPos({ x: newX, y: newY });

        // Wait for travel time
        timeout = setTimeout(() => {
          setState('IDLE');
        }, 2000); // 2s travel time
      }
    };

    tick();
    return () => clearTimeout(timeout);
  }, [state, isActive, theme.companion, isInitialized, pos.x]);

  // Scroll detection - hide briefly while scrolling so it doesn't get stuck on moving elements
  useEffect(() => {
    if (!isActive || !theme.companion) return;

    let scrollTimeout: NodeJS.Timeout;
    let isScrolling = false;

    const handleScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
        setState('HIDE');
      }
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        setState('IDLE');
      }, 1000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isActive, theme.companion]);

  if (!isActive || !theme.companion || !isInitialized) return null;

  const { type, tint } = theme.companion;

  return (
    <AnimatePresence>
      {state !== 'HIDE' && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{
            x: { type: "spring", stiffness: 60, damping: 15 },
            y: { type: "spring", stiffness: 60, damping: 15 },
            opacity: { duration: 0.3 }
          }}
          className="fixed top-0 left-0 z-50 pointer-events-auto cursor-pointer filter drop-shadow-md"
          onClick={() => setState('ATTENTION')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.svg
            width="60"
            height="60"
            viewBox="0 0 100 100"
            animate={
              state === 'ACTION'
                ? { rotate: [0, -10, 10, -10, 10, 0], y: [0, -10, 0] }
                : state === 'ATTENTION'
                ? { scale: [1, 1.2, 1], rotate: [0, -5, 0] }
                : state === 'ROAMING' && (type === 'butterfly' || type === 'robin' || type === 'bluebird')
                ? { y: [0, -15, 5, -10, 0] } // flying bob
                : { y: [0, -3, 0] } // idle breathing
            }
            style={{
              scaleX: facingLeft ? 1 : -1 // Flip horizontally based on movement
            }}
            transition={{
              duration: state === 'ACTION' ? 0.8 : state === 'ATTENTION' ? 0.5 : state === 'ROAMING' ? 2 : 4,
              repeat: state === 'IDLE' ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            {/* ── OCTOPUS (Oswald) ── */}
            {type === 'octopus' && (
              <>
                <motion.g
                  animate={
                    state === 'ACTION' || state === 'ROAMING'
                      ? { y: [0, -5, 0], scaleY: [1, 1.1, 1], transition: { repeat: Infinity, duration: 1 } }
                      : { y: [0, -2, 0], transition: { repeat: Infinity, duration: 3 } }
                  }
                >
                  <circle cx="50" cy="45" r="25" fill={tint} opacity="0.9" />
                  {/* Tentacles */}
                  <path d="M 30 60 Q 20 80 15 90" stroke={tint} strokeWidth="6" strokeLinecap="round" fill="none" />
                  <path d="M 40 65 Q 35 85 35 95" stroke={tint} strokeWidth="8" strokeLinecap="round" fill="none" />
                  <path d="M 50 68 Q 50 90 55 95" stroke={tint} strokeWidth="8" strokeLinecap="round" fill="none" />
                  <path d="M 60 65 Q 70 85 75 90" stroke={tint} strokeWidth="6" strokeLinecap="round" fill="none" />
                </motion.g>
                <circle cx="40" cy="45" r="4" fill="#111" />
                <circle cx="60" cy="45" r="4" fill="#111" />
              </>
            )}

            {/* ── BUTTERFLY (Butterfly Sanctuary) ── */}
            {type === 'butterfly' && (
              <motion.g
                animate={
                  state === 'ACTION' || state === 'ROAMING'
                    ? { scaleX: [1, 0.2, 1], transition: { repeat: Infinity, duration: 0.2 } } // fast flap
                    : state === 'ATTENTION'
                    ? { scaleX: [1, 0.4, 1], transition: { repeat: Infinity, duration: 0.4 } }
                    : { scaleX: [1, 0.8, 1], transition: { repeat: Infinity, duration: 2, delay: 1 } } // slow flap
                }
              >
                {/* Left Wing */}
                <path d="M 50 50 Q 20 10 10 40 Q 20 60 50 50" fill={tint} opacity="0.8" />
                <path d="M 50 50 Q 20 90 15 70 Q 30 60 50 50" fill={tint} opacity="0.6" />
                {/* Right Wing */}
                <path d="M 50 50 Q 80 10 90 40 Q 80 60 50 50" fill={tint} opacity="0.8" />
                <path d="M 50 50 Q 80 90 85 70 Q 70 60 50 50" fill={tint} opacity="0.6" />
                {/* Body */}
                <ellipse cx="50" cy="50" rx="3" ry="12" fill="#111" />
                <path d="M 48 40 Q 40 30 42 25" stroke="#111" strokeWidth="2" fill="none" />
                <path d="M 52 40 Q 60 30 58 25" stroke="#111" strokeWidth="2" fill="none" />
              </motion.g>
            )}

            {/* ── DEFAULT / BIRDS / ANIMALS ── */}
            {type !== 'octopus' && type !== 'butterfly' && (
              <>
                <circle cx="50" cy="60" r="30" fill={tint} opacity="0.9" />
                
                {type === 'fox' || type === 'squirrel' ? (
                  <>
                    <polygon points="25,40 20,15 40,35" fill={tint} />
                    <polygon points="75,40 80,15 60,35" fill={tint} />
                  </>
                ) : type === 'owl' ? (
                  <>
                    <polygon points="30,40 35,25 45,35" fill={tint} />
                    <polygon points="70,40 65,25 55,35" fill={tint} />
                  </>
                ) : (
                   <polygon points="80,50 95,45 80,65" fill={tint} /> // Tail
                )}

                <motion.g
                  animate={
                    state === 'ACTION'
                      ? { scaleY: [1, 0.1, 1], transition: { repeat: 2, duration: 0.2 } }
                      : { scaleY: [1, 0.1, 1], transition: { delay: 3, repeat: Infinity, repeatDelay: 4, duration: 0.2 } }
                  }
                >
                  <circle cx="35" cy="55" r="4" fill="#111" />
                  <circle cx="65" cy="55" r="4" fill="#111" />
                </motion.g>

                {type === 'robin' || type === 'seagull' || type === 'bluebird' || type === 'owl' ? (
                  <polygon points="45,60 55,60 50,70" fill="#F59E0B" />
                ) : (
                  <circle cx="50" cy="65" r="3" fill="#111" />
                )}
              </>
            )}
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
