import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  RefreshCw,
  Route,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import {
  FleetDispatch,
  OptimizationStrategy,
  RouteStop,
  StopUrgency,
  TrafficLevel,
} from '../../types/ops';
import {
  calculateOptimizedRoute,
  defaultDelayForTraffic,
  hydrateStopMetrics,
  refreshLiveTrafficFeed,
  RouteOptimizationResult,
  STRATEGY_PRESETS,
} from '../../utils/routeOptimizer';
import { OpsButton, OpsModal, StatusBadge } from '../ui/OpsPrimitives';

interface RouteOptimizerModalProps {
  open: boolean;
  onClose: () => void;
  dispatches: FleetDispatch[];
  initialDispatchId?: string | null;
  onApplySingle: (result: RouteOptimizationResult) => void;
  onApplyBatchAll: (results: RouteOptimizationResult[]) => void;
}

const URGENCY_OPTIONS: StopUrgency[] = ['Critical', 'High', 'Standard'];
const TRAFFIC_OPTIONS: TrafficLevel[] = ['Clear', 'Moderate', 'Congested'];

function urgencyTone(u: StopUrgency): string {
  if (u === 'Critical') return 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]';
  if (u === 'High') return 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
  return 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]';
}

function trafficTone(t: TrafficLevel): string {
  if (t === 'Congested') return 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]';
  if (t === 'Moderate') return 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
  return 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
}

export function RouteOptimizerModal({
  open,
  onClose,
  dispatches,
  initialDispatchId,
  onApplySingle,
  onApplyBatchAll,
}: RouteOptimizerModalProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [strategy, setStrategy] = useState<OptimizationStrategy>('balanced');
  const [urgencyWeight, setUrgencyWeight] = useState<number>(
    STRATEGY_PRESETS.balanced.urgencyWeight
  );
  const [trafficWeight, setTrafficWeight] = useState<number>(
    STRATEGY_PRESETS.balanced.trafficWeight
  );
  const [draftStopsByDispatch, setDraftStopsByDispatch] = useState<
    Record<string, RouteStop[]>
  >({});

  // Sync initial selection whenever modal opens
  useEffect(() => {
    if (!open) return;
    const preferred =
      (initialDispatchId && dispatches.find((d) => d.id === initialDispatchId)?.id) ||
      dispatches.find((d) => d.status === 'Delayed')?.id ||
      dispatches.find((d) => d.status !== 'Delivered')?.id ||
      dispatches[0]?.id ||
      '';
    setSelectedId(preferred);
    setDraftStopsByDispatch({});
  }, [open, initialDispatchId, dispatches]);

  const activeDispatch = useMemo(() => {
    const base = dispatches.find((d) => d.id === selectedId) ?? dispatches[0] ?? null;
    if (!base) return null;
    const overrideStops = draftStopsByDispatch[base.id];
    return {
      ...base,
      stops: (overrideStops ?? base.stops).map((s, idx) => hydrateStopMetrics(s, idx)),
    };
  }, [dispatches, selectedId, draftStopsByDispatch]);

  const optimization = useMemo(() => {
    if (!activeDispatch) return null;
    return calculateOptimizedRoute(activeDispatch, {
      strategy,
      urgencyWeight,
      trafficWeight,
    });
  }, [activeDispatch, strategy, urgencyWeight, trafficWeight]);

  const handleSelectStrategy = (next: OptimizationStrategy) => {
    setStrategy(next);
    setUrgencyWeight(STRATEGY_PRESETS[next].urgencyWeight);
    setTrafficWeight(STRATEGY_PRESETS[next].trafficWeight);
  };

  const handleUpdateStopField = (
    stopId: string,
    patch: Partial<Pick<RouteStop, 'urgency' | 'trafficLevel'>>
  ) => {
    if (!activeDispatch) return;
    const nextStops = activeDispatch.stops.map((s) => {
      if (s.id !== stopId) return s;
      const nextTraffic = patch.trafficLevel ?? s.trafficLevel;
      const nextDelay =
        patch.trafficLevel !== undefined
          ? defaultDelayForTraffic(patch.trafficLevel)
          : s.delayMinutes;
      return {
        ...s,
        ...patch,
        trafficLevel: nextTraffic,
        delayMinutes: nextDelay,
      };
    });
    setDraftStopsByDispatch((prev) => ({
      ...prev,
      [activeDispatch.id]: nextStops,
    }));
  };

  const handleSimulateTrafficRefresh = () => {
    if (!activeDispatch) return;
    const refreshed = refreshLiveTrafficFeed(activeDispatch.stops);
    setDraftStopsByDispatch((prev) => ({
      ...prev,
      [activeDispatch.id]: refreshed,
    }));
  };

  const handleApplyCurrent = () => {
    if (!optimization) return;
    onApplySingle(optimization);
    onClose();
  };

  const handleOptimizeAllActive = () => {
    const activeRoutes = dispatches.filter(
      (d) => d.status !== 'Delivered' && d.stops.some((s) => !s.completed)
    );
    const results = activeRoutes.map((d) => {
      const overrideStops = draftStopsByDispatch[d.id];
      const workingDispatch = overrideStops ? { ...d, stops: overrideStops } : d;
      return calculateOptimizedRoute(workingDispatch, {
        strategy,
        urgencyWeight,
        trafficWeight,
      });
    });
    onApplyBatchAll(results);
    onClose();
  };

  const remainingStopCount = activeDispatch
    ? activeDispatch.stops.filter((s) => !s.completed).length
    : 0;

  return (
    <OpsModal
      open={open}
      onClose={onClose}
      title="Route Optimizer"
      subtitle="Recalculate dispatch stop sequences from live corridor traffic friction and stop urgency SLAs"
      maxWidthClass="max-w-5xl"
    >
      {!activeDispatch || !optimization ? (
        <div className="py-12 text-center text-[13px] text-[#475569]">
          No active dispatches available to optimize.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Row 1: Route Selector + Live Traffic Feed Action */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <div className="min-w-[260px] flex-1 sm:flex-none">
                <label
                  htmlFor="optimizer-route-select"
                  className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] mb-1"
                >
                  Target Dispatch Route
                </label>
                <select
                  id="optimizer-route-select"
                  value={activeDispatch.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="ops-input w-full px-3 text-[13px] font-medium"
                >
                  {dispatches.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.vehicleCode} · {d.routeCode} ({d.driverName}) — {d.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center gap-2 flex-wrap">
                <StatusBadge
                  state={activeDispatch.state}
                  label={activeDispatch.status}
                />
                <span className="text-[12px] text-[#475569] tabular-nums-strict">
                  {remainingStopCount} remaining of {activeDispatch.stops.length} stops
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 lg:pt-4">
              <OpsButton
                type="button"
                variant="secondary"
                size="compact"
                onClick={handleSimulateTrafficRefresh}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Traffic Feed
              </OpsButton>
            </div>
          </div>

          {/* Row 2: Strategy Presets & Weighting Sliders */}
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#0F172A]">
                <SlidersHorizontal className="h-4 w-4 text-[#4F46E5]" />
                <span>Optimization Objective</span>
              </div>
              <div className="inline-flex flex-wrap items-center p-1 bg-white border border-[#E2E8F0] rounded-lg gap-1">
                {(Object.keys(STRATEGY_PRESETS) as OptimizationStrategy[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectStrategy(key)}
                    className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      strategy === key
                        ? 'bg-[#4F46E5] text-white'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {STRATEGY_PRESETS[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="font-medium text-[#0F172A]">
                    Urgency & Cold-Chain SLA Weight
                  </span>
                  <span className="font-mono font-semibold text-[#4F46E5] tabular-nums-strict">
                    {urgencyWeight}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={urgencyWeight}
                  onChange={(e) => setUrgencyWeight(Number(e.target.value))}
                  className="w-full accent-[#4F46E5] cursor-pointer"
                  aria-label="Urgency priority weight"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="font-medium text-[#0F172A]">
                    Real-Time Traffic Avoidance Weight
                  </span>
                  <span className="font-mono font-semibold text-[#0D9488] tabular-nums-strict">
                    {trafficWeight}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={trafficWeight}
                  onChange={(e) => setTrafficWeight(Number(e.target.value))}
                  className="w-full accent-[#0D9488] cursor-pointer"
                  aria-label="Traffic avoidance weight"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Quantified Optimization Impact Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums-strict">
            <div className="rounded-xl bg-white border border-[#E2E8F0] p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                Route Time Saved
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span
                  className={`text-[22px] font-bold font-mono leading-7 ${
                    optimization.minutesSaved > 0 ? 'text-[#065F46]' : 'text-[#0F172A]'
                  }`}
                >
                  {optimization.minutesSaved > 0
                    ? `-${optimization.minutesSaved}m`
                    : '0m'}
                </span>
                <span className="text-[11px] text-[#475569]">
                  {optimization.baselineTotalMinutes}m → {optimization.optimizedTotalMinutes}m
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-[#E2E8F0] p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                Critical Stop Gain
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-[22px] font-bold font-mono leading-7 text-[#4F46E5]">
                  {optimization.criticalGainMinutes > 0
                    ? `-${optimization.criticalGainMinutes}m`
                    : 'Optimal'}
                </span>
                <span className="text-[11px] text-[#475569]">
                  {optimization.criticalFirstArrivalAfter > 0
                    ? `ETA +${optimization.criticalFirstArrivalAfter}m`
                    : 'No critical'}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-[#E2E8F0] p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                Next Stop ETA
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-[20px] font-bold font-mono leading-7 text-[#0F172A]">
                  {optimization.nextEtaFormatted}
                </span>
                <span className="text-[11px] text-[#475569]">
                  {optimization.reorderedCount} moved
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-[#E2E8F0] p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                Projected Status
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <StatusBadge
                  state={optimization.recommendedState}
                  label={optimization.recommendedStatus}
                  pulse={false}
                />
                {activeDispatch.status === 'Delayed' &&
                  optimization.recommendedStatus === 'En Route' && (
                    <span className="text-[11px] font-semibold text-[#065F46]">
                      SLA Recovered
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Row 4: Two-Column Split — Live Stop Inputs vs. Recalculated Sequence */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Current Stops & Live Traffic/Urgency Inputs */}
            <div className="lg:col-span-6 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                  Current Stop Telemetry & Inputs
                </h4>
                <span className="text-[11px] text-[#475569]">
                  Adjust urgency or traffic to simulate
                </span>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] divide-y divide-[#F1F5F9] overflow-hidden bg-white">
                {activeDispatch.stops.map((stop, idx) => (
                  <div
                    key={stop.id}
                    className={`p-3 flex flex-col gap-2 ${
                      stop.completed ? 'bg-[#F8FAFC]/80 opacity-75' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-5 w-5 rounded-md bg-[#F1F5F9] text-[#475569] font-mono text-[11px] font-semibold flex items-center justify-center shrink-0 tabular-nums-strict">
                          {idx + 1}
                        </span>
                        <span
                          className={`text-[13px] font-medium truncate ${
                            stop.completed
                              ? 'text-[#475569] line-through'
                              : 'text-[#0F172A]'
                          }`}
                        >
                          {stop.location}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#475569] tabular-nums-strict shrink-0">
                        {stop.units} units · {stop.eta}
                      </span>
                    </div>

                    {stop.completed ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#065F46] font-medium pl-7">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed — locked in historical order
                      </div>
                    ) : (
                      <div className="pl-7 flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Urgency for ${stop.location}`}
                          value={stop.urgency ?? 'Standard'}
                          onChange={(e) =>
                            handleUpdateStopField(stop.id, {
                              urgency: e.target.value as StopUrgency,
                            })
                          }
                          className={`h-7 rounded-md border px-2 text-[11px] font-semibold cursor-pointer focus:outline-none ${urgencyTone(
                            stop.urgency ?? 'Standard'
                          )}`}
                        >
                          {URGENCY_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              Urgency: {u}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label={`Traffic condition for ${stop.location}`}
                          value={stop.trafficLevel ?? 'Clear'}
                          onChange={(e) =>
                            handleUpdateStopField(stop.id, {
                              trafficLevel: e.target.value as TrafficLevel,
                            })
                          }
                          className={`h-7 rounded-md border px-2 text-[11px] font-semibold cursor-pointer focus:outline-none ${trafficTone(
                            stop.trafficLevel ?? 'Clear'
                          )}`}
                        >
                          {TRAFFIC_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              Traffic: {t}
                            </option>
                          ))}
                        </select>

                        <span className="text-[11px] font-mono text-[#475569] tabular-nums-strict ml-auto">
                          +{stop.delayMinutes ?? 0}m delay
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Proposed Optimized Sequence */}
            <div className="lg:col-span-6 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4F46E5]">
                  Recalculated Optimal Sequence
                </h4>
                <span className="text-[11px] text-[#475569] tabular-nums-strict">
                  Final Dest: {optimization.newDestination}
                </span>
              </div>

              <div className="rounded-xl border border-[#4F46E5]/30 divide-y divide-[#F1F5F9] overflow-hidden bg-white">
                {optimization.diffs.map((diff) => {
                  const movedUp = diff.positionDelta > 0;
                  const movedDown = diff.positionDelta < 0;

                  return (
                    <div
                      key={diff.stop.id}
                      className={`p-3 flex items-center justify-between gap-3 ${
                        diff.stop.completed
                          ? 'bg-[#F8FAFC]/80 opacity-75'
                          : movedUp
                          ? 'bg-[#EEF2FF]/45'
                          : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`h-6 w-6 rounded-md font-mono text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums-strict ${
                            diff.stop.completed
                              ? 'bg-[#ECFDF5] text-[#065F46]'
                              : 'bg-[#4F46E5] text-white'
                          }`}
                        >
                          {diff.newIndex}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[13px] font-semibold truncate ${
                                diff.stop.completed
                                  ? 'text-[#475569] line-through'
                                  : 'text-[#0F172A]'
                              }`}
                            >
                              {diff.stop.location}
                            </span>
                            {!diff.stop.completed && movedUp && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#065F46] bg-[#ECFDF5] rounded-full px-2 py-0.5">
                                <ArrowUp className="h-3 w-3" />#{diff.previousIndex} → #{diff.newIndex}
                              </span>
                            )}
                            {!diff.stop.completed && movedDown && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#92400E] bg-[#FFFBEB] rounded-full px-2 py-0.5">
                                <ArrowDown className="h-3 w-3" />#{diff.previousIndex} → #{diff.newIndex}
                              </span>
                            )}
                          </div>

                          {!diff.stop.completed && (
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-[#475569] tabular-nums-strict">
                              <span>{diff.stop.urgency}</span>
                              <span>·</span>
                              <span>{diff.stop.trafficLevel} traffic</span>
                              <span>·</span>
                              <span>{diff.legDurationMinutes}m leg</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 tabular-nums-strict">
                        <div className="font-mono text-[13px] font-bold text-[#0F172A] flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3 text-[#4F46E5]" />
                          {diff.newEta}
                        </div>
                        {!diff.stop.completed && diff.previousEta !== diff.newEta && (
                          <div className="text-[11px] font-mono text-[#94A3B8] line-through">
                            {diff.previousEta}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="pt-4 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <OpsButton
              type="button"
              variant="secondary"
              onClick={handleOptimizeAllActive}
            >
              <Zap className="h-4 w-4 text-[#0D9488]" />
              Optimize All Active Routes
            </OpsButton>

            <div className="flex items-center justify-end gap-2.5">
              <OpsButton type="button" variant="secondary" onClick={onClose}>
                Cancel
              </OpsButton>
              <OpsButton
                type="button"
                variant="primary"
                onClick={handleApplyCurrent}
                disabled={remainingStopCount === 0}
              >
                <Route className="h-4 w-4" />
                Apply Sequence to {activeDispatch.vehicleCode}
                <ArrowRight className="h-3.5 w-3.5" />
              </OpsButton>
            </div>
          </div>
        </div>
      )}
    </OpsModal>
  );
}
