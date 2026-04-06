'use client';
import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}

export default function AppShell({ children, title, actions }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            <h1 className="topbar-title">{title}</h1>
          </div>
          <div className="topbar-actions">{actions}</div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
