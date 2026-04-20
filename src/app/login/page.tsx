'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { signIn } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    let finalEmail = email.trim();
    if (finalEmail && !finalEmail.includes('@')) {
      finalEmail = `${finalEmail}@gmail.com`;
    }

    try {
      await signIn(finalEmail, password);
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ 
      backgroundImage: 'linear-gradient(rgba(10, 15, 30, 0.8), rgba(10, 15, 30, 0.8)), url("/aiktc.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Building background is set on parent div */}

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ background: '#fff', padding: 0, overflow: 'hidden', borderRadius: '50%', border: 'none' }}>
            <img src="/aiktc-logo.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>ApproveIt</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, fontWeight: 500 }}>AIKTC PORTAL</div>
          </div>
        </div>

        <h1 className="auth-heading">Welcome<br />Back</h1>
        <p className="auth-sub">Sign in to access your approval portal.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="auth-input-wrap" style={{ marginBottom: 12 }}>
            <Mail size={16} className="auth-input-icon" style={{ top: 14, transform: 'none' }} />
            <input
              id="login-email"
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Username or Email"
              required
              className="auth-input"
              style={{ marginBottom: 0 }}
            />
          </div>

          {/* Password */}
          <div className="auth-input-wrap" style={{ marginBottom: 24 }}>
            <Lock size={16} className="auth-input-icon" style={{ top: 14, transform: 'none' }} />
            <input
              id="login-password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="auth-input"
              style={{ marginBottom: 0, paddingRight: 44 }}
            />
            <button type="button" className="auth-input-toggle" onClick={() => setShowPass(v => !v)}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" className="auth-btn" disabled={loading} id="login-submit">
            {loading ? (
              <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="auth-link">
          Don&apos;t have an account?{' '}
          <Link href="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
