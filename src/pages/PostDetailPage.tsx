import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { getPostBySlug } from '../lib/api';
import { useEffect, useRef, useState } from 'react';
import type { Components } from 'react-markdown';

// ─── Reading progress bar ─────────────────────────────────────────────────────
const ReadingProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      height: '2px', background: 'rgba(126,70,34,0.12)',
    }}>
      <div style={{
        height: '100%', width: `${progress}%`,
        background: 'linear-gradient(90deg, #e07a3a, #ffb51b, #e65d49, #f59e0b)',
        transition: 'width 0.1s linear',
        boxShadow: '0 0 8px rgba(230,125,58,0.7)',
      }} />
    </div>
  );
};

// ─── Estimated read time ──────────────────────────────────────────────────────
const readTime = (text: string) => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
};

// ─── Custom markdown components ───────────────────────────────────────────────
const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 style={{
      fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
      fontWeight: 900,
      color: '#62331d',
      marginTop: '2.5rem',
      marginBottom: '1rem',
      paddingLeft: '1rem',
      borderLeft: '3px solid #e07a3a',
      lineHeight: 1.25,
    }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={{
      fontSize: 'clamp(1.3rem, 2.5vw, 1.75rem)',
      fontWeight: 800,
      color: '#6d351d',
      marginTop: '2.2rem',
      marginBottom: '0.9rem',
      paddingLeft: '0.85rem',
      borderLeft: '2px solid #d35346',
      lineHeight: 1.3,
    }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{
      fontSize: '1.15rem',
      fontWeight: 700,
      color: '#b45309',
      marginTop: '1.8rem',
      marginBottom: '0.7rem',
    }}>{children}</h3>
  ),
  p: ({ children }) => (
    <p style={{
      color: '#684b39',
      lineHeight: 1.85,
      marginBottom: '1.2rem',
      fontSize: '1rem',
    }}>{children}</p>
  ),
  strong: ({ children }) => (
    <strong style={{ color: '#62331d', fontWeight: 700 }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: '#b45309', fontStyle: 'italic' }}>{children}</em>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        color: '#d35346',
        textDecoration: 'underline',
        textDecorationColor: 'rgba(211,83,70,0.35)',
        textUnderlineOffset: '3px',
        transition: 'color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#b45309')}
      onMouseLeave={e => (e.currentTarget.style.color = '#d35346')}
    >{children}</a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      const lang = className?.replace('language-', '') ?? '';
      return (
        <div style={{
          margin: '1.5rem 0',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          border: '1px solid rgba(211,119,53,0.25)',
          background: '#fff8e8',
          backdropFilter: 'blur(8px)',
        }}>
          {/* Header bar */}
          {lang && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.5rem 1rem',
              background: '#ffe4c6',
              borderBottom: '1px solid rgba(211,119,53,0.18)',
            }}>
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#b45309', fontFamily: 'monospace' }}>{lang}</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => (
                  <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                ))}
              </div>
            </div>
          )}
          <pre style={{ margin: 0, padding: '1.2rem 1.4rem', overflowX: 'auto' }}>
            <code style={{ fontFamily: '"Fira Code", "JetBrains Mono", monospace', fontSize: '0.875rem', color: '#62331d', lineHeight: 1.7 }}>
              {children}
            </code>
          </pre>
        </div>
      );
    }
    // Inline code
    return (
      <code style={{
        fontFamily: '"Fira Code", "JetBrains Mono", monospace',
        fontSize: '0.85em',
        color: '#557326',
        background: '#e5f5c8',
        border: '1px solid rgba(132,169,71,0.32)',
        borderRadius: '0.3rem',
        padding: '0.1em 0.45em',
      }} {...props}>{children}</code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  ul: ({ children }) => (
    <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.2rem', color: '#684b39', lineHeight: 1.8 }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.2rem', color: '#684b39', lineHeight: 1.8 }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ marginBottom: '0.4rem', paddingLeft: '0.3rem' }}>{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      margin: '1.5rem 0',
      padding: '1rem 1.4rem',
      borderLeft: '3px solid #e07a3a',
      background: '#fff0bd',
      borderRadius: '0 0.5rem 0.5rem 0',
      color: '#79521f',
      fontStyle: 'italic',
    }}>{children}</blockquote>
  ),
  hr: () => (
    <hr style={{
      margin: '2.5rem 0',
      border: 'none',
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(211,119,53,0.35), transparent)',
    }} />
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '1.5rem 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ padding: '0.6rem 1rem', background: '#ffe4c6', color: '#79521f', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid rgba(211,119,53,0.25)' }}>{children}</th>
  ),
  td: ({ children }) => (
    <td style={{ padding: '0.55rem 1rem', borderBottom: '1px solid rgba(126,70,34,0.1)', color: '#684b39' }}>{children}</td>
  ),
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="toyland-page min-h-screen" style={{ paddingTop: '5rem' }}>
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 1.5rem' }}>
      <div className="animate-pulse space-y-6">
        <div style={{ height: '2rem', width: '30%', background: 'rgba(139,69,30,0.10)', borderRadius: '0.5rem' }} />
        <div style={{ height: '4rem', width: '80%', background: 'rgba(139,69,30,0.13)', borderRadius: '0.5rem' }} />
        <div style={{ height: '1rem', width: '40%', background: 'rgba(139,69,30,0.08)', borderRadius: '0.5rem' }} />
        <div style={{ height: '1px', background: 'rgba(139,69,30,0.10)' }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ height: '1rem', width: `${70 + (i % 3) * 8}%`, background: 'rgba(139,69,30,0.08)', borderRadius: '0.5rem' }} />
        ))}
      </div>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export const PostDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLDivElement>(null);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => getPostBySlug(slug!),
    enabled: !!slug,
  });

  const minutes = post ? readTime(post.content) : null;

  if (isLoading) return <LoadingSkeleton />;

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 pt-24">
        <div style={{
          padding: '3rem', textAlign: 'center',
          background: '#fff8e8', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(211,119,53,0.25)', borderRadius: '1.5rem',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✦</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f87171', marginBottom: '0.75rem' }}>Post Not Found</h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Couldn't locate this post. It may have moved.</p>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(211,119,53,0.18)', border: '1px solid rgba(230,125,58,0.35)',
              color: '#8b5a40', padding: '0.75rem 1.5rem', borderRadius: '0.75rem',
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(211,119,53,0.32)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(211,119,53,0.18)')}
          >
            ← Back to Blog
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ReadingProgress />

      <div className="toyland-page" style={{ minHeight: '100vh', paddingBottom: '6rem', paddingTop: '5rem' }}>


        <div style={{ position: 'relative', zIndex: 1, maxWidth: '780px', margin: '0 auto', padding: '0 1.5rem' }}>


          {/* ── Back button ── */}
          <div style={{ marginBottom: '2.5rem' }}>
            <Link
              to="/posts"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                color: '#6b4530', fontSize: '0.85rem', letterSpacing: '0.05em',
                textDecoration: 'none', transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e07a3a')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6b4530')}
            >
              <span style={{ fontSize: '1rem' }}>←</span> All Posts
            </Link>
          </div>

          {/* ── Hero header ── */}
          <header style={{
            marginBottom: '3rem',
            padding: '2.5rem 2rem',
            borderRadius: '1.5rem',
            border: '1px solid rgba(211,119,53,0.25)',
            background: 'linear-gradient(135deg, #fff8e8 0%, #ffe4c6 100%)',
            backdropFilter: 'blur(12px)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top glow strip */}
            <div style={{
              position: 'absolute', inset: '0 0 auto 0', height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(211,119,53,0.45), transparent)',
            }} />
            {/* Corner glow */}
            <div style={{
              position: 'absolute', top: '-40%', right: '-10%',
              width: '50%', height: '200%',
              background: 'radial-gradient(ellipse, rgba(230,125,58,0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
              {post.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#557326',
                  background: '#e5f5c8',
                  border: '1px solid rgba(132,169,71,0.3)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                }}>{tag}</span>
              ))}
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 900,
              color: '#62331d',
              lineHeight: 1.15,
              marginBottom: '1.2rem',
              letterSpacing: '-0.02em',
            }}>{post.title}</h1>

            {/* Meta row */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '1.2rem',
              color: '#8b5a40', fontSize: '0.82rem', alignItems: 'center',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: '#e07a3a' }}>✦</span>
                {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              {minutes && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: '#e07a3a' }}>◷</span>
                  {minutes} min read
                </span>
              )}
            </div>
          </header>

          {/* ── Article body ── */}
          <article
            ref={articleRef}
            style={{
              borderRadius: '1.25rem',
              border: '1px solid rgba(211,119,53,0.2)',
              background: 'rgba(255,253,246,0.82)',
              backdropFilter: 'blur(8px)',
              padding: 'clamp(1.5rem, 4vw, 2.5rem)',
            }}
          >
            {/* Divider */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, rgba(211,119,53,0.25), transparent)',
              marginBottom: '2rem',
            }} />

            <ReactMarkdown components={mdComponents}>
              {post.content}
            </ReactMarkdown>
          </article>

          {/* ── Footer CTA ── */}
          <div style={{
            marginTop: '3rem',
            padding: '2rem',
            textAlign: 'center',
            borderRadius: '1.25rem',
            border: '1px solid rgba(211,119,53,0.2)',
            background: 'rgba(255,240,189,0.72)',
          }}>
            <p style={{ color: '#8b5a40', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Enjoyed this article?
            </p>
            <Link
              to="/posts"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.4rem',
                borderRadius: '0.75rem',
                background: 'rgba(211,119,53,0.12)',
                border: '1px solid rgba(211,119,53,0.3)',
                color: '#8b5a40',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(211,119,53,0.22)';
                e.currentTarget.style.borderColor = 'rgba(211,119,53,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(211,119,53,0.12)';
                e.currentTarget.style.borderColor = 'rgba(211,119,53,0.3)';
              }}
            >
              ← Browse all posts
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
