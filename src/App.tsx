import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { FancyCursor } from './components/FancyCursor';

// Heavy pages — lazy loaded for code splitting
const PostsPage      = lazy(() => import('./pages/PostsPage').then(m => ({ default: m.PostsPage })));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage').then(m => ({ default: m.PostDetailPage })));
const PortfolioPage  = lazy(() => import('./pages/PortfolioPage').then(m => ({ default: m.PortfolioPage })));
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage').then(m => ({ default: m.PlaygroundPage })));

// Minimal fallback spinner — pages have their own loading skeletons
const PageFallback = () => (
  <div style={{
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center', background: '#F9D3B7',
  }}>
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none"
      style={{ animation: 'spin 1.2s linear infinite' }}>
      <circle cx="20" cy="20" r="17" stroke="rgba(139,69,30,0.18)" strokeWidth="2"/>
      <path d="M20 3 A17 17 0 0 1 37 20" stroke="rgba(230,93,73,0.85)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
    <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <FancyCursor />
      <Navbar />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/"            element={<HomePage />} />
          <Route path="/posts"       element={<PostsPage />} />
          <Route path="/portfolio"   element={<PortfolioPage />} />
          <Route path="/playground"  element={<PlaygroundPage />} />
          {/* The route now uses a slug parameter, which is the most robust and SEO-friendly method */}
          <Route path="/posts/:slug" element={<PostDetailPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
