import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Trash2, Plus, User, Download, Palette, MousePointer2, Move, Undo, Redo, ZoomIn, ZoomOut, Maximize, X, Check, ChevronDown, Image, FileCode, FileText, FileImage, Code2, Plus as PlusIcon, Minus, Cpu, Square, Circle, Hexagon, Database, MessageSquare, Box, ArrowRight, Eye, RefreshCw, Loader2, Brush } from './googleIcons';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileDropdown from './ProfileDropdown';
import { auth, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { agentGenerateDiagram, agentInterpretRefine, agentRefineDiagram, agentSuggestImprovements, getProviderLabel } from './aiService';
import './Arena.css';

let mermaidPromise = null;
const loadMermaid = () => {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (mermaidPromise) return mermaidPromise;
  mermaidPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
    script.onload = () => resolve(window.mermaid);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return mermaidPromise;
};

const TEMPLATES = {
  midnight: {
    name: 'Midnight', preview: 'linear-gradient(135deg, #0f0f23, #1a1a3e, #2d1b69)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: true, background: 'transparent', primaryColor: '#7c3aed', primaryTextColor: '#f0e6ff', primaryBorderColor: '#a78bfa', secondaryColor: '#1e1b4b', secondaryTextColor: '#c4b5fd', secondaryBorderColor: '#6d28d9', tertiaryColor: '#312e81', tertiaryTextColor: '#e0e7ff', tertiaryBorderColor: '#818cf8', lineColor: '#a78bfa', textColor: '#e2e8f0', mainBkg: '#1e1b4b', nodeBorder: '#7c3aed', clusterBkg: 'rgba(124,58,237,0.08)', clusterBorder: 'rgba(167,139,250,0.3)', titleColor: '#c4b5fd', edgeLabelBackground: '#1e1b4b', nodeTextColor: '#f0e6ff', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#1e1b4b',
        pieTitleTextColor: '#e2e8f0', pieSectionTextColor: '#ffffff', pieLegendTextColor: '#c4b5fd', pie1: '#7c3aed', pie2: '#f59e0b', pie3: '#10b981', pie4: '#ef4444', pie5: '#06b6d4', pie6: '#f97316', pie7: '#ec4899', pie8: '#84cc16',
        xyChart: { backgroundColor: 'transparent', titleColor: '#c4b5fd', xAxisLabelColor: '#a78bfa', yAxisLabelColor: '#a78bfa', xAxisTitleColor: '#c4b5fd', yAxisTitleColor: '#c4b5fd', xAxisTickColor: '#6d28d9', yAxisTickColor: '#6d28d9', xAxisLineColor: '#4c1d95', yAxisLineColor: '#4c1d95', plotColorPalette: '#7c3aed,#a78bfa,#c4b5fd,#8b5cf6,#6d28d9' }
      }
    }
  },
  obsidian: {
    name: 'Obsidian', preview: 'linear-gradient(135deg, #000000, #141414, #262626)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: true, background: 'transparent', primaryColor: '#262626', primaryTextColor: '#ffffff', primaryBorderColor: '#525252', secondaryColor: '#171717', secondaryTextColor: '#e5e5e5', secondaryBorderColor: '#404040', tertiaryColor: '#0a0a0a', tertiaryTextColor: '#d4d4d4', tertiaryBorderColor: '#262626', lineColor: '#737373', textColor: '#ffffff', mainBkg: '#171717', nodeBorder: '#404040', clusterBkg: 'rgba(38,38,38,0.3)', clusterBorder: 'rgba(82,82,82,0.5)', titleColor: '#ffffff', edgeLabelBackground: '#171717', nodeTextColor: '#ffffff', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#171717',
        pieTitleTextColor: '#ffffff', pieSectionTextColor: '#000000', pieLegendTextColor: '#e5e5e5', pie1: '#ffffff', pie2: '#f59e0b', pie3: '#10b981', pie4: '#ef4444', pie5: '#3b82f6', pie6: '#ec4899', pie7: '#a78bfa', pie8: '#06b6d4',
        xyChart: { backgroundColor: 'transparent', titleColor: '#ffffff', xAxisLabelColor: '#737373', yAxisLabelColor: '#737373', xAxisTitleColor: '#ffffff', yAxisTitleColor: '#ffffff', xAxisTickColor: '#525252', yAxisTickColor: '#525252', xAxisLineColor: '#262626', yAxisLineColor: '#262626', plotColorPalette: '#ffffff,#a3a3a3,#737373,#525252,#262626' }
      }
    }
  },
  emerald: {
    name: 'Emerald City', preview: 'linear-gradient(135deg, #064e3b, #059669, #34d399)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: true, background: 'transparent', primaryColor: '#059669', primaryTextColor: '#ecfdf5', primaryBorderColor: '#34d399', secondaryColor: '#064e3b', secondaryTextColor: '#6ee7b7', secondaryBorderColor: '#10b981', tertiaryColor: '#022c22', tertiaryTextColor: '#a7f3d0', tertiaryBorderColor: '#047857', lineColor: '#34d399', textColor: '#ecfdf5', mainBkg: '#064e3b', nodeBorder: '#10b981', clusterBkg: 'rgba(5,150,105,0.1)', clusterBorder: 'rgba(52,211,153,0.3)', titleColor: '#34d399', edgeLabelBackground: '#064e3b', nodeTextColor: '#ffffff', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#064e3b',
        pieTitleTextColor: '#ecfdf5', pieSectionTextColor: '#022c22', pieLegendTextColor: '#6ee7b7', pie1: '#10b981', pie2: '#f59e0b', pie3: '#ef4444', pie4: '#3b82f6', pie5: '#a78bfa', pie6: '#ec4899', pie7: '#06b6d4', pie8: '#f97316',
        xyChart: { backgroundColor: 'transparent', titleColor: '#10b981', xAxisLabelColor: '#6ee7b7', yAxisLabelColor: '#6ee7b7', xAxisTitleColor: '#10b981', yAxisTitleColor: '#10b981', xAxisTickColor: '#047857', yAxisTickColor: '#047857', xAxisLineColor: '#022c22', yAxisLineColor: '#022c22', plotColorPalette: '#10b981,#34d399,#6ee7b7,#a7f3d0,#059669' }
      }
    }
  },
  crimson: {
    name: 'Crimson Tide', preview: 'linear-gradient(135deg, #450a0a, #991b1b, #ef4444)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: true, background: 'transparent', primaryColor: '#dc2626', primaryTextColor: '#fef2f2', primaryBorderColor: '#f87171', secondaryColor: '#7f1d1d', secondaryTextColor: '#fca5a5', secondaryBorderColor: '#ef4444', tertiaryColor: '#450a0a', tertiaryTextColor: '#fecaca', tertiaryBorderColor: '#b91c1c', lineColor: '#f87171', textColor: '#fef2f2', mainBkg: '#7f1d1d', nodeBorder: '#ef4444', clusterBkg: 'rgba(220,38,38,0.1)', clusterBorder: 'rgba(248,113,113,0.3)', titleColor: '#f87171', edgeLabelBackground: '#7f1d1d', nodeTextColor: '#ffffff', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#7f1d1d',
        pieTitleTextColor: '#fef2f2', pieSectionTextColor: '#450a0a', pieLegendTextColor: '#fca5a5', pie1: '#ef4444', pie2: '#3b82f6', pie3: '#f59e0b', pie4: '#10b981', pie5: '#a78bfa', pie6: '#06b6d4', pie7: '#ec4899', pie8: '#84cc16',
        xyChart: { backgroundColor: 'transparent', titleColor: '#ef4444', xAxisLabelColor: '#fca5a5', yAxisLabelColor: '#fca5a5', xAxisTitleColor: '#ef4444', yAxisTitleColor: '#ef4444', xAxisTickColor: '#b91c1c', yAxisTickColor: '#b91c1c', xAxisLineColor: '#450a0a', yAxisLineColor: '#450a0a', plotColorPalette: '#ef4444,#f87171,#fca5a5,#fecaca,#dc2626' }
      }
    }
  },
  ocean: {
    name: 'Deep Ocean', preview: 'linear-gradient(135deg, #0f172a, #1e3a8a, #3b82f6)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: true, background: 'transparent', primaryColor: '#2563eb', primaryTextColor: '#eff6ff', primaryBorderColor: '#60a5fa', secondaryColor: '#1e3a8a', secondaryTextColor: '#93c5fd', secondaryBorderColor: '#3b82f6', tertiaryColor: '#0f172a', tertiaryTextColor: '#bfdbfe', tertiaryBorderColor: '#1d4ed8', lineColor: '#60a5fa', textColor: '#eff6ff', mainBkg: '#1e3a8a', nodeBorder: '#3b82f6', clusterBkg: 'rgba(37,99,235,0.1)', clusterBorder: 'rgba(96,165,250,0.3)', titleColor: '#60a5fa', edgeLabelBackground: '#1e3a8a', nodeTextColor: '#ffffff', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#1e3a8a',
        pieTitleTextColor: '#eff6ff', pieSectionTextColor: '#0f172a', pieLegendTextColor: '#93c5fd', pie1: '#3b82f6', pie2: '#f59e0b', pie3: '#ef4444', pie4: '#10b981', pie5: '#ec4899', pie6: '#a78bfa', pie7: '#06b6d4', pie8: '#f97316',
        xyChart: { backgroundColor: 'transparent', titleColor: '#3b82f6', xAxisLabelColor: '#93c5fd', yAxisLabelColor: '#93c5fd', xAxisTitleColor: '#3b82f6', yAxisTitleColor: '#3b82f6', xAxisTickColor: '#1d4ed8', yAxisTickColor: '#1d4ed8', xAxisLineColor: '#0f172a', yAxisLineColor: '#0f172a', plotColorPalette: '#3b82f6,#60a5fa,#93c5fd,#bfdbfe,#2563eb' }
      }
    }
  },
  amber: {
    name: 'Amber Glow', preview: 'linear-gradient(135deg, #451a03, #92400e, #f59e0b)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: true, background: 'transparent', primaryColor: '#f59e0b', primaryTextColor: '#fffbeb', primaryBorderColor: '#fbbf24', secondaryColor: '#78350f', secondaryTextColor: '#fde68a', secondaryBorderColor: '#d97706', tertiaryColor: '#451a03', tertiaryTextColor: '#fef3c7', tertiaryBorderColor: '#b45309', lineColor: '#fbbf24', textColor: '#fffbeb', mainBkg: '#78350f', nodeBorder: '#d97706', clusterBkg: 'rgba(245,158,11,0.1)', clusterBorder: 'rgba(251,191,36,0.3)', titleColor: '#fbbf24', edgeLabelBackground: '#78350f', nodeTextColor: '#ffffff', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#78350f',
        pieTitleTextColor: '#fffbeb', pieSectionTextColor: '#451a03', pieLegendTextColor: '#fde68a', pie1: '#f59e0b', pie2: '#3b82f6', pie3: '#ef4444', pie4: '#10b981', pie5: '#a78bfa', pie6: '#ec4899', pie7: '#06b6d4', pie8: '#84cc16',
        xyChart: { backgroundColor: 'transparent', titleColor: '#fbbf24', xAxisLabelColor: '#fde68a', yAxisLabelColor: '#fde68a', xAxisTitleColor: '#fbbf24', yAxisTitleColor: '#fbbf24', xAxisTickColor: '#b45309', yAxisTickColor: '#b45309', xAxisLineColor: '#451a03', yAxisLineColor: '#451a03', plotColorPalette: '#f59e0b,#fbbf24,#fde68a,#d97706,#b45309' }
      }
    }
  },
  slate: {
    name: 'Slate Steel', preview: 'linear-gradient(135deg, #0f172a, #334155, #64748b)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: true, background: 'transparent', primaryColor: '#475569', primaryTextColor: '#f8fafc', primaryBorderColor: '#94a3b8', secondaryColor: '#1e293b', secondaryTextColor: '#cbd5e1', secondaryBorderColor: '#64748b', tertiaryColor: '#0f172a', tertiaryTextColor: '#e2e8f0', tertiaryBorderColor: '#334155', lineColor: '#94a3b8', textColor: '#f8fafc', mainBkg: '#1e293b', nodeBorder: '#64748b', clusterBkg: 'rgba(71,85,105,0.1)', clusterBorder: 'rgba(148,163,184,0.3)', titleColor: '#94a3b8', edgeLabelBackground: '#1e293b', nodeTextColor: '#f8fafc', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#1e293b',
        pieTitleTextColor: '#f8fafc', pieSectionTextColor: '#0f172a', pieLegendTextColor: '#cbd5e1', pie1: '#64748b', pie2: '#f59e0b', pie3: '#ef4444', pie4: '#10b981', pie5: '#3b82f6', pie6: '#ec4899', pie7: '#a78bfa', pie8: '#06b6d4',
        xyChart: { backgroundColor: 'transparent', titleColor: '#94a3b8', xAxisLabelColor: '#cbd5e1', yAxisLabelColor: '#cbd5e1', xAxisTitleColor: '#94a3b8', yAxisTitleColor: '#94a3b8', xAxisTickColor: '#334155', yAxisTickColor: '#334155', xAxisLineColor: '#0f172a', yAxisLineColor: '#0f172a', plotColorPalette: '#64748b,#94a3b8,#cbd5e1,#475569,#334155' }
      }
    }
  },
  // ─── White BG friendly templates ───
  paper: {
    name: 'Paper Minimal', preview: 'linear-gradient(135deg, #ffffff, #f0f0f0, #e0e0e0)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: false, background: 'transparent', primaryColor: '#f4f4f5', primaryTextColor: '#000000', primaryBorderColor: '#a1a1aa', secondaryColor: '#ffffff', secondaryTextColor: '#3f3f46', secondaryBorderColor: '#d4d4d8', tertiaryColor: '#fafafa', tertiaryTextColor: '#27272a', tertiaryBorderColor: '#e4e4e7', lineColor: '#525252', textColor: '#000000', mainBkg: '#ffffff', nodeBorder: '#525252', clusterBkg: 'rgba(0,0,0,0.02)', clusterBorder: 'rgba(0,0,0,0.15)', titleColor: '#000000', edgeLabelBackground: '#ffffff', nodeTextColor: '#000000', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#ffffff',
        pieTitleTextColor: '#000000', pieSectionTextColor: '#ffffff', pieLegendTextColor: '#3f3f46', pie1: '#18181b', pie2: '#ef4444', pie3: '#3b82f6', pie4: '#f59e0b', pie5: '#10b981', pie6: '#a78bfa', pie7: '#ec4899', pie8: '#06b6d4',
        xyChart: { backgroundColor: 'transparent', titleColor: '#000000', xAxisLabelColor: '#3f3f46', yAxisLabelColor: '#3f3f46', xAxisTitleColor: '#000000', yAxisTitleColor: '#000000', xAxisTickColor: '#d4d4d8', yAxisTickColor: '#d4d4d8', xAxisLineColor: '#a1a1aa', yAxisLineColor: '#a1a1aa', plotColorPalette: '#000000,#3f3f46,#525252,#71717a,#a1a1aa' }
      }
    }
  },
  frost: {
    name: 'Frostbite', preview: 'linear-gradient(135deg, #e0f2fe, #bae6fd, #7dd3fc)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: false, background: 'transparent', primaryColor: '#38bdf8', primaryTextColor: '#ffffff', primaryBorderColor: '#0284c7', secondaryColor: '#e0f2fe', secondaryTextColor: '#0c4a6e', secondaryBorderColor: '#7dd3fc', tertiaryColor: '#f0f9ff', tertiaryTextColor: '#075985', tertiaryBorderColor: '#bae6fd', lineColor: '#0369a1', textColor: '#0f172a', mainBkg: '#e0f2fe', nodeBorder: '#0284c7', clusterBkg: 'rgba(56,189,248,0.08)', clusterBorder: 'rgba(2,132,199,0.25)', titleColor: '#0369a1', edgeLabelBackground: '#ffffff', nodeTextColor: '#0f172a', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#ffffff',
        pieTitleTextColor: '#0f172a', pieSectionTextColor: '#ffffff', pieLegendTextColor: '#0c4a6e', pie1: '#0ea5e9', pie2: '#ef4444', pie3: '#f59e0b', pie4: '#10b981', pie5: '#a78bfa', pie6: '#ec4899', pie7: '#f97316', pie8: '#84cc16',
        xyChart: { backgroundColor: 'transparent', titleColor: '#0f172a', xAxisLabelColor: '#0c4a6e', yAxisLabelColor: '#0c4a6e', xAxisTitleColor: '#0f172a', yAxisTitleColor: '#0f172a', xAxisTickColor: '#bae6fd', yAxisTickColor: '#bae6fd', xAxisLineColor: '#7dd3fc', yAxisLineColor: '#7dd3fc', plotColorPalette: '#0ea5e9,#38bdf8,#7dd3fc,#0284c7,#0369a1' }
      }
    }
  },
  blossom: {
    name: 'Sakura Blossom', preview: 'linear-gradient(135deg, #fce7f3, #fbcfe8, #f472b6)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: false, background: 'transparent', primaryColor: '#ec4899', primaryTextColor: '#ffffff', primaryBorderColor: '#be185d', secondaryColor: '#fce7f3', secondaryTextColor: '#831843', secondaryBorderColor: '#fbcfe8', tertiaryColor: '#fdf2f8', tertiaryTextColor: '#9d174d', tertiaryBorderColor: '#f9a8d4', lineColor: '#9d174d', textColor: '#111827', mainBkg: '#fce7f3', nodeBorder: '#be185d', clusterBkg: 'rgba(236,72,153,0.08)', clusterBorder: 'rgba(190,24,93,0.25)', titleColor: '#be185d', edgeLabelBackground: '#ffffff', nodeTextColor: '#111827', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#ffffff',
        pieTitleTextColor: '#111827', pieSectionTextColor: '#ffffff', pieLegendTextColor: '#831843', pie1: '#ec4899', pie2: '#3b82f6', pie3: '#f59e0b', pie4: '#10b981', pie5: '#ef4444', pie6: '#a78bfa', pie7: '#06b6d4', pie8: '#84cc16',
        xyChart: { backgroundColor: 'transparent', titleColor: '#111827', xAxisLabelColor: '#831843', yAxisLabelColor: '#831843', xAxisTitleColor: '#111827', yAxisTitleColor: '#111827', xAxisTickColor: '#f9a8d4', yAxisTickColor: '#f9a8d4', xAxisLineColor: '#fbcfe8', yAxisLineColor: '#fbcfe8', plotColorPalette: '#db2777,#ec4899,#f472b6,#be185d,#9d174d' }
      }
    }
  },
  mint: {
    name: 'Fresh Mint', preview: 'linear-gradient(135deg, #ccfbf1, #99f6e4, #2dd4bf)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: false, background: 'transparent', primaryColor: '#14b8a6', primaryTextColor: '#ffffff', primaryBorderColor: '#0f766e', secondaryColor: '#ccfbf1', secondaryTextColor: '#134e4a', secondaryBorderColor: '#99f6e4', tertiaryColor: '#f0fdfa', tertiaryTextColor: '#115e59', tertiaryBorderColor: '#5eead4', lineColor: '#0f766e', textColor: '#0f172a', mainBkg: '#ccfbf1', nodeBorder: '#0f766e', clusterBkg: 'rgba(20,184,166,0.08)', clusterBorder: 'rgba(15,118,110,0.25)', titleColor: '#0f766e', edgeLabelBackground: '#ffffff', nodeTextColor: '#0f172a', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#ffffff',
        pieTitleTextColor: '#0f172a', pieSectionTextColor: '#ffffff', pieLegendTextColor: '#134e4a', pie1: '#14b8a6', pie2: '#ef4444', pie3: '#f59e0b', pie4: '#3b82f6', pie5: '#a78bfa', pie6: '#ec4899', pie7: '#f97316', pie8: '#84cc16',
        xyChart: { backgroundColor: 'transparent', titleColor: '#0f172a', xAxisLabelColor: '#134e4a', yAxisLabelColor: '#134e4a', xAxisTitleColor: '#0f172a', yAxisTitleColor: '#0f172a', xAxisTickColor: '#99f6e4', yAxisTickColor: '#99f6e4', xAxisLineColor: '#5eead4', yAxisLineColor: '#5eead4', plotColorPalette: '#0d9488,#14b8a6,#2dd4bf,#0f766e,#115e59' }
      }
    }
  },
  lavender: {
    name: 'Lavender Haze', preview: 'linear-gradient(135deg, #f3e8ff, #e9d5ff, #c084fc)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: false, background: 'transparent', primaryColor: '#a855f7', primaryTextColor: '#ffffff', primaryBorderColor: '#7e22ce', secondaryColor: '#f3e8ff', secondaryTextColor: '#581c87', secondaryBorderColor: '#e9d5ff', tertiaryColor: '#faf5ff', tertiaryTextColor: '#6b21a8', tertiaryBorderColor: '#d8b4fe', lineColor: '#7e22ce', textColor: '#111827', mainBkg: '#f3e8ff', nodeBorder: '#7e22ce', clusterBkg: 'rgba(168,85,247,0.08)', clusterBorder: 'rgba(126,34,206,0.25)', titleColor: '#7e22ce', edgeLabelBackground: '#ffffff', nodeTextColor: '#111827', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#ffffff',
        pieTitleTextColor: '#111827', pieSectionTextColor: '#ffffff', pieLegendTextColor: '#581c87', pie1: '#a855f7', pie2: '#ef4444', pie3: '#f59e0b', pie4: '#10b981', pie5: '#3b82f6', pie6: '#ec4899', pie7: '#06b6d4', pie8: '#84cc16',
        xyChart: { backgroundColor: 'transparent', titleColor: '#111827', xAxisLabelColor: '#581c87', yAxisLabelColor: '#581c87', xAxisTitleColor: '#111827', yAxisTitleColor: '#111827', xAxisTickColor: '#d8b4fe', yAxisTickColor: '#d8b4fe', xAxisLineColor: '#e9d5ff', yAxisLineColor: '#e9d5ff', plotColorPalette: '#a855f7,#c084fc,#d8b4fe,#7e22ce,#6b21a8' }
      }
    }
  },
  terracotta: {
    name: 'Terracotta', preview: 'linear-gradient(135deg, #fef2f2, #fecaca, #f87171)',
    config: {
      theme: 'base', themeVariables: {
        darkMode: false, background: 'transparent', primaryColor: '#e11d48', primaryTextColor: '#ffffff', primaryBorderColor: '#9f1239', secondaryColor: '#fff1f2', secondaryTextColor: '#881337', secondaryBorderColor: '#fecdd3', tertiaryColor: '#fff1f2', tertiaryTextColor: '#9f1239', tertiaryBorderColor: '#fda4af', lineColor: '#9f1239', textColor: '#111827', mainBkg: '#fff1f2', nodeBorder: '#9f1239', clusterBkg: 'rgba(225,29,72,0.06)', clusterBorder: 'rgba(159,18,57,0.2)', titleColor: '#9f1239', edgeLabelBackground: '#ffffff', nodeTextColor: '#111827', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', labelBackground: '#ffffff',
        pieTitleTextColor: '#111827', pieSectionTextColor: '#ffffff', pieLegendTextColor: '#881337', pie1: '#e11d48', pie2: '#3b82f6', pie3: '#f59e0b', pie4: '#10b981', pie5: '#a78bfa', pie6: '#06b6d4', pie7: '#84cc16', pie8: '#f97316',
        xyChart: { backgroundColor: 'transparent', titleColor: '#111827', xAxisLabelColor: '#881337', yAxisLabelColor: '#881337', xAxisTitleColor: '#111827', yAxisTitleColor: '#111827', xAxisTickColor: '#fda4af', yAxisTickColor: '#fda4af', xAxisLineColor: '#fecdd3', yAxisLineColor: '#fecdd3', plotColorPalette: '#e11d48,#fb7185,#fda4af,#9f1239,#881337' }
      }
    }
  },
};

/* ─── Node colors for editing ─── */
const NODE_COLORS = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
];

/* ─── Custom Accurate Shape Icons (SVG) ─── */
const RoundedIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="6" ry="6" />
  </svg>
);
const StadiumIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="6" ry="6" />
  </svg>
);
const SubroutineIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" />
    <line x1="7" y1="5" x2="7" y2="19" />
    <line x1="17" y1="5" x2="17" y2="19" />
  </svg>
);
const ParallelogramIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 6L21 6L17 18L3 18L7 6Z" />
  </svg>
);
const TrapezoidIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6L18 6L22 18L2 18L6 6Z" />
  </svg>
);
const DecisionIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3.5L20.5 12L12 20.5L3.5 12L12 3.5Z" />
  </svg>
);
const BetaBadge = () => <span className="popup-beta-badge">Beta</span>;

const SHAPES = [
  { id: 'rect', label: 'Rectangle', icon: Square, wrap: (t) => `[${t}]` },
  { id: 'round', label: 'Rounded', icon: RoundedIcon, wrap: (t) => `(${t})` },
  { id: 'stadium', label: 'Stadium', icon: StadiumIcon, wrap: (t) => `([${t}])` },
  { id: 'subroutine', label: 'Subroutine', icon: SubroutineIcon, wrap: (t) => `[[${t}]]` },
  { id: 'diamond', label: 'Decision', icon: DecisionIcon, wrap: (t) => `{${t}}` },
  { id: 'hex', label: 'Hexagon', icon: Hexagon, wrap: (t) => `{{${t}}}` },
  { id: 'circle', label: 'Circle', icon: Circle, wrap: (t) => `((${t}))` },
  { id: 'database', label: 'Database', icon: Database, wrap: (t) => `[(${t})]` },
  { id: 'parallelogram', label: 'Parallel', icon: ParallelogramIcon, wrap: (t) => `[/${t}/]` },
  { id: 'trapezoid', label: 'Trapezoid', icon: TrapezoidIcon, wrap: (t) => `[/${t}\\]` },
];

const Arena = ({ prompt, diagramType, diagramId, onBack, onShowHistory }) => {
  const navigate = useNavigate();
  const [mermaidCode, setMermaidCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [pngBgChoice, setPngBgChoice] = useState(null);

  const [activeTemplate, setActiveTemplate] = useState('paper');

  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [renderError, setRenderError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isNavHovered, setIsNavHovered] = useState(false);

  // Refine state
  const [isRefineOpen, setIsRefineOpen] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isBrushing, setIsBrushing] = useState(false);
  const [brushPath, setBrushPath] = useState([]);
  const [selectedContext, setSelectedContext] = useState([]);
  const [interpretation, setInterpretation] = useState(null);
  const abortControllerRef = useRef(null);

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setIsRefining(false);
    if (!mermaidCode) {
      setAgentError('Generation was cancelled.');
      setAgentSteps(prev => [...prev, 'Generation cancelled by the user.']);
    }
  };

  // Suggestion Engine State
  const [suggestions, setSuggestions] = useState([]);
  const [currentSugIdx, setCurrentSugIdx] = useState(0);
  const [isSugLoading, setIsSugLoading] = useState(false);
  const [lastSuggestedCode, setLastSuggestedCode] = useState('');
  const [agentSteps, setAgentSteps] = useState([]);
  const [agentRepairLog, setAgentRepairLog] = useState([]);
  const [agentError, setAgentError] = useState('');

  // Vision Engine State
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  const [visionPrompt, setVisionPrompt] = useState('');
  const [originalVisionPrompt, setOriginalVisionPrompt] = useState('');
  const [isVisionLoading, setIsVisionLoading] = useState(false);


  // Node/Edge selection
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [editPopover, setEditPopover] = useState(null);

  // Edit states
  const [editText, setEditText] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editStrokeColor, setEditStrokeColor] = useState('');
  const [editShape, setEditShape] = useState('');
  const [edgeStyle, setEdgeStyle] = useState('solid');
  const [edgeColor, setEdgeColor] = useState('');

  // Code editor
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeEditorValue, setCodeEditorValue] = useState('');

  // Add-node feature
  const [addNodeTarget, setAddNodeTarget] = useState(null); // nodeId to connect from
  const [addNodeShape, setAddNodeShape] = useState('rect');
  const [addNodeText, setAddNodeText] = useState('');
  const [showAddNodeInput, setShowAddNodeInput] = useState(false);

  // Right sidebar mode: 'edit' or 'add'
  const [sidebarMode, setSidebarMode] = useState('edit');

  const handleVisionClick = async () => {
    setIsVisionModalOpen(true);
    if (!visionPrompt) {
      setIsVisionLoading(true);
      try {
        const res = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, diagramType })
        });
        const data = await res.json();
        if (data.polished_prompt) {
          setVisionPrompt(data.polished_prompt);
          setOriginalVisionPrompt(data.polished_prompt);
        }
      } catch (err) {
        console.error("Vision Error:", err);
      } finally {
        setIsVisionLoading(false);
      }
    }
  };

  const handleVisionRegenerate = async () => {
    if (!visionPrompt || visionPrompt === originalVisionPrompt) return;

    // Extract diagram type if possible
    const lines = visionPrompt.split('\n');
    let extractedType = diagramType;
    for (const line of lines.slice(0, 5)) {
      if (line.toLowerCase().startsWith('diagram type:')) {
        const typeStr = line.split(':')[1].trim().toLowerCase();
        const supported = ['flowchart', 'architecture', 'xy', 'pie', 'sequence', 'erDiagram', 'gantt'];
        if (supported.includes(typeStr)) {
          extractedType = typeStr;
        } else if (typeStr === 'er diagram') {
          extractedType = 'erDiagram';
        }
      }
    }

    setIsVisionLoading(true);
    try {
      // We'll reuse the logic from the main generation but pass the vision prompt
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: visionPrompt, diagramType: extractedType })
      });
      const data = await res.json();
      if (data.mermaid_code) {
        setMermaidCode(data.mermaid_code);
        setHistory([data.mermaid_code]);
        setHistoryIndex(0);
        setOriginalVisionPrompt(visionPrompt);
        setIsVisionModalOpen(false);
      }
    } catch (err) {
      console.error("Vision Regenerate Error:", err);
    } finally {
      setIsVisionLoading(false);
    }
  };

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderCounter = useRef(0);

  /* ─── Push to history helper ─── */
  const pushHistory = (newCode) => {
    const newHist = [...history.slice(0, historyIndex + 1), newCode];
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
    setMermaidCode(newCode);
  };

  /* ─── Generate diagram from API ─── */
  useEffect(() => {
    if (!diagramType) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let cancelled = false;

    const gen = async () => {
      setIsLoading(true);
      setRenderError(null);
      setAgentError('');
      setAgentSteps(['Starting the diagram agent...']);
      setAgentRepairLog([]);

      const savedCode = localStorage.getItem('arka_last_mermaid_code');
      const savedVision = localStorage.getItem('arka_vision_prompt');

      if (savedCode) {
        setMermaidCode(savedCode);
        setHistory([savedCode]);
        setHistoryIndex(0);
        setAgentSteps(['Loaded saved diagram.']);
        if (savedVision) {
          setVisionPrompt(savedVision);
          setOriginalVisionPrompt(savedVision);
        } else {
          setVisionPrompt('');
          setOriginalVisionPrompt('');
        }
        setIsLoading(false);
        return;
      }

      try {
        const byokResult = await agentGenerateDiagram(prompt, diagramType, abortController.signal);
        if (cancelled) return;

        if (byokResult && byokResult.mermaid_code) {
          const code = byokResult.mermaid_code;
          setMermaidCode(code);
          setHistory([code]);
          setHistoryIndex(0);
          setAgentSteps(byokResult.agent_steps || ['Agent generated the diagram.']);
          setAgentRepairLog(byokResult.repair_log || []);
          if (Array.isArray(byokResult.suggestions)) {
            setSuggestions(byokResult.suggestions);
            setCurrentSugIdx(0);
            setLastSuggestedCode(code);
          }
        } else {
          throw new Error('Empty response from AI model');
        }
      } catch (err) {
        if (cancelled || err.name === 'AbortError') return;
        console.error("Generation Error:", err);
        setAgentError(err.message || 'Agent generation failed.');
        setAgentSteps(prev => [...prev, 'Generation stopped before a valid diagram was produced.']);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    gen();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [prompt, diagramType, diagramId]);

  useEffect(() => {
    if (mermaidCode) {
      localStorage.setItem('arka_last_mermaid_code', mermaidCode);
      if (auth?.currentUser && db && diagramId) {
        setDoc(doc(db, 'users', auth.currentUser.uid, 'diagrams', diagramId), {
          prompt: prompt || '',
          visionPrompt: originalVisionPrompt || '',
          diagramType: diagramType || '',
          code: mermaidCode,
          updatedAt: serverTimestamp()
        }).catch(err => console.error("Firebase save error", err));
      }
    }
  }, [mermaidCode, prompt, diagramType, diagramId]);

  /* ─── Render Mermaid ─── */
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    if (!mermaidCode || isLoading) return;

    const render = async () => {
      setIsRendering(true);
      const tmpl = TEMPLATES[activeTemplate];
      document.querySelectorAll('[id^="dm-"]').forEach(el => {
        if (el.parentElement !== canvasRef.current) el.remove();
      });

      try {
        const mermaidApi = await loadMermaid();
        mermaidApi.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          ...tmpl.config,
          flowchart: { htmlLabels: true, curve: 'basis', padding: 15, nodeSpacing: 60, rankSpacing: 80, useMaxWidth: true },
          pie: { useMaxWidth: false, textPosition: 0.75 },
          sequence: { useMaxWidth: false, showSequenceNumbers: false, actorMargin: 80, mirrorActors: false, messageAlign: 'center', messageFontSize: 13, noteFontSize: 12, wrap: true },
          er: { useMaxWidth: false, layoutDirection: 'TB', entityPadding: 15, fontSize: 13 },
          gantt: { useMaxWidth: false, fontSize: 12, barHeight: 24, barGap: 6, topPadding: 50, sidePadding: 100, gridLineStartPadding: 35, numberSectionStyles: 4 },
        });

        if (canvasRef.current) canvasRef.current.innerHTML = '';
        renderCounter.current++;
        const id = `dm-${renderCounter.current}`;
        const { svg } = await mermaidApi.render(id, mermaidCode);

        if (canvasRef.current) {
          canvasRef.current.innerHTML = svg;
          setRenderError(null);
          const svgEl = canvasRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
            svgEl.removeAttribute('height');
            svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          }
          // Delay listener attachment to allow strict layout calculation
          setTimeout(() => {
            if (activeTool === 'select' && canvasRef.current) {
              attachInteractionListeners();
              canvasRef.current.querySelectorAll('.node').forEach(n => n.style.pointerEvents = 'auto');
              canvasRef.current.querySelectorAll('.edgePath').forEach(n => n.style.pointerEvents = 'auto');
            }
          }, 10);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        setRenderError(err.message || 'Render failed');
      } finally {
        setIsRendering(false);
      }
    };

    const t = setTimeout(render, 50);
    return () => clearTimeout(t);
  }, [mermaidCode, activeTemplate, isLoading, renderKey]);

  // Re-attach listeners when tool changes
  useEffect(() => {
    if (!isLoading && canvasRef.current) {
      const nodes = canvasRef.current.querySelectorAll('.node');
      nodes.forEach(n => {
        n.style.cursor = activeTool === 'select' ? 'pointer' : 'default';
        n.style.pointerEvents = activeTool === 'select' ? 'auto' : 'none';
      });
    }
  }, [activeTool, isLoading, mermaidCode]);

  const attachInteractionListeners = () => {
    if (!canvasRef.current) return;

    // Remove existing plus buttons
    canvasRef.current.querySelectorAll('.node-add-btn').forEach(b => b.remove());

    // Only attach interactive editing for diagram types that support it
    if (diagramType !== 'flowchart' && diagramType !== 'architecture') return;

    // Nodes
    canvasRef.current.querySelectorAll('.node').forEach(node => {
      node.style.cursor = 'pointer';
      node.onclick = (e) => {
        if (activeTool !== 'select') return;
        if (e.target.closest('.node-add-btn')) return;
        e.stopPropagation();
        handleNodeClick(node, e);
      };

      try {
        const bbox = node.getBBox();
        if (bbox && bbox.width) {
          const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
          fo.setAttribute('x', bbox.x + bbox.width / 2 - 11);
          fo.setAttribute('y', bbox.y + bbox.height - 11);
          fo.setAttribute('width', 22);
          fo.setAttribute('height', 22);
          fo.style.overflow = 'visible';

          const plusBtn = document.createElement('div');
          plusBtn.className = 'node-add-btn';
          plusBtn.innerHTML = '+';
          // reset bottom positioning since we positioned foreignObject directly
          plusBtn.style.position = 'relative';
          plusBtn.style.bottom = '0';
          plusBtn.style.left = '0';
          plusBtn.style.transform = 'none'; // Overriding the CSS transform translateX
          plusBtn.onclick = (e) => {
            e.stopPropagation();
            const rawId = node.id || '';
            let nodeId = rawId;
            const match = rawId.match(/flowchart-(.+?)-\d+/);
            if (match) nodeId = match[1];
            handleAddNodeClick(nodeId);
          };

          fo.appendChild(plusBtn);
          node.appendChild(fo);
        }
      } catch (err) { }
    });

    // Edges
    canvasRef.current.querySelectorAll('.edgePath').forEach(edge => {
      edge.style.cursor = 'pointer';
      edge.onclick = (e) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        handleEdgeClick(edge, e);
      };
    });
  };

  /* ─── Node Click → Edit Popover ─── */
  const handleNodeClick = (node, e) => {
    clearSelection();

    const labelEl = node.querySelector('.nodeLabel') || node.querySelector('span') || node.querySelector('text');
    const label = labelEl ? labelEl.textContent.trim() : '';
    const rawId = node.id || '';
    let nodeId = rawId;
    const match = rawId.match(/flowchart-(.+?)-\d+/);
    if (match) nodeId = match[1];

    node.classList.add('node-selected');
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const currentShape = detectNodeShape(nodeId, label);

    setSelectedNode({ id: nodeId, rawId: rawId, label, element: node });
    setEditText(label);
    setEditColor('');
    setEditStrokeColor('');
    setEditShape(currentShape);
    setEditPopover({
      type: 'node',
      x: Math.min(e.clientX - containerRect.left + 16, window.innerWidth - 300),
      y: Math.min(e.clientY - containerRect.top, window.innerHeight - 450),
    });
  };

  const handleEdgeClick = (edge, e) => {
    clearSelection();

    edge.classList.add('edge-selected');
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };

    // Attempt to extract edge info from class/id
    const edgeId = edge.id || '';

    setSelectedEdge({ id: edgeId, element: edge });
    setEdgeColor('');
    setEdgeStyle('solid');
    setEditPopover({
      type: 'edge',
      x: Math.min(e.clientX - containerRect.left + 16, window.innerWidth - 300),
      y: Math.min(e.clientY - containerRect.top, window.innerHeight - 300),
    });
  };

  const detectNodeShape = (nodeId, label) => {
    const line = mermaidCode.split('\n').find(l => {
      const trimmed = l.trim();
      return trimmed.includes(nodeId);
    }) || '';

    if (line.includes(`([`) && line.includes(`])`)) return 'stadium';
    if (line.includes(`[[`) && line.includes(`]]`)) return 'subroutine';
    if (line.includes(`((`) && line.includes(`))`)) return 'circle';
    if (line.includes(`{{`) && line.includes(`}}`)) return 'hex';
    if (line.includes(`[(`) && line.includes(`)]`)) return 'database';
    if (line.includes(`[/`) && line.includes(`\\]`)) return 'trapezoid';
    if (line.includes(`[/`) && line.includes(`/]`)) return 'parallelogram';
    if (line.includes(`{`) && line.includes(`}`)) return 'diamond';
    if (line.includes(`(`) && line.includes(`)`)) return 'round';
    if (line.includes(`[`) && line.includes(`]`)) return 'rect';
    return 'rect';
  };

  const clearSelection = () => {
    if (canvasRef.current) {
      canvasRef.current.querySelectorAll('.node-selected').forEach(n => n.classList.remove('node-selected'));
      canvasRef.current.querySelectorAll('.edge-selected').forEach(e => e.classList.remove('edge-selected'));
    }
    setSelectedNode(null);
    setSelectedEdge(null);
    setEditPopover(null);
    setAddNodeTarget(null);
    setShowAddNodeInput(false);
    setAddNodeText('');
    setAddNodeShape('rect');
    setSidebarMode('edit');
  };

  /* ─── Add New Node ─── */
  const handleAddNodeClick = (nodeId) => {
    clearSelection();
    setAddNodeTarget(nodeId);
    setSidebarMode('add');
    setEditPopover({ type: 'add' });
  };

  const addNewNode = () => {
    if (!addNodeTarget || !addNodeText.trim()) return;
    const newId = 'node' + Date.now().toString(36);
    const quotedLabel = `"${addNodeText.trim().replace(/"/g, '#quot;')}"`;
    const shapeObj = SHAPES.find(s => s.id === addNodeShape) || SHAPES[0];
    const newWrap = shapeObj.wrap(quotedLabel);
    const newLine = `    ${addNodeTarget} --> ${newId}${newWrap}`;
    const newCode = mermaidCode.trimEnd() + '\n' + newLine;
    pushHistory(newCode);
    clearSelection();
  };

  /* ─── Apply Node Edits (text, color, shape) ─── */
  const applyEdit = () => {
    if (selectedNode) applyNodeEdit();
    else if (selectedEdge) applyEdgeEdit();
  };

  const applyNodeEdit = () => {
    if (!selectedNode) return;
    const { id: nodeId, label: oldLabel } = selectedNode;
    const newLabel = editText.trim() || oldLabel;

    let lines = mermaidCode.split('\n');

    // Find the line that defines this node (could be at start or after an arrow)
    let targetIndex = -1;
    const escapedId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // Match nodeId followed by a shape bracket - at line start or after arrow
      if (trimmed.match(new RegExp(`(?:^|-->\\s*|---\\s*|==>\\s*)${escapedId}\\s*[\\(\\[\\{]`)) ||
        trimmed.match(new RegExp(`^${escapedId}\\s*$`))) {
        targetIndex = i;
        break;
      }
    }

    const shapeObj = SHAPES.find(s => s.id === editShape) || SHAPES[0];
    const quotedLabel = `"${newLabel.replace(/"/g, '#quot;')}"`;
    const newWrap = shapeObj.wrap(quotedLabel);

    if (targetIndex >= 0) {
      const line = lines[targetIndex];
      // More robust replacement: target exactly the node ID and its trailing bracket sequence
      // This avoids partial mid-word matches and ensures we replace the ENTIRE bracketed label
      const regex = new RegExp(`(^|\\s|-->|---|==>|\\|\\s*)${escapedId}(\\s*[\\(\\[\\{]+.*?[\\)\\]\\}]+)`, 'g');

      lines[targetIndex] = line.replace(regex, (match, prefix, brackets) => {
        return `${prefix}${nodeId}${newWrap}`;
      });

      // Secondary check: if the line was just the ID with no brackets, replace that too
      if (lines[targetIndex] === line) {
        const flatRegex = new RegExp(`(^|\\s|-->|---|==>)(${escapedId})(\\s*|$)`, 'g');
        lines[targetIndex] = line.replace(flatRegex, (match, prefix, id, suffix) => {
          return `${prefix}${nodeId}${newWrap}${suffix}`;
        });
      }
    } else {
      // Node was used but never explicitly defined with a shape, so we append the definition
      lines.push(`    ${nodeId}${newWrap}`);
    }

    let newCode = lines.join('\n');

    // Handle colors - only if user explicitly selected something
    if (editColor || editStrokeColor) {
      // Remove existing style line for this node
      const stylePattern = new RegExp(`\\n\\s*style ${nodeId} .*`, 'g');
      newCode = newCode.replace(stylePattern, '');

      const parts = [];
      if (editColor) {
        parts.push(`fill:${editColor}`);
        // Auto-contrast text color based on fill brightness
        const hex = editColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        parts.push(`color:${brightness > 128 ? '#000' : '#fff'}`);
      }
      if (editStrokeColor) {
        parts.push(`stroke:${editStrokeColor}`);
        parts.push('stroke-width:2px');
      }
      newCode = newCode.trimEnd() + `\n    style ${nodeId} ${parts.join(',')}`;
    }

    if (newCode !== mermaidCode) pushHistory(newCode);
    clearSelection();
  };

  const applyEdgeEdit = () => {
    if (!selectedEdge) return;
    clearSelection();
  };

  const deleteNode = () => {
    if (!selectedNode) return;
    const { id: nodeId } = selectedNode;

    let lines = mermaidCode.split('\n');
    const escapedId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Improved regex to target the node ID specifically while avoiding partial matches in larger IDs
    // It looks for the ID as a whole word, optionally surrounded by Mermaid syntax characters
    const nodeRefRegex = new RegExp(`(?:^|[^a-zA-Z0-9_-])${escapedId}(?:$|[^a-zA-Z0-9_-])`);

    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true;

      // Remove style directives for this node
      if (trimmed.startsWith(`style ${nodeId} `)) return false;

      // Remove any line that references this node (definitions or connections)
      return !nodeRefRegex.test(trimmed);
    });

    const newCode = filteredLines.join('\n');
    if (newCode !== mermaidCode) {
      pushHistory(newCode);
    }
    clearSelection();
  };

  const handleCanvasClick = (e) => {
    if (e.target.closest('.node-edit-popover') || e.target.closest('.edge-edit-popover') || e.target.closest('.node') || e.target.closest('.edgePath')) return;
    clearSelection();
  };

  /* ─── Zoom / Pan ─── */
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 10)); // 1000%
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.3)); // 30%
  const handleFitView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = (e) => {
    if (e.target.closest('.node-edit-sidebar') || e.target.closest('.refine-menu')) return;
    if (activeTool === 'brush') {
      startBrushing(e);
      return;
    }
    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const handleMouseMove = (e) => {
    if (activeTool === 'brush') continueBrushing(e);
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };
  const handleMouseUp = () => {
    if (activeTool === 'brush') endBrushing();
    setIsPanning(false);
  };
  const handleWheel = (e) => { e.preventDefault(); setZoom(z => Math.max(0.3, Math.min(10, z + (e.deltaY > 0 ? -0.1 : 0.1)))); };

  /* ─── Brush / Selection Logic ─── */
  const startBrushing = (e) => {
    setIsBrushing(true);
    setBrushPath([{ x: e.clientX, y: e.clientY }]);
    setSelectedContext([]);
    // Clear previous brush highlights
    if (canvasRef.current) {
      canvasRef.current.querySelectorAll('.node-brush-selected, .edge-brush-highlight').forEach(el => {
        el.classList.remove('node-brush-selected', 'edge-brush-highlight');
      });
    }
  };

  const continueBrushing = (e) => {
    if (!isBrushing) return;
    setBrushPath(prev => [...prev, { x: e.clientX, y: e.clientY }]);
  };

  const endBrushing = () => {
    if (!isBrushing) return;
    setIsBrushing(false);

    // Calculate what's inside the path
    const nodes = canvasRef.current?.querySelectorAll('.node') || [];
    const edges = canvasRef.current?.querySelectorAll('.edgePath') || [];
    const selection = [];

    // Simple bounding box check for selection (can be improved to polygon-in-polygon)
    const bounds = brushPath.reduce((acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      maxX: Math.max(acc.maxX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxY: Math.max(acc.maxY, p.y)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

    // Use intersection logic instead of strict inclusion to make selecting arrows easier
    nodes.forEach(node => {
      const rect = node.getBoundingClientRect();
      const intersects = !(rect.right < bounds.minX || rect.left > bounds.maxX || rect.bottom < bounds.minY || rect.top > bounds.maxY);
      if (intersects) {
        node.classList.add('node-brush-selected');
        const label = node.querySelector('.nodeLabel')?.textContent || node.id;
        selection.push({ type: 'node', label, id: node.id });
      }
    });

    edges.forEach(edge => {
      const rect = edge.getBoundingClientRect();
      const intersects = !(rect.right < bounds.minX || rect.left > bounds.maxX || rect.bottom < bounds.minY || rect.top > bounds.maxY);
      if (intersects) {
        edge.classList.add('edge-brush-highlight');

        // Find label. In mermaid it might be in an adjacent .edgeLabel block or a nested tspan
        // The actual label element is often separate from .edgePath, so we get the edge ID and try to find the corresponding label if not enclosed
        let label = "connection";
        const edgeIdParts = edge.id.split('-');
        if (edgeIdParts.length > 2) {
          label = `${edgeIdParts[0]} to ${edgeIdParts[1]}`;
        }

        // Also look for literal label text around it
        const enclosingGroup = edge.closest('.edgeTerminals, .edgePaths')?.parentNode;
        if (enclosingGroup) {
          const labelEl = enclosingGroup.querySelector('.edgeLabel');
          if (labelEl) label = labelEl.textContent;
        }

        selection.push({ type: 'edge', label: label.trim(), id: edge.id });
      }
    });

    if (selection.length > 0) {
      setSelectedContext(selection);
      setIsRefineOpen(true);
      const nodeLabels = [...new Set(selection.filter(s => s.type === 'node').map(s => s.label))];
      const edgeLabels = [...new Set(selection.filter(s => s.type === 'edge').map(s => s.label))];

      let contextStr = "";
      if (nodeLabels.length > 0) contextStr += `Focusing on components: ${nodeLabels.join(', ')}. `;
      if (edgeLabels.length > 0) contextStr += `Focusing on connections: ${edgeLabels.join(', ')}. `;

      setRefinePrompt(contextStr);
    }

    setBrushPath([]);
  };

  /* ─── Undo / Redo ─── */
  const handleUndo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setMermaidCode(history[historyIndex - 1]); } };
  const handleRedo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(historyIndex + 1); setMermaidCode(history[historyIndex + 1]); } };

  /* ─── Code Editor & Refine ─── */
  const openCodeEditor = () => { setCodeEditorValue(mermaidCode); setShowCodeEditor(true); };
  const applyCodeEdit = () => {
    if (codeEditorValue.trim() && codeEditorValue !== mermaidCode) {
      pushHistory(codeEditorValue);
    }
    setShowCodeEditor(false);
  };

  const handleRefine = async (overridePrompt = null) => {
    const finalPrompt = overridePrompt || refinePrompt;
    if (!finalPrompt.trim()) return;
    setIsRefining(true);
    setAgentError('');
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    try {
      const byokResult = await agentRefineDiagram(finalPrompt, mermaidCode, diagramType, {
        visionPrompt,
        selectedContext,
        signal: abortController.signal
      });
      let resultCode = null;

      if (byokResult && byokResult.mermaid_code) {
        resultCode = byokResult.mermaid_code;
        setAgentSteps(byokResult.agent_steps || ['Agent refined the diagram.']);
        setAgentRepairLog(byokResult.repair_log || []);
        if (Array.isArray(byokResult.suggestions)) {
          setSuggestions(byokResult.suggestions);
          setCurrentSugIdx(0);
          setLastSuggestedCode(resultCode);
        }
      } else {
        throw new Error("Invalid response from AI model");
      }

      if (resultCode) {
        pushHistory(resultCode);
        setIsRefineOpen(false);
        setRefinePrompt('');
        setSelectedContext([]);
        if (canvasRef.current) {
          canvasRef.current.querySelectorAll('.node-brush-selected, .edge-brush-highlight').forEach(el => {
            el.classList.remove('node-brush-selected', 'edge-brush-highlight');
          });
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setAgentSteps(prev => [...prev, 'Refinement cancelled by the user.']);
        return;
      }
      console.error("Refine Error:", err);
      setAgentError(err.message || "Failed to connect to refine API.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleInterpretRefine = async (overridePrompt = null) => {
    const finalPrompt = overridePrompt || refinePrompt;
    if (!finalPrompt.trim()) return;
    setIsInterpreting(true);
    setInterpretation(null);
    try {
      const data = await agentInterpretRefine(finalPrompt, mermaidCode, diagramType, {
        visionPrompt,
        selectedContext
      });
      if (data.confirmation) {
        setInterpretation(data);
        setIsRefineOpen(true);
      } else {
        handleRefine(finalPrompt);
      }
    } catch (err) {
      console.error("Interpret Error:", err);
      handleRefine(finalPrompt);
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleRetryFix = async () => {
    if (!renderError) return;
    const fixPrompt = `Investigate this Mermaid syntax error: "${renderError}".
Fix the following Mermaid code while keeping its original meaning:
${mermaidCode}`;
    await handleInterpretRefine(fixPrompt);
  };

  const fetchSuggestions = async () => {
    if (mermaidCode === lastSuggestedCode) return;
    setIsSugLoading(true);
    try {
      const data = await agentSuggestImprovements(prompt, mermaidCode, diagramType, {
        visionPrompt
      });
      if (data?.suggestions?.length) {
        setSuggestions(data.suggestions);
      }
      setCurrentSugIdx(0);
      setLastSuggestedCode(mermaidCode);
    } catch (err) {
      console.error("Suggestions Error:", err);
    } finally {
      setIsSugLoading(false);
    }
  };

  useEffect(() => {
    if (isRefineOpen && mermaidCode !== lastSuggestedCode) {
      fetchSuggestions();
    }
  }, [isRefineOpen]);

  /* ─── Export ─── */
  const handleExport = (format, bgOpt) => {
    if (!auth?.currentUser) return;

    setIsExportOpen(false); setPngBgChoice(null);
    const svgEl = canvasRef.current?.querySelector('svg');
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true);
    clone.style.filter = 'none';

    // 1. Remove UI elements not needed in exported image
    clone.querySelectorAll('.node-add-btn, .node-selected, .edge-selected').forEach(el => {
      if (el.classList.contains('node-add-btn')) {
        el.remove();
      } else {
        el.classList.remove('node-selected', 'edge-selected');
      }
    });

    // 2. Inline critical styles for consistent rendering in PNG/SVG
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap');
      * { font-family: 'Space Grotesk', sans-serif !important; }
      .node rect, .node polygon, .node circle, .node ellipse { rx: 10px !important; ry: 10px !important; }
      .cluster rect { rx: 14px !important; ry: 14px !important; stroke-dasharray: 5 4 !important; }
      .edgePath path { stroke-width: 1.8px !important; }
      .cluster text.titleText { text-anchor: start !important; dominant-baseline: hanging !important; }
    `;
    clone.prepend(style);

    if (format === 'svg') {
      dl(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }), 'arka-diagram.svg');
    } else if (format === 'png' || format === 'jpg') {
      exportRaster(clone, bgOpt || 'transparent', 4, format);
    } else if (format === 'code') {
      dl(new Blob([mermaidCode], { type: 'text/plain' }), 'arka-diagram.mmd');
    } else if (format === 'json') {
      dl(new Blob([JSON.stringify({ mermaid_code: mermaidCode, diagram_type: diagramType, template: activeTemplate }, null, 2)], { type: 'application/json' }), 'arka-diagram.json');
    }
  };

  const exportRaster = (svgClone, bg, scale, fmt) => {
    // Ensure dimensions are explicitly set on the SVG clone for the Canvas Image render
    const box = svgClone.viewBox.baseVal;
    if (box.width > 0) {
      svgClone.setAttribute('width', box.width);
      svgClone.setAttribute('height', box.height);
    }

    const data = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      if (bg && bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
      const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob(b => dl(b, `arka-diagram.${fmt}`), mime, fmt === 'jpg' ? 0.95 : undefined);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
  };

  const dl = (blob, name) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); };

  const fastTransition = { type: "spring", stiffness: 450, damping: 30 };

  return (
    <div
      className="arena-container"
      ref={containerRef}
      data-theme={activeTemplate}
      style={{
        '--label-bkg': TEMPLATES[activeTemplate]?.config?.themeVariables?.edgeLabelBackground,
        '--label-color': TEMPLATES[activeTemplate]?.config?.themeVariables?.textColor
      }}
    >
      <div className="arena-dot-grid" />

      {/* ─── Navbar ─── */}
      <div className="arena-navbar">
        <div className="arena-nav-left">
          {!isLoading && (
            <>
              <div
                className="nav-expandable-group"
                onMouseEnter={() => setIsNavHovered(true)}
                onMouseLeave={() => setIsNavHovered(false)}
              >
                <button className="nav-btn-main" onClick={onBack} title="New Diagram">
                  <Plus size={20} />
                </button>
                <button className={`nav-btn-secondary ${isNavHovered ? 'visible' : ''}`} onClick={onShowHistory} title="History">
                  HISTORY
                </button>
              </div>

              <button
                className="nav-btn-main vision-nav-btn"
                onClick={handleVisionClick}
                title="Vision Engine"
                style={{
                  borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid #e5e7eb'
                }}
              >
                <Eye size={18} />
              </button>
            </>
          )}
        </div>

        {!isLoading && (
          <div className="arena-nav-right">

            {/* Refine Dropdown */}
            <div className="export-dropdown-container">
              <button
                className={`ai-chip-btn ${renderError ? 'retry-glow' : ''}`}
                title={renderError ? 'Fix Diagram Syntax' : 'Refine Diagram'}
                onClick={() => {
                  if (renderError) {
                    handleRetryFix();
                  } else {
                    setIsRefineOpen(!isRefineOpen);
                    setIsExportOpen(false);
                    setPngBgChoice(null);
                  }
                }}
              >
                <span className="ai-chip-text">
                  {isRefining ? 'Refining...' : renderError ? 'Retry' : 'Refine'}
                </span>
              </button>
              <AnimatePresence>
                {isRefineOpen && (
                  <motion.div
                    layout
                    className="refine-menu export-menu"
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 28,
                      opacity: { duration: 0.15 }
                    }}
                    style={{ width: '380px', right: 0, padding: '16px' }}
                  >

                    {isInterpreting ? (
                      <motion.div
                        layout
                        className="sug-card-loading magical-glow"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ height: '160px', background: 'white' }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      >
                        <div className="mini-loader" />
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Connecting vision context...</span>
                      </motion.div>
                    ) : interpretation ? (
                      <motion.div
                        layout
                        className="interpretation-card magical-glow"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 28,
                          opacity: { duration: 0.2 }
                        }}
                      >
                        <div className="interpretation-header">
                          <span>AI Interpretation</span>
                        </div>
                        <p className="interpretation-text" style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                          {interpretation.confirmation}
                        </p>
                        <div className="interpretation-actions">
                          <button className="btn-proceed" onClick={() => { handleRefine(interpretation.technical_instructions); setInterpretation(null); setRefinePrompt(''); setIsRefineOpen(false); }}>Proceed</button>
                          <button className="btn-cancel" onClick={() => setInterpretation(null)}>Cancel</button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <h4 style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>AI Suggestions <BetaBadge /></h4>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="sug-nav-btn"
                                disabled={currentSugIdx === 0}
                                onClick={() => setCurrentSugIdx(Math.max(0, currentSugIdx - 1))}
                              >
                                <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
                              </button>
                              <button
                                className="sug-nav-btn"
                                disabled={currentSugIdx === suggestions.length - 1}
                                onClick={() => setCurrentSugIdx(Math.min(suggestions.length - 1, currentSugIdx + 1))}
                              >
                                <ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
                              </button>
                            </div>
                          </div>

                          <div className="suggestion-card-container">
                            {isSugLoading ? (
                              <div className="sug-card-loading magical-glow">
                                <div className="mini-loader" />
                                <span style={{ fontSize: '11px', color: '#000000', fontWeight: 700 }}>BRAINSTORMING...</span>
                              </div>
                            ) : (
                              <motion.div
                                key={currentSugIdx}
                                initial={{ opacity: 0, y: 5, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="suggestion-card magical-glow"
                                onClick={() => handleInterpretRefine(suggestions[currentSugIdx])}
                              >
                                <p>{suggestions[currentSugIdx] || "No suggestions available."}</p>
                                <div className="sug-apply-hint">Click to review</div>
                              </motion.div>
                            )}
                            <div className="sug-dots">
                              {suggestions.map((_, i) => (
                                <div key={i} className={`sug-dot ${i === currentSugIdx ? 'active' : ''}`} />
                              ))}
                            </div>
                          </div>
                        </div>

                        <h4 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Custom Refinement</h4>
                        <textarea
                          value={refinePrompt}
                          onChange={(e) => setRefinePrompt(e.target.value)}
                          placeholder="e.g. Change the start node color to red..."
                          className="popover-input"
                          style={{ minHeight: '80px', marginBottom: '12px', resize: 'none', fontSize: '13px' }}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInterpretRefine(); } }}
                        />
                        <button
                          className="popover-apply-btn"
                          onClick={() => handleInterpretRefine()}
                          disabled={isInterpreting || isRefining || !refinePrompt.trim()}
                          style={{ margin: 0, padding: '10px', opacity: (isInterpreting || isRefining || !refinePrompt.trim()) ? 0.7 : 1 }}
                        >
                          {isRefining ? 'Updating…' : 'Update Diagram'}
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Export */}
            <div className="export-dropdown-container">
              <button className="export-btn" onClick={() => { setIsExportOpen(!isExportOpen); setPngBgChoice(null); setIsRefineOpen(false); }}>
                <span>Export</span><Download size={18} />
              </button>
              <AnimatePresence>
                {isExportOpen && (
                  <motion.div className="export-menu" initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.12 }}>
                    <div className="export-item-group">
                      <div className="export-item" onClick={() => setPngBgChoice(pngBgChoice === 'png' ? null : 'png')}>
                        <FileImage size={18} /><span>PNG Image</span><ChevronDown size={16} className={`export-chevron ${pngBgChoice === 'png' ? 'rotated' : ''}`} />
                      </div>
                      <AnimatePresence>
                        {pngBgChoice === 'png' && (
                          <motion.div className="export-sub-options" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <div className="export-sub-item" onClick={() => handleExport('png', 'transparent')}><div className="bg-preview transparent-bg" />Transparent</div>
                            <div className="export-sub-item" onClick={() => handleExport('png', '#ffffff')}><div className="bg-preview white-bg" />White</div>
                            <div className="export-sub-item" onClick={() => handleExport('png', '#202124')}><div className="bg-preview dark-bg" />Dark</div>
                            <div className="export-sub-item" onClick={() => handleExport('png', '#000000')}><div className="bg-preview black-bg" />Black</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="export-item-group">
                      <div className="export-item" onClick={() => setPngBgChoice(pngBgChoice === 'jpg' ? null : 'jpg')}>
                        <Image size={18} /><span>JPG Image</span><ChevronDown size={16} className={`export-chevron ${pngBgChoice === 'jpg' ? 'rotated' : ''}`} />
                      </div>
                      <AnimatePresence>
                        {pngBgChoice === 'jpg' && (
                          <motion.div className="export-sub-options" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <div className="export-sub-item" onClick={() => handleExport('jpg', '#ffffff')}><div className="bg-preview white-bg" />White</div>
                            <div className="export-sub-item" onClick={() => handleExport('jpg', '#202124')}><div className="bg-preview dark-bg" />Dark</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="export-item" onClick={() => handleExport('svg')}><FileCode size={18} /><span>SVG Vector</span></div>
                    <div className="export-divider" />
                    <div className="export-item" onClick={() => handleExport('code')}><FileCode size={18} /><span>Mermaid Code</span></div>
                    <div className="export-item" onClick={() => handleExport('json')}><FileText size={18} /><span>JSON Config</span></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ProfileDropdown />
          </div>
        )}
      </div>

      {/* ─── Canvas ─── */}
      <div className="arena-canvas-wrapper"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onWheel={handleWheel} onClick={handleCanvasClick}
        style={{ cursor: activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : activeTool === 'brush' ? 'crosshair' : 'default' }}
      >
        {/* Brush Overlay */}
        {isBrushing && brushPath.length > 1 && (
          <svg className="brush-drawing-overlay" style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="brush-magic-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="42%" stopColor="#60a5fa" />
                <stop offset="72%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <filter id="brush-magic-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="0 0 0 0 0.10 0 0 0 0 0.55 0 0 0 0 1 0 0 0 0.95 0"
                  result="glow"
                />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <polyline
              points={brushPath.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="url(#brush-magic-gradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.18"
              filter="url(#brush-magic-glow)"
            />
            <polyline
              points={brushPath.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="url(#brush-magic-gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="12 9"
              strokeOpacity="0.95"
              filter="url(#brush-magic-glow)"
            />
            {brushPath.filter((_, idx) => idx % 6 === 0).map((p, idx) => (
              <circle
                key={`${p.x}-${p.y}-${idx}`}
                cx={p.x}
                cy={p.y}
                r={idx % 2 === 0 ? 2.4 : 1.4}
                fill={idx % 2 === 0 ? '#e0f2fe' : '#93c5fd'}
                opacity="0.8"
                filter="url(#brush-magic-glow)"
              />
            ))}
          </svg>
        )}
        {/* Canvas is ALWAYS mounted so canvasRef is always valid */}
        <div className="arena-canvas"
          style={{ opacity: (isLoading || isRefining) ? 0 : 1, transition: 'opacity 0.3s ease' }}>
          <div className="mermaid-canvas-inner" style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s ease'
          }}>
            <div ref={canvasRef} className="mermaid-render-target" />
          </div>
          {renderError && (
            <div className="render-error-badge" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 20px', borderRadius: '16px', maxWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <X size={18} /> <span>{diagramType === 'xy' ? 'Modern Browser Required' : 'Render Error'}</span>
              </div>
              {diagramType === 'xy' && (
                <span style={{ fontSize: '0.7rem', opacity: 0.8, lineHeight: 1.4 }}>
                  This feature uses <b>xychart-beta</b>. For best results, use <b>Google Chrome</b> or <b>Microsoft Edge</b>.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Loader overlay on top */}
        <AnimatePresence>
          {(isLoading || isRefining) && (
            <motion.div key="loader" className="arena-loader-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="new-loader-container">
                <div className="loader" />
                <div className="agent-progress-card">
                  <div className="agent-progress-title">{isRefining ? 'Refinement agent working' : 'Diagram agent working'}</div>
                  {(agentSteps.length ? agentSteps : ['Starting the diagram agent...']).slice(-4).map((step, idx) => (
                    <div className="agent-progress-step" key={`${step}-${idx}`}>{step}</div>
                  ))}
                  <button 
                    className="agent-cancel-btn"
                    onClick={handleCancelRequest}
                    style={{
                      marginTop: '1.25rem',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '0.75rem',
                      border: '1px solid #e5e7eb',
                      background: '#ffffff',
                      color: '#ef4444',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-body)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      justifyContent: 'center',
                      width: '100%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.borderColor = '#fca5a5';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Cancel Task
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && agentError && !mermaidCode && (
          <div className="agent-error-panel">
            <strong>Agent could not generate the diagram.</strong>
            <span>{agentError}</span>
          </div>
        )}

        {!isLoading && mermaidCode && (agentSteps.length > 0 || agentRepairLog.length > 0) && (
          <div className="agent-status-panel">
            <div className="agent-status-title">Agent Run</div>
            {agentSteps.slice(-3).map((step, idx) => (
              <div className="agent-status-line" key={`${step}-${idx}`}>{step}</div>
            ))}
            {agentRepairLog.length > 0 && (
              <div className="agent-status-line muted">
                {agentRepairLog.filter(item => item.status === 'needs_repair').length} repair pass(es), final validation ready.
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─── Right Sidebar (Node Edit / Add Node) ─── */}
      <AnimatePresence>
        {editPopover && (editPopover.type === 'node' || editPopover.type === 'add') && (
          <motion.div className="node-edit-sidebar"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}>
            <div className="popover-header">
              <span className="popover-title">{editPopover.type === 'add' ? 'Add Node' : 'Edit Node'}</span>
              <button className="popover-close" onClick={clearSelection}><X size={18} /></button>
            </div>

            {editPopover.type === 'node' && selectedNode && (
              <>
                <div className="popover-section">
                  <label className="popover-label-mini">Content</label>
                  <input className="popover-input" value={editText} onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyNodeEdit()} autoFocus />
                </div>
                <div className="popover-section">
                  <label className="popover-label-mini">Shape</label>
                  <div className="sidebar-shapes-grid">
                    {SHAPES.map(s => (
                      <button key={s.id} className={`shape-btn-sidebar ${editShape === s.id ? 'active' : ''}`}
                        onClick={() => setEditShape(s.id)} title={s.label}>
                        <s.icon size={16} />
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="popover-section">
                  <label className="popover-label-mini">Fill Color</label>
                  <div className="popover-colors">
                    {NODE_COLORS.map(c => (
                      <button key={c} className={`color-swatch ${editColor === c ? 'active' : ''}`}
                        style={{ background: c }} onClick={() => setEditColor(editColor === c ? '' : c)} />
                    ))}
                    <label className="color-plus-swatch">
                      <PlusIcon size={12} />
                      <input type="color" className="custom-color-input" onChange={e => setEditColor(e.target.value)} />
                    </label>
                  </div>
                </div>
                <div className="popover-section">
                  <label className="popover-label-mini">Stroke Color</label>
                  <div className="popover-colors">
                    {NODE_COLORS.map(c => (
                      <button key={c} className={`color-swatch ${editStrokeColor === c ? 'active' : ''}`}
                        style={{ background: c }} onClick={() => setEditStrokeColor(editStrokeColor === c ? '' : c)} />
                    ))}
                    <label className="color-plus-swatch">
                      <PlusIcon size={12} />
                      <input type="color" className="custom-color-input" onChange={e => setEditStrokeColor(e.target.value)} />
                    </label>
                  </div>
                </div>
                <div className="sidebar-footer-actions">
                  <button className="popover-apply-btn" onClick={applyNodeEdit}><Check size={17} /> Update Node</button>
                  <button className="popover-delete-btn" onClick={deleteNode} title="Delete Node">
                    <Trash2 size={17} />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}

            {editPopover.type === 'add' && addNodeTarget && (
              <>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
                  Adding node connected to <strong>{addNodeTarget}</strong>
                </p>
                <div className="popover-section">
                  <label className="popover-label-mini">Shape</label>
                  <div className="sidebar-shapes-grid">
                    {SHAPES.map(s => (
                      <button key={s.id} className={`shape-btn-sidebar ${addNodeShape === s.id ? 'active' : ''}`}
                        onClick={() => setAddNodeShape(s.id)} title={s.label}>
                        <s.icon size={16} />
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="popover-section">
                  <label className="popover-label-mini">Node Text</label>
                  <input className="popover-input" value={addNodeText} onChange={e => setAddNodeText(e.target.value)}
                    placeholder="Enter node text..." autoFocus
                    onKeyDown={e => e.key === 'Enter' && addNewNode()} />
                </div>
                <button className="popover-apply-btn" onClick={addNewNode} disabled={!addNodeText.trim()}>
                  <Check size={17} /> Add Node
                </button>
              </>
            )}
          </motion.div>
        )}

        {editPopover && editPopover.type === 'edge' && selectedEdge && (
          <motion.div className="node-edit-sidebar"
            initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div className="popover-header">
              <span className="popover-title">Edge Style</span>
              <button className="popover-close" onClick={clearSelection}><X size={18} /></button>
            </div>
            <div className="popover-section">
              <label className="popover-label-mini">Color</label>
              <div className="popover-colors">
                {NODE_COLORS.map(c => (
                  <button key={c} className={`color-swatch ${edgeColor === c ? 'active' : ''}`}
                    style={{ background: c }} onClick={() => setEdgeColor(c)} />
                ))}
                <label className="color-plus-swatch"><PlusIcon size={12} /><input type="color" className="custom-color-input" onChange={e => setEdgeColor(e.target.value)} /></label>
              </div>
            </div>
            <div className="popover-section">
              <label className="popover-label-mini">Line Style</label>
              <div className="popover-shapes">
                <button className={`shape-btn ${edgeStyle === 'solid' ? 'active' : ''}`} onClick={() => setEdgeStyle('solid')} title="Solid">
                  <ArrowRight size={18} />
                </button>
                <button className={`shape-btn ${edgeStyle === 'dotted' ? 'active' : ''}`} onClick={() => setEdgeStyle('dotted')} title="Dotted">
                  <ArrowRight size={18} style={{ strokeDasharray: '4 2' }} />
                </button>
              </div>
            </div>
            <button className="popover-apply-btn" onClick={clearSelection}><Check size={17} /> Done</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Tool Trays (Split) ─── */}
      <AnimatePresence>
        {!isLoading && (
          <>
            <motion.div className="tool-tray-left"
              initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 350, damping: 28 }}>
              <button className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`} onClick={() => setActiveTool('select')} title="Select"><MousePointer2 size={18} /></button>
              <button className={`tool-btn ${activeTool === 'pan' ? 'active' : ''}`} onClick={() => setActiveTool('pan')} title="Pan"><Move size={18} /></button>
              <button className={`tool-btn ${activeTool === 'brush' ? 'active' : ''}`} onClick={() => setActiveTool('brush')} title="Brush Refinement (Circle area)"><Brush size={18} /></button>
              <div className="tool-divider" />
              <button className={`tool-btn-theme ${showTemplates ? 'active' : ''}`} onClick={() => setShowTemplates(!showTemplates)} title="Themes">
                <span>{TEMPLATES[activeTemplate]?.name || 'Theme'}</span>
              </button>
              <button className={`tool-btn ${showCodeEditor ? 'active' : ''}`} onClick={openCodeEditor} title="Edit Code"><Code2 size={18} /></button>
              <div className="tool-divider" />
              <button className={`tool-btn ${historyIndex <= 0 ? 'disabled' : ''}`} onClick={handleUndo} disabled={historyIndex <= 0} title="Undo"><Undo size={18} /></button>
              <button className={`tool-btn ${historyIndex >= history.length - 1 ? 'disabled' : ''}`} onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo"><Redo size={18} /></button>
            </motion.div>

            <motion.div className="tool-tray-right"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 350, damping: 28 }}>
              <div className="zoom-tray-controls">
                <button className="zoom-action-btn" onClick={handleZoomOut} title="Zoom Out"><Minus size={17} /></button>
                <span className="zoom-percentage-readout">{Math.round(zoom * 100)}%</span>
                <button className="zoom-action-btn" onClick={handleZoomIn} title="Zoom In"><PlusIcon size={17} /></button>
              </div>
              <button className="tool-btn" onClick={handleFitView} title="Fit View"><Maximize size={18} /></button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Sidebar Panel (Themes & Blueprints) ─── */}
      <AnimatePresence>
        {showTemplates && !isLoading && (
          <motion.div className="template-panel"
            initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div className="template-panel-header">
              <span>DESIGN CENTER</span>
              <button className="template-close-btn" onClick={() => setShowTemplates(false)}><X size={18} /></button>
            </div>

            <div className="template-scroll-area">
              <section className="template-section">
                <h3 className="template-section-title">Color Themes</h3>
                <div className="template-grid">
                  {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                    <button key={key} className={`template-card ${activeTemplate === key ? 'active' : ''}`} onClick={() => setActiveTemplate(key)}>
                      <div className="template-preview" style={{ background: tmpl.preview }} />
                      <span className="template-name">{tmpl.name}</span>
                      {activeTemplate === key && <motion.div className="template-check" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={10} color="#000" strokeWidth={3} /></motion.div>}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Code Editor Modal ─── */}
      <AnimatePresence>
        {showCodeEditor && (
          <motion.div className="code-editor-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            onClick={() => setShowCodeEditor(false)}>
            <motion.div className="code-editor-modal" onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.15 }}>
              <div className="code-editor-header">
                <div className="code-editor-title"><Code2 size={18} /><span>Mermaid Code</span></div>
              </div>
              <textarea className="code-editor-textarea" value={codeEditorValue}
                onChange={e => setCodeEditorValue(e.target.value)} spellCheck={false} />
              <div className="code-editor-actions">
                <button className="code-editor-cancel" onClick={() => setShowCodeEditor(false)}>Cancel</button>
                <button className="popover-apply-btn" onClick={applyCodeEdit}><Check size={17} /> Apply Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Vision Engine Modal ─── */}
      <AnimatePresence>
        {isVisionModalOpen && (
          <motion.div className="code-editor-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            onClick={() => setIsVisionModalOpen(false)}>
            <motion.div className="code-editor-modal vision-modal" onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.15 }}>
              <div className="code-editor-header">
                <div className="code-editor-title"><Eye size={18} /><span>Your Vision</span><BetaBadge /></div>
                <button
                  className="popover-close"
                  style={{
                    width: 'auto',
                    height: '28px',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    color: '#64748b'
                  }}
                  onClick={() => document.querySelector('.code-editor-textarea')?.focus()}
                >
                  Edit
                </button>
              </div>

              <div className="vision-content-wrapper">
                {isVisionLoading ? (
                  <div className="vision-loading-placeholder">
                    <div className="vision-skeleton-header">
                      <div className="skeleton-chip" />
                      <div className="skeleton-chip" />
                    </div>
                    <div className="vision-skeleton-body">
                      <div className="skeleton-line" style={{ width: '90%' }} />
                      <div className="skeleton-line" style={{ width: '70%' }} />
                      <div className="skeleton-line" style={{ width: '85%' }} />
                      <div className="skeleton-line" style={{ width: '60%' }} />
                      <div className="skeleton-line" style={{ width: '95%' }} />
                      <div className="skeleton-line" style={{ width: '40%' }} />
                    </div>
                  </div>
                ) : (
                  <textarea
                    className="code-editor-textarea"
                    value={visionPrompt}
                    onChange={e => setVisionPrompt(e.target.value)}
                    spellCheck={false}
                    style={{ marginBottom: '1.25rem' }}
                  />
                )}

                <div className="code-editor-actions" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="code-editor-cancel" onClick={() => setIsVisionModalOpen(false)}>Discard</button>
                    <button
                      className="popover-apply-btn"
                      onClick={handleVisionRegenerate}
                      disabled={visionPrompt === originalVisionPrompt || isVisionLoading}
                      style={{
                        width: 'auto',
                        padding: '0.45rem 1.2rem',
                        marginTop: 0,
                        background: (visionPrompt === originalVisionPrompt || isVisionLoading) ? '#f3f4f6' : '#000',
                        color: (visionPrompt === originalVisionPrompt || isVisionLoading) ? '#9ca3af' : '#fff',
                        borderColor: (visionPrompt === originalVisionPrompt || isVisionLoading) ? '#e5e7eb' : '#000'
                      }}
                    >
                      {isVisionLoading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
                      <span style={{ marginLeft: '8px' }}>Regenerate</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
};

export default Arena;
