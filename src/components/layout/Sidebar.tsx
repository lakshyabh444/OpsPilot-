import React from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Truck,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { NavSection, UserRoleType } from '../../types/ops';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  criticalIncidentCount: number;
  pendingRestockCount: number;
  pendingRoleRequestCount: number;
  activePortal: UserRoleType;
  companyName: string;
  userName: string;
  userSubtitle: string;
  onSignOut: () => void;
  onOpenSettings: () => void;
}

interface NavItemConfig {
  id: NavSection;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  badgeTone?: 'critical' | 'vendor';
  portals: UserRoleType[];
}

const PORTAL_THEME: Record<
  UserRoleType,
  {
    portalName: string;
    sectionHeading: string;
    logoBg: string;
    activeBg: string;
    homeSection: NavSection;
  }
> = {
  owner: {
    portalName: 'Business Owner Portal',
    sectionHeading: 'Owner Command',
    logoBg: 'bg-[#4F46E5]',
    activeBg: 'bg-[#4F46E5] text-white shadow-sm',
    homeSection: 'overview',
  },
  employee: {
    portalName: 'Staff Field Portal',
    sectionHeading: 'Field Operations',
    logoBg: 'bg-[#2563EB]',
    activeBg: 'bg-[#2563EB] text-white shadow-sm',
    homeSection: 'dispatch',
  },
  vendor: {
    portalName: 'Vendor Partner Portal',
    sectionHeading: 'Partner Channel',
    logoBg: 'bg-[#0D9488]',
    activeBg: 'bg-[#0D9488] text-white shadow-sm',
    homeSection: 'vendors',
  },
};

export function Sidebar({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  criticalIncidentCount,
  pendingRestockCount,
  pendingRoleRequestCount,
  activePortal,
  companyName,
  userName,
  userSubtitle,
  onSignOut,
  onOpenSettings,
}: SidebarProps) {
  const theme = PORTAL_THEME[activePortal];

  const allNavItems: NavItemConfig[] = [
    {
      id: 'overview',
      label: 'Business Overview',
      shortLabel: 'Home',
      icon: LayoutDashboard,
      portals: ['owner'],
    },
    {
      id: 'dispatch',
      label:
        activePortal === 'vendor'
          ? 'Partner Deliveries'
          : activePortal === 'employee'
          ? 'My Active Routes'
          : 'Fleet & Routes',
      shortLabel: 'Routes',
      icon: Truck,
      portals: ['owner', 'employee', 'vendor'],
    },
    {
      id: 'hardware',
      label: activePortal === 'employee' ? 'Machine Service' : 'Vending Machines',
      shortLabel: 'Machines',
      icon: Cpu,
      portals: ['owner', 'employee'],
    },
    {
      id: 'vendors',
      label: activePortal === 'vendor' ? 'My Restock Orders' : 'Vendor Restocking',
      shortLabel: 'Restock',
      icon: Warehouse,
      badgeCount: pendingRestockCount,
      badgeTone: 'vendor',
      portals: ['owner', 'vendor'],
    },
    {
      id: 'incidents',
      label: 'Field Incidents',
      shortLabel: 'Issues',
      icon: AlertTriangle,
      badgeCount: criticalIncidentCount,
      badgeTone: 'critical',
      portals: ['owner', 'employee'],
    },
    {
      id: 'team',
      label: 'Team & Access',
      shortLabel: 'Team',
      icon: Users,
      badgeCount: pendingRoleRequestCount,
      badgeTone: 'critical',
      portals: ['owner'],
    },
    {
      id: 'activity',
      label: 'Activity Log',
      shortLabel: 'Audit',
      icon: ScrollText,
      portals: ['owner'],
    },
  ];

  // Strictly only render items belonging to this isolated portal window
  const navItems = allNavItems.filter((item) => item.portals.includes(activePortal));

  const initials =
    userName
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'OP';

  const handleNavClick = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const renderRailContent = (isCollapsed: boolean) => (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-200 select-none">
      {/* Brand Header */}
      <div
        className={`h-16 border-b border-[#334155]/80 flex items-center shrink-0 ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <button
          type="button"
          onClick={() => handleNavClick(theme.homeSection)}
          className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
        >
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0 ops-btn-primary ${theme.logoBg}`}
          >
            <Activity className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-[-0.02em] text-white whitespace-nowrap truncate max-w-[140px] leading-5">
                {companyName || 'OpsPilot'}
              </div>
              <div className="text-[11px] font-medium text-slate-400 whitespace-nowrap leading-4">
                {theme.portalName}
              </div>
            </div>
          )}
        </button>

        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse navigation rail"
            className="hidden md:flex h-7 w-7 rounded-md items-center justify-center text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expand trigger when collapsed */}
      {isCollapsed && (
        <div className="hidden md:flex justify-center py-2.5 border-b border-[#334155]/60">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand navigation rail"
            className="h-8 w-8 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Primary Portal-Isolated Navigation (Zero Cross-Role Switcher) */}
      <nav
        aria-label="Portal navigation"
        className="flex-1 overflow-y-auto dark-scroll py-4 px-2.5 space-y-1"
      >
        {!isCollapsed && (
          <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            {theme.sectionHeading}
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const activeClass =
            activePortal === 'owner' && item.id === 'vendors'
              ? 'bg-[#0D9488] text-white shadow-sm'
              : theme.activeBg;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg transition-colors duration-150 cursor-pointer relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] ${
                isCollapsed ? 'justify-center h-10 px-0' : 'justify-between h-10 px-3'
              } ${
                isActive
                  ? activeClass
                  : 'text-slate-300 hover:bg-[#1E293B] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!isCollapsed && (
                  <span className="text-[13px] font-medium whitespace-nowrap truncate">
                    {item.label}
                  </span>
                )}
              </span>

              {item.badgeCount !== undefined && item.badgeCount > 0 && !isCollapsed && (
                <span
                  className={`tabular-nums-strict rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : item.badgeTone === 'critical'
                      ? 'bg-[#EF4444]/20 text-[#FCA5A5]'
                      : 'bg-[#0D9488]/25 text-[#5EEAD4]'
                  }`}
                >
                  {item.badgeCount}
                </span>
              )}

              {item.badgeCount !== undefined && item.badgeCount > 0 && isCollapsed && (
                <span
                  className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${
                    item.badgeTone === 'critical' ? 'bg-[#EF4444]' : 'bg-[#0D9488]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Signed-In User & Sign Out Footer */}
      <div className="p-3 border-t border-[#334155]/80 space-y-2 shrink-0">
        {!isCollapsed ? (
          <div className="rounded-xl bg-[#1E293B] border border-[#334155] p-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-[#334155] text-white text-[12px] font-semibold flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-white truncate">
                  {userName}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {userSubtitle}
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5">
              {activePortal === 'owner' && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  title="Business profile, currency, and workspace data controls"
                  className="flex-1 h-8 rounded-md bg-[#0F172A] hover:bg-[#0F172A]/80 border border-[#334155] text-[11px] font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Settings className="h-3 w-3" />
                  Settings
                </button>
              )}
              <button
                type="button"
                onClick={onSignOut}
                className="flex-1 h-8 rounded-md bg-[#0F172A] hover:bg-[#EF4444]/20 border border-[#334155] hover:border-[#EF4444]/40 text-[11px] font-medium text-slate-300 hover:text-[#FCA5A5] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignOut}
            title="Sign Out"
            aria-label="Sign out"
            className="w-full h-9 rounded-lg bg-[#1E293B] border border-[#334155] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Collapsible Dark-Slate Rail */}
      <aside
        className={`hidden md:block shrink-0 h-screen sticky top-0 border-r border-[#334155] transition-[width] duration-200 ease-out z-30 ${
          collapsed ? 'w-[64px]' : 'w-[260px]'
        }`}
      >
        {renderRailContent(collapsed)}
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex bg-[#0F172A]/50 backdrop-blur-[1px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onCloseMobile();
          }}
        >
          <div className="w-[260px] h-full relative elevation-4">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="absolute top-4 right-3 z-10 h-8 w-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#1E293B] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            {renderRailContent(false)}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Triage Bar (<768px) */}
      <nav
        aria-label="Mobile quick navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0F172A] border-t border-[#334155] px-1 py-1.5 flex items-center justify-around gap-1"
      >
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium relative transition-colors cursor-pointer ${
                isActive
                  ? activePortal === 'vendor' || item.id === 'vendors'
                    ? 'bg-[#0D9488] text-white'
                    : activePortal === 'employee'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#4F46E5] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 mb-0.5" />
              <span className="truncate max-w-full">{item.shortLabel}</span>
              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span
                  className={`absolute top-1 right-2.5 h-2 w-2 rounded-full ${
                    item.badgeTone === 'critical' ? 'bg-[#EF4444]' : 'bg-[#0D9488]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
