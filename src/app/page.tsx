'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/* ──────────────────────────────────────────
   Data
────────────────────────────────────────── */
const stats = [
  { value: '35+', label: 'Years of Excellence' },
  { value: '10,000+', label: 'Alumni Worldwide' },
  { value: '15+', label: 'Academic Programs' },
  { value: 'A+', label: 'NAAC Accredited' },
];

const features = [
  {
    icon: '🎓',
    title: 'Digital Approval Portal',
    desc: 'Streamlined multi-level document approval workflows for students, faculty, and administration.',
  },
  {
    icon: '📋',
    title: 'Smart Templates',
    desc: 'Pre-built department-specific letter and requisition templates for faster processing.',
  },
  {
    icon: '🔐',
    title: 'Role-Based Access',
    desc: 'Secure, tiered access for staff, HODs, Directors, and Accountants.',
  },
  {
    icon: '💸',
    title: 'Fee & Settlement Tracking',
    desc: 'End-to-end financial workflows—from purchase requests to final settlements.',
  },
  {
    icon: '📊',
    title: 'Real-Time Dashboard',
    desc: 'Live analytics and status tracking across all pending requests and approvals.',
  },
  {
    icon: '📱',
    title: 'Mobile Responsive',
    desc: 'Access the system seamlessly from any device, anywhere on campus.',
  },
];

const departments = [
  { name: 'Engineering', icon: '⚙️', color: '#3B82F6' },
  { name: 'Architecture', icon: '🏛️', color: '#8B5CF6' },
  { name: 'Pharmacy', icon: '💊', color: '#10B981' },
  { name: 'Management', icon: '📈', color: '#F59E0B' },
  { name: 'Computer Science', icon: '💻', color: '#EF4444' },
  { name: 'Civil Engineering', icon: '🏗️', color: '#06B6D4' },
];

/* ──────────────────────────────────────────
   Scroll-reveal hook — starts visible,
   then activates IntersectionObserver
────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* Wrapper that reveals children on scroll */
function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────
   Navbar
────────────────────────────────────────── */
function Navbar({ scrolled }: { scrolled: boolean }) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: scrolled ? 'rgba(10,15,30,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
        transition: 'all 0.4s ease',
        padding: '0 clamp(16px,5vw,80px)',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <Image
          src="/aiktc-logo.jpeg"
          alt="AIKTC Logo"
          width={40}
          height={40}
          style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
            AIKTC
          </div>
          <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.2px', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            New Panvel · Navi Mumbai
          </div>
        </div>
      </div>

      {/* Nav Links — desktop only */}
      <nav className="landing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        {['About', 'Departments', 'Portal'].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            style={{ fontSize: '13.5px', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', transition: 'color 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
          >
            {item}
          </a>
        ))}
      </nav>

      {/* CTA */}
      <Link
        href="/login"
        style={{
          padding: '9px 20px',
          background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
          color: '#fff',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Staff Login →
      </Link>
    </header>
  );
}

/* ──────────────────────────────────────────
   Page
────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .landing-page {
          font-family: 'Poppins', 'Inter', system-ui, sans-serif;
          background: #0A0F1E;
          color: #fff;
          overflow-x: hidden;
        }

        /* ── Nav ── */
        .landing-nav-links { display: flex !important; }
        @media (max-width: 680px) {
          .landing-nav-links { display: none !important; }
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10,15,30,0.45) 0%,
            rgba(10,15,30,0.65) 55%,
            #0A0F1E 100%
          );
          z-index: 1;
        }
        .hero-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: clamp(100px, 18vw, 180px) clamp(20px, 5vw, 80px) 80px;
          max-width: 900px;
          width: 100%;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99,102,241,0.18);
          border: 1px solid rgba(99,102,241,0.35);
          border-radius: 30px;
          padding: 6px 18px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #a5b4fc;
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .hero-title {
          font-size: clamp(34px, 6.5vw, 70px);
          font-weight: 900;
          line-height: 1.08;
          letter-spacing: -2px;
          margin-bottom: 16px;
        }
        .hero-title span {
          background: linear-gradient(135deg, #60a5fa, #a78bfa, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub {
          font-size: clamp(14px, 2vw, 18px);
          color: rgba(255,255,255,0.6);
          line-height: 1.75;
          max-width: 580px;
          margin: 0 auto 40px;
          font-weight: 400;
        }
        .hero-cta {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .hero-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 15px 34px;
          background: linear-gradient(135deg, #3B82F6, #6366F1);
          color: #fff;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 8px 32px rgba(99,102,241,0.45);
          transition: all 0.25s;
        }
        .hero-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(99,102,241,0.55); }
        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 15px 34px;
          border: 1.5px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.85);
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.25s;
          backdrop-filter: blur(4px);
        }
        .hero-btn-secondary:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.35); transform: translateY(-2px); }

        /* ── Stats ── */
        .stats-section { padding: 0 clamp(16px,5vw,80px) 90px; }
        .stats-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4,1fr);
          background: rgba(255,255,255,0.05);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.09);
        }
        .stat-box {
          padding: 36px 20px;
          text-align: center;
          border-right: 1px solid rgba(255,255,255,0.07);
          transition: background 0.2s;
        }
        .stat-box:last-child { border-right: none; }
        .stat-box:hover { background: rgba(255,255,255,0.04); }
        .stat-val {
          font-size: clamp(26px, 4vw, 42px);
          font-weight: 900;
          letter-spacing: -1.5px;
          background: linear-gradient(135deg,#60a5fa,#a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .stat-lbl { font-size: 12.5px; color: rgba(255,255,255,0.45); margin-top: 6px; font-weight: 500; }
        @media (max-width: 640px) {
          .stats-inner { grid-template-columns: repeat(2,1fr); }
          .stat-box { border-right: 1px solid rgba(255,255,255,0.07); border-bottom: 1px solid rgba(255,255,255,0.07); }
          .stat-box:nth-child(2n) { border-right: none; }
          .stat-box:nth-last-child(-n+2) { border-bottom: none; }
        }

        /* ── Section helpers ── */
        .section-tag {
          font-size: 11px; font-weight: 800; letter-spacing: 2.5px;
          text-transform: uppercase; color: #60a5fa; margin-bottom: 10px;
        }
        .section-h {
          font-size: clamp(26px, 3.5vw, 40px);
          font-weight: 900;
          letter-spacing: -1px;
          line-height: 1.15;
          margin-bottom: 18px;
        }

        /* ── About ── */
        .about-section { padding: 90px clamp(16px,5vw,80px); }
        .about-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        .about-img-wrap {
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5);
          position: relative;
        }
        .about-img-wrap::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg,#3B82F6,#6366F1,#10B981);
          border-radius: 24px;
          z-index: -1;
        }
        .section-p { font-size: 15px; color: rgba(255,255,255,0.58); line-height: 1.8; margin-bottom: 14px; }
        @media (max-width: 860px) { .about-inner { grid-template-columns: 1fr; } }

        /* ── Features ── */
        .features-section {
          padding: 90px clamp(16px,5vw,80px);
          background: linear-gradient(180deg, rgba(59,130,246,0.04) 0%, transparent 100%);
        }
        .features-inner { max-width: 1100px; margin: 0 auto; }
        .features-header { text-align: center; margin-bottom: 52px; }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 22px;
        }
        .feature-card {
          padding: 30px 26px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          transition: all 0.3s;
        }
        .feature-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(99,102,241,0.3);
          transform: translateY(-5px);
          box-shadow: 0 20px 48px rgba(0,0,0,0.3);
        }
        .feature-icon { font-size: 30px; margin-bottom: 16px; display: block; }
        .feature-title { font-size: 15.5px; font-weight: 800; margin-bottom: 9px; letter-spacing: -0.3px; }
        .feature-desc { font-size: 13.5px; color: rgba(255,255,255,0.52); line-height: 1.7; }
        @media (max-width: 860px) { .feature-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 540px) { .feature-grid { grid-template-columns: 1fr; } }

        /* ── Departments ── */
        .dept-section { padding: 90px clamp(16px,5vw,80px); }
        .dept-inner { max-width: 1100px; margin: 0 auto; }
        .dept-header { text-align: center; margin-bottom: 50px; }
        .dept-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .dept-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 22px 24px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          transition: all 0.25s;
          cursor: default;
        }
        .dept-card:hover {
          border-color: rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.05);
          transform: translateX(5px);
        }
        .dept-icon-wrap {
          width: 48px; height: 48px;
          border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .dept-name { font-size: 14.5px; font-weight: 700; }
        @media (max-width: 860px) { .dept-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 520px) { .dept-grid { grid-template-columns: 1fr; } }

        /* ── Portal CTA ── */
        .portal-section { padding: 90px clamp(16px,5vw,80px) 80px; }
        .portal-inner { max-width: 1100px; margin: 0 auto; }
        .portal-card {
          background: linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.15) 50%, rgba(16,185,129,0.08) 100%);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 28px;
          padding: clamp(44px,7vw,72px) clamp(28px,5vw,72px);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 40px;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        .portal-card::before {
          content: '';
          position: absolute;
          right: -80px; top: -80px;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%);
          pointer-events: none;
        }
        .portal-h {
          font-size: clamp(24px, 3vw, 38px);
          font-weight: 900;
          letter-spacing: -1px;
          line-height: 1.15;
          margin-bottom: 12px;
        }
        .portal-sub { font-size: 14.5px; color: rgba(255,255,255,0.58); line-height: 1.75; max-width: 500px; }
        .portal-actions { display: flex; flex-direction: column; gap: 12px; align-items: flex-end; flex-shrink: 0; }
        @media (max-width: 780px) {
          .portal-card { grid-template-columns: 1fr; }
          .portal-actions { align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
        }

        /* ── Footer ── */
        .footer {
          background: rgba(255,255,255,0.02);
          border-top: 1px solid rgba(255,255,255,0.07);
          padding: 56px clamp(16px,5vw,80px) 28px;
        }
        .footer-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 44px;
        }
        .footer-brand p { font-size: 13.5px; color: rgba(255,255,255,0.42); line-height: 1.7; margin-top: 14px; max-width: 300px; }
        .footer-col-title {
          font-size: 11px; font-weight: 800; letter-spacing: 1.5px;
          text-transform: uppercase; color: rgba(255,255,255,0.38); margin-bottom: 14px;
        }
        .footer-links { display: flex; flex-direction: column; gap: 10px; }
        .footer-links a { font-size: 13.5px; color: rgba(255,255,255,0.58); text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: #fff; }
        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .footer-copy { font-size: 12.5px; color: rgba(255,255,255,0.3); }
        @media (max-width: 720px) { .footer-inner { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 440px) { .footer-inner { grid-template-columns: 1fr; } }

        /* ── Orbs ── */
        @keyframes floatA { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(28px,-18px) scale(1.04)} }
        @keyframes floatB { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-22px,18px) scale(1.04)} }
        .orb-a { animation: floatA 14s ease-in-out infinite; }
        .orb-b { animation: floatB 17s ease-in-out infinite; }
      `}</style>

      <div className="landing-page">
        <Navbar scrolled={scrolled} />

        {/* ── Hero ── */}
        <section className="hero" id="hero">
          <div className="hero-bg">
            <Image
              src="/aiktc.png"
              alt="AIKTC Campus – New Panvel"
              fill
              priority
              style={{ objectFit: 'cover', objectPosition: 'center top' }}
            />
          </div>
          <div className="hero-overlay" />

          <div className="orb-a" style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.16),transparent 70%)', top: '8%', left: '-12%', zIndex: 1, pointerEvents: 'none' }} />
          <div className="orb-b" style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.13),transparent 70%)', bottom: '12%', right: '-6%', zIndex: 1, pointerEvents: 'none' }} />

          <div className="hero-content">
            {/* Institution card */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: '14px',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                maxWidth: '100%',
              }}>
                <Image
                  src="/aiktc-logo.jpeg"
                  alt="AIKTC"
                  width={46}
                  height={46}
                  style={{ borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#fff', letterSpacing: '-0.2px', lineHeight: 1.3 }}>
                    Anjuman-I-Islam's Kalsekar Technical Campus
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginTop: '2px' }}>
                    New Panvel, Navi Mumbai · Est. 1991
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-badge">
              <span>🏫</span> NAAC Accredited Institution
            </div>

            <h1 className="hero-title">
              Excellence in<br />
              <span>Technical Education</span>
            </h1>
            <p className="hero-sub">
              A premier minority-run technical institution offering world-class engineering, architecture, pharmacy, and management programs in Navi Mumbai.
            </p>

            <div className="hero-cta">
              <Link href="/login" className="hero-btn-primary">
                Access Staff Portal →
              </Link>
              <a href="#about" className="hero-btn-secondary">
                Discover AIKTC
              </a>
            </div>
          </div>

          {/* Scroll indicator */}
          <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', opacity: 0.45 }}>
            <span style={{ fontSize: '10px', letterSpacing: '2px', fontWeight: 700 }}>SCROLL</span>
            <div style={{ width: '1px', height: '36px', background: 'linear-gradient(to bottom, #fff, transparent)' }} />
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="stats-section">
          <div className="stats-inner">
            {stats.map((s) => (
              <div className="stat-box" key={s.label}>
                <div className="stat-val">{s.value}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── About ── */}
        <section className="about-section" id="about">
          <div className="about-inner">
            <Reveal>
              <div className="about-img-wrap">
                <Image
                  src="/aiktc.png"
                  alt="AIKTC Campus Building"
                  width={600}
                  height={400}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div>
                <div className="section-tag">About AIKTC</div>
                <h2 className="section-h">Shaping Tomorrow's Engineers & Innovators</h2>
                <p className="section-p">
                  Anjuman-I-Islam's Kalsekar Technical Campus (AIKTC) is a premier technical institution in New Panvel, Navi Mumbai. Approved by AICTE and affiliated to the University of Mumbai, AIKTC is committed to providing quality technical education.
                </p>
                <p className="section-p">
                  With state-of-the-art infrastructure, experienced faculty, and a focus on holistic development, AIKTC has consistently produced industry-ready graduates making a mark globally.
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'AICTE Approved', icon: '✅' },
                    { label: 'Mumbai University', icon: '🏛️' },
                    { label: 'NBA Accredited', icon: '🏆' },
                  ].map((b) => (
                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.11)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '9px 16px' }}>
                      <span>{b.icon}</span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="features-section" id="portal">
          <div className="features-inner">
            <Reveal>
              <div className="features-header">
                <div className="section-tag">Approval Portal</div>
                <h2 className="section-h">Everything You Need to Manage AIKTC</h2>
                <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: '14.5px', maxWidth: '520px', margin: '0 auto', lineHeight: 1.75 }}>
                  Our integrated digital portal centralises all approval, settlement, and financial workflows for the entire institution.
                </p>
              </div>
            </Reveal>

            <div className="feature-grid">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 60}>
                  <div className="feature-card">
                    <span className="feature-icon">{f.icon}</span>
                    <div className="feature-title">{f.title}</div>
                    <div className="feature-desc">{f.desc}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Departments ── */}
        <section className="dept-section" id="departments">
          <div className="dept-inner">
            <Reveal>
              <div className="dept-header">
                <div className="section-tag">Academics</div>
                <h2 className="section-h">Our Departments</h2>
                <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: '14.5px', maxWidth: '440px', margin: '0 auto', lineHeight: 1.75 }}>
                  Six multidisciplinary departments forming the academic backbone of AIKTC.
                </p>
              </div>
            </Reveal>

            <div className="dept-grid">
              {departments.map((d, i) => (
                <Reveal key={d.name} delay={i * 50}>
                  <div className="dept-card">
                    <div className="dept-icon-wrap" style={{ background: `${d.color}22` }}>
                      <span style={{ fontSize: '20px' }}>{d.icon}</span>
                    </div>
                    <div>
                      <div className="dept-name">{d.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.38)', marginTop: '2px', fontWeight: 500 }}>AIKTC · Navi Mumbai</div>
                    </div>
                    <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)', fontSize: '18px' }}>›</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Portal CTA ── */}
        <section className="portal-section">
          <div className="portal-inner">
            <Reveal>
              <div className="portal-card">
                <div>
                  <div className="section-tag">Get Started</div>
                  <h2 className="portal-h">Ready to access the<br />AIKTC Approval Portal?</h2>
                  <p className="portal-sub">
                    Digitise your department's approval workflows, settlement requests, and administrative processes — all in one secure platform.
                  </p>
                </div>
                <div className="portal-actions">
                  <Link
                    href="/login"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '10px',
                      padding: '15px 34px',
                      background: 'linear-gradient(135deg,#3B82F6,#6366F1)',
                      color: '#fff', borderRadius: '12px', fontSize: '14.5px', fontWeight: 800,
                      textDecoration: 'none',
                      boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
                      whiteSpace: 'nowrap', transition: 'all 0.2s',
                    }}
                  >
                    Staff Login →
                  </Link>
                  <Link
                    href="/register"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '10px',
                      padding: '15px 34px',
                      border: '1.5px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.85)', borderRadius: '12px', fontSize: '14.5px',
                      fontWeight: 700, textDecoration: 'none',
                      whiteSpace: 'nowrap', transition: 'all 0.2s',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    Register
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Image src="/aiktc-logo.jpeg" alt="AIKTC" width={38} height={38}
                  style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '-0.3px' }}>AIKTC</div>
                  <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>New Panvel · Est. 1991</div>
                </div>
              </div>
              <p>Anjuman-I-Islam's Kalsekar Technical Campus, Plot No. 2, Sector 16, New Panvel (W), Navi Mumbai – 410 206.</p>
            </div>

            <div>
              <div className="footer-col-title">Quick Links</div>
              <div className="footer-links">
                <a href="#about">About AIKTC</a>
                <a href="#departments">Departments</a>
                <a href="#portal">Approval Portal</a>
                <Link href="/login" style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.58)', textDecoration: 'none' }}>Staff Login</Link>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Contact</div>
              <div className="footer-links">
                <span style={{ color: 'rgba(255,255,255,0.52)', fontSize: '13.5px' }}>📞 +91-22-2745 6100</span>
                <span style={{ color: 'rgba(255,255,255,0.52)', fontSize: '13.5px' }}>📧 principal@aiktc.edu.in</span>
                <span style={{ color: 'rgba(255,255,255,0.52)', fontSize: '13.5px' }}>🌐 www.aiktc.edu.in</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="footer-copy">© {new Date().getFullYear()} AIKTC, New Panvel. All rights reserved.</span>
            <span className="footer-copy">Powered by AIKTC IT Division</span>
          </div>
        </footer>
      </div>
    </>
  );
}