import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FaceLandmarker,
  HandLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

// ─── Constants ────────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 3500;
const REPEL_RADIUS_SQ = 130 * 130;
const REPEL_STRENGTH = 4.5;
const DRAG_MULT      = 3.2;    // multiplier during mousedown
const LERP_SPEED     = 0.1;   // Increased from 0.07 for snappier tracking

// ─── Selected face landmark indices for interesting features ─────────────────
// Eyes, brows, lips, jawline, nose — richer on expressive zones
const FACE_LANDMARK_WEIGHTS: { idx: number; w: number }[] = [
  // Left eye contour
  ...[33,246,161,160,159,158,157,173,133,155,154,153,145,144,163,7].map(idx=>({idx,w:3})),
  // Right eye contour
  ...[362,398,384,385,386,387,388,466,263,249,390,373,374,380,381,382].map(idx=>({idx,w:3})),
  // Lips outer
  ...[61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146].map(idx=>({idx,w:4})),
  // Nose bridge + tip
  ...[168,6,197,195,5,4,1,19,94,2].map(idx=>({idx,w:2})),
  // Jawline
  ...[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,
       377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109].map(idx=>({idx,w:1})),
  // Forehead scattered
  ...[10,151,9,8,107,66,105,63,70,156,143,116,117,118,119,120,121,128].map(idx=>({idx,w:1})),
];

// ─── Particle type ────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;           // current position
  tx: number; ty: number;         // smooth target
  rawTx: number; rawTy: number;   // raw landmark target (lerped into tx/ty)
  vx: number; vy: number;
  size: number;
  alpha: number;
  baseHue: number;
}

// ─── Gaussian spread helper ───────────────────────────────────────────────────
function gaussianRand() {
  // Box-Muller
  return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

// ─── Build targets from landmark results ─────────────────────────────────────
function buildLandmarkTargets(
  faceResult: FaceLandmarkerResult | null,
  handResult: HandLandmarkerResult | null,
  W: number,
  H: number,
): { tx: number; ty: number }[] {
  const targets: { tx: number; ty: number }[] = [];

  // Face landmarks
  if (faceResult && faceResult.faceLandmarks.length > 0) {
    const lm = faceResult.faceLandmarks[0];
    for (const { idx, w } of FACE_LANDMARK_WEIGHTS) {
      if (!lm[idx]) continue;
      // Mirroring fix: Landmarks are 0-1 from CAMERA view,
      // so we use (1.0 - x) to match the mirrored PiP preview.
      const px = (1.0 - lm[idx].x) * W;
      const py = lm[idx].y * H;
      const sigma = 9; // Increased from 5
      const count = w * 11; // Increased density
      for (let k = 0; k < count; k++) {
        targets.push({
          tx: px + gaussianRand() * sigma,
          ty: py + gaussianRand() * sigma,
        });
      }
    }
  }

  // Hand landmarks
  if (handResult && handResult.landmarks.length > 0) {
    for (const hand of handResult.landmarks) {
      for (const pt of hand) {
        // Mirroring fix: flip X
        const px = (1.0 - pt.x) * W;
        const py = pt.y * H;
        const sigma = 14; // Increased from 10
        for (let k = 0; k < 15; k++) { // Increased from 10
          targets.push({
            tx: px + gaussianRand() * sigma,
            ty: py + gaussianRand() * sigma,
          });
        }
      }
    }
  }

  return targets;
}

// ─── Build text targets (idle) ────────────────────────────────────────────────
function buildTextTargets(text: string, W: number, H: number) {
  const off = document.createElement('canvas');
  const fs = Math.min(W * 0.25, H * 0.5, 160);
  off.width = W; off.height = H;
  const ctx = off.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${fs}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H / 2);
  const { data } = ctx.getImageData(0, 0, W, H);
  const targets: { tx: number; ty: number }[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 100) targets.push({ tx: x, ty: y });
    }
  }
  return targets;
}

// ─── Idle phrases ─────────────────────────────────────────────────────────────
const IDLE_PHRASES = ['hi', '</>', '{ }', '*', 'hello'];

// ─── Circular camera button ───────────────────────────────────────────────────
const CameraButton = ({ loading, modelReady, onClick }: {
  loading: boolean; modelReady: boolean; onClick: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const busy = loading || !modelReady;
  return (
    <button
      onClick={onClick}
      disabled={busy}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', width: 80, height: 80, borderRadius: '50%',
        border: `1px solid ${hovered && !busy ? 'rgba(230,93,73,0.55)' : 'rgba(126,70,34,0.2)'}`,
        background: hovered && !busy ? '#ffe4c6' : '#fff6df',
        cursor: busy ? 'wait' : 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 6,
        transition: 'all 0.3s ease', backdropFilter: 'blur(12px)',
        boxShadow: hovered && !busy ? '0 0 0 1px rgba(255,138,76,0.2), 0 8px 24px rgba(126,70,34,0.16)' : '0 6px 16px rgba(126,70,34,0.1)',
        opacity: busy ? 0.45 : 1,
      }}
    >
      <div style={{
        position: 'absolute', inset: -5, borderRadius: '50%',
        border: '1px solid rgba(230,93,73,0.25)',
        transform: hovered && !busy ? 'scale(1)' : 'scale(0.88)',
        opacity: hovered && !busy ? 1 : 0,
        transition: 'all 0.35s ease',
      }} />
      {loading ? (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="11" cy="11" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
          <path d="M11 2 A9 9 0 0 1 20 11" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="26" height="21" viewBox="0 0 26 21" fill="none"
          style={{ color: hovered ? '#e65d49' : '#8b5a40', transition: 'color 0.3s' }}>
          <rect x="1" y="5.5" width="24" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.3"/>
          <circle cx="13" cy="12.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
          <circle cx="13" cy="12.5" r="1.6" stroke="currentColor" strokeWidth="1"/>
          <path d="M9 5.5V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1.5" stroke="currentColor" strokeWidth="1.3"/>
          <circle cx="21" cy="9" r="1" fill="currentColor" opacity="0.55"/>
        </svg>
      )}
      <span style={{
        fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.12em',
        textTransform: 'uppercase', lineHeight: 1,
        color: hovered && !busy ? '#b45309' : '#8b5a40',
        transition: 'color 0.3s',
      }}>
        {loading ? 'loading' : !modelReady ? 'init…' : 'camera'}
      </span>
    </button>
  );
};

const HINTS = [
  '✦ WAVE HANDS TO SCATTER',
  '✦ OPEN MOUTH FOR DETAIL',
  '✦ NOD SLOWLY TO SHIFT',
  '✦ DRAG CURSOR TO PULL',
  '✦ TAP FINGERTIPS TO PUSH',
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export const PlaygroundPage = () => {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef         = useRef<HTMLVideoElement>(null);
  const pipVideoRef      = useRef<HTMLVideoElement>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const animRef          = useRef<number>(0);
  const particlesRef     = useRef<Particle[]>([]);
  const idleTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const idxRef           = useRef(0);

  // MediaPipe refs
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const lastFaceResult    = useRef<FaceLandmarkerResult | null>(null);
  const lastHandResult    = useRef<HandLandmarkerResult | null>(null);
  const lastVideoTime     = useRef(-1);
  const lastTrackingTime  = useRef(0);
  const modelLoadingRef   = useRef(false);

  // Mouse repulsion state
  const mouseRef   = useRef({ x: -9999, y: -9999, down: false });

  const [cameraOn,   setCameraOn]   = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [hintIdx,    setHintIdx]    = useState(0);

  // ── Init particles ──────────────────────────────────────────────────────────
  const initParticles = useCallback((W: number, H: number) => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => {
      const x = Math.random() * W, y = Math.random() * H;
      return {
        x, y, tx: x, ty: y, rawTx: x, rawTy: y,
        vx: 0, vy: 0,
        size:    Math.random() * 1.4 + 0.5,
        alpha:   Math.random() * 0.35 + 0.55,
        baseHue: 8 + Math.random() * 45,
      };
    });
  }, []);

  // ── Apply new raw targets → they lerp each frame ───────────────────────────
  const setRawTargets = useCallback((tgts: { tx: number; ty: number }[]) => {
    if (!tgts.length) return;
    const pCount  = particlesRef.current.length;
    const tCount  = tgts.length;
    
    particlesRef.current.forEach((p, i) => {
      // Uniform sampling: pick a target point based on current particle index ratio.
      // This ensures full shape representation even if pCount < tCount.
      const targetIdx = Math.floor((i / pCount) * tCount);
      const t = tgts[targetIdx % tCount];
      p.rawTx = t.tx;
      p.rawTy = t.ty;
    });
  }, []);

  // ── Mouse repulsion force ──────────────────────────────────────────────────
  const applyMouseRepulsion = (p: Particle, mult = 1) => {
    const mx = mouseRef.current.x, my = mouseRef.current.y;
    const dx = p.x - mx, dy = p.y - my;
    const distSq = dx * dx + dy * dy;
    if (distSq < REPEL_RADIUS_SQ && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const force = Math.pow(1 - dist / 130, 2) * REPEL_STRENGTH * mult;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
    }
  };

  // ── Render loop (shared idle + camera) ────────────────────────────────────
  const renderLoop = useCallback((mode: 'idle' | 'camera') => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;

    // If camera mode, run MediaPipe on current video frame
    if (mode === 'camera') {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime.current) {
        // Performance fix: Throttle MediaPipe to ~30fps even if render loop is 60fps
        const now = performance.now();
        if (now - (lastTrackingTime.current || 0) > 32) {
          lastTrackingTime.current = now;
          lastVideoTime.current = video.currentTime;
          
          if (faceLandmarkerRef.current) {
            try { 
              lastFaceResult.current = faceLandmarkerRef.current.detectForVideo(video, now); 
            } catch(e) { console.error('Face detect error:', e); }
          }
          if (handLandmarkerRef.current) {
            try { 
              lastHandResult.current = handLandmarkerRef.current.detectForVideo(video, now); 
            } catch(e) { console.error('Hand detect error:', e); }
          }
          const tgts = buildLandmarkTargets(lastFaceResult.current, lastHandResult.current, W, H);
          
          // Debugging: expose to window
          (window as any)._debug_tracking = {
            faceCount: lastFaceResult.current?.faceLandmarks?.length ?? 0,
            handCount: lastHandResult.current?.landmarks?.length ?? 0,
            targetsCount: tgts.length
          };

          if (tgts.length > 0) setRawTargets(tgts);
        }
      }
    }

    // Trail fade — deep warm amber backdrop
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, 'rgba(28, 10, 4, 0.22)');
    grad.addColorStop(0.5, 'rgba(22, 7, 3, 0.22)');
    grad.addColorStop(1, 'rgba(32, 10, 5, 0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const dragMult = mouseRef.current.down ? DRAG_MULT : 1;

    // Interaction points for repulsion (Hands only, Face removed for clarity)
    const interactPoints: { x: number; y: number; r: number; f: number }[] = [];
    if (mode === 'camera') {
      // Hand tip repulsion (Index finger only for precision)
      if (lastHandResult.current?.landmarks) {
        lastHandResult.current.landmarks.forEach(hand => {
          if (hand[8]) { // Tip of index finger
            interactPoints.push({
              x: (1.0 - hand[8].x) * W,
              y: hand[8].y * H,
              r: 40,  // Reduced from 100
              f: 2.5  // Reduced from 4.0
            });
          }
        });
      }
    }

    particlesRef.current.forEach(p => {
      // Lerp toward raw target (smooth, no jump)
      p.tx += (p.rawTx - p.tx) * LERP_SPEED;
      p.ty += (p.rawTy - p.ty) * LERP_SPEED;

      const dx = p.tx - p.x, dy = p.ty - p.y;
      p.vx = (p.vx + dx * 0.05) * 0.85;
      p.vy = (p.vy + dy * 0.05) * 0.85;

      // Mouse repulsion
      applyMouseRepulsion(p, dragMult);

      // Landmark repulsion (Physical Interaction)
      interactPoints.forEach(pt => {
        const pdx = p.x - pt.x, pdy = p.y - pt.y;
        const dSq = pdx * pdx + pdy * pdy;
        if (dSq < pt.r * pt.r && dSq > 0.01) {
          const d = Math.sqrt(dSq);
          const force = Math.pow(1 - d / pt.r, 2) * pt.f;
          p.vx += (pdx / d) * force;
          p.vy += (pdy / d) * force;
        }
      });

      p.x += p.vx;
      p.y += p.vy;
      p.x = Math.max(-20, Math.min(W + 20, p.x));
      p.y = Math.max(-20, Math.min(H + 20, p.y));

      const vx = p.vx, vy = p.vy;
      const speedSq = vx * vx + vy * vy;
      
      if (speedSq > 0.01) {
        const speed = Math.sqrt(speedSq);
        const lightness = Math.min(58 + speed * 5, 90);
        const s = p.size * (1 + speed * 0.1);
        ctx.fillStyle = `hsla(${p.baseHue + speed * 5},78%,${lightness}%,${p.alpha})`;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else {
        ctx.fillStyle = `hsla(${p.baseHue},78%,58%,${p.alpha})`;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    });

    animRef.current = requestAnimationFrame(() => renderLoop(mode));
  }, [setRawTargets]);

  // ── Idle mode ──────────────────────────────────────────────────────────────
  // ── Idle mode ──────────────────────────────────────────────────────────────
  const startIdleMode = useCallback(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    
    // Initial particle distribution across current canvas dimensions
    initParticles(canvas.width, canvas.height);

    const applyCurrentPhrase = () => {
      const c = displayCanvasRef.current;
      if (!c) return;
      const tgts = buildTextTargets(IDLE_PHRASES[idxRef.current % IDLE_PHRASES.length], c.width, c.height);
      if (tgts.length) setRawTargets(tgts);
    };

    idxRef.current = 0;
    applyCurrentPhrase();

    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    idleTimerRef.current = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % IDLE_PHRASES.length;
      applyCurrentPhrase();
    }, 3200);
  }, [initParticles, setRawTargets]);

  // ── Load MediaPipe models ──────────────────────────────────────────────────
  const loadModels = useCallback(async () => {
    if (faceLandmarkerRef.current || modelLoadingRef.current) return;
    modelLoadingRef.current = true;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      const [face, hand] = await Promise.all([
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        }),
        HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        }),
      ]);
      faceLandmarkerRef.current = face;
      handLandmarkerRef.current = hand;
      setModelReady(true);
    } catch (e) {
      console.warn('[MediaPipe] Failed to load:', e);
      setModelReady(true);
    } finally {
      modelLoadingRef.current = false;
    }
  }, []);

  // ── Start camera ───────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.width = 640;
      video.height = 480;
      video.srcObject = stream;
      
      const pip = pipVideoRef.current!;
      pip.width = 640;
      pip.height = 480;
      const pipStream = stream.clone();
      pip.srcObject = pipStream;

      await Promise.all([
        video.play().catch(() => {}),
        pip.play().catch(() => {})
      ]);

      const canvas = displayCanvasRef.current!;
      canvas.width  = canvas.parentElement!.clientWidth;
      canvas.height = canvas.parentElement!.clientHeight;

      initParticles(canvas.width, canvas.height);
      lastFaceResult.current = null;
      lastHandResult.current = null;
      lastVideoTime.current  = -1;
      setCameraOn(true);
    } catch (e: any) {
      setError(e?.message ?? 'Camera access denied.');
    } finally {
      setLoading(false);
    }
  }, [initParticles]);

  // ── Stop camera ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    // Stop main stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // Stop and clear PiP video tracks (cloned stream)
    if (pipVideoRef.current?.srcObject) {
      const pipStream = pipVideoRef.current.srcObject as MediaStream;
      pipStream.getTracks().forEach(t => t.stop());
      pipVideoRef.current.srcObject = null;
    }
    
    // Clear references to ensure hardware release
    if (videoRef.current) videoRef.current.srcObject = null;

    setCameraOn(false);
    const c = displayCanvasRef.current;
    if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
  }, []);

  // ── Mount: resize canvas, start model load, start idle ────────────────────
  useEffect(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;

    const resize = () => {
      if (!parent) return;
      canvas.width  = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    const obs = new ResizeObserver(() => {
      resize();
      if (!cameraOn && particlesRef.current.length > 0) {
        const tgts = buildTextTargets(IDLE_PHRASES[idxRef.current % IDLE_PHRASES.length], canvas.width, canvas.height);
        setRawTargets(tgts);
      }
    });
    obs.observe(parent);

    resize();
    loadModels();
    
    // Render loop orchestration
    if (cameraOn) {
      renderLoop('camera');
    } else {
      startIdleMode();
      renderLoop('idle');
    }

    return () => {
      obs.disconnect();
      cancelAnimationFrame(animRef.current);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [cameraOn, renderLoop, startIdleMode, loadModels, setRawTargets]);

  // ── Hint cycling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraOn) return;
    const itv = setInterval(() => {
      setHintIdx(prev => (prev + 1) % HINTS.length);
    }, 5000);
    return () => clearInterval(itv);
  }, [cameraOn]);

  // ── Mouse event wiring on canvas ──────────────────────────────────────────
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    // Scale from CSS pixel to canvas pixel
    const scaleX = e.currentTarget.width  / r.width;
    const scaleY = e.currentTarget.height / r.height;
    mouseRef.current.x = (e.clientX - r.left) * scaleX;
    mouseRef.current.y = (e.clientY - r.top)  * scaleY;
  }, []);
  const onMouseLeave = useCallback(() => {
    mouseRef.current.x = -9999; mouseRef.current.y = -9999;
    mouseRef.current.down = false;
  }, []);
  const onMouseDown  = useCallback(() => { mouseRef.current.down = true;  }, []);
  const onMouseUp    = useCallback(() => { mouseRef.current.down = false; }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="toyland-page" style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: '80px', paddingBottom: '60px', color: '#62331d', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px', zIndex: 2 }}>
        <p style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.45em', color: 'rgba(211,119,53,0.7)', textTransform: 'uppercase', marginBottom: '10px' }}>
          ◈ Playground
        </p>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 4.5vw, 3.4rem)', fontWeight: 900, letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, #3d1f10 0%, #e07a3a 55%, #ffb51b 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px',
        }}>
          Particle Mirror
        </h1>
        <p style={{ fontSize: '13px', color: '#795943', maxWidth: '360px', lineHeight: 1.65 }}>
          {cameraOn
            ? 'Face & hands tracked as particles. Drag to scatter.'
            : 'Move your cursor through the particles — grant camera to see yourself.'}
        </p>
      </div>

      {/* Canvas container */}
      <div style={{
        position: 'relative', width: '90vw', maxWidth: '860px',
        aspectRatio: '16/10', borderRadius: '12px', overflow: 'hidden',
        border: cameraOn
          ? '1px solid rgba(211,130,60,0.40)'
          : '1px solid rgba(160,80,30,0.22)',
        background: 'linear-gradient(135deg, #1a0803 0%, #2d0f05 35%, #1f0904 65%, #260a03 100%)',
        boxShadow: cameraOn
          ? '0 18px 48px rgba(200,80,30,0.22), 0 0 80px rgba(255,160,40,0.10), inset 0 0 60px rgba(100,30,10,0.20)'
          : '0 14px 36px rgba(80,25,8,0.40), inset 0 0 40px rgba(60,15,5,0.18)',
        transition: 'box-shadow 0.8s ease, border-color 0.8s ease',
        zIndex: 1, cursor: 'crosshair',
      }}>
        {/* Ambient color blobs — behind particles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', width: '45%', height: '55%', top: '-10%', left: '-8%',
            background: 'radial-gradient(ellipse, rgba(200,80,20,0.22) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', width: '35%', height: '45%', bottom: '-5%', right: '-5%',
            background: 'radial-gradient(ellipse, rgba(160,40,10,0.18) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', width: '30%', height: '40%', top: '10%', right: '10%',
            background: 'radial-gradient(ellipse, rgba(220,100,30,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', width: '25%', height: '35%', bottom: '10%', left: '15%',
            background: 'radial-gradient(ellipse, rgba(180,60,20,0.10) 0%, transparent 70%)', borderRadius: '50%' }} />
        </div>

        {/* Model loading overlay */}
        {!modelReady && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 18,
            background: 'rgba(14,4,1,0.55)', backdropFilter: 'blur(2px)',
            borderRadius: '12px',
            opacity: 1,
            transition: 'opacity 0.6s ease',
            pointerEvents: 'none',
          }}>
            {/* Spinning ring */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none"
              style={{ animation: 'spin 1.4s linear infinite', flexShrink: 0 }}>
              <circle cx="24" cy="24" r="20" stroke="rgba(211,119,53,0.18)" strokeWidth="2"/>
              <path d="M24 4 A20 20 0 0 1 44 24" stroke="rgba(224,122,58,0.85)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontFamily: 'monospace', fontSize: '11px',
                color: 'rgba(255,180,80,0.80)', letterSpacing: '0.2em',
                textTransform: 'uppercase', marginBottom: 6,
              }}>
                Initialising AI models
              </p>
              <p style={{
                fontFamily: 'monospace', fontSize: '10px',
                color: 'rgba(255,255,255,0.30)', letterSpacing: '0.1em',
              }}>
                face · hand landmarkers loading…
              </p>
            </div>
          </div>
        )}

        {/* HUD Indicator (top-left) */}
        {cameraOn && (
          <div style={{
            position: 'absolute', top: 20, left: 20, zIndex: 10,
            display: 'flex', flexDirection: 'column', gap: 6,
            pointerEvents: 'none', userSelect: 'none'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', borderRadius: '6px',
              background: 'rgba(211,119,53,0.08)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(211,119,53,0.22)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#e07a3a', boxShadow: '0 0 8px #e07a3a',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{
                fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase'
              }}>
                Interactive: Active
              </span>
            </div>
            
            <div style={{
              padding: '10px 14px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.05)',
              minWidth: '220px', transition: 'all 0.5s ease'
            }}>
              <span style={{
                display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.7)',
                fontFamily: 'monospace', letterSpacing: '0.05em',
                animation: 'fadeInOut 5s infinite'
              }}>
                {HINTS[hintIdx]}
              </span>
            </div>
          </div>
        )}

        {/* Hidden source video for MediaPipe (needs layout/dimensions) */}
        <video 
          ref={videoRef} 
          muted 
          autoPlay
          playsInline 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '640px', 
            height: '480px', 
            opacity: 0, 
            pointerEvents: 'none',
            zIndex: -1 
          }} 
        />

        <canvas
          ref={displayCanvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
        />

        {/* PiP preview */}
        <div style={{
          position: 'absolute', bottom: 14, right: 14,
          width: 'clamp(88px, 12vw, 155px)', aspectRatio: '4/3',
          borderRadius: '8px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
          opacity: cameraOn ? 1 : 0,
          transform: cameraOn ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.9)',
          transition: 'opacity 0.45s ease, transform 0.45s ease',
          background: '#1a0a02', zIndex: 3,
        }}>
          <video ref={pipVideoRef} muted autoPlay playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(211,119,53,0.1), transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 6, left: 8, fontSize: '8px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>live</div>
          <div style={{ position: 'absolute', top: 8, right: 8, width: 5, height: 5, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 5px #ef4444', animation: 'blink 1.2s ease-in-out infinite alternate' }} />
        </div>

        {/* Corner brackets */}
        {(['tl','tr','bl','br'] as const).map(p => (
          <div key={p} style={{
            position: 'absolute', width: 16, height: 16,
            ...(p[0]==='t' ? { top: 10 } : { bottom: 10 }),
            ...(p[1]==='l' ? { left: 10 } : { right: 10 }),
            borderTop:    p[0]==='t' ? '1px solid rgba(211,120,50,0.30)' : 'none',
            borderBottom: p[0]==='b' ? '1px solid rgba(211,120,50,0.30)' : 'none',
            borderLeft:   p[1]==='l' ? '1px solid rgba(211,120,50,0.30)' : 'none',
            borderRight:  p[1]==='r' ? '1px solid rgba(211,120,50,0.30)' : 'none',
          }} />
        ))}

        {/* Cursor hint (idle) */}
        {!cameraOn && (
          <div style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            fontSize: '9px', fontFamily: 'monospace',
            color: 'rgba(255,180,80,0.30)',
            letterSpacing: '0.12em', pointerEvents: 'none',
          }}>
            ✦ move cursor · click + drag to pull
          </div>
        )}
      </div>

      {/* Model status pill */}
      <div style={{
        marginTop: '12px', display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 14px', borderRadius: '100px',
        border: modelReady
          ? '1px solid rgba(100,200,100,0.20)'
          : '1px solid rgba(211,119,53,0.25)',
        background: modelReady
          ? 'rgba(60,160,60,0.05)'
          : 'rgba(211,119,53,0.07)',
        transition: 'all 0.6s ease',
        zIndex: 2,
      }}>
        {!modelReady && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ animation: 'spin 1.2s linear infinite', flexShrink: 0 }}>
            <circle cx="5" cy="5" r="4" stroke="rgba(211,119,53,0.3)" strokeWidth="1.2"/>
            <path d="M5 1 A4 4 0 0 1 9 5" stroke="rgba(224,122,58,0.9)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        )}
        {modelReady && (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
        )}
        <span style={{
          fontFamily: 'monospace', fontSize: '9px',
          letterSpacing: '0.15em', textTransform: 'uppercase',
          color: modelReady ? 'rgba(100,220,100,0.70)' : 'rgba(211,160,80,0.75)',
        }}>
          {modelReady ? 'AI ready' : 'Loading models…'}
        </span>
      </div>

      {/* Controls */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', zIndex: 2 }}>
        {!cameraOn ? (
          <CameraButton loading={loading} modelReady={modelReady} onClick={startCamera} />
        ) : (
          <button
            onClick={stopCamera}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 22px', borderRadius: '100px',
              border: '1px solid rgba(239,68,68,0.32)', background: 'rgba(239,68,68,0.05)',
              color: 'rgba(255,120,120,0.78)', fontSize: '10px',
              fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.05)')}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 5px #ef4444', display: 'inline-block', animation: 'blink 1s ease-in-out infinite alternate' }} />
            stop
          </button>
        )}

        {cameraOn && (
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
            {['✦ face + hands tracked', '↑ hold still to sharpen', '⊙ drag cursor to scatter'].map(t => (
              <span key={t} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>{t}</span>
            ))}
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 18px', borderRadius: '8px',
            border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)',
            color: 'rgba(255,120,120,0.8)', fontSize: '11px', fontFamily: 'monospace',
          }}>
            {error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { from { opacity:0.35; } to { opacity:1; } }
        @keyframes spin  { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes fadeInOut { 0% { opacity:0; transform: translateY(4px); } 10% { opacity:1; transform: translateY(0); } 90% { opacity:1; transform: translateY(0); } 100% { opacity:0; transform: translateY(-4px); } }
      `}</style>
    </div>
  );
};
