import React, { useMemo, useState } from 'react';
import { Cpu, MapPin, Navigation, Truck, X } from 'lucide-react';
import { FleetDispatch, OperationalState, VendingUnit } from '../../types/ops';
import { OpsButton, StatusBadge } from '../ui/OpsPrimitives';

interface FleetMapProps {
  dispatches: FleetDispatch[];
  hardwareUnits: VendingUnit[];
  onInspectDispatch?: (dispatch: FleetDispatch) => void;
  onInspectHardware?: (unit: VendingUnit) => void;
  compact?: boolean;
}

type MapFilter = 'all' | 'fleet' | 'hardware' | 'alerts';

interface SelectedPin {
  kind: 'fleet' | 'hardware';
  id: string;
}

const RING_COLOR: Record<OperationalState, string> = {
  operational: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  vendor: '#0D9488',
};

export function FleetMap({
  dispatches,
  hardwareUnits,
  onInspectDispatch,
  onInspectHardware,
  compact = false,
}: FleetMapProps) {
  const [filter, setFilter] = useState<MapFilter>('all');
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);

  const visibleFleet = useMemo(() => {
    if (filter === 'hardware') return [];
    if (filter === 'alerts') {
      return dispatches.filter((d) => d.state === 'critical' || d.state === 'warning');
    }
    return dispatches;
  }, [dispatches, filter]);

  const visibleHardware = useMemo(() => {
    if (filter === 'fleet') return [];
    if (filter === 'alerts') {
      return hardwareUnits.filter((u) => u.state === 'critical' || u.state === 'warning');
    }
    return hardwareUnits;
  }, [hardwareUnits, filter]);

  const selectedFleet =
    selectedPin?.kind === 'fleet'
      ? dispatches.find((d) => d.id === selectedPin.id) ?? null
      : null;

  const selectedHardware =
    selectedPin?.kind === 'hardware'
      ? hardwareUnits.find((u) => u.id === selectedPin.id) ?? null
      : null;

  return (
    <div className="flex flex-col h-full">
      {/* Map Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-lg gap-1">
          {(
            [
              { id: 'all', label: 'All Assets' },
              { id: 'fleet', label: `Fleet (${dispatches.length})` },
              { id: 'hardware', label: `Kiosks (${hardwareUnits.length})` },
              { id: 'alerts', label: 'Alerts Only' },
            ] as { id: MapFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilter(tab.id);
                setSelectedPin(null);
              }}
              className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Ring Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-[#475569]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0F172A] ring-2 ring-[#10B981]" />
            Nominal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0F172A] ring-2 ring-[#F59E0B]" />
            Delayed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0F172A] ring-2 ring-[#EF4444]" />
            Critical
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0F172A] ring-2 ring-[#0D9488]" />
            Vendor
          </span>
        </div>
      </div>

      {/* Tactical Metro Schematic Canvas */}
      <div
        className={`relative w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] overflow-hidden ${
          compact ? 'h-[300px]' : 'h-[380px]'
        }`}
      >
        {/* Crisp Vector Metro Topology & Corridors */}
        <svg
          viewBox="0 0 1000 560"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          {/* Subtle operational grid */}
          <defs>
            <pattern id="opsGrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="#CBD5E1"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="1000" height="560" fill="#F8FAFC" />
          <rect width="1000" height="560" fill="url(#opsGrid)" />

          {/* Stylized Bay Water Body */}
          <path
            d="M 730 0 L 1000 0 L 1000 560 L 790 560 C 760 440, 720 350, 755 245 C 775 180, 725 110, 730 0 Z"
            fill="#E2E8F0"
            fillOpacity="0.65"
          />

          {/* Primary Transit Corridors */}
          <path
            d="M 160 220 Q 430 235 670 155 L 860 210"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />
          <path
            d="M 650 165 Q 520 320 460 420 Q 520 470 620 500"
            fill="none"
            stroke="#4F46E5"
            strokeOpacity="0.35"
            strokeWidth="3"
          />
          <path
            d="M 240 245 Q 380 265 510 265 Q 610 265 670 160"
            fill="none"
            stroke="#0D9488"
            strokeOpacity="0.3"
            strokeWidth="2.5"
          />

          {/* Neutral Operations Sector Labels */}
          <text x="615" y="105" fill="#64748B" fontSize="12" fontWeight="600" letterSpacing="1.2">
            NORTH SECTOR
          </text>
          <text x="155" y="190" fill="#64748B" fontSize="12" fontWeight="600" letterSpacing="1.2">
            WEST CORRIDOR
          </text>
          <text x="455" y="305" fill="#64748B" fontSize="12" fontWeight="600" letterSpacing="1.2">
            CENTRAL HUB
          </text>
          <text x="800" y="165" fill="#64748B" fontSize="12" fontWeight="600" letterSpacing="1.2">
            EAST TERMINAL
          </text>
          <text x="345" y="485" fill="#64748B" fontSize="12" fontWeight="600" letterSpacing="1.2">
            SOUTH TRANSIT
          </text>
          <text x="580" y="530" fill="#64748B" fontSize="12" fontWeight="600" letterSpacing="1.2">
            LOGISTICS PARK
          </text>
        </svg>

        {visibleFleet.length === 0 && visibleHardware.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-xs border border-[#E2E8F0] rounded-xl px-5 py-4 text-center max-w-xs elevation-2">
              <MapPin className="h-5 w-5 text-[#4F46E5] mx-auto mb-1.5" />
              <div className="text-[13px] font-semibold text-[#0F172A]">
                No Active Assets Plotted
              </div>
              <p className="text-[12px] text-[#475569] mt-0.5 leading-4">
                Add a vending machine or create a delivery dispatch to track live markers here.
              </p>
            </div>
          </div>
        )}

        {/* Specialized Fleet Markers (#0F172A container + status ring + white icon) */}
        {visibleFleet.map((vehicle) => {
          const isSelected =
            selectedPin?.kind === 'fleet' && selectedPin.id === vehicle.id;
          const ringColor = RING_COLOR[vehicle.state];

          return (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => setSelectedPin({ kind: 'fleet', id: vehicle.id })}
              style={{
                left: `${vehicle.coords.x}%`,
                top: `${vehicle.coords.y}%`,
                borderColor: ringColor,
              }}
              aria-label={`Inspect fleet vehicle ${vehicle.vehicleCode}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 group flex items-center gap-1.5 rounded-full bg-[#0F172A] text-white border-[2.5px] px-2 py-1 elevation-3 transition-transform duration-150 cursor-pointer focus:outline-none ${
                isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'
              }`}
            >
              <Truck className="h-3.5 w-3.5 text-white shrink-0" />
              <span className="text-[11px] font-mono font-semibold tabular-nums-strict whitespace-nowrap">
                {vehicle.vehicleCode}
              </span>
            </button>
          );
        })}

        {/* Specialized Vending Hardware Markers */}
        {visibleHardware.map((unit) => {
          const isSelected =
            selectedPin?.kind === 'hardware' && selectedPin.id === unit.id;
          const ringColor = RING_COLOR[unit.state];

          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => setSelectedPin({ kind: 'hardware', id: unit.id })}
              style={{
                left: `${unit.coords.x}%`,
                top: `${unit.coords.y}%`,
                borderColor: ringColor,
              }}
              aria-label={`Inspect vending unit ${unit.id}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#0F172A] text-white border-[2.5px] flex items-center justify-center elevation-3 transition-transform duration-150 cursor-pointer focus:outline-none ${
                isSelected ? 'scale-115 z-20' : 'hover:scale-110 z-10'
              }`}
              title={`${unit.id} · ${unit.siteName}`}
            >
              <Cpu className="h-3.5 w-3.5 text-white" />
            </button>
          );
        })}

        {/* Selected Asset Elevation 3 Flyout Popover */}
        {(selectedFleet || selectedHardware) && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 bg-white border border-[#E2E8F0] rounded-xl p-3.5 elevation-3 z-30">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-semibold text-[#0F172A]">
                    {selectedFleet ? selectedFleet.vehicleCode : selectedHardware?.id}
                  </span>
                  {selectedFleet && (
                    <StatusBadge state={selectedFleet.state} label={selectedFleet.status} />
                  )}
                  {selectedHardware && (
                    <StatusBadge
                      state={selectedHardware.state}
                      label={selectedHardware.status}
                    />
                  )}
                </div>
                <p className="text-[12px] text-[#475569] mt-1 truncate">
                  {selectedFleet
                    ? `${selectedFleet.driverName} · ${selectedFleet.corridor}`
                    : selectedHardware?.siteName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPin(null)}
                aria-label="Close map callout"
                className="h-6 w-6 rounded-md flex items-center justify-center text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {selectedFleet && (
              <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[12px] tabular-nums-strict">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                      ETA
                    </div>
                    <div className="font-semibold text-[#0F172A]">
                      {selectedFleet.etaFormatted}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                      Cargo Temp
                    </div>
                    <div className="font-semibold text-[#0F172A]">
                      {selectedFleet.tempCelsius.toFixed(1)}°C
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                      Stops
                    </div>
                    <div className="font-semibold text-[#0F172A]">
                      {selectedFleet.stopsCompleted}/{selectedFleet.stopsTotal}
                    </div>
                  </div>
                </div>
                {onInspectDispatch && (
                  <OpsButton
                    size="compact"
                    variant="secondary"
                    onClick={() => onInspectDispatch(selectedFleet)}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Inspect
                  </OpsButton>
                )}
              </div>
            )}

            {selectedHardware && (
              <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[12px] tabular-nums-strict">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                      Stock
                    </div>
                    <div className="font-semibold text-[#0F172A]">
                      {selectedHardware.stockPct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                      Temp
                    </div>
                    <div
                      className={`font-semibold ${
                        selectedHardware.tempCelsius > 6
                          ? 'text-[#EF4444]'
                          : 'text-[#0F172A]'
                      }`}
                    >
                      {selectedHardware.tempCelsius.toFixed(1)}°C
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                      24h Rev
                    </div>
                    <div className="font-semibold text-[#0F172A]">
                      ${selectedHardware.revenue24h.toLocaleString()}
                    </div>
                  </div>
                </div>
                {onInspectHardware && (
                  <OpsButton
                    size="compact"
                    variant="secondary"
                    onClick={() => onInspectHardware(selectedHardware)}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Telemetry
                  </OpsButton>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
