import React, { useEffect, useState } from 'react';
import {
  Activity,
  Briefcase,
  CheckCircle2,
  Info,
  Lock,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { UserRoleType } from '../../types/ops';

interface LoginPageProps {
  initialPortal: UserRoleType;
  onSelectPortal: (portal: UserRoleType) => void;
  onGoogleSignIn: (role: UserRoleType, vendorOrg?: string) => Promise<void>;
  loading: boolean;
  errorMessage: string | null;
}

interface PortalDoorConfig {
  id: UserRoleType;
  hash: string;
  badge: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  doorDescription: string;
  buttonBg: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  dotColor: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedAccess: string[];
  restrictedNote: string;
}

const PORTAL_DOORS: PortalDoorConfig[] = [
  {
    id: 'owner',
    hash: '#owner',
    badge: 'Owner Administration',
    title: 'Business Owner Portal',
    shortTitle: 'Business Owner',
    subtitle: 'Full company dashboard, revenue, approvals & team control',
    doorDescription:
      'Authorized Business Owners only. Manage your entire fleet, machines, revenue, vendor approvals, and team permissions.',
    buttonBg: 'bg-[#4F46E5] hover:bg-[#4338CA] focus-visible:ring-[#4F46E5]',
    accentBg: 'bg-[#EEF2FF]',
    accentBorder: 'border-[#4F46E5]',
    accentText: 'text-[#4F46E5]',
    dotColor: 'bg-[#4F46E5]',
    icon: Briefcase,
    allowedAccess: [
      'Full Business Overview, revenue metrics & live corridor map',
      'Add/delete machines, routes, vendor partners & approve restocks',
      'Manage Staff & Vendor accounts, roles, and access status',
    ],
    restrictedNote:
      'Staff and Vendor accounts are blocked from opening this portal.',
  },
  {
    id: 'employee',
    hash: '#staff',
    badge: 'Field Operations Only',
    title: 'Staff / Employee Portal',
    shortTitle: 'Staff / Employee',
    subtitle: 'Isolated window for drivers & field technicians',
    doorDescription:
      'Dedicated workspace for daily route deliveries, machine service, and field incident resolution.',
    buttonBg: 'bg-[#2563EB] hover:bg-[#1D4ED8] focus-visible:ring-[#2563EB]',
    accentBg: 'bg-[#EFF6FF]',
    accentBorder: 'border-[#2563EB]',
    accentText: 'text-[#2563EB]',
    dotColor: 'bg-[#2563EB]',
    icon: Truck,
    allowedAccess: [
      'View & update delivery stops and run the Route Optimizer',
      'Check machine temperatures, stock levels & run soft reboots',
      'Log, acknowledge, comment on & resolve field incidents',
    ],
    restrictedNote:
      'No access to company revenue, vendor billing/approvals, team settings, or deleting records.',
  },
  {
    id: 'vendor',
    hash: '#vendor',
    badge: 'External Partner Only',
    title: 'Vendor Partner Portal',
    shortTitle: 'Vendor Partner',
    subtitle: 'Isolated window for external restock & delivery suppliers',
    doorDescription:
      'Dedicated external supplier portal for receiving approved restock orders and confirming kiosk deliveries.',
    buttonBg: 'bg-[#0D9488] hover:bg-[#0F766E] focus-visible:ring-[#0D9488]',
    accentBg: 'bg-[#F0FDFA]',
    accentBorder: 'border-[#0D9488]',
    accentText: 'text-[#0D9488]',
    dotColor: 'bg-[#0D9488]',
    icon: Warehouse,
    allowedAccess: [
      'View only your assigned restock orders & SLA delivery windows',
      'Mark Approved orders as Dispatched and Confirm Completed Fills',
      'Track your assigned partner delivery runs only',
    ],
    restrictedNote:
      'No access to internal fleet, vending revenue, incidents, other vendors, or owner controls.',
  },
];

export function LoginPage({
  initialPortal,
  onSelectPortal,
  onGoogleSignIn,
  loading,
  errorMessage,
}: LoginPageProps) {
  const [selectedPortal, setSelectedPortal] = useState<UserRoleType>(initialPortal);
  const [vendorOrg, setVendorOrg] = useState<string>('');

  useEffect(() => {
    setSelectedPortal(initialPortal);
  }, [initialPortal]);

  const activeDoor =
    PORTAL_DOORS.find((d) => d.id === selectedPortal) ?? PORTAL_DOORS[0];
  const ActiveIcon = activeDoor.icon;

  const handleChoosePortal = (portal: UserRoleType) => {
    setSelectedPortal(portal);
    onSelectPortal(portal);
    const door = PORTAL_DOORS.find((d) => d.id === portal);
    if (door && window.location.hash !== door.hash) {
      window.history.replaceState(null, '', door.hash);
    }
  };

  const handleContinue = async () => {
    await onGoogleSignIn(
      selectedPortal,
      selectedPortal === 'vendor' ? vendorOrg.trim() || undefined : undefined
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Left Structural Dark-Slate Orientation Panel */}
      <aside className="lg:w-[44%] xl:w-[42%] bg-[#0F172A] text-white p-6 sm:p-10 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#334155]">
        <div>
          {/* Brand Lockup */}
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center text-white ops-btn-primary shrink-0 ${
                selectedPortal === 'vendor'
                  ? 'bg-[#0D9488]'
                  : selectedPortal === 'employee'
                  ? 'bg-[#2563EB]'
                  : 'bg-[#4F46E5]'
              }`}
            >
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[18px] font-bold tracking-[-0.02em] leading-6">
                OpsPilot
              </div>
              <div className="text-[12px] text-slate-400 leading-4">
                Separate Role-Authenticated Operations Portals
              </div>
            </div>
          </div>

          {/* Portal-Specific Headline */}
          <div className="mt-10 max-w-md">
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#1E293B] border border-[#334155] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-200 mb-4">
              <ActiveIcon className="h-3.5 w-3.5 text-[#818CF8]" />
              <span>{activeDoor.badge}</span>
            </div>
            <h1 className="text-[28px] sm:text-[34px] font-bold leading-[36px] sm:leading-[42px] tracking-[-0.025em] text-white">
              {activeDoor.title}
            </h1>
            <p className="mt-3 text-[15px] leading-6 text-slate-300">
              {activeDoor.doorDescription}
            </p>
          </div>

          {/* Important Notes Box */}
          <div className="mt-8 rounded-2xl bg-[#1E293B] border border-[#334155] p-5 space-y-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <Info className="h-4 w-4 text-[#818CF8] shrink-0" />
              <span>Separate Access &amp; Authentication Rules</span>
            </div>

            <ul className="space-y-3 text-[13px] leading-5 text-slate-300">
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#10B981] mt-0.5 shrink-0" />
                <span>
                  <strong className="text-white font-semibold">Strictly separate windows:</strong>{' '}
                  Business Owners, Staff, and Vendors each log into their own separate workspace. Staff and Vendors cannot view or switch to Owner pages or each other&apos;s portals.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-[#FBBF24] mt-0.5 shrink-0" />
                <span>
                  <strong className="text-white font-semibold">Verified Google account per role:</strong>{' '}
                  Each person signs in with their own Google account. Staff and Vendor accounts attempting to enter the Owner portal are automatically blocked.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Users className="h-4 w-4 text-[#38BDF8] mt-0.5 shrink-0" />
                <span>
                  <strong className="text-white font-semibold">How Owners test Staff or Vendor windows:</strong>{' '}
                  Sign in through the Staff or Vendor tab here (or use a separate Google account) to open that strictly isolated window. Click Sign Out anytime to switch portals.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-[#5EEAD4] mt-0.5 shrink-0" />
                <span>
                  <strong className="text-white font-semibold">Pop-up tip:</strong>{' '}
                  If Google sign-in does not appear, please allow pop-ups for this site and click Continue with Google again.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#334155]/80 text-[12px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>OpsPilot Operations Hub</span>
          <span>Strict Role-Isolated Firebase Authentication</span>
        </div>
      </aside>

      {/* Right Illuminated Portal Door Selector & Sign-In Card */}
      <main className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-xl bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 elevation-1">
          <div>
            <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[#0F172A]">
              Choose Your Login Portal
            </h2>
            <p className="text-[14px] text-[#475569] mt-1">
              Each portal opens a separate, role-restricted window with its own permissions.
            </p>
          </div>

          {/* 3 Separate Portal Doors Tabs */}
          <div
            className="mt-6 grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]"
            role="tablist"
            aria-label="Select authentication portal"
          >
            {PORTAL_DOORS.map((door) => {
              const Icon = door.icon;
              const isSelected = selectedPortal === door.id;
              return (
                <button
                  key={door.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleChoosePortal(door.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer focus:outline-none ${
                    isSelected
                      ? 'bg-white text-[#0F172A] shadow-xs ring-1 ring-[#CBD5E1]'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isSelected ? door.accentText : 'text-[#64748B]'
                    }`}
                  />
                  <span className="truncate">{door.shortTitle}</span>
                </button>
              );
            })}
          </div>

          {/* Active Portal Details Card */}
          <div
            className={`mt-5 rounded-xl border p-5 ${activeDoor.accentBorder} ${activeDoor.accentBg}/45`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${activeDoor.accentBg} ${activeDoor.accentText}`}
              >
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-semibold text-[#0F172A]">
                  {activeDoor.title}
                </div>
                <p className="text-[13px] text-[#475569] mt-0.5">
                  {activeDoor.subtitle}
                </p>
              </div>
            </div>

            <ul className="mt-4 pt-3.5 border-t border-[#E2E8F0] space-y-1.5">
              {activeDoor.allowedAccess.map((item) => (
                <li
                  key={item}
                  className="text-[12.5px] text-[#334155] flex items-center gap-2"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${activeDoor.dotColor}`}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3.5 pt-3 border-t border-[#E2E8F0] flex items-start gap-2 text-[12px] text-[#475569]">
              <Lock className="h-3.5 w-3.5 text-[#64748B] mt-0.5 shrink-0" />
              <span>{activeDoor.restrictedNote}</span>
            </div>
          </div>

          {/* Vendor Company Name Input (ONLY on Vendor Portal Door) */}
          {selectedPortal === 'vendor' && (
            <div className="mt-4 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] p-4">
              <label
                htmlFor="vendor-org-input"
                className="block text-[12px] font-semibold text-[#115E59] mb-1.5"
              >
                Your Vendor / Supplier Company Name
              </label>
              <input
                id="vendor-org-input"
                type="text"
                value={vendorOrg}
                onChange={(e) => setVendorOrg(e.target.value)}
                placeholder="e.g. FreshLine Supply Co."
                maxLength={120}
                className="ops-input w-full px-3 text-[13px]"
              />
              <p className="text-[11px] text-[#115E59]/80 mt-1.5">
                Orders assigned to this company will appear in your isolated Vendor Portal.
              </p>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div
              role="alert"
              className="mt-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3.5 text-[13px] text-[#991B1B]"
            >
              {errorMessage}
            </div>
          )}

          {/* Primary Google Sign-In CTA */}
          <div className="mt-6 pt-5 border-t border-[#F1F5F9]">
            <button
              type="button"
              onClick={handleContinue}
              disabled={loading}
              className={`w-full h-11 rounded-xl font-semibold text-[14px] text-white flex items-center justify-center gap-3 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ops-btn-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${activeDoor.buttonBg}`}
            >
              <span className="h-6 w-6 rounded-full bg-white flex items-center justify-center shrink-0">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.86z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09A12 12 0 0 0 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.29 14.29A7.18 7.18 0 0 1 4.92 12c0-.79.14-1.56.37-2.29V6.62H1.29a12 12 0 0 0 0 10.76l4-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l4 3.09C6.23 6.87 8.88 4.76 12 4.76z"
                  />
                </svg>
              </span>
              <span>
                {loading
                  ? `Signing into ${activeDoor.title}...`
                  : `Sign in to ${activeDoor.title}`}
              </span>
            </button>

            <p className="mt-3 text-center text-[12px] text-[#64748B]">
              Google will prompt you to pick your account so each person signs into their own role workspace.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
