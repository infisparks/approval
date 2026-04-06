'use client';
import { useRouter } from 'next/navigation';
import { Mail, Briefcase, Building2, LogOut, MapPin, School } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import { signOut } from '@/lib/api';

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="profile-info-row">
      <div className="profile-info-icon">{icon}</div>
      <div>
        <div className="profile-info-label">{label}</div>
        <div className="profile-info-val">{value || '—'}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { profile } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const initial = profile?.full_name?.[0]?.toUpperCase() ?? '?';

  return (
    <AppShell title="My Profile">
      {/* Hero */}
      <div className="profile-hero">
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(59,130,246,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, position: 'relative' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 22,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 900, color: '#fff', flexShrink: 0,
            boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
          }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -0.8, lineHeight: 1.1 }}>{profile?.full_name}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{profile?.email}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {profile?.designations?.name && (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', border: 'none' }}>
                  {profile.designations.name}
                </span>
              )}
              {profile?.departments?.name && (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  {profile.departments.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="profile-info-grid" style={{ marginBottom: 24 }}>
        <div className="profile-info-card">
          <InfoRow icon={<Mail size={16} color="var(--accent)" />} label="Email Address" value={profile?.email ?? ''} />
          <InfoRow icon={<Briefcase size={16} color="var(--accent)" />} label="Designation / Role" value={profile?.designations?.name ?? ''} />
          <InfoRow icon={<Building2 size={16} color="var(--accent)" />} label="Department" value={profile?.departments?.name ?? ''} />
        </div>
        <div className="profile-info-card">
          <InfoRow icon={<School size={16} color="var(--emerald)" />} label="Institute Name" value={profile?.institute_name ?? ''} />
          <InfoRow icon={<MapPin size={16} color="var(--emerald)" />} label="Institute Type" value={profile?.institute_type ?? ''} />
        </div>
      </div>

      {/* Sign out */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(239,68,68,0.15)', padding: '4px 0', marginBottom: 24 }}>
        <button
          id="signout-btn"
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, width: '100%',
            padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} color="var(--rose)" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--rose)' }}>Sign Out</div>
            <div style={{ fontSize: 12, color: 'var(--slate)' }}>You will be returned to the login screen</div>
          </div>
        </button>
      </div>

      {/* Version */}
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--slate-light)', padding: '8px 0 24px' }}>
        ApproveIt · AIKTC v1.0
      </div>
    </AppShell>
  );
}
