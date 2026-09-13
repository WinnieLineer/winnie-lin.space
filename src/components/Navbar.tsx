import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [location]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-base transition-colors duration-300 hover:text-[#ff5f7f] ${isActive ? (isHome ? 'text-white font-semibold' : 'text-[#7a3d22] font-semibold') : (isHome ? 'text-gray-400' : 'text-[#8b735f]')}`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block text-2xl font-bold transition-colors duration-200 py-3 border-b border-white/8 hover:text-[#ffb51b] ${isActive ? 'text-white' : 'text-gray-400'}`;

  const navLinks = [
    { to: '/',           label: 'Home' },
    { to: '/portfolio',  label: 'Attempts' },
    { to: '/posts',      label: 'Posts' },
    { to: '/playground', label: 'Playground' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled || open || !isHome ? 'bg-[#ffe7d5]/80 backdrop-blur-xl border-b border-[#b66a3b]/15 shadow-[0_6px_24px_rgba(126,70,34,0.08)]' : 'bg-transparent'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex justify-between items-center h-14">
          {/* Brand */}
          <NavLink to="/" className={`text-xl font-bold transition-colors shrink-0 ${isHome ? 'text-white hover:text-[#fff1dd]' : 'text-[#6d351d] hover:text-[#ff5f7f]'}`}>
            SHIH TING LIN
          </NavLink>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-8">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} className={linkClass} end={to === '/'}>
                {label}
              </NavLink>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden flex flex-col gap-1.5 p-1 z-50"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span
              className="block w-6 h-0.5 bg-white transition-all duration-300"
              style={{ transform: open ? 'rotate(45deg) translateY(8px)' : 'none' }}
            />
            <span
              className="block w-6 h-0.5 bg-white transition-all duration-300"
              style={{ opacity: open ? 0 : 1 }}
            />
            <span
              className="block w-6 h-0.5 bg-white transition-all duration-300"
              style={{ transform: open ? 'rotate(-45deg) translateY(-8px)' : 'none' }}
            />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className="sm:hidden fixed inset-0 z-40 transition-all duration-400"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex flex-col justify-center h-full px-10 pb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#e07a3a] mb-8">Navigation</p>
          {navLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} className={mobileLinkClass} end={to === '/'}>
              {label}
            </NavLink>
          ))}

          <div className="mt-12 pt-8 border-t border-white/10">
            <a
              href="mailto:hi@winnie-lin.space"
              className="text-sm text-gray-500 hover:text-[#ffb51b] transition-colors"
            >
              hi@winnie-lin.space
            </a>
          </div>
        </div>
      </div>
    </>
  );
};
