import { useState, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";
import { Play, Code, LayoutTemplate, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GanttChart } from "./components/GanttChart";
import { parseGsapCode } from "./lib/gsapMock";
import { ParsedTimeline } from "./lib/types";

const DEFAULT_CODE = `const chars = gsap.utils.toArray('.char');
const lines = gsap.utils.toArray('.line');

const tl = gsap.timeline({ delay: 0.25 });

tl.to('.progress-bar', { scaleX: 1, duration: 2 })
  .to('.progress-bar', { scaleX: 0, duration: 1 });

chars.forEach((char, index) => {
  tl.to(char, {
    yPercent: 0,
    duration: 1,
    delay: index * 0.1
  }, "-=2");
});

tl.to(lines, {
  yPercent: 0,
  duration: 1,
  stagger: 0.1
}, "-=1");
`;

const DEFAULT_HTML = `<div class="progress-bar"></div>
<div class="title">
  <span class="char">H</span>
  <span class="char">E</span>
  <span class="char">L</span>
  <span class="char">L</span>
  <span class="char">O</span>
</div>
<div class="content">
  <p class="line">This is the first line.</p>
  <p class="line">This is the second line.</p>
  <p class="line">This is the third line.</p>
</div>`;

export default function App() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [htmlCode, setHtmlCode] = useState<string>(DEFAULT_HTML);
  const [activeTab, setActiveTab] = useState<"js" | "html">("js");
  const [timelines, setTimelines] = useState<ParsedTimeline[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = () => {
    setIsParsing(true);
    setTimelines([]);
    
    // Slight artificial delay to indicate work to user
    setTimeout(() => {
      try {
        setError(null);
        const parsed = parseGsapCode(code, htmlCode);
        if (parsed.length === 0) {
          setError("No timelines found. Make sure you are using gsap.timeline().");
        }
        setTimelines(parsed);
      } catch (err: any) {
        setError(err.message || "Failed to parse code.");
      } finally {
        setIsParsing(false);
      }
    }, 400);
  };

  // Run once on mount
  useEffect(() => {
    handleParse();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-claude-bg)] flex flex-col font-sans text-[var(--color-claude-text)]">
      <header className="px-8 py-5 flex items-center justify-between border-b border-[var(--color-claude-border)]">
        <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-[var(--color-claude-accent)]" />
            <h1 className="text-2xl font-serif font-medium tracking-tight">GSAP Visualizer</h1>
        </div>
        <a 
            href="https://greensock.com/docs/v3/GSAP/Timeline" 
            target="_blank" rel="noreferrer"
            className="text-sm font-medium text-[var(--color-claude-muted)] hover:text-[var(--color-claude-text)] transition-colors"
        >
            GSAP Docs →
        </a>
      </header>

      <main className="flex-1 p-8 flex flex-col gap-12 max-w-[1200px] mx-auto w-full">
        {/* Top Section: Editor & Controls */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#1e1e1e] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px] ring-1 ring-black/5">
            {/* Header & Example Select */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('js')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'js' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                    >
                        <Code className="w-4 h-4" />
                        JS Code
                    </button>
                    <button 
                        onClick={() => setActiveTab('html')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'html' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                    >
                        <LayoutTemplate className="w-4 h-4" />
                        HTML DOM (Optional)
                    </button>
                </div>
            </div>
            
            {/* Monaco Container */}
            <div className="flex-1 w-full relative">
                <div className={`absolute inset-0 ${activeTab === 'js' ? 'block' : 'hidden'}`}>
                    <MonacoEditor
                        height="100%"
                        language="javascript"
                        theme="vs-dark"
                        value={code}
                        onChange={(val) => setCode(val || "")}
                        options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 14,
                            fontFamily: "'JetBrains Mono', monospace",
                            padding: { top: 16 }
                        }}
                    />
                </div>
                <div className={`absolute inset-0 ${activeTab === 'html' ? 'block' : 'hidden'}`}>
                    <MonacoEditor
                        height="100%"
                        language="html"
                        theme="vs-dark"
                        value={htmlCode}
                        onChange={(val) => setHtmlCode(val || "")}
                        options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 14,
                            fontFamily: "'JetBrains Mono', monospace",
                            padding: { top: 16 }
                        }}
                    />
                </div>
            </div>
          </div>

          <button 
            id="parse-btn"
            onClick={handleParse}
            disabled={isParsing}
            className={`w-full text-white font-medium py-3.5 px-4 rounded-xl transition-all focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-claude-accent)] flex items-center justify-center gap-2 outline-none shadow-sm ${isParsing ? 'bg-[var(--color-claude-accent)]/80 cursor-wait' : 'bg-[var(--color-claude-accent)] hover:bg-[var(--color-claude-accent-hover)]'}`}
          >
            {isParsing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                Parsing...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Parse Timeline
              </>
            )}
          </button>

          {error && (
              <div className="bg-red-50 text-red-800 border border-red-200/60 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                    <span className="text-sm font-semibold">Parse Error</span>
                  </div>
                  <div className="text-sm font-medium font-mono bg-white p-3 rounded-lg border border-red-100 break-all">
                      {error}
                  </div>
              </div>
          )}
        </div>

        {/* Bottom Section: Visualizer */}
        <div className="flex flex-col gap-8 w-full pb-12 min-h-[400px]">
           <AnimatePresence mode="wait">
             {isParsing ? (
                 <motion.div 
                   key="parsing"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="bg-[var(--color-claude-card)] rounded-2xl border border-[var(--color-claude-border)] h-[400px] flex items-center justify-center flex-col text-[var(--color-claude-muted)] gap-4 p-8 text-center shadow-sm"
                 >
                     <div className="bg-[var(--color-claude-bg)] p-4 rounded-full border border-[var(--color-claude-border)] shadow-sm animate-pulse">
                         <Loader2 className="w-8 h-8 opacity-60 animate-spin" />
                     </div>
                     <div className="max-w-md mt-2">
                         <h3 className="text-lg font-serif font-medium text-[var(--color-claude-text)] mb-2">Analyzing your code...</h3>
                         <p className="text-sm leading-relaxed text-[var(--color-claude-muted)]/80">
                            Extracting tweens, calculating durations and offsets.
                         </p>
                     </div>
                 </motion.div>
             ) : timelines.length > 0 ? (
                 <motion.div
                   key="timeline"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.4 }}
                   className="flex flex-col gap-8 w-full"
                 >
                   {timelines.map((tl, index) => (
                       <GanttChart key={index} timeline={tl} />
                   ))}
                 </motion.div>
             ) : (
                 <motion.div 
                   key="empty"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="bg-[var(--color-claude-card)] rounded-2xl border border-[var(--color-claude-border)] h-[400px] flex items-center justify-center flex-col text-[var(--color-claude-muted)] gap-4 p-8 text-center shadow-sm"
                 >
                     <div className="bg-[var(--color-claude-bg)] p-4 rounded-full border border-[var(--color-claude-border)]">
                         <LayoutTemplate className="w-8 h-8 opacity-60" />
                     </div>
                     <div className="max-w-md">
                         <h3 className="text-lg font-serif font-medium text-[var(--color-claude-text)] mb-2">No timelines active</h3>
                         <p className="text-sm leading-relaxed">
                            Paste your GSAP Javascript code, optionally provide HTML DOM elements, and hit parse to visualize your animation timing.
                         </p>
                     </div>
                 </motion.div>
             )}
           </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
