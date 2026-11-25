import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Check,
  CheckCircle2,
  Copy,
  Link2,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import {
  UserProfileRecord,
  UserRoleRecord,
  UserRoleType,
  VendorPartnerRecord,
} from '../../types/ops';
import { OpsButton, OpsCard, StatusBadge } from '../ui/OpsPrimitives';

interface TeamAccessViewProps {
  currentUid: string;
  teamRoles: UserRoleRecord[];
  teamProfiles: Record<string, UserProfileRecord>;
  vendorPartners: VendorPartnerRecord[];
  searchQuery: string;
  onUpdateMember: (
    userId: string,
    patch: {
      role: UserRoleType;
      requestedRole: UserRoleType;
      vendorOrganization: string;
      active: boolean;
    }
  ) => void;
}

const ROLE_LABELS: Record<UserRoleType, string> = {
  owner: 'Business Owner',
  employee: 'Employee (Driver / Tech)',
  vendor: 'Vendor Partner',
};

export function TeamAccessView({
  currentUid,
  teamRoles,
  teamProfiles,
  vendorPartners,
  searchQuery,
  onUpdateMember,
}: TeamAccessViewProps) {
  const [copiedPortal, setCopiedPortal] = useState<UserRoleType | null>(null);

  const portalBaseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';

  const portalLinks: {
    role: UserRoleType;
    label: string;
    description: string;
    url: string;
    accentText: string;
    accentBg: string;
  }[] = [
    {
      role: 'owner',
      label: 'Business Owner Portal',
      description: 'Full company command center (Owner accounts only)',
      url: `${portalBaseUrl}#owner`,
      accentText: 'text-[#4F46E5]',
      accentBg: 'bg-[#EEF2FF]',
    },
    {
      role: 'employee',
      label: 'Staff / Employee Portal',
      description: 'Isolated field window for drivers & technicians',
      url: `${portalBaseUrl}#staff`,
      accentText: 'text-[#2563EB]',
      accentBg: 'bg-[#EFF6FF]',
    },
    {
      role: 'vendor',
      label: 'Vendor Partner Portal',
      description: 'Isolated supplier window for restock deliveries',
      url: `${portalBaseUrl}#vendor`,
      accentText: 'text-[#0D9488]',
      accentBg: 'bg-[#F0FDFA]',
    },
  ];

  const handleCopyPortalLink = async (role: UserRoleType, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPortal(role);
      window.setTimeout(() => {
        setCopiedPortal((prev) => (prev === role ? null : prev));
      }, 2200);
    } catch {
      // Clipboard API unavailable in restricted iframe; select fallback not needed
    }
  };

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teamRoles.filter((member) => {
      if (!q) return true;
      const email = teamProfiles[member.userId]?.email ?? '';
      return (
        member.displayName.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        (member.vendorOrganization ?? '').toLowerCase().includes(q)
      );
    });
  }, [teamRoles, teamProfiles, searchQuery]);

  const counts = useMemo(() => {
    return {
      owners: teamRoles.filter((r) => r.role === 'owner').length,
      employees: teamRoles.filter((r) => r.role === 'employee').length,
      vendors: teamRoles.filter((r) => r.role === 'vendor').length,
      pendingRequests: teamRoles.filter((r) => r.requestedRole !== r.role).length,
    };
  }, [teamRoles]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] md:text-[30px] font-semibold leading-[32px] md:leading-[38px] tracking-[-0.02em] text-[#0F172A]">
          Team &amp; Access Management
        </h1>
        <p className="text-[14px] text-[#475569] mt-1">
          Manage who can sign in as a Business Owner, Employee, or Vendor Partner. Changes take effect immediately across all devices.
        </p>
      </div>

      {/* Role Summary Strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 tabular-nums-strict">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Business Owners
            </span>
            <Briefcase className="h-4 w-4 text-[#4F46E5]" />
          </div>
          <div className="mt-2 text-[28px] font-bold leading-8 text-[#0F172A]">
            {counts.owners}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Employees
            </span>
            <Truck className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 text-[28px] font-bold leading-8 text-[#0F172A]">
            {counts.employees}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Vendor Partners
            </span>
            <Warehouse className="h-4 w-4 text-[#0D9488]" />
          </div>
          <div className="mt-2 text-[28px] font-bold leading-8 text-[#0F172A]">
            {counts.vendors}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Role Requests
            </span>
            <ShieldCheck className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-bold leading-8 text-[#0F172A]">
              {counts.pendingRequests}
            </span>
            <StatusBadge
              state={counts.pendingRequests > 0 ? 'warning' : 'operational'}
              label={counts.pendingRequests > 0 ? 'Review' : 'All Set'}
              pulse={false}
            />
          </div>
        </div>
      </div>

      {/* Separate Portal Login Links Card */}
      <OpsCard
        title="Separate Portal Login Links"
        subtitle="Send each role their own direct portal link. Staff and Vendors are blocked from opening unauthorized portals."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {portalLinks.map((portal) => {
            const isCopied = copiedPortal === portal.role;
            return (
              <div
                key={portal.role}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-7 w-7 rounded-lg flex items-center justify-center ${portal.accentBg} ${portal.accentText}`}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[13px] font-semibold text-[#0F172A]">
                      {portal.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#475569] mt-1.5 leading-4">
                    {portal.description}
                  </p>
                  <div className="mt-2.5 rounded-lg bg-white border border-[#E2E8F0] px-2.5 py-1.5 font-mono text-[11px] text-[#334155] truncate">
                    {portal.url}
                  </div>
                </div>
                <OpsButton
                  variant={isCopied ? 'primary' : 'secondary'}
                  size="compact"
                  onClick={() => handleCopyPortalLink(portal.role, portal.url)}
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied Link
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy {portal.role === 'owner' ? 'Owner' : portal.role === 'employee' ? 'Staff' : 'Vendor'} Link
                    </>
                  )}
                </OpsButton>
              </div>
            );
          })}
        </div>
      </OpsCard>

      {/* Plain-English Role Permissions Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0F172A]">
            <Briefcase className="h-4 w-4 text-[#4F46E5]" />
            Business Owner Window
          </div>
          <p className="text-[12px] text-[#475569] mt-1.5 leading-5">
            Full company visibility across overview, revenue, routes, vending machines, vendor approvals, and team access. Only verified Owners can open this window.
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0F172A]">
            <Truck className="h-4 w-4 text-[#2563EB]" />
            Staff Field Window
          </div>
          <p className="text-[12px] text-[#475569] mt-1.5 leading-5">
            Strictly isolated to Active Routes, Machine Service, and Field Incidents. Zero access to revenue, business overview, vendor billing, or team settings.
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0F172A]">
            <Warehouse className="h-4 w-4 text-[#0D9488]" />
            Vendor Partner Window
          </div>
          <p className="text-[12px] text-[#475569] mt-1.5 leading-5">
            Strictly isolated to that vendor&apos;s Restock Orders and Partner Deliveries. Zero access to internal fleet, hardware, incidents, other vendors, or financials.
          </p>
        </div>
      </div>

      {/* Team Directory Table */}
      <OpsCard
        title={`Registered Workspace Accounts (${filteredMembers.length})`}
        subtitle="Any team member who signs in with Google appears here automatically"
        bodyClassName="p-0"
      >
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-8 w-8 text-[#94A3B8] mx-auto mb-2" />
            <div className="text-[15px] font-semibold text-[#0F172A]">
              No matching team accounts
            </div>
            <p className="text-[13px] text-[#475569] mt-1">
              Clear your search filter or share the app URL with employees and vendors to sign in.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-b-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Team Member
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Assigned Role
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Vendor Company
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Status
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                    Access Control
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredMembers.map((member) => {
                  const isSelf = member.userId === currentUid;
                  const profile = teamProfiles[member.userId];
                  const hasUpgradeRequest = member.requestedRole !== member.role;

                  return (
                    <tr
                      key={member.userId}
                      className="h-[60px] bg-white hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="h-8 w-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] text-[12px] font-semibold flex items-center justify-center shrink-0">
                            {member.displayName.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-1.5">
                              <span className="truncate">{member.displayName}</span>
                              {isSelf && (
                                <span className="text-[11px] font-medium text-[#4F46E5]">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] text-[#475569] truncate max-w-[240px]">
                              {profile?.email ?? `ID: ${member.userId.slice(0, 12)}...`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            aria-label={`Role for ${member.displayName}`}
                            value={member.role}
                            disabled={isSelf}
                            onChange={(e) =>
                              onUpdateMember(member.userId, {
                                role: e.target.value as UserRoleType,
                                requestedRole: e.target.value as UserRoleType,
                                vendorOrganization: member.vendorOrganization ?? '',
                                active: member.active,
                              })
                            }
                            className="ops-input h-9 px-2.5 text-[12px] font-medium disabled:opacity-60"
                          >
                            <option value="owner">Business Owner</option>
                            <option value="employee">Employee</option>
                            <option value="vendor">Vendor Partner</option>
                          </select>

                          {hasUpgradeRequest && (
                            <OpsButton
                              variant="secondary"
                              size="compact"
                              onClick={() =>
                                onUpdateMember(member.userId, {
                                  role: member.requestedRole,
                                  requestedRole: member.requestedRole,
                                  vendorOrganization: member.vendorOrganization ?? '',
                                  active: true,
                                })
                              }
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                              Approve {ROLE_LABELS[member.requestedRole]}
                            </OpsButton>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        {member.role === 'vendor' ? (
                          <div>
                            <input
                              type="text"
                              list="team-vendor-partner-list"
                              aria-label={`Vendor company for ${member.displayName}`}
                              defaultValue={member.vendorOrganization ?? ''}
                              key={`${member.userId}-${member.vendorOrganization ?? ''}`}
                              placeholder="Enter or select vendor"
                              maxLength={120}
                              onBlur={(e) => {
                                const nextVal = e.target.value.trim();
                                if (nextVal !== (member.vendorOrganization ?? '')) {
                                  onUpdateMember(member.userId, {
                                    role: member.role,
                                    requestedRole: member.requestedRole,
                                    vendorOrganization: nextVal,
                                    active: member.active,
                                  });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.currentTarget as HTMLInputElement).blur();
                                }
                              }}
                              className="ops-input h-9 px-2.5 text-[12px] w-48"
                            />
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#94A3B8]">
                            Internal Team
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2.5">
                        <StatusBadge
                          state={
                            !member.active
                              ? 'critical'
                              : member.role === 'vendor'
                              ? 'vendor'
                              : 'operational'
                          }
                          label={member.active ? 'Active' : 'Paused'}
                          pulse={false}
                        />
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        {!isSelf ? (
                          <OpsButton
                            variant={member.active ? 'secondary' : 'primary'}
                            size="compact"
                            onClick={() =>
                              onUpdateMember(member.userId, {
                                role: member.role,
                                requestedRole: member.requestedRole,
                                vendorOrganization: member.vendorOrganization ?? '',
                                active: !member.active,
                              })
                            }
                          >
                            {member.active ? 'Pause Access' : 'Restore Access'}
                          </OpsButton>
                        ) : (
                          <span className="text-[12px] text-[#475569]">Primary Owner</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OpsCard>

      <datalist id="team-vendor-partner-list">
        {vendorPartners.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
    </div>
  );
}
