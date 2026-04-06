'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, LayoutDashboard, Files, User, LogOut, X, BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { signOut } from '@/lib/api';
import { useRouter } from 'next/navigation';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Files, label: 'Templates', href: '/templates' },
  { icon: User, label: 'Profile', href: '/profile' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <>
      {/* Backdrop */}
      <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={onClose} />

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="sidebar-title">ApproveIt</div>
            <div className="sidebar-sub">AIKTC PORTAL</div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 4,
            }}
            className="menu-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-nav-item ${pathname === href ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}

          {profile && (profile.designations?.rank ?? 0) >= 4 && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: 20 }}>Administration</div>
              <Link
                href="/admin"
                className={`sidebar-nav-item ${pathname === '/admin' ? 'active' : ''}`}
                onClick={onClose}
                style={{ color: 'var(--gold)', fontWeight: 700 }}
              >
                <BarChart3 size={18} />
                Admin Dashboard
              </Link>

            </>
          )}
        </nav>

        {/* User footer */}
        {profile && (
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {profile.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.full_name}
                </div>
                <div className="sidebar-user-role">
                  {profile.designations?.name ?? 'Member'}
                </div>
              </div>
              <button className="sidebar-sign-out" onClick={handleSignOut} title="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
