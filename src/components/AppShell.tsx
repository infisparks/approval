'use client';
import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  center?: ReactNode;
}

export default function AppShell({ children, title, actions, center }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            {typeof title === 'string' ? <h1 className="topbar-title">{title}</h1> : title}
          </div>
          
          {center && (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              {center}
            </div>
          )}
          
          <div className="topbar-actions" style={{ flex: 1, justifyContent: 'flex-end' }}>{actions}</div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
