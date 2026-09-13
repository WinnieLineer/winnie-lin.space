import { useState, useCallback } from 'react';
import Spline from '@splinetool/react-spline';

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '28px',
  height: '28px',
  padding: '0 6px',
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderBottom: '3px solid rgba(255,255,255,0.25)',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '700',
  color: '#fff',
  fontFamily: 'monospace',
  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.65)',
  whiteSpace: 'nowrap',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
};

export const HomePage = () => {
  const [sceneKey, setSceneKey] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleSceneLoad = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => setSceneLoaded(true), 600);
  }, []);

  const handleReset = () => {
    setSceneLoaded(false);
    setFadeOut(false);
    setSpinning(true);
    setTimeout(() => {
      setSceneKey((k) => k + 1);
      setSpinning(false);
    }, 400);
  };

  return (
    <>
      {/* Spline scene — base layer */}
      <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', zIndex: 0 }}>
        <Spline
          key={sceneKey}
          scene="https://prod.spline.design/gEgiAMAIMKgNACj1/scene.splinecode"
          onLoad={handleSceneLoad}
        />
      </div>

      {/* Loading overlay — shows until Spline fires onLoad */}
      {!sceneLoaded && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '20px',
          background: '#0a0a0f',
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 0.6s ease',
          pointerEvents: fadeOut ? 'none' : 'all',
        }}>
          {/* Spinning ring */}
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none"
              style={{ animation: 'spin3d 1.4s linear infinite', position: 'absolute', inset: 0 }}>
              <circle cx="32" cy="32" r="28" stroke="rgba(167,139,250,0.15)" strokeWidth="2"/>
              <path d="M32 4 A28 28 0 0 1 60 32" stroke="rgba(167,139,250,0.9)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M32 4 A28 28 0 0 1 52 14" stroke="rgba(96,165,250,0.5)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {/* Pulsing centre dot */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 8, height: 8, borderRadius: '50%',
              background: 'rgba(167,139,250,0.8)',
              boxShadow: '0 0 12px rgba(167,139,250,0.6)',
              animation: 'pulse3d 1.8s ease-in-out infinite',
            }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: '11px', letterSpacing: '0.22em',
              textTransform: 'uppercase', color: 'rgba(167,139,250,0.75)',
              marginBottom: '6px',
            }}>
              Loading 3D Scene
            </p>
            <p style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: '10px', letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.22)',
            }}>
              Hang tight…
            </p>
          </div>
          <style>{`
            @keyframes spin3d { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pulse3d { 0%,100% { opacity:0.5; transform:translate(-50%,-50%) scale(1); } 50% { opacity:1; transform:translate(-50%,-50%) scale(1.5); } }
          `}</style>
        </div>
      )}

      {/* Reset button — sits above Spline canvas */}
      <button
        onClick={handleReset}
        title="Reset scene"
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '999px',
          color: 'rgba(255,255,255,0.75)',
          fontSize: '12px',
          fontWeight: '600',
          fontFamily: 'system-ui, sans-serif',
          cursor: 'pointer',
          letterSpacing: '0.04em',
          transition: 'background 0.2s, color 0.2s',
          pointerEvents: 'all',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
          (e.currentTarget as HTMLButtonElement).style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.45)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)';
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: '14px',
            transition: 'transform 0.4s ease',
            transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
          }}
        >
          ↺
        </span>
        Reset
      </button>

      {/* Controls hint — sits above Spline canvas */}
      <div
        style={{
          position: 'fixed',
          bottom: '0',
          right: '0',
          zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRight: 'none',
          borderBottom: 'none',
          borderRadius: '14px 0 0 0',
          padding: '14px 18px 20px 18px',
          minWidth: '220px',
          pointerEvents: 'none',
        }}
      >
        <p style={{
          fontSize: '10px',
          fontWeight: '700',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '12px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          Controls
        </p>

        {/* WASD */}
        <div style={rowStyle}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['W', 'A', 'S', 'D'].map((k) => (
              <kbd key={k} style={kbdStyle}>{k}</kbd>
            ))}
          </div>
          <span style={labelStyle}>Move</span>
        </div>

        {/* Arrow keys */}
        <div style={rowStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <kbd style={kbdStyle}>↑</kbd>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['←', '↓', '→'].map((k) => (
                <kbd key={k} style={kbdStyle}>{k}</kbd>
              ))}
            </div>
          </div>
          <span style={labelStyle}>Camera angle</span>
        </div>

        {/* Mouse click */}
        <div style={rowStyle}>
          <kbd style={{ ...kbdStyle, padding: '0 8px' }}>🖱</kbd>
          <span style={labelStyle}>Click to move</span>
        </div>

        {/* Mouse drag */}
        <div style={rowStyle}>
          <kbd style={{ ...kbdStyle, padding: '0 8px' }}>⇄</kbd>
          <span style={labelStyle}>Drag to rotate view</span>
        </div>

        <p style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.3)',
          marginTop: '6px',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: '1.5',
        }}>
          * Switch to English input for WASD
        </p>
      </div>
    </>
  );
};
