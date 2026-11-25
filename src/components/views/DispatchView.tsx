import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Columns3,
  List,
  Navigation,
  Route,
  Thermometer,
  Trash2,
  Truck,
} from 'lucide-react';
import { DispatchStatus, FleetDispatch, UserRoleType, VendingUnit } from '../../types/ops';
import { FleetMap } from '../map/FleetMap';
import { OpsButton, OpsCard, StatusBadge } from '../ui/OpsPrimitives';

interface DispatchViewProps {
  dispatches: FleetDispatch[];
  hardwareUnits: VendingUnit[];
  searchQuery: string;
  effectiveRole: UserRoleType;
  onInspectDispatch: (dispatch: FleetDispatch) => void;
  onUpdateDispatchStatus: (id: string, nextStatus: DispatchStatus) => void;
  onDeleteDispatch: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenOptimizer: (dispatchId?: string) => void;
}

type StatusFilter = 'All' | DispatchStatus;

export function DispatchView({
  dispatches,
  hardwareUnits,
  searchQuery,
  effectiveRole,
  onInspectDispatch,
  onUpdateDispatchStatus,
  onDeleteDispatch,
  onOpenCreateModal,
  onOpenOptimizer,
}: DispatchViewProps) {
  const isOwner = effectiveRole === 'owner';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [showMap, setShowMap] = useState(true);

  const roleScopedDispatches = useMemo(() => {
    if (effectiveRole === 'vendor') {
      return dispatches.filter((d) => d.isVendorContractor);
    }
    return dispatches;
  }, [dispatches, effectiveRole]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roleScopedDispatches.filter((d) => {
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.id.toLowerCase().includes(q) ||
        d.vehicleCode.toLowerCase().includes(q) ||
        d.driverName.toLowerCase().includes(q) ||
        d.routeCode.toLowerCase().includes(q) ||
        d.corridor.toLowerCase().includes(q) ||
        d.destination.toLowerCase().includes(q)
      );
    });
  }, [roleScopedDispatches, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      All: roleScopedDispatches.length,
      'En Route': 0,
      Loading: 0,
      Delayed: 0,
      Maintenance: 0,
      Delivered: 0,
    };
    for (const d of roleScopedDispatches) {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    }
    return counts;
  }, [roleScopedDispatches]);

  const boardColumns: DispatchStatus[] = ['Loading', 'En Route', 'Delayed', 'Maintenance', 'Delivered'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] md:text-[30px] font-semibold leading-[32px] md:leading-[38px] tracking-[-0.02em] text-[#0F172A]">
            {effectiveRole === 'vendor'
              ? 'Partner Delivery Routes'
              : 'Live Fleet & Route Dispatch'}
          </h1>
          <p className="text-[14px] text-[#475569] mt-1">
            {effectiveRole === 'vendor'
              ? 'Track your assigned contractor delivery runs, update stop completions, and optimize around traffic.'
              : 'Monitor fleet vehicles, update delivery stops, and optimize routes around real-time traffic.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <OpsButton
            variant="primary"
            size="compact"
            disabled={roleScopedDispatches.length === 0}
            onClick={() => onOpenOptimizer()}
          >
            <Route className="h-3.5 w-3.5" />
            Route Optimizer
          </OpsButton>

          <OpsButton
            variant="secondary"
            size="compact"
            onClick={() => setShowMap((v) => !v)}
          >
            {showMap ? 'Hide Map' : 'Show Corridor Map'}
          </OpsButton>

          <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-lg gap-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium cursor-pointer transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium cursor-pointer transition-colors ${
                viewMode === 'board'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Route Board
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Corridor Map */}
      {showMap && (
        <OpsCard
          title="Active Fleet Corridor Positions"
          subtitle="Live GPS schematic across metro fulfillment depots and delivery hubs"
        >
          <FleetMap
            dispatches={filtered}
            hardwareUnits={hardwareUnits}
            onInspectDispatch={onInspectDispatch}
            compact
          />
        </OpsCard>
      )}

      {/* Segmented Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center p-1 bg-[#F1F5F9] rounded-lg gap-1">
          {(['All', 'En Route', 'Loading', 'Delayed', 'Maintenance', 'Delivered'] as StatusFilter[]).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer tabular-nums-strict ${
                  statusFilter === st
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {st} ({statusCounts[st]})
              </button>
            )
          )}
        </div>
      </div>

      {/* Table Mode */}
      {viewMode === 'table' && (
        <OpsCard bodyClassName="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="h-8 w-8 text-[#94A3B8] mx-auto mb-2" />
              <div className="text-[15px] font-semibold text-[#0F172A]">
                {roleScopedDispatches.length === 0
                  ? 'No delivery routes scheduled yet'
                  : 'No fleet dispatches match your filter'}
              </div>
              <p className="text-[13px] text-[#475569] mt-1">
                {roleScopedDispatches.length === 0
                  ? 'Create your first dispatch with your real vehicle, driver, and delivery stops.'
                  : 'Adjust the active status filter or create a new dispatch run.'}
              </p>
              {effectiveRole !== 'vendor' && (
                <div className="mt-4">
                  <OpsButton onClick={onOpenCreateModal}>
                    {roleScopedDispatches.length === 0
                      ? 'Create First Dispatch'
                      : 'Create Dispatch'}
                  </OpsButton>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                      Vehicle & Route
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                      Driver / Channel
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                      Status
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                      Route Progress
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                      Cargo Temp
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                      Next ETA
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filtered.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => onInspectDispatch(d)}
                      className="h-[56px] bg-white hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-semibold text-[#0F172A]">
                            {d.vehicleCode}
                          </span>
                          <span className="text-[11px] font-mono text-[#475569]">
                            {d.routeCode}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#475569] truncate max-w-[230px]">
                          {d.corridor}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-7 w-7 rounded-lg text-[11px] font-semibold flex items-center justify-center shrink-0 ${
                              d.isVendorContractor
                                ? 'bg-[#F0FDFA] text-[#115E59] border border-[#99F6E4]'
                                : 'bg-[#F1F5F9] text-[#0F172A]'
                            }`}
                          >
                            {d.driverInitials}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-[#0F172A] whitespace-nowrap">
                              {d.driverName}
                            </div>
                            <div className="text-[11px] text-[#475569] truncate max-w-[160px]">
                              {d.isVendorContractor ? d.contractorName : d.vehicleType}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge state={d.state} label={d.status} />
                      </td>
                      <td className="px-4 py-2.5 min-w-[150px]">
                        <div className="flex items-center justify-between text-[11px] text-[#475569] tabular-nums-strict mb-1">
                          <span>
                            {d.stopsCompleted}/{d.stopsTotal} stops
                          </span>
                          <span className="font-semibold text-[#0F172A]">{d.progressPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              d.state === 'critical'
                                ? 'bg-[#EF4444]'
                                : d.state === 'warning'
                                ? 'bg-[#F59E0B]'
                                : d.state === 'vendor'
                                ? 'bg-[#0D9488]'
                                : 'bg-[#4F46E5]'
                            }`}
                            style={{ width: `${d.progressPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums-strict">
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
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] font-semibold text-[#0F172A] tabular-nums-strict whitespace-nowrap">
                        <div>{d.etaFormatted}</div>
                        {d.lastOptimizedAt && (
                          <div className="text-[10px] font-medium text-[#065F46]">
                            Opt {d.minutesSaved ? `-${d.minutesSaved}m` : 'Synced'}
                          </div>
                        )}
                      </td>
                      <td
                        className="px-4 py-2.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {d.status !== 'Delivered' && (
                            <OpsButton
                              variant="secondary"
                              size="compact"
                              onClick={() => onOpenOptimizer(d.id)}
                              title="Recalculate stop sequence with Route Optimizer"
                            >
                              <Route className="h-3.5 w-3.5 text-[#4F46E5]" />
                              Optimize
                            </OpsButton>
                          )}
                          {d.status !== 'Delivered' && (
                            <OpsButton
                              variant="secondary"
                              size="compact"
                              onClick={() =>
                                onUpdateDispatchStatus(
                                  d.id,
                                  d.status === 'Loading'
                                    ? 'En Route'
                                    : d.status === 'Maintenance'
                                    ? 'En Route'
                                    : 'Delivered'
                                )
                              }
                            >
                              {d.status === 'Loading'
                                ? 'Launch'
                                : d.status === 'Maintenance'
                                ? 'Resume'
                                : 'Complete'}
                            </OpsButton>
                          )}
                          <OpsButton
                            variant="ghost"
                            size="compact"
                            onClick={() => onInspectDispatch(d)}
                          >
                            <Navigation className="h-3.5 w-3.5" />
                          </OpsButton>
                          {isOwner && (
                            <OpsButton
                              variant="ghost"
                              size="compact"
                              onClick={() => onDeleteDispatch(d.id)}
                              title="Delete dispatch"
                              aria-label={`Delete dispatch ${d.vehicleCode}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-[#94A3B8] hover:text-[#EF4444]" />
                            </OpsButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </OpsCard>
      )}

      {/* Kanban Route Board Mode */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {boardColumns.map((col) => {
            const items = filtered.filter((d) => d.status === col);
            return (
              <div
                key={col}
                className="bg-[#F1F5F9]/80 border border-[#E2E8F0] rounded-2xl p-3 flex flex-col gap-3 min-h-[320px]"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    {col}
                  </span>
                  <span className="text-[12px] font-semibold text-[#0F172A] tabular-nums-strict">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {items.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => onInspectDispatch(d)}
                      className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 elevation-1 elevation-2-hover cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[13px] font-semibold text-[#0F172A]">
                          {d.vehicleCode}
                        </span>
                        <StatusBadge state={d.state} label={d.etaFormatted} pulse={false} />
                      </div>
                      <div className="text-[12px] font-medium text-[#0F172A] mt-1.5 truncate">
                        {d.destination}
                      </div>
                      <div className="text-[11px] text-[#475569] mt-0.5 truncate">
                        {d.driverName} · {d.routeCode}
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#475569] tabular-nums-strict">
                        <span className="inline-flex items-center gap-1">
                          <Thermometer className="h-3 w-3" />
                          {d.tempCelsius.toFixed(1)}°C
                        </span>
                        <span>
                          {d.stopsCompleted}/{d.stopsTotal} stops
                        </span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="h-24 rounded-xl border border-dashed border-[#CBD5E1] flex flex-col items-center justify-center text-[12px] text-[#94A3B8]">
                      <CheckCircle2 className="h-4 w-4 mb-1 opacity-60" />
                      No routes
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
