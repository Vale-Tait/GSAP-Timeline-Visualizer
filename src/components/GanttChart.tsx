import React, { useState, useMemo, useRef, useEffect } from "react";
import { ParsedTimeline, ParsedItem } from "../lib/types";
import { cn } from "../lib/utils";

interface GanttChartProps {
  timeline: ParsedTimeline;
  key?: React.Key | number | string;
}

export function GanttChart({ timeline }: GanttChartProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [scrubberTime, setScrubberTime] = useState<number>(0);
  const containerRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const duration = Math.max(timeline.totalDuration, 1); // at least 1s wide
  const SVG_WIDTH = 900;
  const pixelsPerSecond = SVG_WIDTH / duration;

  // Group by insertion order is fine, but maybe let's just list items.
  // We only want to list "tween" items as rows, labels as markers.
  const tweens = timeline.items.filter(item => item.type === "tween");
  const labels = timeline.items.filter(item => item.type === "label");

  const ROW_HEIGHT = 40;
  const HEADER_HEIGHT = 40;
  
  // Dynamically calculate LABEL_OFFSET based on the longest target name (approx 8px per char + 40px padding)
  const maxTargetLength = tweens.length > 0 ? Math.max(...tweens.map(t => String(t.target || '').length)) : 10;
  const LABEL_OFFSET = Math.min(Math.max(maxTargetLength * 8 + 40, 120), 500);

  const totalHeight = HEADER_HEIGHT + tweens.length * ROW_HEIGHT + 20;

  // Handle Scrubber Drag
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateScrubber(e.clientX);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateScrubber(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const updateScrubber = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left - LABEL_OFFSET, SVG_WIDTH));
    const time = x / pixelsPerSecond;
    setScrubberTime(time);
  };

  // Generate ticks every 0.1, 0.5, or 1s depending on duration
  const tickInterval = duration > 10 ? 1 : duration > 2 ? 0.5 : 0.1;
  const ticks = [];
  for (let i = 0; i <= duration + tickInterval; i += tickInterval) {
    ticks.push(i);
  }

  const activeTweens = useMemo(() => {
    return tweens.filter(
      (t) => scrubberTime >= t.startTime && scrubberTime <= t.endTime
    );
  }, [scrubberTime, tweens]);

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="flex items-center justify-between">
         <h3 className="text-xl font-serif font-medium text-[var(--color-claude-text)]">Timeline Visualization</h3>
         <div className="font-mono text-sm bg-[var(--color-claude-card)] border border-[var(--color-claude-border)] px-4 py-1.5 rounded-full text-[var(--color-claude-muted)] shadow-sm">
           Total Duration: <span className="text-[var(--color-claude-text)] font-semibold">{timeline.totalDuration.toFixed(2)}s</span>
         </div>
      </div>

      <div 
        className="w-full overflow-x-auto relative rounded-2xl border border-[var(--color-claude-border)] bg-[var(--color-claude-card)] shadow-sm"
        style={{ minHeight: '300px' }}
      >
        <div style={{ paddingBottom: '20px' }}>
            <svg
            width={SVG_WIDTH + LABEL_OFFSET + 20}
            height={totalHeight}
            className="select-none cursor-crosshair"
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            >
            <g transform={`translate(${LABEL_OFFSET}, 0)`}>
                {/* Header / Grid Lines */}
                {ticks.map((tick) => (
                <g key={tick} transform={`translate(${tick * pixelsPerSecond}, 0)`}>
                    <line
                    y1={HEADER_HEIGHT - 5}
                    y2={totalHeight}
                    stroke="var(--color-claude-border)"
                    strokeWidth={1}
                    />
                    <text
                    y={HEADER_HEIGHT - 10}
                    textAnchor="middle"
                    className="text-[10px] fill-[var(--color-claude-muted)] font-mono"
                    >
                    {tick.toFixed(1)}s
                    </text>
                </g>
                ))}

                {/* Labels Markers */}
                {labels.map((label) => (
                <g key={label.id} transform={`translate(${label.startTime * pixelsPerSecond}, ${HEADER_HEIGHT / 2})`}>
                    <line
                    y1={0}
                    y2={totalHeight}
                    stroke="#dda058"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    />
                    <polygon points="0,0 -4,5 4,5" fill="#dda058" />
                    <text
                    x={4}
                    y={12}
                    className="text-[10px] fill-[#dda058] font-medium"
                    >
                    {label.labelName}
                    </text>
                </g>
                ))}

                {/* Tween Bars */}
                {tweens.map((tween, idx) => {
                const isSelected = selectedItemId === tween.id;
                const isActive = activeTweens.some(t => t.id === tween.id);
                const y = HEADER_HEIGHT + idx * ROW_HEIGHT;
                const width = Math.max((tween.endTime - tween.startTime) * pixelsPerSecond, 2); // At least 2px for zero duration
                const x = tween.startTime * pixelsPerSecond;

                return (
                    <g 
                        key={tween.id} 
                        transform={`translate(0, ${y})`}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() => setSelectedItemId(tween.id)}
                    >
                    {/* Background Row Track */}
                    <rect
                        x={-LABEL_OFFSET + 10}
                        y={4}
                        width={SVG_WIDTH + LABEL_OFFSET}
                        height={ROW_HEIGHT - 8}
                        className={cn("fill-transparent transition-colors", isSelected && "fill-[#fdfaf6]")}
                    />
                    {/* Target Name */}
                    <text
                        x={-LABEL_OFFSET + 10}
                        y={ROW_HEIGHT / 2 + 4}
                        className="text-[13px] fill-[var(--color-claude-text)] font-mono truncate"
                        width={LABEL_OFFSET - 20}
                        clipPath={`url(#clip-label-${tween.id})`}
                        style={{ pointerEvents: 'none' }}
                    >
                        <title>{tween.target}</title>
                        {tween.target}
                    </text>
                    
                    <clipPath id={`clip-label-${tween.id}`}>
                        <rect x={-LABEL_OFFSET} y={0} width={LABEL_OFFSET - 20} height={ROW_HEIGHT} />
                    </clipPath>

                    {/* Colored Bar */}
                    <rect
                        x={x}
                        y={6}
                        width={width}
                        height={ROW_HEIGHT - 12}
                        rx={6}
                        className={cn(
                        "transition-all",
                        isActive ? "fill-[var(--color-claude-accent)]" : "fill-[var(--color-claude-border)]",
                        tween.duration === 0 && "fill-[#8e8d8a]"
                        )}
                    />
                    
                    {/* Method Badge (to/from/set) */}
                    {width > 40 && (
                        <text
                        x={x + 8}
                        y={ROW_HEIGHT / 2 + 3}
                        className={cn("text-[10px] font-medium uppercase tracking-wider", isActive ? "fill-white" : "fill-[var(--color-claude-text)]")}
                        style={{ pointerEvents: 'none' }}
                        >
                        {tween.method}
                        </text>
                    )}
                    </g>
                );
                })}

                {/* Scrubber Interaction Layer (Now just visual wrapper) */}
                <rect
                    x={0}
                    y={HEADER_HEIGHT}
                    width={SVG_WIDTH}
                    height={totalHeight - HEADER_HEIGHT}
                    fill="transparent"
                    className="cursor-ew-resize"
                    style={{ pointerEvents: 'none' }}
                />

                {/* Scrubber Line */}
                <g 
                    transform={`translate(${scrubberTime * pixelsPerSecond}, 0)`}
                    style={{ pointerEvents: 'none' }}
                >
                    <line
                        y1={HEADER_HEIGHT - 10}
                        y2={totalHeight}
                        stroke="var(--color-claude-accent)"
                        strokeWidth={2}
                    />
                    <polygon points="0,HEADER_HEIGHT-10 -6,HEADER_HEIGHT-16 6,HEADER_HEIGHT-16" fill="var(--color-claude-accent)" />
                </g>
            </g>
            </svg>
        </div>
      </div>

      {/* Detail Panel */}
      <div className="bg-[var(--color-claude-card)] border border-[var(--color-claude-border)] rounded-2xl p-6 min-h-[120px] shadow-sm">
         {selectedItemId ? (() => {
             const item = timeline.items.find(i => i.id === selectedItemId);
             if (!item) return null;
             if (item.type === 'label') {
                 return (
                     <div className="flex items-center gap-4">
                         <span className="bg-[var(--color-claude-bg)] border border-[#dda058] text-[#dda058] px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Label</span>
                         <span className="font-mono text-sm font-bold text-[var(--color-claude-text)]">{item.labelName}</span>
                         <span className="text-sm text-[var(--color-claude-muted)]">at {item.startTime.toFixed(2)}s</span>
                     </div>
                 )
             }
             return (
                 <div className="grid grid-cols-2 gap-8">
                     <div className="flex flex-col gap-4">
                         <div className="flex items-center gap-3 border-b border-[var(--color-claude-border)] pb-3">
                            <span className="bg-[var(--color-claude-bg)] border border-[var(--color-claude-border)] text-[var(--color-claude-text)] px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">{item.method}</span>
                            <span className="font-mono text-[var(--color-claude-text)] text-[15px]">{item.target}</span>
                         </div>
                         <div className="text-[13px] text-[var(--color-claude-muted)] flex flex-col gap-2">
                             <div className="flex justify-between items-center bg-[var(--color-claude-bg)] px-3 py-2 rounded-lg border border-[var(--color-claude-border)]"><span className="font-medium text-[var(--color-claude-text)]">Start:</span> {item.startTime.toFixed(2)}s</div>
                             <div className="flex justify-between items-center bg-[var(--color-claude-bg)] px-3 py-2 rounded-lg border border-[var(--color-claude-border)]"><span className="font-medium text-[var(--color-claude-text)]">End:</span> {item.endTime.toFixed(2)}s</div>
                             <div className="flex justify-between items-center bg-[var(--color-claude-bg)] px-3 py-2 rounded-lg border border-[var(--color-claude-border)]"><span className="font-medium text-[var(--color-claude-text)]">Duration:</span> {item.duration.toFixed(2)}s</div>
                             {item.originalPosition && <div className="flex justify-between items-center bg-[var(--color-claude-bg)] px-3 py-2 rounded-lg border border-[var(--color-claude-border)]"><span className="font-medium text-[var(--color-claude-text)]">Position Param:</span> <code className="bg-[var(--color-claude-card)] border border-[var(--color-claude-border)] px-1.5 py-0.5 rounded text-[var(--color-claude-text)] font-mono">"{item.originalPosition}"</code></div>}
                         </div>
                     </div>
                     <div className="flex flex-col gap-3">
                         <strong className="text-[13px] font-medium text-[var(--color-claude-text)] uppercase tracking-wide">Animated Properties</strong>
                         <pre className="bg-[var(--color-claude-bg)] text-[var(--color-claude-text)] border border-[var(--color-claude-border)] p-4 rounded-xl text-[13px] overflow-x-auto flex-1 font-mono shadow-inner">
                            {JSON.stringify(item.vars, null, 2)}
                         </pre>
                     </div>
                 </div>
             )
         })() : (
             <div className="h-full flex items-center justify-center text-[var(--color-claude-muted)] text-[15px]">
                 Click on an animation timeline block to inspect its details.
             </div>
         )}
      </div>
    </div>
  );
}
