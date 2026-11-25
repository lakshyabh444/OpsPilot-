import {
  DispatchStatus,
  FleetDispatch,
  OperationalState,
  OptimizationStrategy,
  RouteStop,
  StopUrgency,
  TrafficLevel,
} from '../types/ops';

export interface RouteOptimizerWeights {
  strategy: OptimizationStrategy;
  urgencyWeight: number; // 0..100
  trafficWeight: number; // 0..100
}

export interface StopOptimizationDiff {
  stop: RouteStop;
  previousIndex: number; // 1-based among all stops
  newIndex: number; // 1-based among all stops
  positionDelta: number; // positive means promoted earlier
  previousEta: string;
  newEta: string;
  legDurationMinutes: number;
  priorityScore: number;
}

export interface RouteOptimizationResult {
  dispatchId: string;
  strategy: OptimizationStrategy;
  optimizedStops: RouteStop[];
  diffs: StopOptimizationDiff[];
  baselineTotalMinutes: number;
  optimizedTotalMinutes: number;
  minutesSaved: number;
  criticalFirstArrivalBefore: number; // minutes until first Critical stop
  criticalFirstArrivalAfter: number;
  criticalGainMinutes: number;
  reorderedCount: number;
  nextEtaMinutes: number;
  nextEtaFormatted: string;
  newDestination: string;
  recommendedStatus: DispatchStatus;
  recommendedState: OperationalState;
  updatedDispatch: FleetDispatch;
}

export const STRATEGY_PRESETS: Record<
  OptimizationStrategy,
  { label: string; description: string; urgencyWeight: number; trafficWeight: number }
> = {
  balanced: {
    label: 'Balanced',
    description: 'Balances urgent thermal/stock SLAs against active corridor delays.',
    urgencyWeight: 60,
    trafficWeight: 60,
  },
  'urgency-first': {
    label: 'Urgency First',
    description: 'Prioritizes Critical and High-urgency stops immediately, even through moderate traffic.',
    urgencyWeight: 95,
    trafficWeight: 25,
  },
  'traffic-avoidance': {
    label: 'Traffic Avoidance',
    description: 'Defers congested legs so corridor bottlenecks clear while servicing clear zones first.',
    urgencyWeight: 30,
    trafficWeight: 95,
  },
  'sla-strict': {
    label: 'SLA Strict',
    description: 'Maximizes on-time delivery for high-volume stops and cold-chain priority docks.',
    urgencyWeight: 85,
    trafficWeight: 70,
  },
};

export function defaultDelayForTraffic(level: TrafficLevel): number {
  if (level === 'Congested') return 20;
  if (level === 'Moderate') return 9;
  return 2;
}

/**
 * Ensures older localStorage RouteStop records without traffic/urgency metadata
 * seamlessly receive deterministic operational defaults.
 */
export function hydrateStopMetrics(stop: RouteStop, idx: number): Required<RouteStop> {
  const inferredUrgency: StopUrgency =
    stop.urgency ??
    (stop.units >= 290 ? 'Critical' : stop.units >= 200 ? 'High' : 'Standard');

  const inferredTraffic: TrafficLevel =
    stop.trafficLevel ??
    (idx % 3 === 0 ? 'Congested' : idx % 3 === 1 ? 'Moderate' : 'Clear');

  const inferredDelay =
    stop.delayMinutes ?? defaultDelayForTraffic(inferredTraffic);

  const inferredDrive = stop.driveMinutes ?? 10 + ((idx * 3) % 7);

  return {
    ...stop,
    urgency: inferredUrgency,
    trafficLevel: inferredTraffic,
    delayMinutes: inferredDelay,
    driveMinutes: inferredDrive,
  };
}

function formatClockFromMinutes(totalMinutesFromMidnight: number): string {
  const normalized = ((totalMinutesFromMidnight % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const mins = Math.round(normalized % 60);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
}

function getBaseAnchorMinutes(): number {
  // Anchor to current local clock (or 09:28 AM operational baseline if preferred;
  // using live current time keeps ETAs grounded and realistic).
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function urgencyValue(urgency: StopUrgency): number {
  if (urgency === 'Critical') return 100;
  if (urgency === 'High') return 62;
  return 22;
}

function trafficPenalty(level: TrafficLevel, delayMinutes: number): number {
  const levelBase = level === 'Congested' ? 85 : level === 'Moderate' ? 38 : 6;
  return levelBase + delayMinutes * 1.4;
}

/**
 * Computes effective travel + congestion delay for a stop given its sequence
 * position among remaining stops.
 * Deferring congested legs allows peak corridor congestion to decay by ~35-55%
 * by the time the vehicle reaches that corridor, modeling real-time traffic relief.
 */
function effectiveLegMinutes(
  stop: Required<RouteStop>,
  positionInRemaining: number
): number {
  const serviceMinutes = Math.max(4, Math.round(stop.units / 60));
  const decayFactor =
    stop.trafficLevel === 'Congested'
      ? Math.max(0.42, 1 - positionInRemaining * 0.24)
      : stop.trafficLevel === 'Moderate'
      ? Math.max(0.65, 1 - positionInRemaining * 0.14)
      : 1;
  const adjustedDelay = Math.round(stop.delayMinutes * decayFactor);
  return stop.driveMinutes + adjustedDelay + serviceMinutes;
}

function simulateSequenceMetrics(stops: Required<RouteStop>[]) {
  let cumulative = 0;
  let firstCritical = 0;
  const arrivalById: Record<string, number> = {};
  const legById: Record<string, number> = {};

  stops.forEach((s, idx) => {
    const leg = effectiveLegMinutes(s, idx);
    cumulative += leg;
    arrivalById[s.id] = cumulative;
    legById[s.id] = leg;
    if (s.urgency === 'Critical' && firstCritical === 0) {
      firstCritical = cumulative;
    }
  });

  return { totalMinutes: cumulative, firstCritical, arrivalById, legById };
}

export function calculateOptimizedRoute(
  dispatch: FleetDispatch,
  weights: RouteOptimizerWeights
): RouteOptimizationResult {
  const hydratedStops = dispatch.stops.map((s, idx) => hydrateStopMetrics(s, idx));
  const completedStops = hydratedStops.filter((s) => s.completed);
  const remainingStops = hydratedStops.filter((s) => !s.completed);

  const originalIndexMap = new Map<string, number>();
  hydratedStops.forEach((s, idx) => originalIndexMap.set(s.id, idx + 1));

  // Score each remaining stop using urgency, real-time traffic friction, and cargo volume
  const scoredRemaining = remainingStops.map((stop) => {
    const uScore = urgencyValue(stop.urgency) * (weights.urgencyWeight / 100);
    const tFriction =
      trafficPenalty(stop.trafficLevel, stop.delayMinutes) *
      (weights.trafficWeight / 100);
    const volumeBoost =
      weights.strategy === 'sla-strict' ? Math.min(28, stop.units / 14) : stop.units / 45;
    const drivePenalty = stop.driveMinutes * 0.65;

    const priorityScore = Math.round(uScore + volumeBoost - tFriction - drivePenalty);
    return { stop, priorityScore };
  });

  const sortedRemaining = [...scoredRemaining].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return a.stop.delayMinutes - b.stop.delayMinutes;
  });

  const baselineSim = simulateSequenceMetrics(remainingStops);
  const optimizedRemainingRaw = sortedRemaining.map((entry) => entry.stop);
  const optimizedSim = simulateSequenceMetrics(optimizedRemainingRaw);

  const anchorMinutes = getBaseAnchorMinutes();
  const optimizedRemainingWithEtas: Required<RouteStop>[] = optimizedRemainingRaw.map(
    (stop) => ({
      ...stop,
      eta: formatClockFromMinutes(anchorMinutes + optimizedSim.arrivalById[stop.id]),
    })
  );

  const optimizedStops: RouteStop[] = [
    ...completedStops,
    ...optimizedRemainingWithEtas,
  ];

  const scoreById = new Map(scoredRemaining.map((s) => [s.stop.id, s.priorityScore]));

  const diffs: StopOptimizationDiff[] = optimizedStops.map((stop, idx) => {
    const prevIdx = originalIndexMap.get(stop.id) ?? idx + 1;
    const newIdx = idx + 1;
    const origStop = hydratedStops.find((s) => s.id === stop.id);
    return {
      stop,
      previousIndex: prevIdx,
      newIndex: newIdx,
      positionDelta: prevIdx - newIdx,
      previousEta: origStop?.eta ?? stop.eta,
      newEta: stop.eta,
      legDurationMinutes: optimizedSim.legById[stop.id] ?? 0,
      priorityScore: scoreById.get(stop.id) ?? 0,
    };
  });

  const reorderedCount = diffs.filter(
    (d) => !d.stop.completed && d.positionDelta !== 0
  ).length;

  const rawSaved = baselineSim.totalMinutes - optimizedSim.totalMinutes;
  const minutesSaved = Math.max(0, rawSaved);

  const criticalGainMinutes =
    baselineSim.firstCritical > 0 && optimizedSim.firstCritical > 0
      ? Math.max(0, baselineSim.firstCritical - optimizedSim.firstCritical)
      : 0;

  const firstRemaining = optimizedRemainingWithEtas[0];
  const lastRemaining =
    optimizedRemainingWithEtas[optimizedRemainingWithEtas.length - 1];

  const nextEtaMinutes = firstRemaining
    ? optimizedSim.arrivalById[firstRemaining.id]
    : 0;
  const nextEtaFormatted = firstRemaining
    ? dispatch.status === 'Maintenance'
      ? 'HALTED'
      : firstRemaining.eta
    : 'ARRIVED';

  const newDestination = lastRemaining ? lastRemaining.location : dispatch.destination;

  // Recover Delayed route back to En Route if optimization yields meaningful relief (>= 6m saved or critical pull-forward >= 10m)
  let recommendedStatus: DispatchStatus = dispatch.status;
  if (
    dispatch.status === 'Delayed' &&
    (minutesSaved >= 6 || criticalGainMinutes >= 10)
  ) {
    recommendedStatus = 'En Route';
  }

  let recommendedState: OperationalState = dispatch.state;
  if (recommendedStatus === 'Maintenance') {
    recommendedState = 'critical';
  } else if (recommendedStatus === 'Delayed') {
    recommendedState = 'warning';
  } else if (dispatch.isVendorContractor && recommendedStatus !== 'Delivered') {
    recommendedState = 'vendor';
  } else {
    recommendedState = 'operational';
  }

  const nowStamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const updatedDispatch: FleetDispatch = {
    ...dispatch,
    stops: optimizedStops,
    etaMinutes: nextEtaMinutes,
    etaFormatted: nextEtaFormatted,
    destination: newDestination,
    status: recommendedStatus,
    state: recommendedState,
    lastOptimizedAt: nowStamp,
    minutesSaved,
    optimizationStrategy: weights.strategy,
  };

  return {
    dispatchId: dispatch.id,
    strategy: weights.strategy,
    optimizedStops,
    diffs,
    baselineTotalMinutes: baselineSim.totalMinutes,
    optimizedTotalMinutes: optimizedSim.totalMinutes,
    minutesSaved,
    criticalFirstArrivalBefore: baselineSim.firstCritical,
    criticalFirstArrivalAfter: optimizedSim.firstCritical,
    criticalGainMinutes,
    reorderedCount,
    nextEtaMinutes,
    nextEtaFormatted,
    newDestination,
    recommendedStatus,
    recommendedState,
    updatedDispatch,
  };
}

/**
 * Simulates a live corridor traffic refresh across incomplete stops so
 * dispatchers can test dynamic re-optimization under shifting traffic loads.
 */
export function refreshLiveTrafficFeed(stops: RouteStop[]): RouteStop[] {
  const levels: TrafficLevel[] = ['Clear', 'Moderate', 'Congested'];
  return stops.map((raw, idx) => {
    const s = hydrateStopMetrics(raw, idx);
    if (s.completed) return s;
    const nextIdx = (levels.indexOf(s.trafficLevel) + 1 + (idx % 2)) % levels.length;
    const nextTraffic = levels[nextIdx];
    const jitter = (idx * 3) % 5;
    const nextDelay =
      nextTraffic === 'Congested'
        ? 18 + jitter
        : nextTraffic === 'Moderate'
        ? 7 + jitter
        : 1 + (jitter % 3);
    return {
      ...s,
      trafficLevel: nextTraffic,
      delayMinutes: nextDelay,
    };
  });
}
