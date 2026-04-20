'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { LayoutDashboard, Files, User, LogOut, X, BarChart3, Building, Receipt } from 'lucide-react';
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
          <div className="sidebar-logo" style={{ background: '#fff', padding: 0, overflow: 'hidden', borderRadius: '50%' }}>
            <Image 
              src="/aiktc-logo.jpeg" 
              alt="AIKTC Logo" 
              width={44} 
              height={44} 
              className="object-cover"
            />
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
          {[
            { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', color: 'var(--accent)' },
            { icon: Files, label: 'Letter Templates', href: '/templates', color: 'var(--emerald)' },
            { icon: Receipt, label: 'Settlements', href: '/settlements', color: 'var(--accent2)' },
            { icon: User, label: 'My Profile', href: '/profile', color: 'var(--gold)' },
          ].map(({ icon: Icon, label, href, color }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-nav-item ${pathname === href ? 'active' : ''}`}
              onClick={onClose}
              style={{
                '--item-accent': color
              } as any}
            >
              <div className="nav-icon-container">
                <Icon size={18} />
              </div>
              {label}
            </Link>
          ))}

          {profile?.is_admin && (
              <>
                <div className="sidebar-section-label" style={{ marginTop: 24 }}>Administration</div>
              <Link
                href="/admin"
                className={`sidebar-nav-item ${pathname === '/admin' ? 'active' : ''}`}
                onClick={onClose}
                style={{ '--item-accent': 'var(--gold)' } as any}
              >
                <div className="nav-icon-container">
                  <BarChart3 size={18} />
                </div>
                Admin Dashboard
              </Link>
                  <Link
                    href="/admin/templates"
                    className={`sidebar-nav-item ${pathname === '/admin/templates' ? 'active' : ''}`}
                    onClick={onClose}
                    style={{ '--item-accent': 'var(--emerald2)' } as any}
                  >
                    <div className="nav-icon-container">
                      <Files size={18} />
                    </div>
                    Workflows Approval
                  </Link>
                  <Link
                    href="/admin/organization"
                    className={`sidebar-nav-item ${pathname === '/admin/organization' ? 'active' : ''}`}
                    onClick={onClose}
                    style={{ '--item-accent': 'var(--accent)' } as any}
                  >
                    <div className="nav-icon-container">
                      <User size={18} />
                    </div>
                    Organization Mgmt
                  </Link>
                  <Link
                    href="/admin/departments"
                    className={`sidebar-nav-item ${pathname === '/admin/departments' ? 'active' : ''}`}
                    onClick={onClose}
                    style={{ '--item-accent': 'var(--accent2)' } as any}
                  >
                    <div className="nav-icon-container">
                      <Building size={18} />
                    </div>
                    Departments Mgmt
                  </Link>
                  <Link
                    href="/admin/collection"
                    className={`sidebar-nav-item ${pathname === '/admin/collection' ? 'active' : ''}`}
                    onClick={onClose}
                    style={{ '--item-accent': 'var(--emerald)' } as any}
                  >
                    <div className="nav-icon-container">
                      <BarChart3 size={18} />
                    </div>
                    Collection Mgmt
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
