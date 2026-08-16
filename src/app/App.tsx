import { useState, useRef, useEffect, MouseEvent, TouchEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import {
  Paintbrush,
  Eraser,
  Undo2,
  RotateCcw,
  Shuffle,
  Info,
  ChevronRight,
  Check,
  Minus,
  Plus,
  Eye,
  EyeOff,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { getSavedPaintings, deletePainting, type SavedPainting } from "../lib/storage";
import { matchArtworks, defaultSet, getArtworkMeta, type ArtworkMeta } from "../lib/api";
import { exportPaintingDataUrl, savePainting } from "../lib/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "welcome" | "checkin" | "gallery" | "canvas" | "close" | "history" | "viewer";
type PaintTool = "brush" | "eraser";

type Artwork = {
  id: number;
  imageUrl: string;
};

// ─── Shared Mobile Nav Bar ────────────────────────────────────────────────────

function NavBar({
  onBack,
  rightSlot,
}: {
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-12 pb-3">
      <div className="w-10">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Go back"
            className="w-10 h-10 flex items-center justify-center rounded-full
                       hover:bg-secondary transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
          Quiet Canvas
        </span>
      </div>
      <div className="w-10 flex justify-end">{rightSlot}</div>
    </div>
  );
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────

function WelcomeScreen({
  onStart,
  onHistory,
  hasPastPaintings,
}: {
  onStart: () => void;
  onHistory: () => void;
  hasPastPaintings: boolean;
}) {
  // Purely decorative -- no check-in has happened yet, so this is just a
  // handful of default artworks, not anything matched to the user.
  const [collage, setCollage] = useState<Artwork[]>([]);

  useEffect(() => {
    let cancelled = false;
    defaultSet([], 4)
      .then((artworks) => {
        if (!cancelled) setCollage(artworks);
      })
      .catch(() => {
        // Decorative only -- if it fails, the warm background gradient underneath is enough.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9 }}
      className="flex flex-col h-full bg-background overflow-hidden"
    >
      {/* Top artwork collage — decorative */}
      <div className="relative flex-none h-[42%] overflow-hidden bg-muted">
        <div className="absolute inset-0 grid grid-cols-2 gap-0.5">
          {collage.map((art, i) => (
            <motion.div
              key={art.id}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.12 + 0.1, duration: 1.2, ease: "easeOut" }}
              className="relative overflow-hidden bg-muted"
            >
              <img
                src={art.imageUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </motion.div>
          ))}
        </div>
        {/* Bottom fade into background */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
        {/* Wordmark over image */}
        <div className="absolute top-12 left-5 z-10">
          <div className="flex items-center gap-2.5 bg-background/85 backdrop-blur-md rounded-full px-4 py-2.5 shadow-sm border border-border/20">
            <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" aria-hidden="true" />
            <span className="font-display text-sm italic text-foreground tracking-wide">
              Quiet Canvas
            </span>
          </div>
        </div>

        {/* History icon — only shown when there's something to look back at */}
        {hasPastPaintings && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={onHistory}
            aria-label="Your past pieces"
            className="absolute top-12 right-5 z-10 w-11 h-11 flex items-center justify-center
                       bg-background/85 backdrop-blur-md rounded-full shadow-sm border border-border/20
                       text-muted-foreground active:bg-background/95 transition-colors"
          >
            <Clock className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex-1 flex flex-col justify-between px-6 pt-4 pb-10"
      >
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
            A private space for what words can't hold
          </p>
          <h1 className="font-display text-[2.6rem] leading-[1.1] text-foreground mb-4">
            A quiet space,{" "}
            <em className="text-accent not-italic">whenever you need it.</em>
          </h1>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            No words needed. No explanation required. Just you, a painting, and
            as much time as you want.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-3
                       bg-primary text-primary-foreground
                       py-4 rounded-2xl font-body text-base
                       active:scale-[0.98] transition-all duration-300"
          >
            Whenever you're ready
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>

          {hasPastPaintings && (
            <button
              onClick={onHistory}
              className="w-full py-3 font-body text-sm text-muted-foreground
                         active:text-foreground transition-colors"
            >
              Look back at past pieces
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Check-In Screen ──────────────────────────────────────────────────────────

// Piecewise-linear remap: field edges match the real p5/p95 of scored
// paintings, and the field's exact center matches the true median (p50) --
// which isn't the same as the midpoint of p5 and p95 when the distribution
// is skewed. Without this, a plain -1..1 mapping wastes most of the field on
// score ranges almost no painting occupies (see scripts/inspect_scores.py).
function remapToScoreRange(t: number, p5: number, p50: number, p95: number): number {
  if (t <= 0.5) {
    return p5 + (t / 0.5) * (p50 - p5);
  }
  return p50 + ((t - 0.5) / 0.5) * (p95 - p50);
}

// valence_score across 2861 scored paintings (stable -- not affected by the
// arousal recalibration in scripts/recalibrate_arousal.py).
const VALENCE_P5 = 0.295;
const VALENCE_P50 = 0.519;
const VALENCE_P95 = 0.643;

// arousal_score across 2861 scored paintings, after
// scripts/recalibrate_arousal.py --apply 0.7 (blends in edge density to cut
// correlation with valence_score from r=-0.558 to r=-0.347).
const AROUSAL_P5 = -0.255;
const AROUSAL_P50 = -0.137;
const AROUSAL_P95 = 0.114;

function CheckInScreen({
  onSelect,
  onSkip,
  onBack,
}: {
  onSelect: (v: number, a: number) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  const handleInteraction = (clientX: number, clientY: number) => {
    if (!fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setPos({ x, y });
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) =>
    handleInteraction(e.clientX, e.clientY);

  const handleTouch = (e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleConfirm = () => {
    if (!pos) return;
    const valence = remapToScoreRange(pos.x, VALENCE_P5, VALENCE_P50, VALENCE_P95);
    const arousal = remapToScoreRange(1 - pos.y, AROUSAL_P5, AROUSAL_P50, AROUSAL_P95);
    onSelect(valence, arousal);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col h-full bg-background"
    >
      <NavBar onBack={onBack} />

      <div className="flex-1 flex flex-col px-5 pb-8 overflow-y-auto">
        <div className="mb-6 mt-2">
          <h2 className="font-display text-[1.9rem] leading-[1.15] text-foreground mb-2">
            How does it feel right now?
          </h2>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            No need to put it into words — just tap where it feels closest.
          </p>
        </div>

        {/* Circumplex field */}
        <div className="flex flex-col items-center justify-center gap-2 flex-1">
          {/* Top label */}
          <span className="font-mono text-[13px] tracking-widest uppercase text-muted-foreground/70 whitespace-nowrap">
            arousal
          </span>

          {/* Middle row: left label + square + right label */}
          <div className="flex items-center gap-2 w-full">
            <span
              className="font-mono text-[13px] tracking-widest uppercase text-muted-foreground/70 whitespace-nowrap flex-shrink-0"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              unpleasant
            </span>

            <div
              ref={fieldRef}
              onClick={handleClick}
              onTouchStart={handleTouch}
              className="relative flex-1 aspect-square rounded-3xl overflow-hidden cursor-crosshair border border-border"
            style={{
              background: `
                radial-gradient(ellipse at 75% 18%, rgba(184,137,110,0.22) 0%, transparent 52%),
                radial-gradient(ellipse at 25% 18%, rgba(160,100,100,0.14) 0%, transparent 52%),
                radial-gradient(ellipse at 75% 82%, rgba(92,122,99,0.22) 0%, transparent 52%),
                radial-gradient(ellipse at 25% 82%, rgba(100,115,155,0.18) 0%, transparent 52%),
                #F7F3EC
              `,
            }}
          >
            {/* Center crosshairs */}
            <div className="absolute inset-0 flex items-center pointer-events-none">
              <div className="w-full h-px bg-foreground/6" />
            </div>
            <div className="absolute inset-0 flex justify-center pointer-events-none">
              <div className="h-full w-px bg-foreground/6" />
            </div>

            {/* Quadrant labels */}
            <span className="absolute top-3 left-3 font-mono text-[8px] tracking-wide text-muted-foreground/38">
              tense
            </span>
            <span className="absolute top-3 right-3 font-mono text-[8px] tracking-wide text-muted-foreground/38">
              excited
            </span>
            <span className="absolute bottom-3 left-3 font-mono text-[8px] tracking-wide text-muted-foreground/38">
              depressed
            </span>
            <span className="absolute bottom-3 right-3 font-mono text-[8px] tracking-wide text-muted-foreground/38">
              serene
            </span>

            {/* Selection dot */}
            {pos && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
              >
                <div className="w-5 h-5 rounded-full bg-accent ring-[7px] ring-accent/20" />
              </motion.div>
            )}
          </div>

            {/* Right label */}
            <span
              className="font-mono text-[13px] tracking-widest uppercase text-muted-foreground/70 whitespace-nowrap flex-shrink-0"
              style={{ writingMode: "vertical-rl" }}
            >
              pleasant
            </span>
          </div>

          {/* Bottom label */}
          <span className="font-mono text-[13px] tracking-widest uppercase text-muted-foreground/70 whitespace-nowrap">
            calm
          </span>
        </div>

        {/* Bottom actions */}
        <div className="mt-4 flex flex-col gap-3">
          <AnimatePresence>
            {pos && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2.5
                           bg-primary text-primary-foreground py-4 rounded-2xl
                           font-body text-base active:scale-[0.98] transition-all duration-300"
              >
                <Check className="w-4 h-4" />
                Find some pieces
              </motion.button>
            )}
          </AnimatePresence>
          <button
            onClick={onSkip}
            className="w-full py-3.5 rounded-2xl border border-border
                       font-body text-sm text-muted-foreground
                       active:bg-secondary transition-colors"
          >
            Skip for now
          </button>
          <p className="text-center font-mono text-[9px] tracking-wider uppercase text-muted-foreground/35 mt-1">
            Nothing is analyzed or stored
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Gallery Screen ───────────────────────────────────────────────────────────

function GalleryScreen({
  artworks,
  isLoading,
  error,
  poolExhausted,
  onSelect,
  onShuffle,
  onBack,
}: {
  artworks: Artwork[];
  isLoading: boolean;
  error: boolean;
  poolExhausted: boolean;
  onSelect: (art: Artwork) => void;
  onShuffle: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col h-full bg-background"
    >
      <NavBar onBack={onBack} />

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="mb-5 mt-2">
          <h2 className="font-display text-[1.9rem] leading-[1.15] text-foreground mb-1.5">
            A few pieces for you.
          </h2>
          <p className="font-body text-sm text-muted-foreground">
            Tap whichever one draws you in.
          </p>
        </div>

        {isLoading && (
          <p className="font-body text-sm text-muted-foreground text-center mt-16">
            Finding a few pieces for you.
          </p>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-4 mt-16">
            <p className="font-body text-sm text-muted-foreground text-center">
              That didn't come through. Let's try again.
            </p>
            <button
              onClick={onShuffle}
              className="py-3 px-6 rounded-2xl border border-border
                         font-body text-sm text-muted-foreground
                         active:bg-secondary transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* 2×2 artwork grid */}
            <div className="grid grid-cols-2 gap-3">
              {artworks.map((art, i) => (
                <motion.button
                  key={`${art.id}-${i}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 + 0.1, duration: 0.5 }}
                  onClick={() => onSelect(art)}
                  className="group relative aspect-square rounded-2xl overflow-hidden
                             bg-muted border border-border/50 active:scale-[0.96]
                             transition-all duration-300 focus:outline-none
                             focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={art.imageUrl}
                    alt={`Artwork option ${i + 1}`}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover
                               transition-transform duration-500 group-active:scale-105"
                  />
                  {/* TEMP debug: append ?debug=1 to the URL to see the actual
                      image src on-screen (works in production too, unlike
                      import.meta.env.DEV). Remove once mobile issue is found. */}
                  {new URLSearchParams(window.location.search).get("debug") && (
                    <p
                      className="absolute bottom-0 left-0 right-0 bg-black/70 text-white z-10 p-1"
                      style={{ fontSize: 8, wordBreak: "break-all" }}
                    >
                      {art.imageUrl}
                    </p>
                  )}
                  {/* Tap overlay */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent
                               opacity-0 group-active:opacity-100 transition-opacity duration-200"
                  />
                </motion.button>
              ))}
            </div>

            {/* Shuffle button, or a warm note once the pool's exhausted */}
            {poolExhausted ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-5 text-center font-body text-sm text-muted-foreground/70"
              >
                That's everything for now.
              </motion.p>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={onShuffle}
                className="mt-5 w-full flex items-center justify-center gap-2.5
                           py-3.5 rounded-2xl border border-border
                           font-body text-sm text-muted-foreground
                           active:bg-secondary transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
                Show me different ones
              </motion.button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Canvas Screen ────────────────────────────────────────────────────────────

const PALETTE = [
  "#2A2520",
  "#5C7A63",
  "#B8896E",
  "#8B9DC3",
  "#C4A882",
  "#8B7B8B",
  "#6B8BA4",
  "#A8B5A2",
  "#E8D5B7",
  "#F5F0E8",
  "#FFFFFF",
];

function CanvasScreen({
  artwork,
  onDone,
}: {
  artwork: Artwork;
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<PaintTool>("brush");
  const [color, setColor] = useState("#2A2520");
  const [brushSize, setBrushSize] = useState(14);
  const [artOpacity, setArtOpacity] = useState(0.55);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [showOpacity, setShowOpacity] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const ctx = canvas.getContext("2d");
      const prev = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (prev) ctx?.putImageData(prev, 0, 0);
    });
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const getCanvasPos = (
    e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const saveToUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setUndoStack((prev) => [
      ...prev.slice(-24),
      ctx.getImageData(0, 0, canvas.width, canvas.height),
    ]);
  };

  const applyStrokeStyle = (ctx: CanvasRenderingContext2D) => {
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
    }
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const startDraw = (
    e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    saveToUndo();
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    if (!pos) return;
    lastPos.current = pos;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    applyStrokeStyle(ctx);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const draw = (
    e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!isDrawing || !lastPos.current) return;
    const pos = getCanvasPos(e);
    if (!pos) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    applyStrokeStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.globalCompositeOperation = "source-over";
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(last, 0, 0);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    saveToUndo();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleDone = async () => {
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = await exportPaintingDataUrl(canvas, artwork.imageUrl, artOpacity);
        savePainting(artwork.id, dataUrl);
      }
    } catch {
      // Fail quietly -- the session ends the same way either way.
    }
    onDone();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col h-full bg-foreground overflow-hidden"
    >
      {/* Artwork background — takes all remaining space */}
      <img
        src={artwork.imageUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-400"
        style={{ opacity: artOpacity }}
      />

      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2
                        bg-background/70 backdrop-blur-md rounded-full px-3.5 py-2 border border-border/20">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Quiet Canvas
          </span>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={handleDone}
            className="bg-background/70 backdrop-blur-md border border-border/20
                       rounded-full px-4 py-2 font-body text-sm text-foreground
                       active:bg-background/90 transition-all"
          >
            Done
          </button>
        </div>
      </div>

      {/* ── Opacity tray (opens above bottom bar) ── */}
      <AnimatePresence>
        {showOpacity && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22 }}
            className="absolute bottom-[88px] left-5 right-5 z-20
                       bg-background/90 backdrop-blur-md rounded-2xl border border-border/25 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Painting showing through
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {Math.round(artOpacity * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={artOpacity}
                onChange={(e) => setArtOpacity(parseFloat(e.target.value))}
                aria-label="Artwork opacity"
                className="flex-1 accent-primary"
              />
              <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom toolbar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-8 px-4">
        <div className="bg-background/85 backdrop-blur-md rounded-2xl border border-border/25 overflow-hidden">
          {/* Color row */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 overflow-x-auto scrollbar-none">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setTool("brush");
                }}
                aria-label={`Color ${c}`}
                className="flex-shrink-0 w-7 h-7 rounded-full transition-transform active:scale-90"
                style={{
                  backgroundColor: c,
                  boxShadow:
                    color === c && tool === "brush"
                      ? `0 0 0 2px white, 0 0 0 3.5px ${c}`
                      : undefined,
                  border:
                    c === "#F5F0E8" || c === "#FFFFFF"
                      ? "1px solid rgba(42,37,32,0.2)"
                      : undefined,
                }}
              />
            ))}
            {/* Custom color */}
            <label
              className="relative flex-shrink-0 w-7 h-7 rounded-full overflow-hidden
                         border border-border cursor-pointer active:scale-90 transition-transform"
              aria-label="Custom color"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-300 via-sky-300 to-emerald-300" />
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setTool("brush");
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-1 px-3 py-2">
            {/* Tool toggle */}
            <button
              onClick={() => setTool("brush")}
              aria-label="Brush"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all
                ${tool === "brush" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Paintbrush className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setTool("eraser")}
              aria-label="Eraser"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all
                ${tool === "eraser" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Eraser className="w-4.5 h-4.5" />
            </button>

            <div className="w-px h-6 bg-border/50 mx-1 flex-shrink-0" />

            {/* Brush size */}
            <button
              onClick={() => setBrushSize((s) => Math.max(2, s - 4))}
              aria-label="Decrease brush size"
              className="w-11 h-11 flex items-center justify-center text-muted-foreground active:text-foreground"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center w-8 h-11" aria-hidden="true">
              <div
                className="rounded-full bg-foreground/50 transition-all"
                style={{
                  width: Math.max(4, Math.min(26, brushSize)),
                  height: Math.max(4, Math.min(26, brushSize)),
                }}
              />
            </div>
            <button
              onClick={() => setBrushSize((s) => Math.min(72, s + 4))}
              aria-label="Increase brush size"
              className="w-11 h-11 flex items-center justify-center text-muted-foreground active:text-foreground"
            >
              <Plus className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-border/50 mx-1 flex-shrink-0" />

            {/* Undo */}
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              aria-label="Undo"
              className="w-11 h-11 rounded-xl flex items-center justify-center
                         text-muted-foreground active:text-foreground
                         disabled:opacity-25 transition-all"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            {/* Clear */}
            <button
              onClick={clearCanvas}
              aria-label="Clear canvas"
              className="w-11 h-11 rounded-xl flex items-center justify-center
                         text-muted-foreground active:text-foreground transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="flex-1" />

            {/* Opacity toggle */}
            <button
              onClick={() => setShowOpacity((v) => !v)}
              aria-label="Adjust artwork opacity"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all
                ${showOpacity ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Close Screen ─────────────────────────────────────────────────────────────

function CloseScreen({
  artworkId,
  onRestart,
  onHistory,
}: {
  artworkId: number;
  onRestart: () => void;
  onHistory: () => void;
}) {
  // Metadata guardrail: title/artist/date/genre are only ever fetched here,
  // on demand, after the creative act is over -- never during check-in,
  // gallery, or painting.
  const [meta, setMeta] = useState<ArtworkMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  const revealMeta = () => {
    if (meta || metaLoading) {
      setShowMeta((v) => !v);
      return;
    }
    setMetaLoading(true);
    setShowMeta(true);
    getArtworkMeta(artworkId)
      .then(setMeta)
      .catch(() => setMeta(null))
      .finally(() => setMetaLoading(false));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="flex flex-col h-full bg-background"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full text-center"
        >
          {/* Ornamental rule */}
          <div
            className="flex items-center justify-center gap-3 mb-12"
            aria-hidden="true"
          >
            <div className="h-px w-10 bg-accent/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-accent/60" />
            <div className="h-px w-10 bg-accent/40" />
          </div>

          <h2 className="font-display text-[2.4rem] leading-[1.12] text-foreground mb-5">
            Take your time.
          </h2>
          <p className="font-body text-muted-foreground leading-relaxed mb-3 text-[0.95rem]">
            Whatever you made lives here, just for you. No one else can see it.
            You don't need to make sense of it.
          </p>
          <p className="font-body text-muted-foreground/60 text-sm leading-relaxed">
            It's okay to feel however you feel.
          </p>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.7 }}
        className="px-5 pb-10 flex flex-col items-center gap-4"
      >
        <AnimatePresence>
          {showMeta && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22 }}
              className="w-full bg-secondary/40 rounded-2xl border border-border/30 p-4 text-center"
            >
              {metaLoading && (
                <p className="font-body text-sm text-muted-foreground">Just a moment.</p>
              )}
              {!metaLoading && meta && (
                <>
                  <h3 className="font-display text-base text-foreground leading-snug mb-0.5">
                    {meta.title ?? "Untitled"}
                  </h3>
                  {meta.artist && (
                    <p className="font-body text-sm text-muted-foreground">{meta.artist}</p>
                  )}
                  <p className="font-mono text-[10px] text-muted-foreground/55 mt-0.5">
                    {[meta.date, meta.genre].filter(Boolean).join(" · ")}
                  </p>
                </>
              )}
              {!metaLoading && !meta && (
                <p className="font-body text-sm text-muted-foreground">
                  Couldn't find those details right now.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onRestart}
          className="w-full py-4 rounded-2xl border border-border
                     font-body text-sm text-muted-foreground
                     active:bg-secondary transition-colors"
        >
          Start again, whenever you're ready
        </button>

        <button
          onClick={onHistory}
          className="w-full py-3.5 rounded-2xl border border-border
                     font-body text-sm text-muted-foreground
                     active:bg-secondary transition-colors"
        >
          Look back at what you've made
        </button>

        <button
          onClick={revealMeta}
          className="flex items-center gap-1.5 font-body text-xs text-muted-foreground/70
                     active:text-muted-foreground transition-colors"
        >
          <Info className="w-3 h-3" aria-hidden="true" />
          {showMeta ? "Hide the details" : "Curious what this was?"}
        </button>

        <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/30">
          Quiet Canvas · Private by default
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── History Screen ───────────────────────────────────────────────────────────

function HistoryScreen({
  paintings,
  onBack,
  onView,
}: {
  paintings: SavedPainting[];
  onBack: () => void;
  onView: (p: SavedPainting) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col h-full bg-background"
    >
      <NavBar onBack={onBack} />

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <div className="mb-6 mt-2">
          <h2 className="font-display text-[1.9rem] leading-[1.15] text-foreground mb-1.5">
            What you've made.
          </h2>
          <p className="font-body text-sm text-muted-foreground">
            Kept here, quietly, just for you.
          </p>
        </div>

        {paintings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center pt-16 text-center px-4"
          >
            <div className="flex items-center gap-3 mb-8" aria-hidden="true">
              <div className="h-px w-8 bg-accent/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-accent/40" />
              <div className="h-px w-8 bg-accent/30" />
            </div>
            <p className="font-display text-xl text-foreground mb-3">
              Nothing here yet.
            </p>
            <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-[220px]">
              Whenever you finish a piece, it'll find its way here.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {paintings.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 + 0.1, duration: 0.45 }}
                onClick={() => onView(p)}
                className="group flex flex-col gap-1.5 text-left active:scale-[0.96] transition-all duration-200"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/50">
                  <img
                    src={p.dataUrl}
                    alt={`Piece from ${format(new Date(p.savedAt), "MMM d")}`}
                    className="absolute inset-0 w-full h-full object-cover
                               transition-transform duration-500 group-active:scale-105"
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground/60 tracking-wide pl-0.5">
                  {format(new Date(p.savedAt), "MMM d, yyyy")}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Viewer Screen ────────────────────────────────────────────────────────────

function ViewerScreen({
  painting,
  onBack,
  onDelete,
}: {
  painting: SavedPainting;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    onDelete(painting.id);
    onBack();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col h-full bg-foreground overflow-hidden"
    >
      <img
        src={painting.dataUrl}
        alt={`Piece from ${format(new Date(painting.savedAt), "MMMM d, yyyy")}`}
        className="absolute inset-0 w-full h-full object-contain"
      />

      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-3">
        <button
          onClick={onBack}
          aria-label="Go back"
          className="w-10 h-10 flex items-center justify-center rounded-full
                     bg-background/70 backdrop-blur-md border border-border/20
                     text-muted-foreground active:bg-background/90 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 bg-background/70 backdrop-blur-md rounded-full px-3.5 py-2 border border-border/20">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            {format(new Date(painting.savedAt), "MMMM d, yyyy")}
          </span>
        </div>
        <div className="w-10" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 pb-10 px-5">
        <AnimatePresence mode="wait">
          {!confirmDelete ? (
            <motion.button
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 font-body text-sm text-muted-foreground/50
                         active:text-muted-foreground transition-colors text-center"
            >
              Remove this piece
            </motion.button>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-background/90 backdrop-blur-md rounded-2xl border border-border/25 p-4"
            >
              <p className="font-body text-sm text-muted-foreground text-center mb-3">
                This will be gone for good. No way to undo it.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-3 rounded-xl border border-border
                             font-body text-sm text-muted-foreground
                             active:bg-secondary transition-colors"
                >
                  Keep it
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-foreground text-background
                             font-body text-sm active:opacity-80 transition-opacity"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}



// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [gallery, setGallery] = useState<Artwork[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState(false);
  const [poolExhausted, setPoolExhausted] = useState(false);
  const [shownIds, setShownIds] = useState<number[]>([]);
  const [checkIn, setCheckIn] = useState<{ valence: number; arousal: number } | null>(null);
  const [activeArtwork, setActiveArtwork] = useState<Artwork | null>(null);

  const [paintings, setPaintings] = useState<SavedPainting[]>(getSavedPaintings());
  const [viewingPainting, setViewingPainting] = useState<SavedPainting | null>(null);

  const refreshPaintings = () => setPaintings(getSavedPaintings());

  const loadGallery = (fetcher: () => Promise<Artwork[]>) => {
    setScreen("gallery");
    setGalleryLoading(true);
    setGalleryError(false);
    setPoolExhausted(false);
    fetcher()
      .then((artworks) => {
        setGallery(artworks);
        setShownIds(artworks.map((a) => a.id));
      })
      .catch(() => setGalleryError(true))
      .finally(() => setGalleryLoading(false));
  };

  const handleCheckIn = (valence: number, arousal: number) => {
    setCheckIn({ valence, arousal });
    loadGallery(() => matchArtworks(valence, arousal, []));
  };

  const handleSkip = () => {
    setCheckIn(null);
    loadGallery(() => defaultSet([]));
  };

  const handleShuffle = () => {
    setGalleryLoading(true);
    setGalleryError(false);
    const fetcher = checkIn
      ? matchArtworks(checkIn.valence, checkIn.arousal, shownIds)
      : defaultSet(shownIds);
    fetcher
      .then((artworks) => {
        if (artworks.length === 0) {
          setPoolExhausted(true);
          return;
        }
        setGallery(artworks);
        setShownIds((prev) => [...prev, ...artworks.map((a) => a.id)]);
      })
      .catch(() => setGalleryError(true))
      .finally(() => setGalleryLoading(false));
  };

  const handleSelectArtwork = (art: Artwork) => {
    setActiveArtwork(art);
    setScreen("canvas");
  };

  const handleDeletePainting = (id: string) => {
    deletePainting(id);
    refreshPaintings();
  };

  const handleViewPainting = (p: SavedPainting) => {
    setViewingPainting(p);
    setScreen("viewer");
  };

  return (
    <div className="min-h-screen w-full bg-secondary/60 flex items-center justify-center">
      <div
        className="relative w-full h-screen
                   sm:w-[390px] sm:h-[844px] sm:rounded-[3rem] sm:overflow-hidden
                   sm:shadow-[0_32px_80px_rgba(42,37,32,0.22)]
                   bg-background overflow-hidden font-body"
      >
        <AnimatePresence mode="wait">
          {screen === "welcome" && (
            <div key="welcome" className="absolute inset-0">
              <WelcomeScreen
                onStart={() => setScreen("checkin")}
                onHistory={() => setScreen("history")}
                hasPastPaintings={paintings.length > 0}
              />
            </div>
          )}
          {screen === "checkin" && (
            <div key="checkin" className="absolute inset-0">
              <CheckInScreen
                onSelect={handleCheckIn}
                onSkip={handleSkip}
                onBack={() => setScreen("welcome")}
              />
            </div>
          )}
          {screen === "gallery" && (
            <div key="gallery" className="absolute inset-0">
              <GalleryScreen
                artworks={gallery}
                isLoading={galleryLoading}
                error={galleryError}
                poolExhausted={poolExhausted}
                onSelect={handleSelectArtwork}
                onShuffle={handleShuffle}
                onBack={() => setScreen("checkin")}
              />
            </div>
          )}
          {screen === "canvas" && activeArtwork && (
            <div key="canvas" className="absolute inset-0">
              <CanvasScreen
                artwork={activeArtwork}
                onDone={() => {
                  refreshPaintings();
                  setScreen("close");
                }}
              />
            </div>
          )}
          {screen === "close" && activeArtwork && (
            <div key="close" className="absolute inset-0">
              <CloseScreen
                artworkId={activeArtwork.id}
                onRestart={() => setScreen("welcome")}
                onHistory={() => setScreen("history")}
              />
            </div>
          )}
          {screen === "history" && (
            <div key="history" className="absolute inset-0">
              <HistoryScreen
                paintings={paintings}
                onBack={() => setScreen("welcome")}
                onView={handleViewPainting}
              />
            </div>
          )}
          {screen === "viewer" && viewingPainting && (
            <div key="viewer" className="absolute inset-0">
              <ViewerScreen
                painting={viewingPainting}
                onBack={() => setScreen("history")}
                onDelete={handleDeletePainting}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}