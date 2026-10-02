'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TrendingUp, ChevronLeft, Upload, X } from 'lucide-react';

const brandItems = [
  { label: 'Hitachi', href: '/hitachi', initial: 'H' },
  { label: 'Godrej',  href: '/godrej',  initial: 'G' },
  { label: 'Samsung', href: '/samsung', initial: 'S' },
];

interface Props {
  isAdmin: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavItem({
  href, label, initial, icon: Icon, collapsed, onClick,
}: {
  href: string; label: string; initial?: string; icon?: React.ElementType;
  collapsed: boolean; onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`relative mb-0.5 flex items-center rounded-[8px] px-3 py-2.5 text-sm font-medium transition-all
        ${collapsed ? 'justify-center' : 'gap-3'}
        ${isActive ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-subtle hover:text-ink'}`}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
      )}
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-xs font-bold
        ${isActive ? 'bg-primary text-white' : 'bg-subtle text-ink-2'}`}>
        {Icon ? <Icon size={14} /> : initial}
      </div>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SidebarContent({
  isAdmin, collapsed, onLinkClick,
}: {
  isAdmin: boolean; collapsed: boolean; onLinkClick?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-4">
      {!collapsed && (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-3">Brands</p>
      )}
      {brandItems.map((item) => (
        <NavItem key={item.href} {...item} collapsed={collapsed} onClick={onLinkClick} />
      ))}

      {isAdmin && (
        <>
          <div className={`border-t border-line ${collapsed ? 'my-2' : 'my-3'}`} />
          {!collapsed && (
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-3">Admin</p>
          )}
          <NavItem
            href="/uploads"
            label="Upload History"
            icon={Upload}
            collapsed={collapsed}
            onClick={onLinkClick}
          />
        </>
      )}
    </nav>
  );
}

export default function Sidebar({ isAdmin, mobileOpen, onMobileClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={`relative hidden md:flex flex-col border-r border-line bg-surface transition-all duration-200
          ${collapsed ? 'w-16' : 'w-[260px]'}`}
      >
        {/* Logo */}
        <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-line px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary">
            <TrendingUp size={18} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-[17px] font-semibold text-ink">Ops Dashboard</span>
          )}
        </div>

        <SidebarContent isAdmin={isAdmin} collapsed={collapsed} />

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-[84px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface shadow-sm hover:bg-subtle transition-colors"
        >
          <ChevronLeft
            size={14}
            className={`text-ink-3 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          <aside
            className="absolute left-0 top-0 flex h-full w-[260px] flex-col border-r border-line bg-surface"
            style={{ animation: 'drawer-right 200ms ease-out' }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary">
                  <TrendingUp size={16} className="text-white" />
                </div>
                <span className="text-[16px] font-semibold text-ink">Ops Dashboard</span>
              </div>
              <button
                onClick={onMobileClose}
                className="rounded-md p-1 text-ink-3 hover:bg-subtle hover:text-ink transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent isAdmin={isAdmin} collapsed={false} onLinkClick={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}
