export type UserRoleType = 'owner' | 'employee' | 'vendor';

export type NavSection =
  | 'overview'
  | 'dispatch'
  | 'hardware'
  | 'vendors'
  | 'incidents'
  | 'team'
  | 'activity';

export interface UserProfileRecord {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  organization?: string;
  phone?: string;
}

export interface UserRoleRecord {
  userId: string;
  orgId: string;
  displayName: string;
  role: UserRoleType;
  requestedRole: UserRoleType;
  vendorOrganization?: string;
  active: boolean;
}

export type OperationalState = 'operational' | 'warning' | 'critical' | 'vendor';

export type DispatchStatus =
  | 'En Route'
  | 'Loading'
  | 'Delayed'
  | 'Delivered'
  | 'Maintenance';

export type StopUrgency = 'Critical' | 'High' | 'Standard';

export type TrafficLevel = 'Clear' | 'Moderate' | 'Congested';

export type OptimizationStrategy =
  | 'balanced'
  | 'urgency-first'
  | 'traffic-avoidance'
  | 'sla-strict';

export interface RouteStop {
  id: string;
  location: string;
  eta: string;
  units: number;
  completed: boolean;
  urgency?: StopUrgency;
  trafficLevel?: TrafficLevel;
  delayMinutes?: number;
  driveMinutes?: number;
}

export interface FleetDispatch {
  id: string;
  vehicleCode: string;
  vehicleType: 'Cold-Chain Van' | 'Heavy Box Truck' | 'Rapid Service Van' | 'Partner Sprinter';
  driverName: string;
  driverInitials: string;
  routeCode: string;
  corridor: string;
  origin: string;
  destination: string;
  status: DispatchStatus;
  state: OperationalState;
  etaMinutes: number;
  etaFormatted: string;
  progressPct: number;
  cargoFillPct: number;
  tempCelsius: number;
  stopsCompleted: number;
  stopsTotal: number;
  isVendorContractor?: boolean;
  contractorName?: string;
  coords: { x: number; y: number }; // 0..100 normalized map schematic coords
  stops: RouteStop[];
  lastOptimizedAt?: string;
  minutesSaved?: number;
  optimizationStrategy?: OptimizationStrategy;
}

export type HardwareStatus = 'Online' | 'Low Stock' | 'Thermal Alert' | 'Offline' | 'Restocking';

export interface VendingSlot {
  bay: string;
  sku: string;
  product: string;
  current: number;
  capacity: number;
}

export interface VendingUnit {
  id: string;
  serial: string;
  model: string;
  siteName: string;
  zone: string;
  status: HardwareStatus;
  state: OperationalState;
  stockPct: number;
  tempCelsius: number;
  targetTempCelsius: number;
  cashlessStatus: 'Nominal' | 'Degraded' | 'Offline';
  compressorHealthPct: number;
  revenue24h: number;
  transactions24h: number;
  lastHeartbeat: string;
  assignedVendor: string;
  coords: { x: number; y: number };
  slots: VendingSlot[];
}

export type RestockStatus = 'Pending Approval' | 'Approved' | 'Dispatched' | 'Completed';

export interface VendorRestockOrder {
  id: string;
  vendorName: string;
  contractorLead: string;
  targetSite: string;
  unitId: string;
  zone: string;
  skuCount: number;
  palletWeightKg: number;
  estimatedCost: number;
  slaWindow: string;
  status: RestockStatus;
  priority: 'Standard' | 'Priority' | 'Urgent';
  createdAt: string;
  autoTriggered: boolean;
}

export type IncidentSeverity = 'Critical' | 'Warning' | 'Resolved';

export interface IncidentTimelineEntry {
  id: string;
  timestamp: string;
  author: string;
  message: string;
}

export interface OpsIncident {
  id: string;
  title: string;
  assetId: string;
  assetCategory: 'Vending Hardware' | 'Fleet Unit' | 'Cold-Chain' | 'Payment Gateway';
  zone: string;
  severity: IncidentSeverity;
  acknowledged: boolean;
  reportedAt: string;
  slaMinutesRemaining: number;
  assignedTech: string;
  description: string;
  timeline: IncidentTimelineEntry[];
}

export interface ThroughputPoint {
  label: string;
  fulfilled: number;
  target: number;
  uptimePct: number;
  vendorFulfilled: number;
}

export interface OpsToast {
  id: string;
  title: string;
  detail?: string;
  tone: 'indigo' | 'emerald' | 'amber' | 'rose' | 'teal';
}

export interface WorkspaceSettingsRecord {
  id: 'main';
  orgId: string;
  companyName: string;
  regionName: string;
  currencySymbol: string;
  updatedBy?: string;
}

export interface VendorPartnerRecord {
  id: string;
  orgId: string;
  name: string;
  lead: string;
  slaTargetPct: number;
  avgTurnaroundMin: number;
  contactNote?: string;
}

export type ActivityLogCategory =
  | 'dispatch'
  | 'hardware'
  | 'vendor'
  | 'incident'
  | 'account'
  | 'workspace';

export type ActivityLogSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface ActivityLogRecord {
  id: string;
  orgId: string;
  category: ActivityLogCategory;
  action: string;
  summary: string;
  details?: string;
  targetId: string;
  targetLabel: string;
  actorUid: string;
  actorName: string;
  actorRole: UserRoleType;
  severity: ActivityLogSeverity;
  createdAtMs: number;
}

