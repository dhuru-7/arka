import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Trash2, Plus, User, Download, Palette, MousePointer2, Move, Undo, Redo, ZoomIn, ZoomOut, Maximize, X, Check, ChevronDown, Image, FileCode, FileText, FileImage, Code2, Plus as PlusIcon, Minus, Cpu, Square, Circle, Hexagon, Database, MessageSquare, Box, ArrowRight, Brush } from './googleIcons';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileDropdown from './ProfileDropdown';
import { auth, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { agentGenerateDiagram, agentRefineDiagram, getProviderLabel, agentChat } from './aiService';
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

const getInitialAgentRemarks = (steps, repairLog) => {
  let remarks = "Hello! I am your diagram assistant. Here is a summary of how I generated this diagram:\n\n";
  if (steps && steps.length > 0) {
    remarks += "**Execution Steps:**\n";
    steps.forEach(step => {
      remarks += `- ${step}\n`;
    });
  }
  const repairs = repairLog ? repairLog.filter(item => item.status === 'needs_repair').length : 0;
  if (repairs > 0) {
    remarks += `\n**Repairs:** I performed ${repairs} repair pass(es) to resolve syntax/rendering issues and ensure the diagram renders correctly.`;
  } else {
    remarks += `\n**Validation:** Static checks passed on the first attempt without requiring syntax repairs!`;
  }
  return remarks;
};

const renderMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    let content = line;
    let isBullet = false;
    let isHeader = false;
    let headerLevel = 0;

    if (content.trim().startsWith('- ') || content.trim().startsWith('* ')) {
      isBullet = true;
      content = content.trim().substring(2);
    }

    const headerMatch = content.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      isHeader = true;
      headerLevel = headerMatch[1].length;
      content = headerMatch[2];
    }

    const parseInlineStyles = (str) => {
      const parts = [];
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(str)) !== null) {
        if (match.index > lastIndex) {
          parts.push(str.substring(lastIndex, match.index));
        }
        parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < str.length) {
        parts.push(str.substring(lastIndex));
      }

      return parts.length > 0 ? parts : str;
    };

    const renderedInline = parseInlineStyles(content);

    if (isBullet) {
      return (
        <li key={lineIdx} style={{ marginLeft: '1.2rem', marginBottom: '0.35rem', listStyleType: 'disc' }}>
          {renderedInline}
        </li>
      );
    }

    if (isHeader) {
      const HeaderTag = `h${Math.min(headerLevel + 2, 6)}`;
      return (
        <HeaderTag key={lineIdx} style={{ margin: '0.8rem 0 0.4rem 0', fontWeight: 700, color: 'var(--text-main)' }}>
          {renderedInline}
        </HeaderTag>
      );
    }

    return (
      <div key={lineIdx} style={{ minHeight: '1.2em', marginBottom: '0.3rem' }}>
        {renderedInline}
      </div>
    );
  });
};

const TypewriterText = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    const timer = setInterval(() => {
      index += 4;
      if (index >= text.length) {
        setDisplayedText(text);
        clearInterval(timer);
        if (onComplete) onComplete();
      } else {
        setDisplayedText(text.slice(0, index));
      }
      
      const container = document.querySelector('.chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 15);
    return () => clearInterval(timer);
  }, [text]);

  return <>{renderMarkdown(displayedText)}</>;
};

const AgentChatMessage = ({ msg, canClickPlan, handleProceedWithPlan, idx, onTypingComplete }) => {
  const isTyping = msg.typed === false;
  const [typingComplete, setTypingComplete] = useState(msg.typed !== false);
  const [isClicked, setIsClicked] = useState(msg.clicked);

  useEffect(() => {
    setTypingComplete(msg.typed !== false);
  }, [msg.typed]);

  useEffect(() => {
    setIsClicked(msg.clicked);
  }, [msg.clicked]);

  const handleComplete = () => {
    setTypingComplete(true);
    if (onTypingComplete) {
      onTypingComplete(idx);
    }
  };

  const showPlanActive = canClickPlan && !isClicked;

  return (
    <div className={`chat-message-bubble ${msg.sender}`}>
      <div className="chat-message-text">
        {isTyping ? (
          <TypewriterText text={msg.text} onComplete={handleComplete} />
        ) : (
          renderMarkdown(msg.text)
        )}
      </div>
      {msg.proposal && typingComplete && (
        <div className="chat-proposal-container" style={{ marginTop: '0.75rem' }}>
          <motion.div 
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`suggestion-card ${showPlanActive ? 'magical-glow' : 'disabled'}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (showPlanActive) {
                setIsClicked(true);
                handleProceedWithPlan(idx, msg.proposal);
              }
            }}
            style={{
              cursor: showPlanActive ? 'pointer' : 'default',
              opacity: showPlanActive ? 1 : 0.65,
              pointerEvents: showPlanActive ? 'auto' : 'none'
            }}
          >
            <p style={{ fontWeight: 600 }}>{msg.proposal}</p>
            {msg.clicked || isClicked ? (
              <div className="sug-apply-hint" style={{ opacity: 1, color: '#10b981' }}>Applied</div>
            ) : showPlanActive ? (
              <div className="sug-apply-hint" style={{ opacity: 1 }}>Click to proceed</div>
            ) : (
              <div className="sug-apply-hint" style={{ opacity: 1, color: '#9ca3af' }}>Unavailable</div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};


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

  // Diagram update state
  const [isRefining, setIsRefining] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const abortControllerRef = useRef(null);

  // Brush/Highlight states
  const [isBrushing, setIsBrushing] = useState(false);
  const [brushPath, setBrushPath] = useState([]);
  const [selectedContext, setSelectedContext] = useState([]);
  const [highlightImage, setHighlightImage] = useState(null);
  const brushPathRef = useRef([]);

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

  const [dynamicLoadingText, setDynamicLoadingText] = useState('Starting diagram agent...');

  // Agent State
  const [agentSteps, setAgentSteps] = useState([]);
  const [agentRepairLog, setAgentRepairLog] = useState([]);
  const [agentError, setAgentError] = useState('');


  // Chat states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const isProceedingPlanRef = useRef(false);

  const getShortAgentName = () => {
    const label = getProviderLabel();
    if (label && label.includes(' · ')) {
      return label.split(' · ')[1];
    }
    return label;
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading, isChatOpen]);

  // Mark all messages as typed when chat is closed to prevent re-triggering typing animations
  useEffect(() => {
    if (!isChatOpen) {
      setChatMessages(prev => prev.map(m => ({ ...m, typed: true })));
    }
  }, [isChatOpen]);

  const handleInputChange = (e) => {
    setChatInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 80)}px`;
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userText = chatInput.trim();
    setChatInput('');
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
    }

    // Add user message to chat
    const updatedMessages = [...chatMessages, { sender: 'user', text: userText }];
    setChatMessages(updatedMessages);

    setIsChatLoading(true);

    // Format history for planning and discussion
    let displayMermaidCode = mermaidCode;
    let contextInstructions = '';
    if (selectedContext && selectedContext.length > 0) {
      const nodeLabels = [...new Set(selectedContext.filter(s => s.type === 'node').map(s => s.label))];
      const edgeLabels = [...new Set(selectedContext.filter(s => s.type === 'edge').map(s => s.label))];
      
      let contextStr = "";
      if (nodeLabels.length > 0) contextStr += `Focusing on components: ${nodeLabels.join(', ')}. `;
      if (edgeLabels.length > 0) contextStr += `Focusing on connections: ${edgeLabels.join(', ')}. `;
      
      contextInstructions = `\n\nNote: The user has highlighted the following elements on the diagram canvas: ${contextStr}Please address these highlighted components specifically in your response and plan.`;

      // Highlight in code for non-vision models:
      const highlightStyles = selectedContext
        .filter(item => item.type === 'node')
        .map(item => `style ${item.id} stroke:#3b82f6,stroke-width:3px,stroke-dasharray: 8 8`)
        .join('\n');
      if (highlightStyles) {
        displayMermaidCode = mermaidCode.trimEnd() + '\n' + highlightStyles;
      }
    }

    const systemPrompt = `You are Arka's diagram planning assistant.
You are helping the user design and refine a ${diagramType} diagram.
Current Mermaid JS code:
${displayMermaidCode}
${contextInstructions}

Your task is to discuss, brainstorm, and plan changes with the user.
Follow these formatting and response rules strictly:
- **EXTREME CONCISENESS**: Do not use filler words, introductory fluff, or long conversational explanations. Be brief and direct.
- **FORMATTING**: Use **bold headings** and bullet points when suggesting options or outlining steps. Keep your paragraphs to 1-2 short sentences.
- **DIRECT ANSWERS**: If the user asks a question, answer it directly in the first sentence (e.g. "Yes, we can add colors to this flowchart." or "No, sequence diagrams do not support custom colors for individual nodes in standard Mermaid.").
- **PROPOSALS**: Only append a proposal block wrapped in [PROPOSAL] and [/PROPOSAL] at the very end of your response if a diagram modification is actually required. Do not output proposal cards for general questions, greetings, or error complaints.
- **NO MERMAID CODE**: Never print raw Mermaid JS blocks in the chat response.

DIAGRAM STYLING RULES:
- **Flowchart / Architecture**: Supports individual node coloring, custom shapes, borders, and line styling.
- **ER Diagram**: Supports table-level attributes and relationships.
- **Sequence Diagram**: Standard Mermaid sequence diagrams DO NOT support custom CSS styling or individual participant/line colors. Always refuse to style individual components of a sequence diagram.
- **Pie / Gantt / XY Chart**: Configured at theme/template level; individual components cannot be colored/styled.

DIRECT CODE ACCESS RULES:
- You have direct, real-time access to the current diagram code (displayed above under "Current Mermaid JS code").
- If the user says "I see nothing on the screen", "the diagram is blank", "I'm seeing a render error", or similar, DO NOT ask them to share or paste their code. You already have it in your prompt context!
- Look at the "Current Mermaid JS code":
  1. If the current code is empty or has only a starting line, explain that no diagram has been generated yet, and offer to create one.
  2. If the current code is fully valid and correct, explain that the Mermaid code itself appears completely correct and valid, and suggest browser-side troubleshooting steps like refreshing the page, resizing the window, or trying a different browser.
  3. If the current code has syntax errors or is broken, analyze the code, identify the issue, and output a [PROPOSAL] block to fix it.

Example:
User: "Add a database node"
Response: "I will add a new Database component to store records.
[PROPOSAL] Add a database node and connect it from the API Service [/PROPOSAL]"`;

    const userMessageWithHistory = `Here is our conversation history:
${updatedMessages.slice(0, -1).map(m => `${m.sender === 'user' ? 'User' : 'Agent'}: ${m.text}`).join('\n')}
User's latest message: ${userText}`;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await agentChat(systemPrompt, userMessageWithHistory, abortController.signal, highlightImage);
      
      let replyText = result;
      let proposalText = null;

      // Clean thinking blocks from reasoning models
      replyText = replyText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Extract proposal block if present
      const proposalMatch = replyText.match(/\[PROPOSAL\]([\s\S]*?)\[\/PROPOSAL\]/);
      if (proposalMatch) {
        proposalText = proposalMatch[1].trim();
        replyText = replyText.replace(/\[PROPOSAL\][\s\S]*?\[\/PROPOSAL\]/, '').trim();
      }

      setChatMessages(prev => {
        const next = [...prev, { sender: 'agent', text: replyText, proposal: proposalText, clicked: false, typed: false }];
        return next;
      });

      // Clear highlights after sending the message
      if (canvasRef.current) {
        canvasRef.current.querySelectorAll('.node-brush-selected, .edge-brush-highlight').forEach(el => {
          el.classList.remove('node-brush-selected', 'edge-brush-highlight');
        });
      }
      setBrushPath([]);
      brushPathRef.current = [];
      setSelectedContext([]);
      setHighlightImage(null);

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error("Chat Error:", err);
      setChatMessages(prev => {
        const next = [...prev, { sender: 'agent', text: `Failed to get a response: ${err.message || "Unknown error"}` }];
        return next;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleTypingComplete = (msgIdx) => {
    setChatMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, typed: true } : m));
  };

  const handleProceedWithPlan = async (msgIdx, proposalText) => {
    if (msgIdx !== chatMessages.length - 1 || chatMessages[msgIdx].clicked || isRefining || isLoading || isProceedingPlanRef.current) return;
    isProceedingPlanRef.current = true;

    // Mark as clicked
    setChatMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, clicked: true } : m));

    // Show full-screen loader ONLY during diagram update
    setIsRefining(true);
    setDynamicLoadingText('Updating diagram...');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const byokResult = await agentRefineDiagram(proposalText, mermaidCode, diagramType, {
        selectedContext,
        signal: abortController.signal,
        onProgress: (step) => {
          setDynamicLoadingText(step);
        }
      });

      if (byokResult && byokResult.mermaid_code) {
        const resultCode = byokResult.mermaid_code;
        pushHistory(resultCode);

        const remarks = byokResult.agent_steps && byokResult.agent_steps.length > 0
          ? `I've successfully updated the diagram. Here is what I did:\n${byokResult.agent_steps.map(s => `- ${s}`).join('\n')}`
          : "I've successfully updated the diagram!";

        setChatMessages(prev => {
          const next = [...prev, { sender: 'agent', text: remarks, typed: false }];
          return next;
        });
      } else {
        throw new Error("Invalid response from AI model");
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setChatMessages(prev => {
          const next = [...prev, { sender: 'agent', text: "Request cancelled." }];
          return next;
        });
        return;
      }
      console.error("Chat Proposal Apply Error:", err);
      setChatMessages(prev => {
        const next = [...prev, { sender: 'agent', text: `Failed to update diagram: ${err.message || "Unknown error"}` }];
        return next;
      });
    } finally {
      setIsRefining(false);
      isProceedingPlanRef.current = false;
    }
  };

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

  const getCanvasImageBase64 = async () => {
    const svgEl = canvasRef.current?.querySelector('svg');
    if (!svgEl) return null;
    const clone = svgEl.cloneNode(true);
    
    // Set dimensions
    const box = clone.viewBox.baseVal;
    if (box.width > 0) {
      clone.setAttribute('width', box.width);
      clone.setAttribute('height', box.height);
    }
    
    const data = new XMLSerializer().serializeToString(clone);
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw diagram
        ctx.drawImage(img, 0, 0);
        
        // Draw the brush path
        if (brushPathRef.current && brushPathRef.current.length > 1) {
          const rect = svgEl.getBoundingClientRect();
          
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          
          brushPathRef.current.forEach((p, idx) => {
            const x = (p.x - rect.left) * (box.width / rect.width);
            const y = (p.y - rect.top) * (box.height / rect.height);
            if (idx === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();
        }
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
    });
  };

  const startBrushing = (e) => {
    setIsBrushing(true);
    const coords = { x: e.clientX, y: e.clientY };
    setBrushPath([coords]);
    brushPathRef.current = [coords];
    setSelectedContext([]);
    setHighlightImage(null);
    if (canvasRef.current) {
      canvasRef.current.querySelectorAll('.node-brush-selected, .edge-brush-highlight').forEach(el => {
        el.classList.remove('node-brush-selected', 'edge-brush-highlight');
      });
    }
  };

  const continueBrushing = (e) => {
    if (!isBrushing) return;
    const coords = { x: e.clientX, y: e.clientY };
    setBrushPath(prev => {
      const next = [...prev, coords];
      brushPathRef.current = next;
      return next;
    });
  };

  const endBrushing = async () => {
    if (!isBrushing) return;
    setIsBrushing(false);

    const nodes = canvasRef.current?.querySelectorAll('.node') || [];
    const edges = canvasRef.current?.querySelectorAll('.edgePath') || [];
    const selection = [];

    const bounds = brushPathRef.current.reduce((acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      maxX: Math.max(acc.maxX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxY: Math.max(acc.maxY, p.y)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

    nodes.forEach(node => {
      const rect = node.getBoundingClientRect();
      const intersects = !(rect.right < bounds.minX || rect.left > bounds.maxX || rect.bottom < bounds.minY || rect.top > bounds.maxY);
      if (intersects) {
        node.classList.add('node-brush-selected');
        const labelEl = node.querySelector('.nodeLabel') || node.querySelector('span') || node.querySelector('text');
        const label = labelEl ? labelEl.textContent.trim() : node.id;
        const rawId = node.id || '';
        let nodeId = rawId;
        const match = rawId.match(/flowchart-(.+?)-\d+/);
        if (match) nodeId = match[1];
        selection.push({ type: 'node', label, id: nodeId, rawId });
      }
    });

    edges.forEach(edge => {
      const rect = edge.getBoundingClientRect();
      const intersects = !(rect.right < bounds.minX || rect.left > bounds.maxX || rect.bottom < bounds.minY || rect.top > bounds.maxY);
      if (intersects) {
        edge.classList.add('edge-brush-highlight');
        let label = "connection";
        const edgeIdParts = edge.id.split('-');
        if (edgeIdParts.length > 2) {
          label = `${edgeIdParts[0]} to ${edgeIdParts[1]}`;
        }
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
      setIsChatOpen(true);
      try {
        const base64Img = await getCanvasImageBase64();
        setHighlightImage(base64Img);
      } catch (err) {
        console.error("Failed to capture highlighted canvas:", err);
      }
    } else {
      setBrushPath([]);
      brushPathRef.current = [];
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
      setDynamicLoadingText('Starting diagram agent...');
      setRenderError(null);
      setAgentError('');
      setAgentSteps(['Starting the diagram agent...']);
      setAgentRepairLog([]);

      const savedCode = localStorage.getItem('arka_last_mermaid_code');

      if (savedCode) {
        setMermaidCode(savedCode);
        setHistory([savedCode]);
        setHistoryIndex(0);
        setAgentSteps(['Loaded saved diagram.']);
        setChatMessages([{ sender: 'agent', text: "Hello! I loaded your saved diagram. How can I help you refine or modify it?", typed: true }]);
        setIsLoading(false);
        return;
      }

      try {
        const byokResult = await agentGenerateDiagram(prompt, diagramType, {
          signal: abortController.signal,
          onProgress: (step) => {
            if (!cancelled) {
              setDynamicLoadingText(step);
              setAgentSteps(prev => [...prev, step]);
            }
          }
        });
        if (cancelled) return;

        if (byokResult && byokResult.mermaid_code) {
          const code = byokResult.mermaid_code;
          setMermaidCode(code);
          setHistory([code]);
          setHistoryIndex(0);
          const steps = byokResult.agent_steps || ['Agent generated the diagram.'];
          const repairLog = byokResult.repair_log || [];
          setAgentSteps(steps);
          setAgentRepairLog(repairLog);
          setChatMessages([{ sender: 'agent', text: getInitialAgentRemarks(steps, repairLog), typed: true }]);
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

  const clearSelection = (keepChatOpen = false) => {
    if (canvasRef.current) {
      canvasRef.current.querySelectorAll('.node-selected, .node-brush-selected').forEach(n => {
        n.classList.remove('node-selected', 'node-brush-selected');
      });
      canvasRef.current.querySelectorAll('.edge-selected, .edge-brush-highlight').forEach(e => {
        e.classList.remove('edge-selected', 'edge-brush-highlight');
      });
    }
    setSelectedNode(null);
    setSelectedEdge(null);
    setEditPopover(null);
    setAddNodeTarget(null);
    setShowAddNodeInput(false);
    setAddNodeText('');
    setAddNodeShape('rect');
    setSidebarMode('edit');
    
    // Clear brush states
    setBrushPath([]);
    brushPathRef.current = [];
    setSelectedContext([]);
    setHighlightImage(null);

    if (!keepChatOpen) {
      setIsChatOpen(false);
    }
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
    if (e.target.closest('.node-edit-sidebar') || e.target.closest('.chat-sidebar')) return;
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
    if (activeTool === 'brush') {
      continueBrushing(e);
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };
  const handleMouseUp = () => {
    if (activeTool === 'brush') {
      endBrushing();
    } else {
      setIsPanning(false);
    }
  };
  const handleWheel = (e) => { e.preventDefault(); setZoom(z => Math.max(0.3, Math.min(10, z + (e.deltaY > 0 ? -0.1 : 0.1)))); };

  /* ─── Undo / Redo ─── */
  const handleUndo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setMermaidCode(history[historyIndex - 1]); } };
  const handleRedo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(historyIndex + 1); setMermaidCode(history[historyIndex + 1]); } };

  /* ─── Code Editor ─── */
  const openCodeEditor = () => { setCodeEditorValue(mermaidCode); setShowCodeEditor(true); };
  const applyCodeEdit = () => {
    if (codeEditorValue.trim() && codeEditorValue !== mermaidCode) {
      pushHistory(codeEditorValue);
    }
    setShowCodeEditor(false);
  };

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
            </>
          )}
        </div>

        {!isLoading && (
          <div className="arena-nav-right">

            {/* Sidechat Toggle Button */}
            <button
              className={`chat-toggle-btn ${isChatOpen ? 'active' : ''}`}
              title="Agent Chat"
              disabled={isRefining}
              onClick={() => {
                if (isRefining) return;
                const nextChatOpen = !isChatOpen;
                setIsChatOpen(nextChatOpen);
                if (!nextChatOpen) {
                  // Mark all messages as typed when closing chat to prevent any animation when reopening
                  setChatMessages(prev => prev.map(m => ({ ...m, typed: true })));
                }
                setIsExportOpen(false);
                setPngBgChoice(null);
                clearSelection(true);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
                <path d="M272-160q-30 0-51-21t-21-51q0-21 12-39.5t32-26.5l156-62v-90q-54 63-125.5 96.5T120-320v-80q68 0 123.5-28T344-508l54-64q12-14 28-21t34-7h40q18 0 34 7t28 21l54 64q45 52 100.5 80T840-400v80q-83 0-154.5-33.5T560-450v90l156 62q20 8 32 26.5t12 39.5q0 30-21 51t-51 21H400v-20q0-26 17-43t43-17h120q9 0 14.5-5.5T600-260q0-9-5.5-14.5T580-280H460q-42 0-71 29t-29 71v20h-88Zm151.5-503.5Q400-687 400-720t23.5-56.5Q447-800 480-800t56.5 23.5Q560-753 560-720t-23.5 56.5Q513-640 480-640t-56.5-23.5Z"/>
              </svg>
            </button>

            {/* Export */}
            <div className="export-dropdown-container">
              <button className="export-btn" onClick={() => { setIsExportOpen(!isExportOpen); setPngBgChoice(null); }}>
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



        {!isLoading && agentError && !mermaidCode && (
          <div className="agent-error-panel">
            <strong>Agent could not generate the diagram.</strong>
            <span>{agentError}</span>
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

      {/* ─── Right Sidebar (Agent Chat) ─── */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div className="chat-sidebar"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}>
            
            <div className="popover-header">
              <span className="popover-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#000000" style={{ flexShrink: 0 }}>
                  <path d="M272-160q-30 0-51-21t-21-51q0-21 12-39.5t32-26.5l156-62v-90q-54 63-125.5 96.5T120-320v-80q68 0 123.5-28T344-508l54-64q12-14 28-21t34-7h40q18 0 34 7t28 21l54 64q45 52 100.5 80T840-400v80q-83 0-154.5-33.5T560-450v90l156 62q20 8 32 26.5t12 39.5q0 30-21 51t-51 21H400v-20q0-26 17-43t43-17h120q9 0 14.5-5.5T600-260q0-9-5.5-14.5T580-280H460q-42 0-71 29t-29 71v20h-88Zm151.5-503.5Q400-687 400-720t23.5-56.5Q447-800 480-800t56.5 23.5Q560-753 560-720t-23.5 56.5Q513-640 480-640t-56.5-23.5Z"/>
                </svg>
                {getShortAgentName()}
              </span>
              <button className="popover-close" onClick={() => setIsChatOpen(false)}><X size={18} /></button>
            </div>
            
            <div className="chat-messages-container">
              {chatMessages.map((msg, idx) => {
                const isLatest = idx === chatMessages.length - 1;
                const canClickPlan = isLatest && msg.proposal && !msg.clicked && !isRefining && !isLoading;

                if (msg.sender === 'user') {
                  return (
                    <div key={idx} className={`chat-message-bubble ${msg.sender}`}>
                      <div className="chat-message-text">
                        {renderMarkdown(msg.text)}
                      </div>
                    </div>
                  );
                }

                return (
                  <AgentChatMessage
                    key={idx}
                    msg={msg}
                    canClickPlan={canClickPlan}
                    handleProceedWithPlan={handleProceedWithPlan}
                    idx={idx}
                    onTypingComplete={handleTypingComplete}
                  />
                );
              })}
              {isChatLoading && (
                <div className="chat-message-bubble agent">
                  <div className="chat-message-text typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="chat-input-area">
              <div className={`chat-input-wrapper ${isRefining ? 'disabled' : ''}`}>
                <textarea
                  ref={chatInputRef}
                  className="chat-input-textarea"
                  value={chatInput}
                  onChange={handleInputChange}
                  placeholder="Ask agent to change the diagram..."
                  disabled={isRefining}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                />
                <button 
                  className="chat-send-btn-inline" 
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading || isRefining}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                    <path d="M440-160v-487L216-424l-56-56 320-320 320 320-56 56-224-223v487h-80Z"/>
                  </svg>
                </button>
              </div>
            </div>
            
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

      {/* Loader overlay on top (Fixed position at root zIndex 5500 to cover all sidebar/panels/nav except sidechat zIndex 6000) */}
      <AnimatePresence>
        {(isLoading || isRefining) && (
          <motion.div 
            key="loader" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 5500,
              backgroundColor: '#f5f5f5',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2rem'
            }}
          >
            <div className="loader"></div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
              <span style={{ 
                fontWeight: 400, 
                color: 'var(--text-main)', 
                fontSize: '1.1rem', 
                fontFamily: 'var(--font-mono)', 
                textAlign: 'center', 
                maxWidth: '90%', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis' 
              }}>
                {dynamicLoadingText}
              </span>
              <button 
                className="agent-cancel-btn"
                onClick={handleCancelRequest}
                style={{
                  marginTop: '1rem',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#ef4444',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-body)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease'
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
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Arena;
