import { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, ArrowUp, Send, Layout, Zap, Boxes, Plus, Network, Layers, LineChart, PieChart, ChevronLeft, Grid, Paintbrush, Paperclip, GitBranch, Image as ImageIcon, PenTool, SlidersHorizontal, ArrowDown, History, X, MessageSquareDot, Table2, CalendarRange, Trash2 } from './googleIcons';
import Arena from './Arena';
import Auth from './Auth';
import Settings from './Settings';
import Help from './Help';
import Docs from './Docs';
import ProfileDropdown from './ProfileDropdown';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { isBYOK, hasCredits, incrementCredits, suggestDiagramType, getSettings, getCreditsInfo } from './aiService';


// Lander import removed
const DiagramsPage = () => {
  const [prompt, setPrompt] = useState(() => localStorage.getItem('arka_prompt') || '');
  const [isHovered, setIsHovered] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPinNotice, setShowPinNotice] = useState(false);
  const [viewState, setViewState] = useState(() => localStorage.getItem('arka_viewState') || 'input'); // 'input', 'loading', 'result', 'arena'
  const [suggestedType, setSuggestedType] = useState(() => localStorage.getItem('arka_diagramType') || null);
  const [showAll, setShowAll] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('Describe your flowchart...');
  const textareaRef = useRef(null);
  const pinNoticeTimerRef = useRef(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentDiagramId, setCurrentDiagramId] = useState(() => localStorage.getItem('arka_diagramId') || null);

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

  const isBetaDiagram = (id) => id !== 'flowchart' && id !== 'architecture';

  const openPinNotice = () => {
    setShowPinNotice(true);
    window.clearTimeout(pinNoticeTimerRef.current);
    pinNoticeTimerRef.current = window.setTimeout(() => setShowPinNotice(false), 2600);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt, viewState]);

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

  const [showLimitModal, setShowLimitModal] = useState(false);
  const settingsNav = useNavigate();

  const handleSubmit = async () => {
    if (!prompt.trim() || viewState !== 'input') return;
    
    if (auth?.currentUser && historyItems.length >= 50) {
      alert("You have reached the 50 diagram limit. Please delete some diagrams from History to save new ones.");
      return;
    }

    // Credit gate: if free tier and no credits left, show limit modal
    const settings = getSettings();
    if (settings.providerType === 'free') {
      const canGenerate = await hasCredits();
      if (!canGenerate) {
        setShowLimitModal(true);
        return;
      }
    }

    setCurrentDiagramId(Date.now().toString());
    localStorage.removeItem('arka_last_mermaid_code');
    localStorage.removeItem('arka_vision_prompt');
    setViewState('loading');
    
    try {
      // Try BYOK suggest first
      const byokResult = await suggestDiagramType(prompt);
      if (byokResult) {
        // BYOK path — got result directly
        setSuggestedType(byokResult.category || 'flowchart');
        setViewState('result');
        return;
      }

      // Free tier path — use backend
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      setSuggestedType(data.category || 'flowchart');
      setViewState('result');
      
      // Increment credits for free tier
      await incrementCredits();
      
    } catch (error) {
      console.error("AI Error:", error);
      setSuggestedType('flowchart');
      setViewState('result');
    }
  };

  const handleReset = () => {
    setPrompt('');
    setViewState('input');
    setSuggestedType(null);
    setCurrentDiagramId(null);
    setShowAll(false);
    localStorage.removeItem('arka_prompt');
    localStorage.removeItem('arka_last_mermaid_code');
    localStorage.removeItem('arka_diagramId');
    localStorage.removeItem('arka_viewState');
    localStorage.removeItem('arka_diagramType');
  };

  const loadHistoryItem = (item) => {
    localStorage.setItem('arka_last_mermaid_code', item.code);
    localStorage.setItem('arka_prompt', item.prompt);
    localStorage.setItem('arka_vision_prompt', item.visionPrompt || '');
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
  const hasText = prompt.trim().length > 0;

  return (
    <div className="diagrams-container">
      {/* ─── Credit Limit Modal ─── */}
      <AnimatePresence>
        {showLimitModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={() => setShowLimitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#fff', borderRadius: '1.25rem', padding: '2rem', maxWidth: '420px', width: '100%', textAlign: 'center', border: '1px solid #e5e7eb' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚡</div>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Free Credits Used Up</h3>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem', fontFamily: 'var(--font-mono)' }}>
                You've used all 3 free generations. Add your own API key (Gemini or Sarvam) or run a local model to keep generating — unlimited.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                <button onClick={() => { setShowLimitModal(false); settingsNav('/settings'); }} style={{
                  padding: '0.85rem', borderRadius: '0.75rem', background: '#000', color: '#fff', border: 'none',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)'
                }}>
                  Add API Key →
                </button>
                {!auth?.currentUser && (
                  <button onClick={() => { setShowLimitModal(false); settingsNav('/auth'); }} style={{
                    padding: '0.75rem', borderRadius: '0.75rem', background: '#f3f4f6', color: '#000', border: '1px solid #e5e7eb',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-sans)'
                  }}>
                    Sign in first
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* History Sidebar */}
      <aside className={`history-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="history-header">
          <h3 className="history-title">
            <History size={20} /> History
          </h3>
          <button onClick={() => setIsSidebarOpen(false)} className="close-sidebar-btn">
            <X size={20} />
          </button>
        </div>
        <div className="history-content">
          {historyLoading ? (
            <div className="history-loading">Loading...</div>
          ) : historyItems.length === 0 ? (
            <div className="history-empty">No diagrams saved yet.</div>
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
                 
                 {/* No button on left for prompt area */}
                 {viewState === 'input' ? null : (
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
                      onClick={() => setShowAll(!showAll)}
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
                          What are we building <span style={{position: 'relative', display: 'inline-block', padding: '0 8px'}}>
                            <span style={{position: 'relative', zIndex: 10}}>today?</span>
                            <span style={{position: 'absolute', bottom: '6px', left: 0, width: '100%', height: '9px', background: 'var(--accent)', zIndex: -1, transform: 'rotate(-2deg) skewX(12deg)', opacity: 0.8}}></span>
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
                                 backdropFilter: 'none',
                                 WebkitBackdropFilter: 'none',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center'
                               }}
                             >
                                <div className="loader"></div>
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
                               <div className="prompt-box-main">
                                 <textarea 
                                   ref={textareaRef}
                                   rows={1}
                                   placeholder={placeholderText}
                                   value={prompt}
                                   onChange={(e) => setPrompt(e.target.value)}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter' && !e.shiftKey) {
                                       e.preventDefault();
                                       if (hasText) handleSubmit();
                                     }
                                   }}
                                   className="prompt-input-textarea"
                                 />
                                 
                                 <div className="prompt-bottom-toolbar">
                                    <div className="toolbar-left" style={{ display: 'flex', gap: '0.25rem' }}>
                                       <button
                                         className="tool-icon-btn"
                                         title="Attach context"
                                         type="button"
                                         onClick={openPinNotice}
                                       >
                                          <Paperclip size={20} />
                                       </button>
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
                                    </div>
                                    <motion.button 
                                      onClick={handleSubmit}
                                      whileTap={hasText ? { scale: 0.9 } : {}}
                                      disabled={!hasText}
                                      className={`submit-btn ${hasText ? 'active' : 'inactive'}`}
                                    >
                                      <Send size={22} />
                                    </motion.button>
                                 </div>
                               </div>
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
                        <div className="suggestion-highlight-container">
                            <motion.div
                              layoutId={suggestedType}
                              className="type-card suggested"
                              style={{ borderColor: diagramTypes.find(t => t.id === suggestedType)?.color }}
                            >
                              <div className="icon-box-static" style={{ color: diagramTypes.find(t => t.id === suggestedType)?.color }}>
                                 {(() => {
                                    const Icon = diagramTypes.find(t => t.id === suggestedType)?.icon;
                                    return Icon ? (
                                      <>
                                        <Icon size={40} strokeWidth={1.2} />
                                        {isBetaDiagram(suggestedType) && <span className="beta-icon-badge">Beta</span>}
                                      </>
                                    ) : null;
                                 })()}
                              </div>
                              <span className="type-label">{diagramTypes.find(t => t.id === suggestedType)?.label}</span>
                            </motion.div>
                            
                            <button className="confirm-btn" onClick={() => setViewState('arena')}>Confirm Generation</button>
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
                              onClick={() => { setSuggestedType(type.id); setShowAll(false); }}
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
    </div>
  );
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
