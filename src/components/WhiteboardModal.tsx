import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  PenTool,
  Eraser,
  RotateCcw,
  Download,
  Palette,
  Square,
  Minus,
  Check,
  FileText,
} from 'lucide-react';
import { stateManager } from '../modules/StateManager';

interface WhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState<string>('#00ff66');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [notes, setNotes] = useState<string>(() => {
    try {
      return localStorage.getItem('mery_whiteboard_notes') || '';
    } catch {
      return '';
    }
  });

  const colors = ['#00ff66', '#38bdf8', '#a855f7', '#f43f5e', '#fbbf24', '#ffffff'];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        initCanvas();
      }, 100);
    }
  }, [isOpen]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    // Set internal resolution matching display dimensions
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#080a0e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    } else {
      ctx.strokeStyle = '#080a0e';
      ctx.lineWidth = lineWidth * 5;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.closePath();
  };

  const handleClear = () => {
    if (!confirm('Clear whiteboard canvas?')) return;
    initCanvas();
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    stateManager.notify('Downloaded whiteboard snapshot', 'success');
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    try {
      localStorage.setItem('mery_whiteboard_notes', val);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      id="whiteboard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-5xl h-[88vh] bg-[#0a0c10] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white font-sans">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Live Whiteboard & Scratchpad
              </h2>
              <p className="text-xs text-white/50">Sketch concepts, system diagrams, and brainstorm notes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadImage}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              title="Export Snapshot"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
              title="Clear Canvas"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tools Strip */}
        <div className="px-5 py-2 border-b border-white/10 flex items-center justify-between bg-black/40 text-xs">
          <div className="flex items-center gap-4">
            {/* Tool Selector */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setTool('pen')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  tool === 'pen' ? 'bg-[#00ff66] text-black font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Pen</span>
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  tool === 'eraser' ? 'bg-[#00ff66] text-black font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Eraser</span>
              </button>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1.5">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setTool('pen');
                  }}
                  className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                    color === c && tool === 'pen' ? 'scale-125 border-white shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Width */}
            <div className="hidden sm:flex items-center gap-2 text-white/60 text-[11px]">
              <span>Width:</span>
              {[2, 4, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => setLineWidth(w)}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center cursor-pointer ${
                    lineWidth === w ? 'border-[#00ff66] text-[#00ff66]' : 'border-white/10 text-white/40'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-white/40 font-telemetry">
            Touch / Stylus / Mouse supported
          </div>
        </div>

        {/* Content Area: Canvas + Notes Split */}
        <div className="flex-1 flex min-h-0">
          {/* Drawing Canvas Area */}
          <div className="flex-1 relative overflow-hidden bg-[#080a0e]">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair touch-none"
            />
          </div>

          {/* Quick Notes Sidebar */}
          <div className="w-72 border-l border-white/10 flex flex-col shrink-0 bg-black/40">
            <div className="p-3 border-b border-white/10 flex items-center gap-2 text-xs font-semibold text-white">
              <FileText className="w-3.5 h-3.5 text-[#00ff66]" />
              <span>Scratchpad Notes</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Quick brainstorm notes, formulas, or reminders..."
              className="flex-1 p-3 bg-transparent text-white text-xs leading-relaxed focus:outline-none resize-none font-sans"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
