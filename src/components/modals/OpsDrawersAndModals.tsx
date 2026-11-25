import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Cpu,
  PackagePlus,
  Plus,
  RefreshCw,
  Route,
  Thermometer,
  Trash2,
  Truck,
  Warehouse,
} from 'lucide-react';
import {
  DispatchStatus,
  FleetDispatch,
  IncidentSeverity,
  StopUrgency,
  TrafficLevel,
  VendingSlot,
  VendingUnit,
  VendorPartnerRecord,
} from '../../types/ops';
import {
  OpsButton,
  OpsDrawer,
  OpsModal,
  StatusBadge,
} from '../ui/OpsPrimitives';

interface DispatchDrawerProps {
  dispatch: FleetDispatch | null;
  onClose: () => void;
  onToggleStop: (dispatchId: string, stopId: string) => void;
  onUpdateStatus: (dispatchId: string, status: DispatchStatus) => void;
  onOptimizeRoute: (dispatchId: string) => void;
  canDelete?: boolean;
  onDelete?: (dispatchId: string) => void;
}

export function DispatchDetailDrawer({
  dispatch,
  onClose,
  onToggleStop,
  onUpdateStatus,
  onOptimizeRoute,
  canDelete = false,
  onDelete,
}: DispatchDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [dispatch?.id]);

  return (
    <OpsDrawer
      open={Boolean(dispatch)}
      onClose={onClose}
      title={dispatch ? `${dispatch.vehicleCode} · ${dispatch.routeCode}` : ''}
      subtitle={dispatch?.corridor}
      headerBadge={
        dispatch ? <StatusBadge state={dispatch.state} label={dispatch.status} /> : null
      }
    >
      {dispatch && (
        <div className="space-y-6">
          {/* Telemetry Grid */}
          <div className="grid grid-cols-3 gap-3 tabular-nums-strict">
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
                Next ETA
              </div>
              <div className="text-[16px] font-bold text-[#0F172A] mt-1 font-mono">
                {dispatch.etaFormatted}
              </div>
            </div>
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
                Cargo Temp
              </div>
              <div
                className={`text-[16px] font-bold mt-1 font-mono ${
                  dispatch.tempCelsius > 8 && dispatch.vehicleType !== 'Rapid Service Van'
                    ? 'text-[#EF4444]'
                    : 'text-[#0F172A]'
                }`}
              >
                {dispatch.tempCelsius.toFixed(1)}°C
              </div>
            </div>
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
                Cargo Load
              </div>
              <div className="text-[16px] font-bold text-[#0F172A] mt-1 font-mono">
                {dispatch.cargoFillPct}%
              </div>
            </div>
          </div>

          {/* Driver & Vehicle Metadata */}
          <div className="rounded-xl border border-[#E2E8F0] p-4 space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Assigned Driver</span>
              <span className="font-semibold text-[#0F172A]">{dispatch.driverName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Vehicle Class</span>
              <span className="font-medium text-[#0F172A]">{dispatch.vehicleType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Origin Depot</span>
              <span className="font-medium text-[#0F172A]">{dispatch.origin}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Final Destination</span>
              <span className="font-medium text-[#0F172A] truncate max-w-[200px]">
                {dispatch.destination}
              </span>
            </div>
            {dispatch.lastOptimizedAt && (
              <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
                <span className="text-[#475569]">Last Optimized</span>
                <span className="font-mono text-[12px] font-semibold text-[#065F46] tabular-nums-strict">
                  {dispatch.lastOptimizedAt}
                  {dispatch.minutesSaved ? ` (-${dispatch.minutesSaved}m)` : ''}
                </span>
              </div>
            )}
            {dispatch.isVendorContractor && dispatch.contractorName && (
              <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
                <span className="text-[#475569]">Partner Contractor</span>
                <span className="font-semibold text-[#0D9488]">
                  {dispatch.contractorName}
                </span>
              </div>
            )}
          </div>

          {/* Route Status Actions */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Dispatch Status Controls
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['En Route', 'Delayed', 'Maintenance', 'Delivered'] as DispatchStatus[]).map(
                (st) => (
                  <OpsButton
                    key={st}
                    size="compact"
                    variant={dispatch.status === st ? 'primary' : 'secondary'}
                    onClick={() => onUpdateStatus(dispatch.id, st)}
                  >
                    {st}
                  </OpsButton>
                )
              )}
            </div>
          </div>

          {/* Interactive Stop Manifest */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] block">
                  Stop Manifest ({dispatch.stopsCompleted}/{dispatch.stopsTotal})
                </span>
                <span className="text-[11px] text-[#94A3B8]">Click stop to mark completed</span>
              </div>
              <OpsButton
                variant="secondary"
                size="compact"
                onClick={() => onOptimizeRoute(dispatch.id)}
                disabled={dispatch.status === 'Delivered'}
              >
                <Route className="h-3.5 w-3.5 text-[#4F46E5]" />
                Optimize Route
              </OpsButton>
            </div>

            <div className="space-y-2">
              {dispatch.stops.map((stop, idx) => (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => onToggleStop(dispatch.id, stop.id)}
                  className="w-full text-left rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {stop.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-[#CBD5E1] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div
                        className={`text-[13px] font-medium truncate ${
                          stop.completed
                            ? 'text-[#475569] line-through'
                            : 'text-[#0F172A]'
                        }`}
                      >
                        <span className="font-mono text-[11px] text-[#94A3B8] mr-1.5">
                          #{idx + 1}
                        </span>
                        {stop.location}
                      </div>
                      <div className="text-[11px] text-[#475569] tabular-nums-strict flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{stop.units} units</span>
                        {!stop.completed && stop.urgency && (
                          <>
                            <span>·</span>
                            <span
                              className={
                                stop.urgency === 'Critical'
                                  ? 'text-[#EF4444] font-semibold'
                                  : stop.urgency === 'High'
                                  ? 'text-[#92400E] font-medium'
                                  : ''
                              }
                            >
                              {stop.urgency}
                            </span>
                          </>
                        )}
                        {!stop.completed && stop.trafficLevel && (
                          <>
                            <span>·</span>
                            <span>{stop.trafficLevel} traffic</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[12px] font-semibold text-[#0F172A] tabular-nums-strict shrink-0">
                    {stop.eta}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Owner Delete Control */}
          {canDelete && onDelete && (
            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
              <span className="text-[12px] text-[#475569]">
                Remove this route permanently
              </span>
              {!confirmDelete ? (
                <OpsButton
                  variant="secondary"
                  size="compact"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-[#EF4444]" />
                  Delete Route
                </OpsButton>
              ) : (
                <div className="flex items-center gap-2">
                  <OpsButton
                    variant="secondary"
                    size="compact"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </OpsButton>
                  <OpsButton
                    variant="destructive"
                    size="compact"
                    onClick={() => {
                      onDelete(dispatch.id);
                      onClose();
                    }}
                  >
                    Confirm Delete
                  </OpsButton>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </OpsDrawer>
  );
}

interface HardwareDrawerProps {
  unit: VendingUnit | null;
  currencySymbol: string;
  showFinancials?: boolean;
  onClose: () => void;
  onReboot: (unitId: string) => void;
  onTriggerRestock: (unit: VendingUnit) => void;
  canDelete?: boolean;
  onDelete?: (unitId: string) => void;
}

export function HardwareDetailDrawer({
  unit,
  currencySymbol,
  showFinancials = true,
  onClose,
  onReboot,
  onTriggerRestock,
  canDelete = false,
  onDelete,
}: HardwareDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [unit?.id]);

  return (
    <OpsDrawer
      open={Boolean(unit)}
      onClose={onClose}
      title={unit ? `${unit.id} · ${unit.model}` : ''}
      subtitle={unit?.siteName}
      headerBadge={unit ? <StatusBadge state={unit.state} label={unit.status} /> : null}
    >
      {unit && (
        <div className="space-y-6">
          {/* Sensor Telemetry Strip */}
          <div className="grid grid-cols-3 gap-3 tabular-nums-strict">
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
                Chiller Temp
              </div>
              <div
                className={`text-[16px] font-bold mt-1 font-mono flex items-center gap-1 ${
                  unit.tempCelsius > unit.targetTempCelsius + 3
                    ? 'text-[#EF4444]'
                    : 'text-[#0F172A]'
                }`}
              >
                <Thermometer className="h-3.5 w-3.5" />
                {unit.tempCelsius.toFixed(1)}°C
              </div>
            </div>
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
                Fill Level
              </div>
              <div className="text-[16px] font-bold text-[#0F172A] mt-1 font-mono">
                {unit.stockPct}%
              </div>
            </div>
            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
                Compressor
              </div>
              <div className="text-[16px] font-bold text-[#0F172A] mt-1 font-mono">
                {unit.compressorHealthPct}%
              </div>
            </div>
          </div>

          {/* Remote Commands */}
          <div className="flex items-center gap-2.5">
            <OpsButton
              variant="secondary"
              className="flex-1"
              onClick={() => onReboot(unit.id)}
            >
              <RefreshCw className="h-4 w-4" />
              Soft Reboot Unit
            </OpsButton>
            <OpsButton
              variant="vendor"
              className="flex-1"
              onClick={() => onTriggerRestock(unit)}
            >
              <PackagePlus className="h-4 w-4" />
              Dispatch Restock
            </OpsButton>
          </div>

          {/* Device Identity */}
          <div className="rounded-xl border border-[#E2E8F0] p-4 space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Hardware Serial</span>
              <span className="font-mono font-semibold text-[#0F172A]">{unit.serial}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Cashless Terminal</span>
              <span className="font-medium text-[#0F172A]">{unit.cashlessStatus}</span>
            </div>
            {showFinancials && (
              <div className="flex items-center justify-between">
                <span className="text-[#475569]">24h Transactions</span>
                <span className="font-mono font-semibold text-[#0F172A] tabular-nums-strict">
                  {unit.transactions24h} ({currencySymbol}
                  {unit.revenue24h.toFixed(2)})
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Assigned Vendor</span>
              <span className="font-medium text-[#0D9488]">{unit.assignedVendor}</span>
            </div>
          </div>

          {/* Bay / Slot Inventory Matrix */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] mb-3">
              Slot-Level Inventory Telemetry
            </div>
            <div className="space-y-2.5">
              {unit.slots.map((slot) => {
                const pct = Math.round((slot.current / Math.max(slot.capacity, 1)) * 100);
                return (
                  <div
                    key={slot.bay}
                    className="rounded-xl border border-[#E2E8F0] p-3 bg-white"
                  >
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-[#4F46E5] mr-2">
                          {slot.bay}
                        </span>
                        <span className="font-medium text-[#0F172A]">{slot.product}</span>
                      </div>
                      <span className="font-mono text-[12px] font-semibold text-[#0F172A] tabular-nums-strict shrink-0">
                        {slot.current}/{slot.capacity}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct < 25
                            ? 'bg-[#EF4444]'
                            : pct < 50
                            ? 'bg-[#F59E0B]'
                            : 'bg-[#10B981]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Owner Delete Control */}
          {canDelete && onDelete && (
            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
              <span className="text-[12px] text-[#475569]">
                Remove this machine permanently
              </span>
              {!confirmDelete ? (
                <OpsButton
                  variant="secondary"
                  size="compact"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-[#EF4444]" />
                  Delete Machine
                </OpsButton>
              ) : (
                <div className="flex items-center gap-2">
                  <OpsButton
                    variant="secondary"
                    size="compact"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </OpsButton>
                  <OpsButton
                    variant="destructive"
                    size="compact"
                    onClick={() => {
                      onDelete(unit.id);
                      onClose();
                    }}
                  >
                    Confirm Delete
                  </OpsButton>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </OpsDrawer>
  );
}

// =========================================================================
// Create Fleet Dispatch Modal (Zero Hardcoded Demo Defaults + Custom Stops)
// =========================================================================
export interface CreateDispatchDraftStop {
  location: string;
  units: number;
  urgency: StopUrgency;
  trafficLevel: TrafficLevel;
}

interface CreateDispatchModalProps {
  open: boolean;
  onClose: () => void;
  teamMembers: string[];
  vendorPartners: VendorPartnerRecord[];
  onCreate: (payload: {
    vehicleCode: string;
    vehicleType: FleetDispatch['vehicleType'];
    driverName: string;
    origin: string;
    corridor: string;
    destination: string;
    tempCelsius: number;
    cargoFillPct: number;
    isVendorContractor: boolean;
    contractorName?: string;
    stops: CreateDispatchDraftStop[];
  }) => void;
}

export function CreateDispatchModal({
  open,
  onClose,
  teamMembers,
  vendorPartners,
  onCreate,
}: CreateDispatchModalProps) {
  const [vehicleCode, setVehicleCode] = useState('');
  const [vehicleType, setVehicleType] =
    useState<FleetDispatch['vehicleType']>('Cold-Chain Van');
  const [driverName, setDriverName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [corridor, setCorridor] = useState('');
  const [tempCelsius, setTempCelsius] = useState('4.0');
  const [cargoFillPct, setCargoFillPct] = useState('80');
  const [isVendor, setIsVendor] = useState(false);
  const [contractorName, setContractorName] = useState('');
  const [stops, setStops] = useState<CreateDispatchDraftStop[]>([
    { location: '', units: 60, urgency: 'Standard', trafficLevel: 'Clear' },
  ]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
    }
  }, [open]);

  const addStop = () => {
    if (stops.length >= 10) return;
    setStops((prev) => [
      ...prev,
      { location: '', units: 40, urgency: 'Standard', trafficLevel: 'Clear' },
    ]);
  };

  const updateStop = (index: number, patch: Partial<CreateDispatchDraftStop>) => {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const removeStop = (index: number) => {
    if (stops.length <= 1) return;
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setVehicleCode('');
    setDriverName('');
    setOrigin('');
    setDestination('');
    setCorridor('');
    setTempCelsius('4.0');
    setCargoFillPct('80');
    setIsVendor(false);
    setContractorName('');
    setStops([{ location: '', units: 60, urgency: 'Standard', trafficLevel: 'Clear' }]);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedVehicle = vehicleCode.trim().toUpperCase();
    const cleanedDriver = driverName.trim();
    const cleanedDest = destination.trim();
    const cleanedOrigin = origin.trim();
    const resolvedContractor = isVendor
      ? contractorName.trim() || vendorPartners[0]?.name || ''
      : '';

    if (!cleanedVehicle || !cleanedDriver || !cleanedDest) {
      setError('Vehicle ID, assigned driver, and primary destination are required.');
      return;
    }
    if (isVendor && !resolvedContractor) {
      setError('Please enter or select a vendor partner company.');
      return;
    }

    const validStops = stops
      .map((s) => ({ ...s, location: s.location.trim() }))
      .filter((s) => s.location.length > 0);

    const finalStops: CreateDispatchDraftStop[] =
      validStops.length > 0
        ? validStops
        : [
            {
              location: cleanedDest,
              units: Math.max(1, Number(stops[0]?.units) || 60),
              urgency: stops[0]?.urgency ?? 'Standard',
              trafficLevel: stops[0]?.trafficLevel ?? 'Clear',
            },
          ];

    onCreate({
      vehicleCode: cleanedVehicle,
      vehicleType: isVendor ? 'Partner Sprinter' : vehicleType,
      driverName: cleanedDriver,
      origin: cleanedOrigin || 'Main Depot',
      corridor:
        corridor.trim() || `${cleanedOrigin || 'Main Depot'} → ${cleanedDest}`,
      destination: cleanedDest,
      tempCelsius: Number.isFinite(Number(tempCelsius)) ? Number(tempCelsius) : 4.0,
      cargoFillPct: Math.max(0, Math.min(100, Number(cargoFillPct) || 80)),
      isVendorContractor: isVendor,
      contractorName: isVendor ? resolvedContractor : undefined,
      stops: finalStops,
    });
    resetForm();
    onClose();
  };

  return (
    <OpsModal
      open={open}
      onClose={onClose}
      title="Create Delivery Dispatch"
      subtitle="Enter your real vehicle, driver, and delivery stops"
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-[12px] font-medium text-[#991B1B]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Vehicle ID / Plate *
            </label>
            <input
              type="text"
              value={vehicleCode}
              onChange={(e) => setVehicleCode(e.target.value)}
              maxLength={40}
              className={`ops-input w-full px-3 font-mono text-[13px] ${
                error && !vehicleCode.trim() ? 'ops-input-error' : ''
              }`}
              placeholder="e.g. VAN-01 or TRUCK-104"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Vehicle Class
            </label>
            <select
              value={vehicleType}
              onChange={(e) =>
                setVehicleType(e.target.value as FleetDispatch['vehicleType'])
              }
              className="ops-input w-full px-3 text-[13px]"
            >
              <option value="Cold-Chain Van">Cold-Chain Van</option>
              <option value="Heavy Box Truck">Heavy Box Truck</option>
              <option value="Rapid Service Van">Rapid Service Van</option>
              <option value="Partner Sprinter">Partner Sprinter</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Assigned Driver *
            </label>
            <input
              type="text"
              list="dispatch-driver-list"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              maxLength={100}
              placeholder="Type driver name"
              className={`ops-input w-full px-3 text-[13px] ${
                error && !driverName.trim() ? 'ops-input-error' : ''
              }`}
            />
            <datalist id="dispatch-driver-list">
              {teamMembers.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Dispatch Channel
            </label>
            <select
              value={isVendor ? 'vendor' : 'internal'}
              onChange={(e) => {
                const nextVendor = e.target.value === 'vendor';
                setIsVendor(nextVendor);
                if (nextVendor && !contractorName && vendorPartners[0]) {
                  setContractorName(vendorPartners[0].name);
                }
              }}
              className="ops-input w-full px-3 text-[13px]"
            >
              <option value="internal">Internal Fleet</option>
              <option value="vendor">Third-Party Vendor Partner</option>
            </select>
          </div>
        </div>

        {isVendor && (
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Vendor Partner Organization *
            </label>
            <input
              type="text"
              list="dispatch-vendor-list"
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              maxLength={120}
              placeholder="Select or type vendor company name"
              className="ops-input w-full px-3 text-[13px]"
            />
            <datalist id="dispatch-vendor-list">
              {vendorPartners.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Origin / Starting Depot
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              maxLength={120}
              className="ops-input w-full px-3 text-[13px]"
              placeholder="e.g. Warehouse North"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Primary Destination *
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              maxLength={120}
              className={`ops-input w-full px-3 text-[13px] ${
                error && !destination.trim() ? 'ops-input-error' : ''
              }`}
              placeholder="e.g. Downtown Office Tower"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Cargo Temp (°C)
            </label>
            <input
              type="number"
              step="0.5"
              min={-30}
              max={60}
              value={tempCelsius}
              onChange={(e) => setTempCelsius(e.target.value)}
              className="ops-input w-full px-3 font-mono text-[13px]"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Cargo Load (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={cargoFillPct}
              onChange={(e) => setCargoFillPct(e.target.value)}
              className="ops-input w-full px-3 font-mono text-[13px]"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Route Label (Optional)
            </label>
            <input
              type="text"
              value={corridor}
              onChange={(e) => setCorridor(e.target.value)}
              maxLength={160}
              className="ops-input w-full px-3 text-[13px]"
              placeholder="Auto-generated if blank"
            />
          </div>
        </div>

        {/* Custom Delivery Stops Builder */}
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[12px] font-semibold text-[#0F172A]">
                Delivery Stops ({stops.length})
              </div>
              <div className="text-[11px] text-[#475569]">
                Add stops for live tracking and Route Optimizer calculations
              </div>
            </div>
            <OpsButton
              type="button"
              variant="secondary"
              size="compact"
              onClick={addStop}
              disabled={stops.length >= 10}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Stop
            </OpsButton>
          </div>

          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-0.5">
            {stops.map((stop, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center bg-white border border-[#E2E8F0] rounded-lg p-2"
              >
                <input
                  type="text"
                  value={stop.location}
                  onChange={(e) => updateStop(idx, { location: e.target.value })}
                  placeholder={`Stop #${idx + 1} location`}
                  className="col-span-12 sm:col-span-5 h-8 rounded-md border border-[#CBD5E1] px-2.5 text-[12px] text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={stop.units}
                  onChange={(e) =>
                    updateStop(idx, { units: Math.max(1, Number(e.target.value) || 1) })
                  }
                  title="Units to deliver"
                  className="col-span-4 sm:col-span-2 h-8 rounded-md border border-[#CBD5E1] px-2 font-mono text-[12px] text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
                <select
                  value={stop.urgency}
                  onChange={(e) =>
                    updateStop(idx, { urgency: e.target.value as StopUrgency })
                  }
                  className="col-span-4 sm:col-span-2 h-8 rounded-md border border-[#CBD5E1] px-1.5 text-[11px] text-[#0F172A]"
                >
                  <option value="Standard">Standard</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
                <select
                  value={stop.trafficLevel}
                  onChange={(e) =>
                    updateStop(idx, { trafficLevel: e.target.value as TrafficLevel })
                  }
                  className="col-span-3 sm:col-span-2 h-8 rounded-md border border-[#CBD5E1] px-1.5 text-[11px] text-[#0F172A]"
                >
                  <option value="Clear">Clear</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Congested">Congested</option>
                </select>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeStop(idx)}
                    disabled={stops.length <= 1}
                    aria-label="Remove stop"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
          <OpsButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </OpsButton>
          <OpsButton type="submit" variant={isVendor ? 'vendor' : 'primary'}>
            <Truck className="h-4 w-4" />
            Launch Dispatch
          </OpsButton>
        </div>
      </form>
    </OpsModal>
  );
}

// =========================================================================
// Create Vending Machine / Hardware Modal (Owner-only)
// =========================================================================
interface CreateHardwareModalProps {
  open: boolean;
  onClose: () => void;
  vendorPartners: VendorPartnerRecord[];
  onCreate: (payload: {
    id: string;
    serial: string;
    model: string;
    siteName: string;
    zone: string;
    targetTempCelsius: number;
    tempCelsius: number;
    assignedVendor: string;
    slots: VendingSlot[];
  }) => void;
}

export function CreateHardwareModal({
  open,
  onClose,
  vendorPartners,
  onCreate,
}: CreateHardwareModalProps) {
  const [unitId, setUnitId] = useState('');
  const [serial, setSerial] = useState('');
  const [model, setModel] = useState('');
  const [siteName, setSiteName] = useState('');
  const [zone, setZone] = useState('');
  const [targetTemp, setTargetTemp] = useState('4.0');
  const [currentTemp, setCurrentTemp] = useState('4.2');
  const [assignedVendor, setAssignedVendor] = useState('');
  const [slots, setSlots] = useState<VendingSlot[]>([
    { bay: 'A1', sku: 'SKU-01', product: '', current: 20, capacity: 24 },
  ]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
    }
  }, [open]);

  const addSlot = () => {
    if (slots.length >= 12) return;
    const nextIdx = slots.length + 1;
    setSlots((prev) => [
      ...prev,
      {
        bay: `A${nextIdx}`,
        sku: `SKU-0${nextIdx}`,
        product: '',
        current: 20,
        capacity: 24,
      },
    ]);
  };

  const updateSlot = (idx: number, patch: Partial<VendingSlot>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeSlot = (idx: number) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setUnitId('');
    setSerial('');
    setModel('');
    setSiteName('');
    setZone('');
    setTargetTemp('4.0');
    setCurrentTemp('4.2');
    setAssignedVendor('');
    setSlots([{ bay: 'A1', sku: 'SKU-01', product: '', current: 20, capacity: 24 }]);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = unitId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
    if (!cleanId || !siteName.trim() || !zone.trim()) {
      setError('Machine ID, site/location name, and zone are required.');
      return;
    }

    const cleanedSlots: VendingSlot[] = slots.map((s, idx) => ({
      bay: s.bay.trim() || `A${idx + 1}`,
      sku: s.sku.trim() || `SKU-${idx + 1}`,
      product: s.product.trim() || `Bay ${s.bay.trim() || `A${idx + 1}`} Product`,
      capacity: Math.max(1, Number(s.capacity) || 20),
      current: Math.max(
        0,
        Math.min(Math.max(1, Number(s.capacity) || 20), Number(s.current) || 0)
      ),
    }));

    onCreate({
      id: cleanId,
      serial: serial.trim() || `SN-${cleanId}`,
      model: model.trim() || 'Smart Kiosk',
      siteName: siteName.trim(),
      zone: zone.trim(),
      targetTempCelsius: Number.isFinite(Number(targetTemp)) ? Number(targetTemp) : 4.0,
      tempCelsius: Number.isFinite(Number(currentTemp)) ? Number(currentTemp) : 4.2,
      assignedVendor:
        assignedVendor.trim() || vendorPartners[0]?.name || 'Internal Team',
      slots: cleanedSlots,
    });
    resetForm();
    onClose();
  };

  return (
    <OpsModal
      open={open}
      onClose={onClose}
      title="Register Vending Machine"
      subtitle="Add a real vending machine or kiosk with its location and product bays"
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-[12px] font-medium text-[#991B1B]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Machine ID *
            </label>
            <input
              type="text"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              maxLength={40}
              placeholder="e.g. KIOSK-01"
              className={`ops-input w-full px-3 font-mono text-[13px] ${
                error && !unitId.trim() ? 'ops-input-error' : ''
              }`}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Hardware Serial
            </label>
            <input
              type="text"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              maxLength={60}
              placeholder="Optional"
              className="ops-input w-full px-3 font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Machine Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              maxLength={80}
              placeholder="e.g. Chiller Pro 400"
              className="ops-input w-full px-3 text-[13px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Site / Building Location *
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              maxLength={140}
              placeholder="e.g. Central Station Lobby"
              className={`ops-input w-full px-3 text-[13px] ${
                error && !siteName.trim() ? 'ops-input-error' : ''
              }`}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Zone / Area *
            </label>
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              maxLength={80}
              placeholder="e.g. Downtown Core"
              className={`ops-input w-full px-3 text-[13px] ${
                error && !zone.trim() ? 'ops-input-error' : ''
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Target Temp (°C)
            </label>
            <input
              type="number"
              step="0.5"
              min={-30}
              max={30}
              value={targetTemp}
              onChange={(e) => setTargetTemp(e.target.value)}
              className="ops-input w-full px-3 font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Current Temp (°C)
            </label>
            <input
              type="number"
              step="0.5"
              min={-30}
              max={60}
              value={currentTemp}
              onChange={(e) => setCurrentTemp(e.target.value)}
              className="ops-input w-full px-3 font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Assigned Vendor
            </label>
            <input
              type="text"
              list="hw-vendor-list"
              value={assignedVendor}
              onChange={(e) => setAssignedVendor(e.target.value)}
              maxLength={120}
              placeholder="Internal Team or Vendor"
              className="ops-input w-full px-3 text-[13px]"
            />
            <datalist id="hw-vendor-list">
              <option value="Internal Team" />
              {vendorPartners.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Product Bays / Slots */}
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[12px] font-semibold text-[#0F172A]">
                Product Bays / Inventory Slots ({slots.length})
              </div>
              <div className="text-[11px] text-[#475569]">
                Stock percentage is calculated automatically from these bays
              </div>
            </div>
            <OpsButton
              type="button"
              variant="secondary"
              size="compact"
              onClick={addSlot}
              disabled={slots.length >= 12}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Bay
            </OpsButton>
          </div>

          <div className="space-y-2 max-h-[170px] overflow-y-auto pr-0.5">
            {slots.map((slot, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center bg-white border border-[#E2E8F0] rounded-lg p-2"
              >
                <input
                  type="text"
                  value={slot.bay}
                  onChange={(e) => updateSlot(idx, { bay: e.target.value })}
                  placeholder="A1"
                  className="col-span-2 h-8 rounded-md border border-[#CBD5E1] px-2 font-mono text-[12px] text-[#0F172A]"
                />
                <input
                  type="text"
                  value={slot.product}
                  onChange={(e) => updateSlot(idx, { product: e.target.value })}
                  placeholder="Product name (e.g. Sparkling Water)"
                  className="col-span-5 h-8 rounded-md border border-[#CBD5E1] px-2 text-[12px] text-[#0F172A]"
                />
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={slot.current}
                  onChange={(e) => updateSlot(idx, { current: Number(e.target.value) })}
                  title="Current units in bay"
                  className="col-span-2 h-8 rounded-md border border-[#CBD5E1] px-2 font-mono text-[12px] text-[#0F172A]"
                />
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={slot.capacity}
                  onChange={(e) => updateSlot(idx, { capacity: Number(e.target.value) })}
                  title="Max bay capacity"
                  className="col-span-2 h-8 rounded-md border border-[#CBD5E1] px-2 font-mono text-[12px] text-[#0F172A]"
                />
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeSlot(idx)}
                    disabled={slots.length <= 1}
                    aria-label="Remove bay"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
          <OpsButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </OpsButton>
          <OpsButton type="submit" variant="primary">
            <Cpu className="h-4 w-4" />
            Save Machine
          </OpsButton>
        </div>
      </form>
    </OpsModal>
  );
}

// =========================================================================
// Create Vendor Partner Modal (Owner-only)
// =========================================================================
interface CreateVendorPartnerModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    lead: string;
    slaTargetPct: number;
    avgTurnaroundMin: number;
    contactNote: string;
  }) => void;
}

export function CreateVendorPartnerModal({
  open,
  onClose,
  onCreate,
}: CreateVendorPartnerModalProps) {
  const [name, setName] = useState('');
  const [lead, setLead] = useState('');
  const [slaTargetPct, setSlaTargetPct] = useState('95');
  const [avgTurnaroundMin, setAvgTurnaroundMin] = useState('45');
  const [contactNote, setContactNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) setError('');
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !lead.trim()) {
      setError('Vendor company name and dispatch lead are required.');
      return;
    }
    onCreate({
      name: name.trim(),
      lead: lead.trim(),
      slaTargetPct: Math.max(0, Math.min(100, Number(slaTargetPct) || 95)),
      avgTurnaroundMin: Math.max(1, Math.min(1440, Number(avgTurnaroundMin) || 45)),
      contactNote: contactNote.trim(),
    });
    setName('');
    setLead('');
    setSlaTargetPct('95');
    setAvgTurnaroundMin('45');
    setContactNote('');
    onClose();
  };

  return (
    <OpsModal
      open={open}
      onClose={onClose}
      title="Add Vendor / Restock Partner"
      subtitle="Register a supplier or delivery partner for your restocking workflow"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-[12px] font-medium text-[#991B1B]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
            Vendor Company Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="e.g. FreshLine Supply Co."
            className={`ops-input w-full px-3 text-[13px] ${
              error && !name.trim() ? 'ops-input-error' : ''
            }`}
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
            Primary Contact / Dispatch Lead *
          </label>
          <input
            type="text"
            value={lead}
            onChange={(e) => setLead(e.target.value)}
            maxLength={80}
            placeholder="e.g. Jordan Patel"
            className={`ops-input w-full px-3 text-[13px] ${
              error && !lead.trim() ? 'ops-input-error' : ''
            }`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Target SLA (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={slaTargetPct}
              onChange={(e) => setSlaTargetPct(e.target.value)}
              className="ops-input w-full px-3 font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Avg Turnaround (min)
            </label>
            <input
              type="number"
              min={5}
              max={1440}
              value={avgTurnaroundMin}
              onChange={(e) => setAvgTurnaroundMin(e.target.value)}
              className="ops-input w-full px-3 font-mono text-[13px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
            Service / Contact Note (Optional)
          </label>
          <input
            type="text"
            value={contactNote}
            onChange={(e) => setContactNote(e.target.value)}
            maxLength={200}
            placeholder="e.g. Refrigerated snacks & beverages, Mon–Sat"
            className="ops-input w-full px-3 text-[13px]"
          />
        </div>

        <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
          <OpsButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </OpsButton>
          <OpsButton type="submit" variant="vendor">
            <Warehouse className="h-4 w-4" />
            Save Partner
          </OpsButton>
        </div>
      </form>
    </OpsModal>
  );
}

// =========================================================================
// Create Restock Order Modal (Uses Real Machines & Real Vendor Partners)
// =========================================================================
interface CreateRestockModalProps {
  open: boolean;
  onClose: () => void;
  hardwareUnits: VendingUnit[];
  vendorPartners: VendorPartnerRecord[];
  currencySymbol: string;
  canAddHardware?: boolean;
  onRequestAddHardware?: () => void;
  onCreate: (payload: {
    vendorName: string;
    contractorLead: string;
    unitId: string;
    skuCount: number;
    estimatedCost: number;
    priority: 'Standard' | 'Priority' | 'Urgent';
  }) => void;
}

export function CreateRestockModal({
  open,
  onClose,
  hardwareUnits,
  vendorPartners,
  currencySymbol,
  canAddHardware = false,
  onRequestAddHardware,
  onCreate,
}: CreateRestockModalProps) {
  const [unitId, setUnitId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [skuCount, setSkuCount] = useState('60');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [priority, setPriority] = useState<'Standard' | 'Priority' | 'Urgent'>(
    'Priority'
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setUnitId((prev) =>
        hardwareUnits.some((u) => u.id === prev) ? prev : hardwareUnits[0]?.id ?? ''
      );
      setVendorName((prev) => prev || vendorPartners[0]?.name || '');
    }
  }, [open, hardwareUnits, vendorPartners]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId) {
      setError('Select a registered vending machine first.');
      return;
    }
    const cleanVendor = vendorName.trim();
    if (!cleanVendor) {
      setError('Enter or select a vendor partner name.');
      return;
    }
    const matchedPartner = vendorPartners.find(
      (p) => p.name.toLowerCase() === cleanVendor.toLowerCase()
    );
    const qty = Math.max(1, Number(skuCount) || 60);
    const parsedCost =
      estimatedCost.trim() !== '' && Number.isFinite(Number(estimatedCost))
        ? Math.max(0, Number(estimatedCost))
        : Math.round(qty * 10);

    onCreate({
      vendorName: cleanVendor,
      contractorLead: matchedPartner?.lead ?? 'Partner Dispatch',
      unitId,
      skuCount: qty,
      estimatedCost: parsedCost,
      priority,
    });
    setEstimatedCost('');
    onClose();
  };

  return (
    <OpsModal
      open={open}
      onClose={onClose}
      title="Create Vendor Restock Order"
      subtitle="Submit a restocking batch for one of your registered vending machines"
    >
      {hardwareUnits.length === 0 ? (
        <div className="py-6 text-center space-y-3">
          <Cpu className="h-9 w-9 text-[#94A3B8] mx-auto" />
          <div className="text-[15px] font-semibold text-[#0F172A]">
            Add a Vending Machine First
          </div>
          <p className="text-[13px] text-[#475569] max-w-sm mx-auto">
            Restock orders link directly to a registered vending machine so stock levels update automatically once fulfilled.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <OpsButton variant="secondary" onClick={onClose}>
              Close
            </OpsButton>
            {canAddHardware && onRequestAddHardware && (
              <OpsButton
                variant="primary"
                onClick={() => {
                  onClose();
                  onRequestAddHardware();
                }}
              >
                <Plus className="h-4 w-4" />
                Register First Machine
              </OpsButton>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-[12px] font-medium text-[#991B1B]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Target Vending Machine *
            </label>
            <select
              value={unitId}
              onChange={(e) => {
                setUnitId(e.target.value);
                const selectedUnit = hardwareUnits.find((u) => u.id === e.target.value);
                if (selectedUnit && selectedUnit.assignedVendor && !vendorName) {
                  setVendorName(selectedUnit.assignedVendor);
                }
              }}
              className="ops-input w-full px-3 text-[13px]"
            >
              {hardwareUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id} — {u.siteName} ({u.stockPct}% full)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Vendor Partner *
            </label>
            <input
              type="text"
              list="restock-vendor-list"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              maxLength={120}
              placeholder="Select or type vendor company"
              className="ops-input w-full px-3 text-[13px]"
            />
            <datalist id="restock-vendor-list">
              {vendorPartners.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
                Units (SKUs)
              </label>
              <input
                type="number"
                min={1}
                max={5000}
                value={skuCount}
                onChange={(e) => setSkuCount(e.target.value)}
                className="ops-input w-full px-3 font-mono text-[13px] tabular-nums-strict"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
                Est. Cost ({currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                max={500000}
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="Auto"
                className="ops-input w-full px-3 font-mono text-[13px] tabular-nums-strict"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
                SLA Priority
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'Standard' | 'Priority' | 'Urgent')
                }
                className="ops-input w-full px-3 text-[13px]"
              >
                <option value="Standard">Standard (4h)</option>
                <option value="Priority">Priority (2h)</option>
                <option value="Urgent">Urgent (60m)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
            <OpsButton type="button" variant="secondary" onClick={onClose}>
              Cancel
            </OpsButton>
            <OpsButton type="submit" variant="vendor">
              <PackagePlus className="h-4 w-4" />
              Create Restock Order
            </OpsButton>
          </div>
        </form>
      )}
    </OpsModal>
  );
}

// =========================================================================
// Create Incident Modal (Zero Hardcoded Demo Defaults)
// =========================================================================
interface CreateIncidentModalProps {
  open: boolean;
  onClose: () => void;
  hardwareUnits: VendingUnit[];
  dispatches: FleetDispatch[];
  teamMembers: string[];
  onCreate: (payload: {
    title: string;
    assetId: string;
    assetCategory: 'Vending Hardware' | 'Fleet Unit' | 'Cold-Chain' | 'Payment Gateway';
    zone: string;
    severity: IncidentSeverity;
    assignedTech: string;
    description: string;
  }) => void;
}

export function CreateIncidentModal({
  open,
  onClose,
  hardwareUnits,
  dispatches,
  teamMembers,
  onCreate,
}: CreateIncidentModalProps) {
  const [title, setTitle] = useState('');
  const [assetId, setAssetId] = useState('');
  const [assetCategory, setAssetCategory] = useState<
    'Vending Hardware' | 'Fleet Unit' | 'Cold-Chain' | 'Payment Gateway'
  >('Vending Hardware');
  const [zone, setZone] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('Critical');
  const [assignedTech, setAssignedTech] = useState('Unassigned');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) setError('');
  }, [open]);

  const handleSelectKnownAsset = (value: string) => {
    setAssetId(value);
    const hw = hardwareUnits.find((u) => u.id === value);
    if (hw) {
      setZone(hw.zone);
      setAssetCategory('Vending Hardware');
      return;
    }
    const dsp = dispatches.find((d) => d.vehicleCode === value || d.id === value);
    if (dsp) {
      setZone(dsp.destination);
      setAssetCategory('Fleet Unit');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedAsset = assetId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
    if (!title.trim() || !cleanedAsset) {
      setError('Incident headline and target asset ID are required.');
      return;
    }
    setError('');
    onCreate({
      title: title.trim(),
      assetId: cleanedAsset,
      assetCategory,
      zone: zone.trim() || 'General',
      severity,
      assignedTech: assignedTech.trim() || 'Unassigned',
      description:
        description.trim() || 'Field incident logged by operations team.',
    });
    setTitle('');
    setAssetId('');
    setZone('');
    setAssignedTech('Unassigned');
    setDescription('');
    onClose();
  };

  return (
    <OpsModal
      open={open}
      onClose={onClose}
      title="Log Field Incident"
      subtitle="Report a hardware fault, temperature excursion, or route disruption"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-[12px] font-medium text-[#991B1B]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
            Incident Headline *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder="e.g. Chiller temp rising or Payment terminal offline"
            className={`ops-input w-full px-3 text-[13px] ${
              error && !title.trim() ? 'ops-input-error' : ''
            }`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Asset ID *
            </label>
            <input
              type="text"
              list="incident-asset-list"
              value={assetId}
              onChange={(e) => handleSelectKnownAsset(e.target.value)}
              maxLength={60}
              placeholder="Pick machine/vehicle or type ID"
              className={`ops-input w-full px-3 font-mono text-[13px] ${
                error && !assetId.trim() ? 'ops-input-error' : ''
              }`}
            />
            <datalist id="incident-asset-list">
              {hardwareUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.siteName}
                </option>
              ))}
              {dispatches.map((d) => (
                <option key={d.id} value={d.vehicleCode}>
                  {d.corridor}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Category
            </label>
            <select
              value={assetCategory}
              onChange={(e) =>
                setAssetCategory(
                  e.target.value as
                    | 'Vending Hardware'
                    | 'Fleet Unit'
                    | 'Cold-Chain'
                    | 'Payment Gateway'
                )
              }
              className="ops-input w-full px-3 text-[13px]"
            >
              <option value="Vending Hardware">Vending Hardware</option>
              <option value="Fleet Unit">Fleet Unit</option>
              <option value="Cold-Chain">Cold-Chain</option>
              <option value="Payment Gateway">Payment Gateway</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Severity
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
              className="ops-input w-full px-3 text-[13px]"
            >
              <option value="Critical">Critical</option>
              <option value="Warning">Warning</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Zone / Site
            </label>
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              maxLength={80}
              placeholder="e.g. North Wing"
              className="ops-input w-full px-3 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
              Assign Tech
            </label>
            <input
              type="text"
              list="incident-tech-list"
              value={assignedTech}
              onChange={(e) => setAssignedTech(e.target.value)}
              maxLength={100}
              placeholder="Unassigned"
              className="ops-input w-full px-3 text-[13px]"
            />
            <datalist id="incident-tech-list">
              <option value="Unassigned" />
              {teamMembers.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#0F172A] mb-1">
            Operational Context
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="Describe what happened, readings observed, or parts needed..."
            className="w-full rounded-lg bg-white border border-[#CBD5E1] p-3 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:shadow-[0_0_0_1px_#4F46E5,0_0_0_4px_rgba(79,70,229,0.15)]"
          />
        </div>

        <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
          <OpsButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </OpsButton>
          <OpsButton
            type="submit"
            variant={severity === 'Critical' ? 'destructive' : 'primary'}
          >
            Log Incident
          </OpsButton>
        </div>
      </form>
    </OpsModal>
  );
}
