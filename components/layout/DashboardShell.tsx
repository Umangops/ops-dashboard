'use client';
import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface Props {
  fullName: string;
  role: 'admin' | 'viewer';
  children: React.ReactNode;
}

export default function DashboardShell({ fullName, role, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = role === 'admin';

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar
        isAdmin={isAdmin}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          fullName={fullName}
          role={role}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
