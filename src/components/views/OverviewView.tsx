import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Cpu,
  Plus,
  Route,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  Warehouse,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FleetDispatch,
  NavSection,
  OpsIncident,
  UserRoleType,
  VendingUnit,
  VendorPartnerRecord,
  VendorRestockOrder,
  WorkspaceSettingsRecord,
} from '../../types/ops';
import { FleetMap } from '../map/FleetMap';
import { OpsButton, OpsCard, StatusBadge } from '../ui/OpsPrimitives';

interface OverviewViewProps {
  dispatches: FleetDispatch[];
  hardwareUnits: VendingUnit[];
  incidents: OpsIncident[];
  restockOrders: VendorRestockOrder[];
  vendorPartners: VendorPartnerRecord[];
  workspaceSettings: WorkspaceSettingsRecord;
  hasSampleData: boolean;
  searchQuery: string;
  effectiveRole: UserRoleType;
  onNavigate: (section: NavSection) => void;
  onInspectDispatch: (dispatch: FleetDispatch) => void;
  onInspectHardware: (unit: VendingUnit) => void;
  onAcknowledgeIncident: (id: string) => void;
  onResolveIncident: (id: string) => void;
  onOpenOptimizer: (dispatchId?: string) => void;
  onOpenSettings: () => void;
  onOpenAddHardware: () => void;
  onOpenAddVendor: () => void;
  onOpenCreateDispatch: () => void;
  onClearAllData: () => void;
  onLoadSampleData: () => void;
}

export function OverviewView({
  dispatches,
  hardwareUnits,
  incidents,
  restockOrders,
  vendorPartners,
  workspaceSettings,
  hasSampleData,
  searchQuery,
  effectiveRole,
  onNavigate,
  onInspectDispatch,
  onInspectHardware,
  onAcknowledgeIncident,
  onResolveIncident,
  onOpenOptimizer,
  onOpenSettings,
  onOpenAddHardware,
  onOpenAddVendor,
  onOpenCreateDispatch,
  onClearAllData,
  onLoadSampleData,
}: OverviewViewProps) {
  const isOwner = effectiveRole === 'owner';
  const currency = workspaceSettings.currencySymbol || '$';
  const isEmptyWorkspace =
    dispatches.length === 0 &&
    hardwareUnits.length === 0 &&
    restockOrders.length === 0 &&
    incidents.length === 0;

  const kpis = useMemo(() => {
    const activeVehicles = dispatches.filter(
      (d) => d.status === 'En Route' || d.status === 'Loading'
    ).length;
    const fleetUtilPct =
      dispatches.length > 0
        ? Math.round((activeVehicles / dispatches.length) * 100)
        : 0;

    const onlineHardware = hardwareUnits.filter(
      (u) => u.status !== 'Offline'
    ).length;
    const hardwareUptimePct =
      hardwareUnits.length > 0
        ? ((onlineHardware / hardwareUnits.length) * 100).toFixed(1)
        : '—';

    const openCritical = incidents.filter((i) => i.severity === 'Critical').length;
    const openWarnings = incidents.filter((i) => i.severity === 'Warning').length;

    const pendingVendor = restockOrders.filter(
      (r) => r.status === 'Pending Approval'
    ).length;

    const avgPartnerSla =
      vendorPartners.length > 0
        ? (
            vendorPartners.reduce((sum, p) => sum + p.slaTargetPct, 0) /
            vendorPartners.length
          ).toFixed(1)
        : null;

    const totalRevenue24h = hardwareUnits.reduce((acc, u) => acc + u.revenue24h, 0);

    return {
      activeVehicles,
      fleetUtilPct,
      onlineHardware,
      hardwareUptimePct,
      openCritical,
      openWarnings,
      pendingVendor,
      avgPartnerSla,
      totalRevenue24h,
    };
  }, [dispatches, hardwareUnits, incidents, restockOrders, vendorPartners]);

  const prioritizedIncidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return incidents
      .filter((i) => i.severity !== 'Resolved')
      .filter((i) => {
        if (!q) return true;
        return (
          i.id.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.assetId.toLowerCase().includes(q) ||
          i.zone.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.severity === 'Critical' && b.severity !== 'Critical') return -1;
        if (b.severity === 'Critical' && a.severity !== 'Critical') return 1;
        return a.slaMinutesRemaining - b.slaMinutesRemaining;
      });
  }, [incidents, searchQuery]);

  const activeRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dispatches.filter((d) => {
      if (!q) return true;
      return (
        d.vehicleCode.toLowerCase().includes(q) ||
        d.driverName.toLowerCase().includes(q) ||
        d.corridor.toLowerCase().includes(q) ||
        d.routeCode.toLowerCase().includes(q)
      );
    });
  }, [dispatches, searchQuery]);

  // Real live operational chart computed directly from active Firestore dispatches & hardware
  const livePerformanceSeries = useMemo(() => {
    if (dispatches.length > 0) {
      return dispatches.slice(0, 7).map((d) => ({
        name: d.vehicleCode,
        completed: d.stopsCompleted,
        remaining: Math.max(0, d.stopsTotal - d.stopsCompleted),
        progressPct: d.progressPct,
      }));
    }
    if (hardwareUnits.length > 0) {
      return hardwareUnits.slice(0, 7).map((u) => ({
        name: u.id,
        completed: u.stockPct,
        remaining: Math.max(0, 100 - u.stockPct),
        progressPct: u.stockPct,
      }));
    }
    return [];
  }, [dispatches, hardwareUnits]);

  const chartMode = dispatches.length > 0 ? 'routes' : 'hardware';

  return (
    <div className="space-y-6">
      {/* Sample Data Cleanup Notice (Shown to Owners if starter demo records exist in DB) */}
      {isOwner && hasSampleData && (
        <div className="rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[#92400E]">
              Sample demonstration data is currently loaded in your database
            </div>
            <p className="text-[12px] text-[#92400E]/90 mt-0.5 leading-5">
              Ready to run your real business? Clear the sample records in one click to start with a clean workspace and enter your own machines, routes, and vendors.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <OpsButton variant="secondary" size="compact" onClick={onOpenSettings}>
              <Settings className="h-3.5 w-3.5" />
              Business Settings
            </OpsButton>
            <OpsButton variant="destructive" size="compact" onClick={onClearAllData}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear Demo Data &amp; Start Fresh
            </OpsButton>
          </div>
        </div>
      )}

      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] md:text-[30px] font-semibold leading-[32px] md:leading-[38px] tracking-[-0.02em] text-[#0F172A]">
            {workspaceSettings.companyName && workspaceSettings.companyName !== 'OpsPilot'
              ? `${workspaceSettings.companyName} · ${
                  isOwner ? 'Operations Overview' : 'Daily Operations'
                }`
              : isOwner
              ? 'Business Operations Overview'
              : 'Daily Field Operations'}
          </h1>
          <p className="text-[14px] text-[#475569] mt-1">
            {workspaceSettings.regionName
              ? `${workspaceSettings.regionName} · `
              : ''}
            {isOwner
              ? 'Live overview of your delivery fleet, vending machines, vendor restocking, and urgent field alerts.'
              : 'Track active delivery routes, check vending machines needing care, and resolve open field issues.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && (
            <OpsButton variant="secondary" size="compact" onClick={onOpenSettings}>
              <Settings className="h-3.5 w-3.5" />
              Business Settings
            </OpsButton>
          )}
          <OpsButton variant="secondary" size="compact" onClick={() => onNavigate('incidents')}>
            Field Issues
            <ArrowUpRight className="h-3.5 w-3.5" />
          </OpsButton>
        </div>
      </div>

      {/* First-Time Business Setup Checklist (Clean Slate Onboarding) */}
      {isEmptyWorkspace && (
        <OpsCard
          title={
            isOwner
              ? 'Set Up Your Business Workspace'
              : 'No Active Operations Scheduled Yet'
          }
          subtitle={
            isOwner
              ? 'Your database is clean and ready for production use. Complete any step below to start tracking live operations.'
              : 'Your Business Owner has not added machines or routes yet. You can create a dispatch route or report a field issue anytime.'
          }
          actions={
            isOwner ? (
              <OpsButton variant="ghost" size="compact" onClick={onLoadSampleData}>
                <Sparkles className="h-3.5 w-3.5 text-[#4F46E5]" />
                Load Sample Demo Data
              </OpsButton>
            ) : undefined
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {isOwner && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="h-8 w-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-semibold text-[#475569]">
                      Step 1
                    </span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#0F172A] mt-3">
                    Business Name &amp; Currency
                  </h3>
                  <p className="text-[12px] text-[#475569] mt-1 leading-5">
                    Set your company name, city/region, and currency ({currency}).
                  </p>
                </div>
                <OpsButton variant="secondary" size="compact" onClick={onOpenSettings}>
                  Configure Profile
                </OpsButton>
              </div>
            )}

            {isOwner && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="h-8 w-8 rounded-lg bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
                      <Cpu className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-semibold text-[#475569]">
                      Step 2
                    </span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#0F172A] mt-3">
                    Register First Machine
                  </h3>
                  <p className="text-[12px] text-[#475569] mt-1 leading-5">
                    Add your vending machine ID, location, chiller target, and product bays.
                  </p>
                </div>
                <OpsButton variant="primary" size="compact" onClick={onOpenAddHardware}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Machine
                </OpsButton>
              </div>
            )}

            {isOwner && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="h-8 w-8 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
                      <Warehouse className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-semibold text-[#475569]">
                      Step 3
                    </span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#0F172A] mt-3">
                    Add Vendor Partner
                  </h3>
                  <p className="text-[12px] text-[#475569] mt-1 leading-5">
                    Register your restock suppliers so they can receive and complete orders.
                  </p>
                </div>
                <OpsButton variant="vendor" size="compact" onClick={onOpenAddVendor}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Vendor
                </OpsButton>
              </div>
            )}

            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="h-8 w-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                    <Truck className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-semibold text-[#475569]">
                    {isOwner ? 'Step 4' : 'Quick Action'}
                  </span>
                </div>
                <h3 className="text-[14px] font-semibold text-[#0F172A] mt-3">
                  Launch First Delivery Route
                </h3>
                <p className="text-[12px] text-[#475569] mt-1 leading-5">
                  Create a dispatch with your vehicle, driver, and custom delivery stops.
                </p>
              </div>
              <OpsButton variant="primary" size="compact" onClick={onOpenCreateDispatch}>
                <Plus className="h-3.5 w-3.5" />
                Create Dispatch
              </OpsButton>
            </div>
          </div>
        </OpsCard>
      )}

      {/* 12-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div
          onClick={() => onNavigate('dispatch')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1 elevation-2-hover cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Active Fleet Utilization
            </span>
            <Truck className="h-4 w-4 text-[#4F46E5]" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
              {dispatches.length > 0 ? `${kpis.fleetUtilPct}%` : '—'}
            </span>
            <span className="text-[12px] font-medium text-[#065F46] tabular-nums-strict">
              {kpis.activeVehicles}/{dispatches.length} active
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#4F46E5]"
              style={{ width: `${kpis.fleetUtilPct}%` }}
            />
          </div>
        </div>

        <div
          onClick={() => onNavigate('hardware')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1 elevation-2-hover cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Vending Fleet Uptime
            </span>
            <Cpu className="h-4 w-4 text-[#10B981]" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
              {hardwareUnits.length > 0 ? `${kpis.hardwareUptimePct}%` : '—'}
            </span>
            <span className="text-[12px] font-medium text-[#475569] tabular-nums-strict">
              {kpis.onlineHardware}/{hardwareUnits.length} online
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-[#475569] tabular-nums-strict">
            <span>24h Gross Revenue</span>
            <span className="font-semibold text-[#0F172A]">
              {currency}
              {kpis.totalRevenue24h.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('incidents')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1 elevation-2-hover cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Critical Incidents
            </span>
            <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
              {kpis.openCritical}
            </span>
            <StatusBadge
              state={kpis.openCritical > 0 ? 'critical' : 'operational'}
              label={kpis.openCritical > 0 ? 'Action Needed' : 'All Clear'}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-[#475569] tabular-nums-strict">
            <span>Active Warnings</span>
            <span className="font-semibold text-[#92400E]">{kpis.openWarnings} queued</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('vendors')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1 elevation-2-hover cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Vendor Restock Queue
            </span>
            <TrendingUp className="h-4 w-4 text-[#0D9488]" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
              {kpis.pendingVendor}
            </span>
            <StatusBadge state="vendor" label="Partner Channel" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-[#475569] tabular-nums-strict">
            <span>Partner SLA Target</span>
            <span className="font-semibold text-[#115E59]">
              {kpis.avgPartnerSla ? `${kpis.avgPartnerSla}% avg` : `${vendorPartners.length} partners`}
            </span>
          </div>
        </div>
      </div>

      {/* Main 12-Col Cockpit Row: Live Map (7 cols) + Priority Incident Triage (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <OpsCard
          title="Live Operations Telemetry Map"
          subtitle="Click any active fleet vehicle or vending machine marker to inspect details"
          className="xl:col-span-7 flex flex-col"
          bodyClassName="p-5 flex-1"
          actions={
            <OpsButton
              variant="ghost"
              size="compact"
              onClick={() => onNavigate('dispatch')}
            >
              Open Fleet Dispatch
            </OpsButton>
          }
        >
          <FleetMap
            dispatches={dispatches}
            hardwareUnits={hardwareUnits}
            onInspectDispatch={onInspectDispatch}
            onInspectHardware={onInspectHardware}
          />
        </OpsCard>

        <OpsCard
          title="Priority Incident Triage"
          subtitle="Ordered by severity and remaining SLA response window"
          className="xl:col-span-5 flex flex-col"
          bodyClassName="p-0 flex-1 flex flex-col"
          actions={
            <OpsButton
              variant="ghost"
              size="compact"
              onClick={() => onNavigate('incidents')}
            >
              All ({incidents.length})
            </OpsButton>
          }
        >
          {prioritizedIncidents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-[#10B981] mb-2" />
              <div className="text-[14px] font-semibold text-[#0F172A]">
                Zero Active Incidents
              </div>
              <p className="text-[12px] text-[#475569] mt-1 max-w-xs">
                All tracked fleet units and vending terminals are currently clear of open incidents.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {prioritizedIncidents.slice(0, 4).map((incident) => (
                <div
                  key={incident.id}
                  className="px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[12px] font-semibold text-[#475569]">
                          {incident.id}
                        </span>
                        <span className="text-[#CBD5E1]">·</span>
                        <span className="font-mono text-[12px] font-semibold text-[#2563EB]">
                          {incident.assetId}
                        </span>
                        <StatusBadge
                          state={incident.severity === 'Critical' ? 'critical' : 'warning'}
                          label={incident.severity}
                        />
                      </div>
                      <h3 className="text-[14px] font-semibold text-[#0F172A] mt-1 leading-5">
                        {incident.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-[#475569] tabular-nums-strict">
                        <span>{incident.zone}</span>
                        <span>·</span>
                        <span>Tech: {incident.assignedTech}</span>
                        <span>·</span>
                        <span
                          className={
                            incident.slaMinutesRemaining <= 25
                              ? 'text-[#EF4444] font-semibold'
                              : 'text-[#475569]'
                          }
                        >
                          SLA {incident.slaMinutesRemaining}m left
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    {!incident.acknowledged && (
                      <OpsButton
                        variant="secondary"
                        size="compact"
                        onClick={() => onAcknowledgeIncident(incident.id)}
                      >
                        Acknowledge
                      </OpsButton>
                    )}
                    <OpsButton
                      variant={incident.severity === 'Critical' ? 'primary' : 'secondary'}
                      size="compact"
                      onClick={() => onResolveIncident(incident.id)}
                    >
                      Mark Resolved
                    </OpsButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </OpsCard>
      </div>

      {/* Bottom 12-Col Live Analytics (Computed from Live Data) + Active Dispatch Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <OpsCard
          title={
            chartMode === 'routes'
              ? 'Live Route Stop Progress'
              : 'Live Machine Stock Levels'
          }
          subtitle={
            chartMode === 'routes'
              ? 'Completed vs. remaining stops across your active delivery vehicles'
              : 'Current fill percentage vs. open capacity across registered machines'
          }
          className="xl:col-span-5"
        >
          {livePerformanceSeries.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center text-center px-4">
              <TrendingUp className="h-8 w-8 text-[#CBD5E1] mb-2" />
              <div className="text-[14px] font-semibold text-[#0F172A]">
                Live Analytics Appear Here
              </div>
              <p className="text-[12px] text-[#475569] mt-1 max-w-xs">
                Once you add a delivery route or vending machine, real-time fulfillment metrics chart automatically with zero dummy values.
              </p>
            </div>
          ) : (
            <>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={livePerformanceSeries}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '10px',
                        fontSize: '12px',
                        boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                    <Bar
                      dataKey="completed"
                      name={chartMode === 'routes' ? 'Completed Stops' : 'Stock %'}
                      stackId="a"
                      fill="#4F46E5"
                      radius={[0, 0, 4, 4]}
                    />
                    <Bar
                      dataKey="remaining"
                      name={chartMode === 'routes' ? 'Remaining Stops' : 'Empty %'}
                      stackId="a"
                      fill="#CBD5E1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[12px] text-[#475569] tabular-nums-strict">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#4F46E5]" />
                    {chartMode === 'routes' ? 'Completed' : 'Stocked'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
                    {chartMode === 'routes' ? 'Remaining' : 'Open Capacity'}
                  </span>
                </div>
                <span className="font-semibold text-[#0F172A]">
                  {livePerformanceSeries.length} tracked
                </span>
              </div>
            </>
          )}
        </OpsCard>

        <OpsCard
          title="Active Fleet Telemetry Grid"
          subtitle="Live route progress, cargo temperatures, and next destination ETAs"
          className="xl:col-span-7"
          bodyClassName="p-0"
          actions={
            <div className="flex items-center gap-1.5">
              {dispatches.length > 0 && (
                <OpsButton
                  variant="secondary"
                  size="compact"
                  onClick={() => onOpenOptimizer()}
                >
                  <Route className="h-3.5 w-3.5 text-[#4F46E5]" />
                  Optimize Routes
                </OpsButton>
              )}
              <OpsButton
                variant="ghost"
                size="compact"
                onClick={() => onNavigate('dispatch')}
              >
                Manage
              </OpsButton>
            </div>
          }
        >
          {activeRoutes.length === 0 ? (
            <div className="p-10 text-center">
              <Truck className="h-8 w-8 text-[#94A3B8] mx-auto mb-2" />
              <div className="text-[14px] font-semibold text-[#0F172A]">
                No delivery routes yet
              </div>
              <p className="text-[12px] text-[#475569] mt-1">
                Create your first dispatch route to track live stops and cargo telemetry.
              </p>
              <div className="mt-4">
                <OpsButton size="compact" onClick={onOpenCreateDispatch}>
                  <Plus className="h-3.5 w-3.5" />
                  Create First Dispatch
                </OpsButton>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                      Unit / Route
                    </th>
                    <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                      Driver
                    </th>
                    <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                      Status
                    </th>
                    <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                      Temp
                    </th>
                    <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                      ETA
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {activeRoutes.slice(0, 5).map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => onInspectDispatch(d)}
                      className="h-[52px] bg-white hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2">
                        <div className="font-mono text-[13px] font-semibold text-[#0F172A]">
                          {d.vehicleCode}
                        </div>
                        <div className="text-[12px] text-[#475569] truncate max-w-[180px]">
                          {d.corridor}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[13px] text-[#0F172A] whitespace-nowrap">
                        {d.driverName}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge state={d.state} label={d.status} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[13px] tabular-nums-strict">
                        <span
                          className={
                            d.tempCelsius > 8 && d.vehicleType !== 'Rapid Service Van'
                              ? 'text-[#EF4444] font-semibold'
                              : 'text-[#0F172A]'
                          }
                        >
                          {d.tempCelsius.toFixed(1)}°C
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[13px] font-semibold text-[#0F172A] tabular-nums-strict whitespace-nowrap">
                        {d.etaFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </OpsCard>
      </div>
    </div>
  );
}
