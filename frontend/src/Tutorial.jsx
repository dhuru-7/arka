/**
 * Tutorial.jsx — Guided Onboarding Overlay
 * 
 * Steps:
 *  1 = Spotlight on prompt box ("Type your idea here!")
 *  2 = Loading (no spotlight) — handled by parent
 *  3 = Spotlight on the "Show all diagrams" button
 *  4 = Diagram picker is open (no spotlight)
 *  5 = Diagram is loading in the arena (no spotlight)
 *  6 = Spotlight on the diagram and Agent button + "Got it" card
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MousePointer2 } from './googleIcons';
import './Tutorial.css';

const STEP_CONFIG = {
  1: {
    selectors: ['.prompt-box-main'],
    text: '✨ Type your first diagram idea here!',
    hint: 'Press Enter to send',
    hintKbd: 'Enter',
    position: 'bottom',
    padding: 12,
  },
  3: {
    selectors: ['.show-all-header-btn'],
    text: 'Click Show all diagrams to explore every available diagram type.',
    hint: null,
    position: 'bottom',
    padding: 8,
  },
  6: {
    selectors: ['.mermaid-render-target', '.chat-toggle-btn'],
    text: 'Your diagram is ready! Use the Agent to refine it, or click Got it to finish the tutorial.',
    hint: null,
    position: 'center',
    padding: 8,
  }
};

const springTransition = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
  mass: 0.8,
};

const Tutorial = ({ step, onGotIt }) => {
  const [spotlightRects, setSpotlightRects] = useState([]);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const rafRef = useRef(null);

  const config = STEP_CONFIG[step];

  // Track the spotlight targets' positions
  const updateSpotlights = useCallback(() => {
    if (!config?.selectors) {
      console.log("[Tutorial Debug] No selectors defined for step:", step);
      setSpotlightRects([]);
      return;
    }
    
    const rects = [];
    for (const selector of config.selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        const pad = config.padding || 8;
        console.log(`[Tutorial Debug] Step ${step} - Found ${selector}:`, {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        rects.push({
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          selector
        });
      } else {
        console.log(`[Tutorial Debug] Step ${step} - Selector NOT found: ${selector}`);
      }
    }
    setSpotlightRects(rects);
  }, [config, step]);

  useEffect(() => {
    updateSpotlights();

    // Poll for elements (handles dynamic appearance and transitions)
    const interval = setInterval(updateSpotlights, 150);

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateSpotlights);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateSpotlights, step]);

  if (step === 2 || step === 4 || step === 5) return null;
  if (!config) return null;

  const getTooltipStyle = () => {
    if (spotlightRects.length === 0) return { opacity: 0 };
    
    // Keep the completion card clear of the diagram and Agent button.
    if (step === 6) {
      return {
        position: 'fixed',
        left: '1.5rem',
        bottom: '1.5rem',
        zIndex: 10001,
        maxWidth: '440px',
        width: '90%'
      };
    }

    // Single element positioning
    const r = spotlightRects[0];
    const gap = 16;
    const tooltipWidth = 340; // max-width of .tutorial-tooltip
    const margin = 16;

    let effectivePosition = config.position;
    // Auto flip top/bottom
    if (effectivePosition === 'bottom' && (r.top + r.height + gap + 160) > window.innerHeight) {
      effectivePosition = 'top';
    }

    // Horizontal clamping to prevent viewport overflow
    let leftVal = r.left + r.width / 2;
    const halfWidth = tooltipWidth / 2;
    if (leftVal - halfWidth < margin) {
      leftVal = halfWidth + margin;
    } else if (leftVal + halfWidth > window.innerWidth - margin) {
      leftVal = window.innerWidth - halfWidth - margin;
    }

    switch (effectivePosition) {
      case 'bottom':
        return {
          top: r.top + r.height + gap,
          left: leftVal,
          transform: 'translateX(-50%)',
        };
      case 'top':
        return {
          bottom: window.innerHeight - r.top + gap,
          left: leftVal,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: r.top + r.height / 2,
          right: window.innerWidth - r.left + gap,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          top: r.top + r.height / 2,
          left: r.left + r.width + gap,
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
        {/* SVG Mask Backdrop */}
        <svg
          className="tutorial-svg-mask"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 9998
          }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {spotlightRects.map((r, idx) => (
                <rect
                  key={idx}
                  x={r.left}
                  y={r.top}
                  width={r.width}
                  height={r.height}
                  rx={12}
                  ry={12}
                  fill="black"
                />
              ))}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.55)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Pulsing Outline Rings on elements */}
        {spotlightRects.map((r, idx) => (
          <motion.div
            key={idx}
            className="tutorial-spotlight"
            style={{
              top: r.top,
              left: r.left,
              width: r.width,
              height: r.height,
              borderRadius: '0.75rem',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          />
        ))}

        {/* Tooltip Card (Steps 1 and 3) OR completion card (Step 6) */}
        <motion.div
          className="tutorial-tooltip"
          style={getTooltipStyle()}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springTransition, delay: 0.15 }}
        >
          {step === 6 ? (
            /* Step 6: Got It Card */
            <div className="tutorial-final-card" style={{ boxShadow: 'none' }}>
              <div className="tutorial-final-icon">
                <Check size={28} />
              </div>
              <h2 className="tutorial-final-title">You're all set! 🎉</h2>
              <p className="tutorial-final-subtitle">
                Your diagram is ready. The canvas and Agent button are highlighted.
              </p>

              <div className="tutorial-tips-list">
                <div className="tutorial-tip-item">
                  <span className="tutorial-tip-icon">
                    <MousePointer2 size={15} />
                  </span>
                  <div className="tutorial-tip-text">
                    <strong>Click on nodes</strong>
                    <span>Double-click nodes directly on the canvas to edit text, shapes, and colors manually.</span>
                  </div>
                </div>

                <div className="tutorial-tip-item">
                  <span className="tutorial-tip-icon">💬</span>
                  <div className="tutorial-tip-text">
                    <strong>Agent</strong>
                    <span>Use the Agent button in the top right to refine the diagram or add nodes.</span>
                  </div>
                </div>
              </div>

              <button className="tutorial-got-it-btn" onClick={onGotIt}>
                <Check size={18} /> Got it!
              </button>
            </div>
          ) : (
            /* Steps 1 and 3: Tooltip Bubble */
            <div className="tutorial-tooltip-card">
              <div className="tutorial-step-badge">
                {[1, 3, 6].map((s) => (
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
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Tutorial;
