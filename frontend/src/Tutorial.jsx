/**
 * Tutorial.jsx — Guided Onboarding Overlay
 * 
 * Steps:
 *  1 = Spotlight on prompt box ("Type your idea here!")
 *  2 = Loading (no spotlight) — handled by parent
 *  3 = Spotlight on info (ℹ) button on diagram card
 *  4 = Spotlight on Proceed button
 *  5 = Loading (no spotlight) — handled by parent
 *  6 = Final overlay with tips + "Got It!" button
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MousePointer2 } from './googleIcons';
import './Tutorial.css';

const STEP_CONFIG = {
  1: {
    selector: '.prompt-box-main',
    text: '✨ Type your first diagram idea here!',
    hint: 'Press Enter to send',
    hintKbd: 'Enter',
    position: 'bottom',
    allowClickThrough: true,
  },
  3: {
    selector: '.card-info-btn.btn-info-aqua',
    text: 'Click here to see why our AI agent suggested this diagram type',
    hint: null,
    position: 'left',
    allowClickThrough: true,
    padding: 6,
  },
  4: {
    selector: '.confirm-btn',
    text: 'Great! Now click Proceed to generate your diagram 🚀',
    hint: null,
    position: 'top',
    allowClickThrough: true,
    padding: 8,
  },
};

const springTransition = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
  mass: 0.8,
};

const Tutorial = ({ step, onSkip }) => {
  const [spotlightRect, setSpotlightRect] = useState(null);
  const observerRef = useRef(null);
  const rafRef = useRef(null);

  const config = STEP_CONFIG[step];

  // Track the spotlight target's position
  const updateSpotlight = useCallback(() => {
    if (!config?.selector) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(config.selector);
    if (!el) {
      setSpotlightRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const pad = config.padding || 12;
    setSpotlightRect({
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    });
  }, [config]);

  useEffect(() => {
    updateSpotlight();

    // Poll for element appearance (handles dynamic rendering)
    const interval = setInterval(updateSpotlight, 200);

    // Watch for layout shifts
    const handleResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateSpotlight);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateSpotlight, step]);

  // Steps 2 and 5 are loading screens — no overlay needed
  if (step === 2 || step === 5) return null;

  // Step 6 is the final "Got It" screen
  if (step === 6) return null; // Rendered by TutorialFinalOverlay separately

  if (!config) return null;

  const getTooltipStyle = () => {
    if (!spotlightRect) return { opacity: 0 };

    const gap = 16;
    const tooltipHeight = 160; // approximate height of tooltip
    
    // Auto-flip: if bottom position would overflow, show on top instead
    let effectivePosition = config.position;
    if (effectivePosition === 'bottom' && (spotlightRect.top + spotlightRect.height + gap + tooltipHeight) > window.innerHeight) {
      effectivePosition = 'top';
    }

    switch (effectivePosition) {
      case 'bottom':
        return {
          top: spotlightRect.top + spotlightRect.height + gap,
          left: spotlightRect.left + spotlightRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'top':
        return {
          bottom: window.innerHeight - spotlightRect.top + gap,
          left: spotlightRect.left + spotlightRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: spotlightRect.top + spotlightRect.height / 2,
          right: window.innerWidth - spotlightRect.left + gap,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          top: spotlightRect.top + spotlightRect.height / 2,
          left: spotlightRect.left + spotlightRect.width + gap,
          transform: 'translateY(-50%)',
        };
      default:
        return {};
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="tutorial-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Dark backdrop without spotlight if element not found yet */}
        {!spotlightRect && <div className="tutorial-backdrop-fill" />}

        {/* Spotlight cutout */}
        {spotlightRect && (
          <>
            <motion.div
              className="tutorial-spotlight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                top: spotlightRect.top,
                left: spotlightRect.left,
                width: spotlightRect.width,
                height: spotlightRect.height,
              }}
              transition={springTransition}
            />

            {/* Tooltip */}
            <motion.div
              className="tutorial-tooltip"
              style={getTooltipStyle()}
              initial={{ opacity: 0, y: config.position === 'bottom' ? -10 : 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...springTransition, delay: 0.15 }}
            >
              <div className="tutorial-tooltip-card">
                <div className="tutorial-step-badge">
                  {[1, 3, 4].map((s, i) => (
                    <span
                      key={s}
                      className={`tutorial-step-dot ${s === step ? 'active' : s < step ? 'done' : ''}`}
                    />
                  ))}
                  <span style={{ marginLeft: '0.25rem' }}>
                    Step {step === 1 ? 1 : step === 3 ? 2 : 3} of 3
                  </span>
                </div>
                <p className="tutorial-tooltip-text">{config.text}</p>
                {config.hint && (
                  <div className="tutorial-tooltip-hint">
                    {config.hintKbd ? (
                      <>
                        Press <kbd>{config.hintKbd}</kbd> to continue
                      </>
                    ) : (
                      config.hint
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export const TutorialFinalOverlay = ({ onGotIt }) => {
  return (
    <motion.div
      className="tutorial-final-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="tutorial-final-card"
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26, delay: 0.1 }}
      >
        <motion.div
          className="tutorial-final-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.3 }}
        >
          <Check size={28} />
        </motion.div>

        <h2 className="tutorial-final-title">You're all set! 🎉</h2>
        <p className="tutorial-final-subtitle">
          Your trial diagram is ready. Here are a few tips to get the most out of ARKA:
        </p>

        <div className="tutorial-tips-list">
          <motion.div
            className="tutorial-tip-item"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="tutorial-tip-icon">
              <MousePointer2 size={15} />
            </span>
            <div className="tutorial-tip-text">
              <strong>Click on nodes</strong>
              <span>Edit text, change shapes, and update colors</span>
            </div>
          </motion.div>

          <motion.div
            className="tutorial-tip-item"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <span className="tutorial-tip-icon">💬</span>
            <div className="tutorial-tip-text">
              <strong>Use the Agent chat</strong>
              <span>Ask AI to refine, add nodes, or change the diagram</span>
            </div>
          </motion.div>

          <motion.div
            className="tutorial-tip-item"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <span className="tutorial-tip-icon">📥</span>
            <div className="tutorial-tip-text">
              <strong>Export your work</strong>
              <span>Download as PNG, SVG, or copy the Mermaid code</span>
            </div>
          </motion.div>

          <motion.div
            className="tutorial-tip-item"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <span className="tutorial-tip-icon">⚙️</span>
            <div className="tutorial-tip-text">
              <strong>Add your API key</strong>
              <span>Go to Settings to configure your own key for unlimited use</span>
            </div>
          </motion.div>
        </div>

        <motion.button
          className="tutorial-got-it-btn"
          onClick={onGotIt}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          whileTap={{ scale: 0.96 }}
        >
          <Check size={18} /> Got it!
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default Tutorial;
