import React, { useMemo, useState } from 'react';
import {
  Cpu,
  PackagePlus,
  Plus,
  RefreshCw,
  Thermometer,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { HardwareStatus, UserRoleType, VendingUnit } from '../../types/ops';
import { OpsButton, OpsCard, StatusBadge } from '../ui/OpsPrimitives';

interface HardwareViewProps {
  hardwareUnits: VendingUnit[];
  searchQuery: string;
  effectiveRole: UserRoleType;
  currencySymbol: string;
  onInspectHardware: (unit: VendingUnit) => void;
  onRebootUnit: (unitId: string) => void;
  onTriggerRestock: (unit: VendingUnit) => void;
  onOpenAddHardware: () => void;
  onDeleteHardware: (unitId: string) => void;
}

type HardwareFilter = 'All' | HardwareStatus;

export function HardwareView({
  hardwareUnits,
  searchQuery,
  effectiveRole,
  currencySymbol,
  onInspectHardware,
  onRebootUnit,
  onTriggerRestock,
  onOpenAddHardware,
  onDeleteHardware,
}: HardwareViewProps) {
  const isOwner = effectiveRole === 'owner';
  const [statusFilter, setStatusFilter] = useState<HardwareFilter>('All');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return hardwareUnits.filter((u) => {
      if (statusFilter !== 'All' && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.id.toLowerCase().includes(q) ||
        u.serial.toLowerCase().includes(q) ||
        u.siteName.toLowerCase().includes(q) ||
        u.zone.toLowerCase().includes(q) ||
        u.assignedVendor.toLowerCase().includes(q)
      );
    });
  }, [hardwareUnits, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const total = hardwareUnits.length;
    const online = hardwareUnits.filter((u) => u.status !== 'Offline').length;
    const lowStock = hardwareUnits.filter((u) => u.stockPct < 30).length;
    const thermalAlerts = hardwareUnits.filter(
      (u) => u.tempCelsius > u.targetTempCelsius + 3
    ).length;
    const rev = hardwareUnits.reduce((sum, u) => sum + u.revenue24h, 0);
    const avgCompressor =
      total > 0
        ? Math.round(
            hardwareUnits.reduce((sum, u) => sum + u.compressorHealthPct, 0) / total
          )
        : 0;
    return { total, online, lowStock, thermalAlerts, rev, avgCompressor };
  }, [hardwareUnits]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] md:text-[30px] font-semibold leading-[32px] md:leading-[38px] tracking-[-0.02em] text-[#0F172A]">
            {isOwner ? 'Automated Vending Hardware' : 'Machine Service & Diagnostics'}
          </h1>
          <p className="text-[14px] text-[#475569] mt-1">
            {isOwner
              ? 'Live thermal telemetry, bay fill ratios, cashless payment terminals, and remote diagnostic controls.'
              : 'Field diagnostics, chiller temperatures, bay stock levels, and remote terminal reboot controls.'}
          </p>
        </div>
        {isOwner && (
          <OpsButton variant="primary" size="compact" onClick={onOpenAddHardware}>
            <Plus className="h-4 w-4" />
            Add Machine
          </OpsButton>
        )}
      </div>

      {/* Hardware Telemetry Summary Strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
            Connected Terminals
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
              {metrics.online}/{metrics.total}
            </span>
            <span className="text-[12px] font-medium text-[#065F46]">
              {metrics.total > 0
                ? `${Math.round((metrics.online / metrics.total) * 100)}% link`
                : '0 registered'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
            Thermal Excursions
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
              {metrics.thermalAlerts}
            </span>
            <StatusBadge
              state={metrics.thermalAlerts > 0 ? 'critical' : 'operational'}
              label={metrics.thermalAlerts > 0 ? 'Check Chiller' : 'In Spec'}
            />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
            Below 30% Reorder Floor
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
              {metrics.lowStock}
            </span>
            <span className="text-[12px] font-medium text-[#92400E]">
              {metrics.lowStock > 0 ? 'Needs restock' : 'All stocked'}
            </span>
          </div>
        </div>

        {isOwner ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              24h Fleet Revenue
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
                {currencySymbol}
                {metrics.rev.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[12px] font-medium text-[#475569] tabular-nums-strict">
                {metrics.total} unit{metrics.total === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Avg Compressor Health
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
                {metrics.total > 0 ? `${metrics.avgCompressor}%` : '—'}
              </span>
              <span className="text-[12px] font-medium text-[#475569] tabular-nums-strict">
                {metrics.total} unit{metrics.total === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="inline-flex flex-wrap items-center p-1 bg-[#F1F5F9] rounded-lg gap-1">
        {(['All', 'Online', 'Low Stock', 'Thermal Alert', 'Restocking', 'Offline'] as HardwareFilter[]).map(
          (st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {st}
            </button>
          )
        )}
      </div>

      {/* Hardware Live Data Grid */}
      <OpsCard
        title="Deployed Hardware Telemetry"
        subtitle="Click any unit row to open slot-level inventory and remote diagnostics"
        bodyClassName="p-0"
      >
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Cpu className="h-8 w-8 text-[#94A3B8] mx-auto mb-2" />
            <div className="text-[15px] font-semibold text-[#0F172A]">
              {hardwareUnits.length === 0
                ? 'No vending machines registered yet'
                : 'No vending hardware units match your filter'}
            </div>
            <p className="text-[13px] text-[#475569] mt-1">
              {hardwareUnits.length === 0
                ? 'Register your first vending machine with its site, chiller target, and product bays.'
                : 'Clear your search filter to inspect all deployed kiosks.'}
            </p>
            {isOwner && hardwareUnits.length === 0 && (
              <div className="mt-4">
                <OpsButton onClick={onOpenAddHardware}>
                  <Plus className="h-4 w-4" />
                  Register First Machine
                </OpsButton>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-b-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Unit / Site
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Status
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Stock Level
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                    Chiller Temp
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Payment Link
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                    {isOwner ? '24h Revenue' : 'Zone / Bays'}
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                    Remote Controls
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((unit) => {
                  const tempBreach = unit.tempCelsius > unit.targetTempCelsius + 3;
                  return (
                    <tr
                      key={unit.id}
                      onClick={() => onInspectHardware(unit)}
                      className="h-[56px] bg-white hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-semibold text-[#0F172A]">
                            {unit.id}
                          </span>
                          <span className="text-[11px] text-[#94A3B8] font-mono">
                            {unit.serial}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#475569] truncate max-w-[230px]">
                          {unit.siteName}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge state={unit.state} label={unit.status} />
                      </td>
                      <td className="px-4 py-2.5 min-w-[140px]">
                        <div className="flex items-center justify-between text-[12px] tabular-nums-strict mb-1">
                          <span className="font-semibold text-[#0F172A]">
                            {unit.stockPct}%
                          </span>
                          <span className="text-[11px] text-[#94A3B8]">
                            Comp {unit.compressorHealthPct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              unit.stockPct < 25
                                ? 'bg-[#F59E0B]'
                                : unit.stockPct < 55
                                ? 'bg-[#0D9488]'
                                : 'bg-[#10B981]'
                            }`}
                            style={{ width: `${unit.stockPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums-strict whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            tempBreach
                              ? 'text-[#EF4444] font-semibold'
                              : 'text-[#0F172A]'
                          }`}
                        >
                          <Thermometer className="h-3.5 w-3.5" />
                          {unit.tempCelsius.toFixed(1)}°C
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="inline-flex items-center gap-1.5 text-[12px] font-medium">
                          {unit.cashlessStatus === 'Offline' ? (
                            <>
                              <WifiOff className="h-3.5 w-3.5 text-[#EF4444]" />
                              <span className="text-[#991B1B]">
                                Offline ({unit.lastHeartbeat})
                              </span>
                            </>
                          ) : (
                            <>
                              <Wifi className="h-3.5 w-3.5 text-[#10B981]" />
                              <span className="text-[#0F172A]">
                                Nominal · {unit.lastHeartbeat}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      {isOwner ? (
                        <td className="px-4 py-2.5 text-right font-mono text-[13px] font-semibold text-[#0F172A] tabular-nums-strict whitespace-nowrap">
                          {currencySymbol}
                          {unit.revenue24h.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      ) : (
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <div className="text-[12px] font-medium text-[#0F172A]">
                            {unit.zone}
                          </div>
                          <div className="text-[11px] text-[#475569] tabular-nums-strict">
                            {unit.slots.length} bays
                          </div>
                        </td>
                      )}
                      <td
                        className="px-4 py-2.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <OpsButton
                            variant="secondary"
                            size="compact"
                            onClick={() => onRebootUnit(unit.id)}
                            title="Send remote diagnostics & soft reboot"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Reboot
                          </OpsButton>
                          <OpsButton
                            variant="vendor"
                            size="compact"
                            onClick={() => onTriggerRestock(unit)}
                            title="Dispatch automated vendor restock order"
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                            Restock
                          </OpsButton>
                          {isOwner && (
                            <OpsButton
                              variant="ghost"
                              size="compact"
                              onClick={() => onDeleteHardware(unit.id)}
                              title="Delete machine"
                              aria-label={`Delete machine ${unit.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-[#94A3B8] hover:text-[#EF4444]" />
                            </OpsButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OpsCard>
    </div>
  );
}
