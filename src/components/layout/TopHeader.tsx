import React from 'react';
import { ChevronRight, Menu, Plus, Search } from 'lucide-react';
import { NavSection, UserRoleType } from '../../types/ops';
import { OpsButton } from '../ui/OpsPrimitives';

interface TopHeaderProps {
  activeSection: NavSection;
  effectiveRole: UserRoleType;
  companyName: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileMenu: () => void;
  onPrimaryAction: () => void;
}

function getHeaderMeta(
  section: NavSection,
  role: UserRoleType
): {
  portalLabel: string;
  breadcrumb: string;
  primaryLabel: string | null;
  primaryVariant: 'primary' | 'vendor';
} {
  const portalLabel =
    role === 'owner'
      ? 'Owner Portal'
      : role === 'employee'
      ? 'Staff Portal'
      : 'Vendor Portal';

  switch (section) {
    case 'overview':
      return {
        portalLabel,
        breadcrumb: 'Business Overview',
        primaryLabel: 'New Dispatch',
        primaryVariant: 'primary',
      };
    case 'dispatch':
      return {
        portalLabel,
        breadcrumb:
          role === 'vendor'
            ? 'Partner Deliveries'
            : role === 'employee'
            ? 'My Active Routes'
            : 'Fleet & Routes',
        primaryLabel: role === 'vendor' ? 'Propose Restock' : 'Create Dispatch',
        primaryVariant: role === 'vendor' ? 'vendor' : 'primary',
      };
    case 'hardware':
      return {
        portalLabel,
        breadcrumb: role === 'employee' ? 'Machine Service' : 'Vending Machines',
        primaryLabel: role === 'owner' ? 'Add Machine' : 'Report Machine Issue',
        primaryVariant: 'primary',
      };
    case 'vendors':
      return {
        portalLabel,
        breadcrumb: role === 'vendor' ? 'My Restock Orders' : 'Vendor Restocking',
        primaryLabel: role === 'owner' ? 'New Restock Order' : 'Propose Restock',
        primaryVariant: 'vendor',
      };
    case 'incidents':
      return {
        portalLabel,
        breadcrumb: 'Field Incidents',
        primaryLabel: 'Report Issue',
        primaryVariant: 'primary',
      };
    case 'team':
      return {
        portalLabel,
        breadcrumb: 'Team & Access',
        primaryLabel: null,
        primaryVariant: 'primary',
      };
    case 'activity':
      return {
        portalLabel,
        breadcrumb: 'Activity Log',
        primaryLabel: null,
        primaryVariant: 'primary',
      };
  }
}

export function TopHeader({
  activeSection,
  effectiveRole,
  companyName,
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
  onPrimaryAction,
}: TopHeaderProps) {
  const meta = getHeaderMeta(activeSection, effectiveRole);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0] px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Zone 1: Mobile Menu + Contextual Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="md:hidden h-9 w-9 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer shrink-0"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] min-w-0">
          <span className="font-semibold text-[#475569] whitespace-nowrap hidden sm:inline truncate max-w-[140px]">
            {companyName || 'OpsPilot'}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] shrink-0 hidden sm:inline" />
          <span className="font-medium text-[#64748B] whitespace-nowrap hidden md:inline">
            {meta.portalLabel}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] shrink-0 hidden md:inline" />
          <span className="font-semibold text-[#0F172A] truncate">
            {meta.breadcrumb}
          </span>
        </nav>
      </div>

      {/* Zone 2: Live Operational Search */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="h-4 w-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              activeSection === 'activity'
                ? 'Search audit events by action, actor, ID, or summary...'
                : 'Search by vehicle, machine, order, or zone...'
            }
            className="ops-input w-full pl-9 pr-3 text-[13px]"
          />
        </div>
      </div>

      {/* Zone 3: Single Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        {meta.primaryLabel && (
          <OpsButton
            variant={meta.primaryVariant}
            size="compact"
            onClick={onPrimaryAction}
          >
            <Plus className="h-4 w-4" />
            <span>{meta.primaryLabel}</span>
          </OpsButton>
        )}
      </div>
    </header>
  );
}
