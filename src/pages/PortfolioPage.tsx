import { useState, useEffect, useRef } from 'react';
import { SidePreview } from '../components/SidePreview';

const projects = [
  {
    title: 'Daily Diet',
    description: 'A daily nutrition companion designed to make meal logging and healthier choices feel simple and approachable.',
    image: '/portfolio/daily-diet.svg',
    url: 'https://winnie-lin.space/daily-diet/',
    tags: ['Health', 'Nutrition', 'Lifestyle'],
    year: '2026',
    color: '#84a947',
  },
  {
    title: 'Asset Insights',
    description: 'An advanced asset tracking dashboard with automatic classification, real-time stock prices, and historical bar charts.',
    image: '/portfolio/asset-insights.png',
    url: 'https://winnie-lin.space/asset-insights/',
    tags: ['Finance', 'AI', 'Real-time'],
    year: '2026',
    color: '#7c3aed',
  },
  {
    title: 'HeartSync',
    description: 'A shared-life balance app for couples to track expenses and household contributions in one thoughtful view.',
    image: '/portfolio/heartsync.svg',
    url: 'https://winnie-lin.space/couple-balance/',
    tags: ['Couples', 'Finance', 'Wellbeing'],
    year: '2026',
    color: '#e879a8',
  },
  {
    title: 'Dawnguard',
    description: 'An AI-powered counseling chatbot themed around Tanjiro Kamado. Empathetic and supportive.',
    image: '/portfolio/dawnguard.png',
    url: 'https://winnie-lin.space/dawnguard/',
    tags: ['Mental Health', 'Chatbot', 'Anime'],
    year: '2026',
    color: '#0ea5e9',
  },
  {
    title: 'Focus Flow',
    description: 'A productivity PWA with strict session management and distraction penalties. Premium glassmorphism UI.',
    image: '/portfolio/focus-flow.png',
    url: 'https://winnie-lin.space/focus-flow/',
    tags: ['Productivity', 'PWA', 'Focus'],
    year: '2025',
    color: '#10b981',
  },
  {
    title: 'Lofi Music',
    description: 'An immersive Lofi music player paired with calming, atmospheric visuals.',
    image: '/portfolio/lofi-music.png',
    url: 'https://winnie-lin.space/LofiMusic/',
    tags: ['Music', 'Relaxation', 'Audio'],
    year: '2025',
    color: '#f59e0b',
  },
  {
    title: 'Pomodoro',
    description: 'A minimalist Pomodoro timer to optimize workflow and manage time effectively.',
    image: '/portfolio/pomodoro.png',
    url: 'https://winnie-lin.space/Pomodoro/',
    tags: ['Productivity', 'Time Management'],
    year: '2025',
    color: '#ef4444',
  },
  {
    title: 'DreamScape',
    description: 'A visually striking interactive 3D demo resembling a high-quality game title sequence.',
    image: '/portfolio/dreamscape.png',
    url: 'https://winnie-lin.space/DreamScape/',
    tags: ['Animation', 'Demo', 'Game'],
    year: '2024',
    color: '#8b5cf6',
  },
  {
    title: 'BPTracker',
    description: 'A health monitoring app with OCR for automated blood pressure and weight logging.',
    image: '/portfolio/bptracker.png',
    url: 'https://winnie-lin.space/BPTracker/',
    tags: ['Health', 'OCR', 'AI'],
    year: '2024',
    color: '#ec4899',
  },
  {
    title: 'Clock for Phone',
    description: 'A phone-first clock experience that turns time into a calm, focused part of the day.',
    image: '/portfolio/clock-for-phone.svg',
    url: 'https://winnie-lin.space/clockForPhone/',
    tags: ['Mobile', 'Utility', 'Time'],
    year: '2026',
    color: '#5b7cfa',
  },
];

// Floating particle background
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#ff6b6b', '#fb923c'];
    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 1.8 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    let animId: number;
    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x = (p.x + p.vx + canvas.width) % canvas.width;
        p.y = (p.y + p.vy + canvas.height) % canvas.height;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      // Connector lines — only recalculate every 2nd frame
      if (frame % 2 === 0) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 100) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = particles[i].color;
              ctx.globalAlpha = (1 - d / 100) * 0.1;
              ctx.lineWidth = 0.5;
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
          }
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animate();
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, opacity: 0.6 }} />;
};

export const PortfolioPage = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [cursorBlink, setCursorBlink] = useState(true);
  const [titleVisible, setTitleVisible] = useState(false);
  const [visibleItems, setVisibleItems] = useState<boolean[]>(new Array(projects.length).fill(false));

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => setCursorBlink(b => !b), 530);
    return () => clearInterval(interval);
  }, []);

  // Staggered entrance
  useEffect(() => {
    const t = setTimeout(() => setTitleVisible(true), 100);
    projects.forEach((_, i) => {
      setTimeout(() => {
        setVisibleItems(prev => { const next = [...prev]; next[i] = true; return next; });
      }, 200 + i * 90);
    });
    return () => clearTimeout(t);
  }, []);

  const hoveredProject = hoveredIndex !== null ? projects[hoveredIndex] : null;
  const isLeft = hoveredIndex !== null && hoveredIndex % 2 === 0;
  const side = isLeft ? 'left' : 'right';

  return (
    <div className="toyland-page relative overflow-hidden">
      <ParticleField />

      {/* Ambient glows */}
      <div className="fixed pointer-events-none" style={{ top: '15%', left: '5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: '10%', right: '5%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(14,165,233,0.04) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
      {/* Warm ambient glow — coral/orange, ties to Spline scene */}
      <div className="fixed pointer-events-none" style={{ top: '40%', right: '20%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(251,146,60,0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ bottom: '30%', left: '15%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />

      {/* Side floating preview */}
      {hoveredProject && (
        <SidePreview
          image={hoveredProject.image}
          title={hoveredProject.title}
          index={hoveredIndex!}
          visible={hoveredIndex !== null}
          side={side}
          color={hoveredProject.color}
        />
      )}

      {/* Main content */}
      <div className="relative mx-auto px-8 md:px-16 lg:px-24 pt-32 pb-24" style={{ maxWidth: '860px', zIndex: 1 }}>

        {/* Header */}
        <div
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? 'translateY(0)' : 'translateY(-16px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            marginBottom: '64px',
          }}
        >
          <div className="text-xs font-mono uppercase tracking-[0.4em] mb-3" style={{ color: 'rgba(211,119,53,0.75)' }}>
            ◈ Attempts
          </div>
          <div className="flex justify-between items-baseline">
            <h1 className="portfolio-main-title">Experiments</h1>
              <div className="text-right">
                <div className="font-mono text-sm" style={{ color: '#6b4530' }}>2024–2026</div>
                <div className="font-mono mt-1 tracking-widest uppercase" style={{ fontSize: '10px', color: '#9b6b4a' }}>
                  things i built for fun
                </div>
              </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px mb-0 relative" style={{ background: 'linear-gradient(90deg, transparent, rgba(211,119,53,0.45), rgba(230,93,73,0.25), transparent)' }} />

        {/* Project list */}
        <div className="relative">
          {projects.map((project, index) => (
            <a
              href={project.url}
              key={index}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                opacity: visibleItems[index] ? 1 : 0,
                transform: visibleItems[index] ? 'translateX(0)' : 'translateX(-20px)',
                transition: `opacity 0.5s ease ${index * 0.05}s, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 0.05}s`,
              }}
            >
              {/* Row */}
              <div
                className="flex items-center justify-between py-5 relative"
                style={{
                  borderBottom: `1px solid ${hoveredIndex === index ? `${project.color}44` : 'rgba(0,0,0,0.10)'}`,                  transition: 'border-color 0.3s ease',
                }}
              >
                {/* Left: number + title + tags */}
                <div className="flex items-center gap-5 min-w-0 flex-1 pr-6">
                  {/* Index */}
                  <span
                    className="text-xs font-mono shrink-0 tabular-nums transition-all duration-300 hidden sm:inline"
                    style={{
                      color: hoveredIndex === index ? project.color : 'transparent',
                      WebkitTextStroke: hoveredIndex === index ? '0px' : '1px rgba(0,0,0,0.25)',
                      textShadow: hoveredIndex === index ? `0 0 8px ${project.color}` : 'none',
                      width: '28px',
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="min-w-0">
                    {/* Title */}
                    <h2
                      className="font-black uppercase tracking-tighter leading-none transition-all duration-400"
                      style={{
                        fontSize: 'clamp(1.8rem, 4vw, 3.5rem)',
                        background: hoveredIndex === index
                          ? `linear-gradient(135deg, #3d1f10 0%, ${project.color} 100%)`
                          : `linear-gradient(135deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.04) 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        WebkitTextStroke: hoveredIndex === index ? '0px' : '1px rgba(0,0,0,0.18)',
                        filter: hoveredIndex === index ? `drop-shadow(0 0 18px ${project.color}55)` : 'none',
                        transition: 'all 0.35s ease',
                        display: 'block',
                      }}
                    >
                      {project.title}
                    </h2>

                    {/* Description — shows on hover */}
                    <p
                      className="text-xs leading-relaxed mt-1 max-w-sm transition-all duration-300"
                      style={{
                        color: hoveredIndex === index ? 'rgba(0,0,0,0.75)' : 'transparent',
                        maxHeight: hoveredIndex === index ? '60px' : '0px',
                        overflow: 'hidden',
                        transition: 'color 0.3s ease, max-height 0.4s ease',
                      }}
                    >
                      {project.description}
                    </p>
                  </div>
                </div>

                {/* Right: thumbnail card + year */}
                <div className="flex items-center gap-4 shrink-0">
                  {/* Tags (only on hover, large screen) */}
                  <div
                    className="hidden xl:flex gap-1.5 flex-wrap justify-end"
                    style={{
                      opacity: hoveredIndex === index ? 1 : 0,
                      transform: hoveredIndex === index ? 'translateX(0)' : 'translateX(8px)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {project.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                        style={{
                          border: `1px solid ${project.color}55`,
                          color: project.color,
                          background: `${project.color}0d`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Year */}
                  <span
                    className="text-base font-light font-mono transition-all duration-300 hidden sm:block"
                    style={{
                      color: hoveredIndex === index ? project.color : 'rgba(0,0,0,0.3)',
                      textShadow: hoveredIndex === index ? `0 0 12px ${project.color}` : 'none',
                      minWidth: '44px',
                      textAlign: 'right',
                    }}
                  >
                    {project.year}
                  </span>

                  {/* Thumbnail card */}
                  <div
                    className="relative overflow-hidden rounded shrink-0"
                    style={{
                      width: 'clamp(64px, 8vw, 90px)',
                      aspectRatio: '16/10',
                      border: `1px solid ${hoveredIndex === index ? `${project.color}55` : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: hoveredIndex === index ? `0 0 20px ${project.color}30` : 'none',
                      transition: 'border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease',
                      transform: hoveredIndex === index ? 'scale(1.04)' : 'scale(1)',
                    }}
                  >
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover transition-all duration-500"
                      style={{
                        filter: hoveredIndex === index ? 'none' : 'grayscale(30%) brightness(0.88)',
                      }}
                    />
                    {/* Color overlay on hover */}
                    <div
                      className="absolute inset-0 transition-opacity duration-300"
                      style={{
                        background: `linear-gradient(135deg, ${project.color}22, transparent)`,
                        opacity: hoveredIndex === index ? 1 : 0,
                      }}
                    />
                  </div>

                  {/* Arrow */}
                  <span
                    className="text-base transition-all duration-300 hidden md:block"
                    style={{
                      color: project.color,
                      opacity: hoveredIndex === index ? 1 : 0,
                      transform: hoveredIndex === index ? 'translate(0, 0)' : 'translate(-6px, 6px)',
                      textShadow: `0 0 8px ${project.color}`,
                    }}
                  >
                    ↗
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div
          className="mt-24 pt-10 flex justify-between items-center text-gray-700 font-mono text-xs uppercase tracking-[0.3em]"
          style={{ borderTop: '1px solid rgba(0,0,0,0.10)' }}
        >
          <span>© 2026 SHIH TING</span>
          <span className="flex items-center gap-1" style={{ color: '#8b5a40' }}>
            Built for curiosity
            <span
              className="inline-block w-[2px] h-[13px] bg-[#e07a3a] ml-1"
              style={{ opacity: cursorBlink ? 1 : 0, transition: 'opacity 0.1s' }}
            />
          </span>
        </div>
      </div>
    </div>
  );
};
