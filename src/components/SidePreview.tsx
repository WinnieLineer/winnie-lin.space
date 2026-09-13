import React, { useEffect, useRef, useState } from 'react';

// Animated CRT noise overlay
const NoiseCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width = 300;
    const H = canvas.height = 200;
    let frameCount = 0;

    const drawNoise = () => {
      frameCount++;
      // Throttle to ~10fps (skip 5 out of every 6 frames)
      if (frameCount % 6 === 0) {
        const imageData = ctx.createImageData(W, H);
        const d = imageData.data;

        for (let i = 0; i < d.length; i += 4) {
          const rand = Math.random() * 255;
          d[i] = rand;   // R
          d[i+1] = rand; // G
          d[i+2] = rand; // B
          d[i+3] = Math.random() < 0.03 ? 40 : 0; // Only ~3% pixels visible
        }

        ctx.putImageData(imageData, 0, 0);

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let y = 0; y < H; y += 3) {
          ctx.fillRect(0, y, W, 1);
        }
      }

      animRef.current = requestAnimationFrame(drawNoise);
    };
    drawNoise();

    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        mixBlendMode: 'screen',
        opacity: 0.6,
        pointerEvents: 'none',
        borderRadius: '6px',
      }}
    />
  );
};

interface SidePreviewProps {
  image: string;
  title: string;
  index: number;
  visible: boolean;
  side: 'left' | 'right';
  color: string;
}

export const SidePreview: React.FC<SidePreviewProps> = ({
  image, title, index, visible, side, color,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setMounted(true), 10);
      return () => clearTimeout(t);
    } else {
      setMounted(false);
    }
  }, [visible]);

  const rotateDeg = side === 'left' ? -8 : 8;
  const translateX = mounted && visible ? '0%' : side === 'left' ? '-15%' : '15%';

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        top: '50%',
        [side]: '2vw',
        transform: `translateY(-50%)`,
        width: 'clamp(200px, 20vw, 300px)',
        zIndex: 50,
        opacity: mounted && visible ? 1 : 0,
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          transform: `perspective(800px) rotateY(${side === 'left' ? 8 : -8}deg) rotateZ(${rotateDeg}deg) translateX(${translateX})`,
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Image card with CRT noise */}
        <div
          style={{
            borderRadius: '6px',
            overflow: 'hidden',
            border: `1px solid ${color}33`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 30px ${color}22`,
            position: 'relative',
          }}
        >
          <img
            src={image}
            alt={title}
            style={{
              width: '100%',
              display: 'block',
              aspectRatio: '16/10',
              objectFit: 'cover',
            }}
          />

          {/* CRT noise overlay - only render when visible for performance */}
          {visible && <NoiseCanvas />}

          {/* Glitch scan line sweep */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, transparent 0%, ${color}08 50%, transparent 100%)`,
              backgroundSize: '100% 6px',
              animation: 'scanSweep 3s linear infinite',
              pointerEvents: 'none',
            }}
          />

          {/* Vignette */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Color tone overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `${color}0d`,
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Label below */}
        <div
          style={{
            marginTop: '10px',
            paddingLeft: side === 'left' ? '4px' : '0',
            paddingRight: side === 'right' ? '4px' : '0',
            textAlign: side === 'left' ? 'left' : 'right',
          }}
        >
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: color,
              opacity: 0.8,
              marginBottom: '2px',
            }}
          >
            #{String(index + 1).padStart(2, '0')}
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.02em',
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
        </div>
      </div>
    </div>
  );
};
