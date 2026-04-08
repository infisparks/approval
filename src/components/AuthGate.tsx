'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Lock, LogOut } from 'lucide-react';
import { signOut } from '@/lib/api';
import { AuthProvider } from '@/lib/auth-context';

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [session, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" />
      </div>
    );
  }
  if (!session) return null;
  
  if (profile?.is_locked) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0A0F1E', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 20
      }}>
        <div style={{ 
          maxWidth: 400, 
          width: '100%', 
          background: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(10px)',
          borderRadius: 24, 
          padding: 40, 
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: 24, background: 'rgba(239, 68, 68, 0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
          }}>
            <Lock size={40} color="#ef4444" />
          </div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 900, marginBottom: 16 }}>Account Locked</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            Your account has been locked by the administrator. This typically happens if a staff member leaves the institution or for security reasons.
          </p>
          <button 
            onClick={() => signOut().then(() => window.location.href = '/login')}
            style={{ 
              width: '100%', padding: '14px', borderRadius: 12, border: 'none', 
              background: '#fff', color: '#0A0F1E', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGateInner>{children}</AuthGateInner>
    </AuthProvider>
  );
}
