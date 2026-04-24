import { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, ArrowUp, Layout, Zap, Boxes, Plus, Network, Layers, LineChart, PieChart, ChevronLeft, Grid, Paintbrush, ImagePlus, Paperclip, GitBranch, Image as ImageIcon, PenTool, SlidersHorizontal, ArrowDown, History, X, MessageSquareDot, Table2, CalendarRange } from 'lucide-react';
import Arena from './Arena';


const Lander = () => {
  const [compatWarning, setCompatWarning] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIE = ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    
    if (isIE) {
      setCompatWarning("Internet Explorer is not supported. Please use Chrome, Edge, or Firefox.");
    } else if (isSafari && !ua.includes('Version/16') && !ua.includes('Version/17')) {
      setCompatWarning("Your version of Safari may have issues rendering complex diagrams. Chrome or Edge is recommended.");
    }
  }, []);

  return (
    <div className="lander-container minimalist">
      {compatWarning && (
        <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="compat-banner unsupported">
          <Zap size={16} /> {compatWarning}
        </motion.div>
      )}
      <main className="lander-minimalist">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Link to="/diagrams" className="lander-link" id="lander-entry">
             ARKA DIAGRAMS
             <ArrowUp size={28} className="link-icon" />
          </Link>
        </motion.div>
      </main>
    </div>
  );
};

const DiagramsPage = () => {
  const [prompt, setPrompt] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewState, setViewState] = useState('input'); // 'input', 'loading', 'result', 'arena'
  const [suggestedType, setSuggestedType] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('Describe your flowchart...');
  const textareaRef = useRef(null);

  const diagramTypes = [
    { id: 'flowchart', label: 'Flowcharts', icon: Network, color: '#000000' },
    { id: 'architecture', label: 'Architecture', icon: Layers, color: '#000000' },
    { id: 'sequence', label: 'Sequence', icon: MessageSquareDot, color: '#000000' },
    { id: 'erDiagram', label: 'ER Diagrams', icon: Table2, color: '#000000' },
    { id: 'gantt', label: 'Gantt Charts', icon: CalendarRange, color: '#000000' },
    { id: 'xy', label: 'XY Charts', icon: LineChart, color: '#000000' },
    { id: 'pie', label: 'Pie Charts', icon: PieChart, color: '#000000' },
    { id: 'mindmap', label: 'Mindmaps', icon: GitBranch, color: '#000000' }
  ];

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

  const handleSubmit = async () => {
    if (!prompt.trim() || viewState !== 'input') return;
    
    setViewState('loading');
    
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        console.error('Suggest API returned error status:', response.status);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const category = data.category || 'flowchart';
      
      setSuggestedType(category);
      setViewState('result');
      
    } catch (error) {
      console.error("AI Error:", error);
      setSuggestedType('flowchart');
      setViewState('result');
    }
  };

  const handleReset = () => {
    setViewState('input');
    setSuggestedType(null);
    setShowAll(false);
  };

  const fastTransition = { type: "spring", stiffness: 450, damping: 30 };
  const hasText = prompt.trim().length > 0;

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
            <History size={20} /> History
          </h3>
          <button onClick={() => setIsSidebarOpen(false)} className="close-sidebar-btn">
            <X size={20} />
          </button>
        </div>
        <div className="history-content">
          <div className="history-item">
            <p className="history-item-time">Today, 10:42 AM</p>
            <h4 className="history-item-title">AWS Microservices Architecture</h4>
            <div className="history-item-preview">
              <Network size={24} />
            </div>
          </div>
          <div className="history-item">
            <p className="history-item-time">Yesterday</p>
            <h4 className="history-item-title">User Auth Flowchart</h4>
            <div className="history-item-preview">
              <GitBranch size={24} />
            </div>
          </div>
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
                 
                 {/* Expandable Add/History Split Pill Group */}
                 <div className="nav-expandable-group"
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={() => setIsHovered(false)}
                 >
                    <button 
                      className="nav-btn-main" 
                      onClick={viewState === 'result' || viewState === 'loading' ? handleReset : undefined}
                      >
                      {viewState === 'result' || viewState === 'loading' ? <ChevronLeft size={16} /> : <Plus size={16} />}
                    </button>
                    
                    <button className="nav-btn-secondary" onClick={() => setIsSidebarOpen(true)}>
                      History
                    </button>
                 </div>
                 
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
                      <Grid size={15} /> {showAll ? "Hide All" : "Show all diagrams"}
                    </button>
                  ) : (
                    <button className="profile-btn">
                      <User size={14} />
                    </button>
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
                                       <button className="tool-icon-btn" title="Upload Image or Diagram">
                                          <ImagePlus size={20} />
                                       </button>
                                       <button className="tool-icon-btn" title="Attach context">
                                          <Paperclip size={20} />
                                       </button>
                                    </div>
                                    <motion.button 
                                      onClick={handleSubmit}
                                      whileTap={hasText ? { scale: 0.9 } : {}}
                                      disabled={!hasText}
                                      className={`submit-btn ${hasText ? 'active' : 'inactive'}`}
                                    >
                                      <ArrowUp size={20} strokeWidth={2.5} />
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

                    {/* ONLY shown when actively taking prompt input - scrolls down perfectly */}
                    {viewState === 'input' && (
                       <motion.div 
                         initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                         className="lander-features-wrapper"
                       >
                          {/* DIAGRAM SUPPORT MARQUEE */}
                          <section className="marquee-section">
                              <p className="marquee-title">The Complete Toolset</p>
                              <div className="marquee-container">
                                  <div className="marquee-content">
                                      {/* Set 1 */}
                                      <span className="marquee-item"><div className="marquee-dot"></div> Sequence</span>
                                      <span className="marquee-item">State</span>
                                      <span className="marquee-item">Class</span>
                                      <span className="marquee-item">Entity-Relationship</span>
                                      <span className="marquee-item">User Journey</span>
                                      <span className="marquee-item">Gantt</span>
                                      <span className="marquee-item">Requirement</span>
                                      <span className="marquee-item">Gitgraph</span>
                                      <span className="marquee-item">Mindmap</span>
                                      <span className="marquee-item">Timeline</span>
                                      <span className="marquee-item">C4 Model</span>
                                      <span className="marquee-item">Quadrant</span>
                                      <span className="marquee-item">ZenUML</span>
                                      <span className="marquee-item">Sankey</span>
                                      {/* Duplicate Set for smooth infinite loop */}
                                      <span className="marquee-item"><div className="marquee-dot"></div> Sequence</span>
                                      <span className="marquee-item">State</span>
                                      <span className="marquee-item">Class</span>
                                      <span className="marquee-item">Entity-Relationship</span>
                                      <span className="marquee-item">User Journey</span>
                                      <span className="marquee-item">Gantt</span>
                                      <span className="marquee-item">Requirement</span>
                                      <span className="marquee-item">Gitgraph</span>
                                      <span className="marquee-item">Mindmap</span>
                                      <span className="marquee-item">Timeline</span>
                                      <span className="marquee-item">C4 Model</span>
                                      <span className="marquee-item">Quadrant</span>
                                      <span className="marquee-item">ZenUML</span>
                                      <span className="marquee-item">Sankey</span>
                                  </div>
                              </div>
                          </section>

                          {/* FEATURES SECTION (Bento Box Style) */}
                          <section className="bento-section">
                              <div className="bento-header">
                                  <h3>From thought to visualization.</h3>
                                  <p>Powered by advanced AI and native Mermaid engine, Arka understands your intent, sketches, and manual edits to create flawless technical architecture.</p>
                              </div>

                              <div className="bento-grid">
                                  {/* Feature 1 */}
                                  <div className="bento-card col-span-2">
                                      <div className="bento-icon-wrapper"><Zap size={24} /></div>
                                      <h4>The Optimized Core</h4>
                                      <p>While we support the entire Mermaid library, we've fine-tuned our AI to generate structural perfection for the four most critical diagrams used by engineering teams.</p>
                                      <div className="bento-tags">
                                          <div className="bento-tag"><GitBranch size={16} /> Flowcharts</div>
                                          <div className="bento-tag"><Network size={16} /> Architecture</div>
                                          <div className="bento-tag"><PieChart size={16} /> Pie Charts</div>
                                          <div className="bento-tag"><LineChart size={16} /> XY Charts</div>
                                      </div>
                                  </div>

                                  {/* Feature 2 */}
                                  <div className="bento-card">
                                      <h4 style={{textAlign: 'center', marginBottom: '1.5rem'}}>How It Generates</h4>
                                      <div className="process-flow">
                                          <div className="process-step">1. User Prompt</div>
                                          <ArrowDown className="process-arrow" size={16} />
                                          <div className="process-step">2. AI Intent Engine</div>
                                          <ArrowDown className="process-arrow" size={16} style={{ animationDelay: '0.5s' }} />
                                          <div className="process-step">3. Syntax Builder</div>
                                          <ArrowDown className="process-arrow" size={16} style={{ animationDelay: '1s' }} />
                                          <div className="process-step dark">4. Rendered Chart</div>
                                      </div>
                                  </div>

                                  {/* Feature 3 */}
                                  <div className="bento-card">
                                      <div className="bento-icon-wrapper"><ImageIcon size={24} /></div>
                                      <h4>Sketch to Diagram</h4>
                                      <p>Upload a whiteboard photo or hand-drawn sketch. Add an optional prompt, and watch the AI instantly convert it into a clean, editable digital diagram.</p>
                                  </div>

                                  {/* Feature 4 */}
                                  <div className="bento-card">
                                      <div className="bento-icon-wrapper"><PenTool size={24} /></div>
                                      <h4>Draw & Co-create</h4>
                                      <p>Start drawing manually on our canvas. If you get stuck midway, our AI can analyze your progress and automatically complete the structure for you.</p>
                                  </div>

                                  {/* Feature 5 */}
                                  <div className="bento-card">
                                      <div className="bento-icon-wrapper"><SlidersHorizontal size={24} /></div>
                                      <h4>Infinite Editing</h4>
                                      <p>Generation is just the beginning. Manually tweak nodes, reroute connections, or prompt the AI to make specific localized adjustments to your chart.</p>
                                  </div>
                              </div>
                          </section>

                          {/* Footer */}
                          <footer className="lander-footer">
                              <div className="footer-content">
                                  <div className="footer-logo">ARKA <span className="logo-diagrams" style={{fontSize: '0.5rem', marginLeft: '0.2rem'}}>DIAGRAMS</span></div>
                                  <div className="footer-copy">&copy; 2024. All rights reserved.</div>
                                  <div className="footer-links">
                                      <a href="#">Documentation</a>
                                      <a href="#">Mermaid Guide</a>
                                      <a href="#">Support</a>
                                  </div>
                              </div>
                          </footer>

                       </motion.div>
                    )}
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
                                    return Icon ? <Icon size={40} strokeWidth={1.2} /> : null;
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

function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Lander />} />
          <Route path="/diagrams" element={<DiagramsPage />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

export default App;