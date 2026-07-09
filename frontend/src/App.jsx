import { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, ArrowUp, Send, Layout, Zap, Boxes, Plus, Network, Layers, LineChart, PieChart, ChevronLeft, Grid, Paintbrush, Paperclip, GitBranch, Image as ImageIcon, PenTool, SlidersHorizontal, ArrowDown, History, X, MessageSquareDot, Table2, CalendarRange, Trash2, Info, Loader2, ScratchPad } from './googleIcons';
import Arena from './Arena';
import Auth from './Auth';
import Settings from './Settings';
import Help from './Help';
import Docs from './Docs';
import ProfileDropdown from './ProfileDropdown';
import Tutorial from './Tutorial';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { agentSuggestDiagramType, optimizePrompt } from './aiService';
import { isTrialMode, checkTrialStatus, completeTrial, trialSuggestDiagramType } from './trialService';


// Lander import removed
const DiagramsPage = () => {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [prompt, setPrompt] = useState(() => localStorage.getItem('arka_prompt') || '');
  const [isHovered, setIsHovered] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [showPinNotice, setShowPinNotice] = useState(false);
  const [viewState, setViewState] = useState(() => localStorage.getItem('arka_viewState') || 'input'); // 'input', 'loading', 'result', 'arena'
  const [suggestedType, setSuggestedType] = useState(() => localStorage.getItem('arka_diagramType') || null);
  const [agentSuggestion, setAgentSuggestion] = useState(null);
  const [suggestionError, setSuggestionError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [expandedCardType, setExpandedCardType] = useState(null);
  const [placeholderText, setPlaceholderText] = useState('Describe your flowchart...');
  const textareaRef = useRef(null);
  const pinNoticeTimerRef = useRef(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentDiagramId, setCurrentDiagramId] = useState(() => localStorage.getItem('arka_diagramId') || null);
  const suggestAbortControllerRef = useRef(null);
  const optimizeAbortControllerRef = useRef(null);
  const [showBrushMenu, setShowBrushMenu] = useState(false);
  const [highlightColor] = useState(() => {
    const colors = [
      '#D5F3D8', // Green
      '#A5F3FC', // Aqua
      '#FBCFE8', // Baby Pink
      '#FECACA'  // Light Red
    ];
    const lastIndexStr = localStorage.getItem('arka_highlight_index');
    let index = 0;
    if (lastIndexStr !== null) {
      index = parseInt(lastIndexStr, 10);
      if (isNaN(index)) index = 0;
    }
    if (!window.__arka_highlight_incremented) {
      window.__arka_highlight_incremented = true;
      const nextIndex = (index + 1) % colors.length;
      localStorage.setItem('arka_highlight_index', String(nextIndex));
      return colors[nextIndex];
    }
    return colors[index];
  });
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [animatingText, setAnimatingText] = useState(null);
  const [animationTokens, setAnimationTokens] = useState([]);
  const [staggerDelay, setStaggerDelay] = useState(0.015);

  // Tutorial state
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [showTutorialFinal, setShowTutorialFinal] = useState(false);

  const handleCancelSuggest = () => {
    if (suggestAbortControllerRef.current) {
      suggestAbortControllerRef.current.abort();
    }
    setViewState('input');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/auth');
      } else {
        setAuthLoading(false);
        // Check trial status from Firestore
        const trialActive = await checkTrialStatus(user.uid);
        setIsTutorialActive(trialActive);
        if (trialActive) {
          setTutorialStep(1);
          // Reset to input view for tutorial
          setViewState('input');
          setPrompt('');
          setSuggestedType(null);
          setAgentSuggestion(null);
          localStorage.removeItem('arka_last_mermaid_code');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('arka_prompt', prompt);
    localStorage.setItem('arka_viewState', viewState);
    if (suggestedType) localStorage.setItem('arka_diagramType', suggestedType);
    if (currentDiagramId) localStorage.setItem('arka_diagramId', currentDiagramId);
  }, [prompt, viewState, suggestedType, currentDiagramId]);

  const diagramTypes = [
    { id: 'flowchart', label: 'Flowcharts', icon: Network, color: '#000000' },
    { id: 'architecture', label: 'Architecture', icon: Layers, color: '#000000' },
    { id: 'sequence', label: 'Sequence', icon: MessageSquareDot, color: '#000000' },
    { id: 'erDiagram', label: 'ER Diagrams', icon: Table2, color: '#000000' },
    { id: 'gantt', label: 'Gantt Charts', icon: CalendarRange, color: '#000000' },
    { id: 'xy', label: 'XY Charts', icon: LineChart, color: '#000000' },
    { id: 'pie', label: 'Pie Charts', icon: PieChart, color: '#000000' }
  ];

  const isBetaDiagram = (id) => id !== 'flowchart' && id !== 'architecture' && id !== 'sequence' && id !== 'erDiagram';

  const openPinNotice = () => {
    setShowPinNotice(true);
    window.clearTimeout(pinNoticeTimerRef.current);
    pinNoticeTimerRef.current = window.setTimeout(() => setShowPinNotice(false), 2600);
  };

  // Auto-resize textarea to expand up to 184px (base 130px + 2 lines)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '130px';
      const newHeight = Math.max(130, Math.min(textareaRef.current.scrollHeight, 184));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [prompt]);

  // Animated Placeholder Typing Effect
  useEffect(() => {
    const phrases = ["flowchart...", "pie chart...", "architecture...", "XY chart..."];
    let currentPhraseIndex = 0;
    let isDeleting = false;
    let charIndex = 0;
    let typingTimeout;

    const typePlaceholder = () => {
      const currentPhrase = phrases[currentPhraseIndex];

      if (isDeleting) {
        setPlaceholderText(`Describe your design ${currentPhrase.substring(0, charIndex)}`);
        charIndex--;
      } else {
        setPlaceholderText(`Describe your design ${currentPhrase.substring(0, charIndex)}`);
        charIndex++;
      }

      let typingSpeed = isDeleting ? 40 : 80;

      if (!isDeleting && charIndex > currentPhrase.length) {
        isDeleting = true;
        typingSpeed = 2000; // Pause at end of word
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
        typingSpeed = 500; // Pause before typing new word
      }

      typingTimeout = setTimeout(typePlaceholder, typingSpeed);
    };

    typingTimeout = setTimeout(typePlaceholder, 100);
    return () => clearTimeout(typingTimeout);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(pinNoticeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!auth?.currentUser) return;

    setHistoryLoading(true);
    const q = query(collection(db, 'users', auth.currentUser.uid, 'diagrams'), orderBy('updatedAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoryItems(items);
      setHistoryLoading(false);
    }, (error) => {
      console.error("Error fetching history real-time:", error);
      setHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [isSidebarOpen, auth?.currentUser]);



  const handleOptimizePrompt = async () => {
    if (!prompt.trim() || isOptimizingPrompt || animatingText) return;

    setIsOptimizingPrompt(true);
    setSuggestionError('');

    const abortController = new AbortController();
    optimizeAbortControllerRef.current = abortController;

    try {
      const optimized = await optimizePrompt(prompt, abortController.signal);
      if (!optimized) {
        throw new Error("Could not optimize prompt.");
      }

      // Prepare animation tokens
      const useWords = optimized.length > 200;
      const tokens = useWords ? optimized.split(/(\s+)/) : Array.from(optimized);
      const delay = Math.min(1.2 / tokens.length, useWords ? 0.035 : 0.015);

      setAnimationTokens(tokens);
      setStaggerDelay(delay);
      setAnimatingText(optimized);
      setIsOptimizingPrompt(false);

      // Duration: total stagger delay + fade-in duration (0.5s)
      const durationMs = (tokens.length * delay * 1000) + 500;
      setTimeout(() => {
        setPrompt(optimized);
        setAnimatingText(null);
        setAnimationTokens([]);
      }, durationMs);

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("Optimize prompt request aborted.");
        setIsOptimizingPrompt(false);
        return;
      }
      console.error("Optimize prompt error:", err);
      setSuggestionError(err.message || "Failed to optimize prompt. Please try again.");
      setIsOptimizingPrompt(false);
    }
  };

  const handleCancelOptimize = () => {
    if (optimizeAbortControllerRef.current) {
      optimizeAbortControllerRef.current.abort();
      optimizeAbortControllerRef.current = null;
    }
    setIsOptimizingPrompt(false);
  };

  const handleBrushClick = (e) => {
    e.stopPropagation();
    if (isOptimizingPrompt) {
      handleCancelOptimize();
    } else if (!animatingText) {
      setShowBrushMenu(!showBrushMenu);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || viewState !== 'input') return;

    if (auth?.currentUser && historyItems.length >= 50) {
      alert("You have reached the 50 diagram limit. Please delete some diagrams from History to save new ones.");
      return;
    }

    setCurrentDiagramId(Date.now().toString());
    localStorage.removeItem('arka_last_mermaid_code');
    setSuggestedType(null);
    setAgentSuggestion(null);
    setExpandedCardType(null);
    setSuggestionError('');
    setViewState('loading');

    // Advance tutorial to loading step
    if (isTutorialActive && tutorialStep === 1) {
      setTutorialStep(2);
    }

    const abortController = new AbortController();
    suggestAbortControllerRef.current = abortController;

    try {
      // Use trial endpoint if in tutorial mode
      const suggestResult = isTutorialActive
        ? await trialSuggestDiagramType(prompt, abortController.signal)
        : await agentSuggestDiagramType(prompt, abortController.signal);
      const nextType = suggestResult?.suggestions?.[0]?.type || suggestResult?.suggested_type;
      if (!nextType) throw new Error('The selected AI model returned no diagram suggestions.');
      setSuggestedType(nextType);
      setAgentSuggestion(suggestResult || null);
      setViewState('result');

      // The request is asynchronous, so `tutorialStep` here can still be the
      // value captured before step 2 was rendered. Once a tutorial suggestion
      // succeeds, always advance to the catalogue spotlight.
      if (isTutorialActive) {
        setTutorialStep(3);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error("AI Error:", error);
      setSuggestionError(error.message || 'The selected AI model could not analyze this prompt.');
      setViewState('input');
      // Reset tutorial to step 1 on error
      if (isTutorialActive) {
        setTutorialStep(1);
      }
    }
  };

  const handleReset = () => {
    setPrompt('');
    setViewState('input');
    setSuggestedType(null);
    setAgentSuggestion(null);
    setSuggestionError('');
    setCurrentDiagramId(null);
    setShowAll(false);
    setExpandedCardType(null);
    localStorage.removeItem('arka_prompt');
    localStorage.removeItem('arka_last_mermaid_code');
    localStorage.removeItem('arka_diagramId');
    localStorage.removeItem('arka_viewState');
    localStorage.removeItem('arka_diagramType');
  };

  const handleProceed = () => {
    if (!suggestedType) return;
    localStorage.removeItem('arka_last_mermaid_code');
    // Advance tutorial to arena loading step
    if (isTutorialActive && (tutorialStep === 3 || tutorialStep === 4)) {
      setTutorialStep(5);
    }
    setViewState('arena');
  };

  const loadHistoryItem = (item) => {
    localStorage.setItem('arka_last_mermaid_code', item.code);
    localStorage.setItem('arka_prompt', item.prompt);
    setPrompt(item.prompt);
    setSuggestedType(item.diagramType);
    setCurrentDiagramId(item.id);
    setViewState('arena');
    setIsSidebarOpen(false);
  };

  const handleDeleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    if (!auth?.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'diagrams', id));
      setHistoryItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Error deleting history item:", err);
    }
  };

  const getDiagramIcon = (type) => {
    const dType = diagramTypes.find(d => d.id === type);
    return dType ? <dType.icon size={24} /> : <Network size={24} />;
  };

  const fastTransition = { type: "spring", stiffness: 450, damping: 30 };
  const hasText = prompt.length > 0;

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="diagrams-container">

      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* History Sidebar */}
      <aside className={`history-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="history-header">
          <h3 className="history-title">
            History
          </h3>
          <button onClick={() => setIsSidebarOpen(false)} className="close-sidebar-btn">
            <X size={20} />
          </button>
        </div>
        <div className="history-content">
          {historyLoading ? (
            <div className="history-loading">Loading...</div>
          ) : historyItems.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '38px', color: '#a1a1aa' }}>history</span>
              </div>
              <span>No diagrams generated yet.</span>
            </div>
          ) : (
            historyItems.map(item => (
              <div key={item.id} className="history-item" onClick={() => loadHistoryItem(item)}>
                <p className="history-item-time">
                  {item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleString() : new Date().toLocaleString()}
                </p>
                <h4 className="history-item-title">{item.prompt || 'Untitled Diagram'}</h4>
                <div className="history-item-preview">
                  {getDiagramIcon(item.diagramType)}
                </div>
                <button
                  className="history-item-delete"
                  onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                  title="Delete diagram"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <AnimatePresence mode="wait">
        {viewState === 'arena' ? (
          <motion.div
            key="arena-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="arena-full-page"
          >
            <Arena
              prompt={prompt}
              diagramType={suggestedType}
              diagramId={currentDiagramId}
              onBack={handleReset}
              onShowHistory={() => setIsSidebarOpen(true)}
              isTutorialActive={isTutorialActive}
              onTutorialDiagramReady={() => {
                if (isTutorialActive && tutorialStep === 5) {
                  setTutorialStep(6);
                  setShowTutorialFinal(true);
                }
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="planner-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="planner-wrapper"
          >
            {/* Top Navigation */}
            <header className="fixed-navbar">
              <div className="nav-left-group">

                {viewState === 'input' ? (
                  <div style={{ display: 'flex', alignItems: 'center', marginRight: '-0.17rem' }}>
                    <div
                      className="nav-expandable-group"
                      onMouseEnter={() => setIsNavHovered(true)}
                      onMouseLeave={() => setIsNavHovered(false)}
                    >
                      <button className="nav-btn-main" onClick={handleReset} title="New Diagram">
                        <Plus size={20} />
                      </button>
                      <button
                        className={`nav-btn-secondary ${isNavHovered ? 'visible' : ''}`}
                        onClick={() => setIsSidebarOpen(true)}
                        title="History"
                      >
                        HISTORY
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="nav-btn-main"
                      onClick={viewState === 'result' || viewState === 'loading' || viewState === 'arena' ? handleReset : undefined}
                      title="New Diagram"
                      style={{ borderRadius: '50%', height: '38px', border: '1px solid #e5e7eb' }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                  </div>
                )}

                {/* Logo or Suggestion Title */}
                {viewState === 'result' || viewState === 'loading' ? (
                  <span className="suggestion-title-updated" style={{ marginLeft: '1rem' }}>Ai suggested diagram/s</span>
                ) : (
                  <motion.div layout className="logo-wrapper" transition={fastTransition} style={{ transform: isHovered ? 'translateX(5px)' : 'translateX(0)' }}>
                    <span className="logo-arka">ARKA</span>
                    <span className="logo-diagrams">DIAGRAMS</span>
                  </motion.div>
                )}
              </div>

              <div className="nav-actions">
                {viewState === 'result' || viewState === 'loading' ? (
                  <button
                    className="show-all-header-btn"
                    onClick={() => {
                      const willShowAll = !showAll;
                      setShowAll(willShowAll);
                      if (isTutorialActive && tutorialStep === 3 && willShowAll) {
                        setTutorialStep(4);
                      }
                    }}
                    style={{
                      padding: '0.6rem 1.2rem',
                      borderRadius: '12px',
                      opacity: viewState === 'loading' ? 0.5 : 1,
                      pointerEvents: viewState === 'loading' ? 'none' : 'auto'
                    }}
                  >
                    <Grid size={18} /> {showAll ? "Hide All" : "Show all diagrams"}
                  </button>
                ) : (
                  <ProfileDropdown />
                )}
              </div>
            </header>

            <main className="diagrams-hero">
              <AnimatePresence mode="wait">
                {viewState === 'input' || viewState === 'loading' ? (
                  <motion.div
                    key="prompt-view"
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="hero-content"
                  >

                    {/* Hero Wrapper ensuring Prompt Box Centers exactly on the screen */}
                    <div className="hero-top-spacer">
                      <div className="hero-heading-area">
                        <motion.h1
                          initial={{ opacity: 0, y: 12 }}
                          animate={{
                            opacity: viewState === 'input' ? 1 : 0,
                            y: viewState === 'input' ? 0 : -10
                          }}
                          className="hero-prompt-title"
                          style={{
                            pointerEvents: viewState === 'input' ? 'auto' : 'none',
                            visibility: viewState === 'input' || viewState === 'loading' ? 'visible' : 'hidden'
                          }}
                        >
                          What are we building <span style={{ position: 'relative', display: 'inline-block', padding: '0 8px', isolation: 'isolate' }}>
                            <span style={{ position: 'absolute', bottom: '6px', left: 0, width: '100%', height: '9px', backgroundColor: highlightColor, transform: 'rotate(-2deg) skewX(12deg)', opacity: 0.8, zIndex: -1 }}></span>
                            <span style={{ position: 'relative', zIndex: 10 }}>today?</span>
                          </span>
                        </motion.h1>
                      </div>

                      <div className="prompt-container">
                        <AnimatePresence mode="popLayout">
                          {viewState === 'loading' ? (
                            <motion.div
                              key="loader-only"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="new-loader-container"
                              style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '100vw',
                                height: '100vh',
                                zIndex: 5000,
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
                                  Analyzing diagram types...
                                </span>
                                <button
                                  onClick={handleCancelSuggest}
                                  style={{
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
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="prompt-card"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              transition={{ type: "spring", stiffness: 260, damping: 26 }}
                              className="prompt-box-wrapper"
                            >
                              <div className={`prompt-box-main ${(isOptimizingPrompt || animatingText) ? 'optimizing' : ''}`}>
                                <div className="prompt-textarea-mask-container">
                                  <div className="prompt-textarea-fade-top"></div>
                                  <textarea
                                    ref={textareaRef}
                                    rows={1}
                                    placeholder={placeholderText}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (hasText && !isOptimizingPrompt && !animatingText) handleSubmit();
                                      }
                                    }}
                                    className={`prompt-input-textarea ${isOptimizingPrompt ? 'textarea-optimizing' : ''}`}
                                    style={{
                                      color: (isOptimizingPrompt || animatingText) ? 'transparent' : 'inherit',
                                      caretColor: (isOptimizingPrompt || animatingText) ? 'transparent' : 'auto',
                                    }}
                                    disabled={isOptimizingPrompt || !!animatingText}
                                  />
                                  {(isOptimizingPrompt || animatingText) && (
                                    <div className="prompt-animation-overlay">
                                      {isOptimizingPrompt && !animatingText && (
                                        <span className="prompt-blur-placeholder">
                                          {prompt}
                                        </span>
                                      )}
                                      {animatingText && (
                                        <>
                                          {animationTokens.map((token, idx) => (
                                            <span 
                                              key={idx} 
                                              className="polish-token" 
                                              style={{ 
                                                animationDelay: `${idx * staggerDelay}s` 
                                              }}
                                            >
                                              {token}
                                            </span>
                                          ))}
                                        </>
                                      )}
                                    </div>
                                  )}
                                  <div className="prompt-textarea-fade-bottom"></div>
                                </div>

                                <div className="prompt-bottom-toolbar">
                                   <div className="toolbar-left" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', position: 'relative' }}>
                                     <AnimatePresence mode="wait">
                                       {(!hasText || showPinNotice) ? (
                                         <motion.button
                                           key="paperclip"
                                           initial={{ opacity: 0, scale: 0.8 }}
                                           animate={{ opacity: 1, scale: 1 }}
                                           exit={{ opacity: 0, scale: 0.8 }}
                                           transition={{ duration: 0.15 }}
                                           className="tool-icon-btn"
                                           title="Attach context"
                                           type="button"
                                           onClick={openPinNotice}
                                         >
                                           <Paperclip size={17} />
                                         </motion.button>
                                       ) : (
                                         <motion.button
                                           key="brush"
                                           initial={{ opacity: 0, scale: 0.8 }}
                                           animate={{ opacity: 1, scale: 1 }}
                                           exit={{ opacity: 0, scale: 0.8 }}
                                           transition={{ duration: 0.15 }}
                                           className="tool-icon-btn"
                                           title={isOptimizingPrompt ? "Cancel Polish" : "AI Polish & Files"}
                                           type="button"
                                           onClick={handleBrushClick}
                                           disabled={!!animatingText}
                                           style={{
                                             color: (isOptimizingPrompt || animatingText) ? '#0ea5e9' : 'inherit',
                                            }}
                                         >
                                           {isOptimizingPrompt ? (
                                             <Loader2 className="spin" size={17} />
                                           ) : (
                                             <svg 
                                               xmlns="http://www.w3.org/2000/svg" 
                                               height="17" 
                                               viewBox="0 -960 960 960" 
                                               width="17" 
                                               fill="currentColor"
                                             >
                                               <path d="M240-120q-45 0-89-22t-71-58q26 0 53-20.5t27-59.5q0-50 35-85t85-35q50 0 85 35t35 85q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T320-280q0-17-11.5-28.5T280-320q-17 0-28.5 11.5T240-280q0 23-5.5 42T220-202q5 2 10 2h10Zm230-160L360-470l358-358q11-11 27.5-11.5T774-828l54 54q12 12 12 28t-12 28L470-360Zm-190 80Z"/>
                                             </svg>
                                           )}
                                         </motion.button>
                                       )}
                                     </AnimatePresence>

                                     <AnimatePresence>
                                       {showPinNotice && (
                                         <motion.div
                                           className="pin-notice-popover"
                                           initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                           animate={{ opacity: 1, y: 0, scale: 1 }}
                                           exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                           transition={{ duration: 0.16 }}
                                         >
                                           This feature is under development.
                                         </motion.div>
                                       )}
                                     </AnimatePresence>

                                     {showBrushMenu && (
                                       <>
                                         <div 
                                           style={{
                                             position: 'fixed',
                                             top: 0,
                                             left: 0,
                                             right: 0,
                                             bottom: 0,
                                             zIndex: 40,
                                             background: 'transparent',
                                             cursor: 'default'
                                           }} 
                                           onClick={() => setShowBrushMenu(false)}
                                         />
                                         <motion.div
                                           className="brush-menu-popover"
                                           initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                           animate={{ opacity: 1, y: 0, scale: 1 }}
                                           exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                           transition={{ duration: 0.16 }}
                                         >
                                           <button 
                                             className="brush-menu-item" 
                                             onClick={() => {
                                               setShowBrushMenu(false);
                                               handleOptimizePrompt();
                                             }}
                                           >
                                             <svg 
                                               xmlns="http://www.w3.org/2000/svg" 
                                               height="16" 
                                               viewBox="0 -960 960 960" 
                                               width="16" 
                                               fill="currentColor"
                                             >
                                               <path d="M240-120q-45 0-89-22t-71-58q26 0 53-20.5t27-59.5q0-50 35-85t85-35q50 0 85 35t35 85q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T320-280q0-17-11.5-28.5T280-320q-17 0-28.5 11.5T240-280q0 23-5.5 42T220-202q5 2 10 2h10Zm230-160L360-470l358-358q11-11 27.5-11.5T774-828l54 54q12 12 12 28t-12 28L470-360Zm-190 80Z"/>
                                             </svg>
                                             <span>Polish</span>
                                           </button>
                                           <button 
                                             className="brush-menu-item" 
                                             onClick={() => {
                                               setShowBrushMenu(false);
                                               openPinNotice();
                                             }}
                                           >
                                             <Paperclip size={16} />
                                             <span>Add files</span>
                                           </button>
                                         </motion.div>
                                       </>
                                     )}
                                   </div>
                                  <motion.button
                                    onClick={handleSubmit}
                                    whileTap={hasText ? { scale: 0.9 } : {}}
                                    disabled={!hasText || isOptimizingPrompt || !!animatingText}
                                    className={`submit-btn ${hasText && !isOptimizingPrompt && !animatingText ? 'active' : 'inactive'}`}
                                  >
                                    <Send size={18} />
                                  </motion.button>
                                </div>
                              </div>
                              {suggestionError && <div className="agent-suggestion-error">{suggestionError}</div>}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <p className="footer-hint">
                          ARKA AI can make mistakes. Verify important details.
                        </p>
                      </div>
                    </div>


                  </motion.div>
                ) : (
                  <motion.div
                    key="suggestion-view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={fastTransition}
                    className="suggestion-board"
                  >


                    <div className="suggestion-scroll-area">
                      {!showAll ? (
                        <div className="suggestion-highlight-container" style={{ width: '100%' }}>
                          <div className="suggested-diagrams-grid">
                            <AnimatePresence mode="popLayout">
                              {(() => {
                                const suggestionsList = [...(agentSuggestion?.suggestions || [])];
                                const isSuggestedTypeInSuggestions = suggestionsList.some(s => s.type === suggestedType);
                                if (suggestedType && !isSuggestedTypeInSuggestions) {
                                  suggestionsList.push({
                                    type: suggestedType,
                                    confidence: 0,
                                    reason: "Manually selected from the diagram list.",
                                    isManual: true
                                  });
                                }
                                return suggestionsList;
                              })()
                                .filter(suggestion => !expandedCardType || expandedCardType === suggestion.type)
                                .map((suggestion) => {
                                  const type = diagramTypes.find(item => item.id === suggestion.type);
                                  if (!type) return null;
                                  const Icon = type.icon;
                                  const isSelected = suggestedType === suggestion.type;
                                  const isExpanded = expandedCardType === suggestion.type;

                                  return (
                                    <motion.div
                                      key={suggestion.type}
                                      layout
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.9 }}
                                      transition={{ type: "spring", stiffness: 220, damping: 18 }}
                                      className={`type-card grid-card suggested-card-updated ${isSelected ? 'highlight-border' : ''} ${isExpanded ? 'expanded' : ''}`}
                                      onClick={() => {
                                        if (!isExpanded) {
                                          setSuggestedType(suggestion.type);
                                        }
                                      }}
                                    >
                                      <button
                                        className={`card-info-btn ${isExpanded ? 'btn-close-red' : 'btn-info-aqua'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedCardType(isExpanded ? null : suggestion.type);
                                        }}
                                        title={isExpanded ? "Close explanation" : "Show explanation"}
                                      >
                                        {isExpanded ? <X size={16} /> : <Info size={16} />}
                                      </button>

                                      <div className="icon-box-static" style={{ color: type.color }}>
                                        <Icon size={32} strokeWidth={1.5} />
                                      </div>
                                      <span className="type-label">{type.label}</span>

                                      {isExpanded && (
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.1 }}
                                          className="suggestion-expanded-content"
                                        >
                                          <div className="suggestion-confidence">
                                            Confidence: <span>{suggestion.isManual ? "Manual Selection" : `${Math.round(suggestion.confidence * 100)}%`}</span>
                                          </div>
                                          <p className="suggestion-explanation">{suggestion.reason}</p>
                                        </motion.div>
                                      )}
                                    </motion.div>
                                  );
                                })}
                            </AnimatePresence>
                          </div>

                          {!expandedCardType && (
                            <button className="confirm-btn" onClick={handleProceed} style={{ marginTop: '2rem' }}>Proceed</button>
                          )}
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="all-diagrams-grid"
                        >
                          {diagramTypes.map((type) => (
                            <motion.div
                              key={type.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`type-card grid-card ${suggestedType === type.id ? 'highlight-border' : ''}`}
                              onClick={() => {
                                setSuggestedType(type.id);
                                setShowAll(false);
                                if (isTutorialActive && tutorialStep === 4) {
                                  localStorage.removeItem('arka_last_mermaid_code');
                                  setTutorialStep(5);
                                  setViewState('arena');
                                }
                              }}
                            >
                              <div className="icon-box-static" style={{ color: type.color }}>
                                <type.icon size={32} strokeWidth={1.5} />
                                {isBetaDiagram(type.id) && <span className="beta-icon-badge">Beta</span>}
                              </div>
                              <span className="type-label">{type.label}</span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Tutorial Overlay */}
      {isTutorialActive && (tutorialStep === 1 || tutorialStep === 3 || (tutorialStep === 6 && showTutorialFinal)) && (
        <Tutorial
          step={tutorialStep}
          onGotIt={async () => {
            const uid = auth?.currentUser?.uid;
            await completeTrial(uid);
            setIsTutorialActive(false);
            setShowTutorialFinal(false);
            setTutorialStep(1);
          }}
        />
      )}
    </div>
  );
};

const handleTutorialGotIt = async (setIsTutorialActive, setShowTutorialFinal, setTutorialStep) => {
  const uid = auth?.currentUser?.uid;
  await completeTrial(uid);
  setIsTutorialActive(false);
  setShowTutorialFinal(false);
  setTutorialStep(1);
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/diagrams" replace />} />
        <Route path="/diagrams" element={<DiagramsPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
