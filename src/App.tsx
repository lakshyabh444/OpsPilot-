/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowRight, CheckCircle2, Loader2, Lock, LogOut, ShieldAlert, X } from 'lucide-react';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import {
  CreateDispatchDraftStop,
  CreateDispatchModal,
  CreateHardwareModal,
  CreateIncidentModal,
  CreateRestockModal,
  CreateVendorPartnerModal,
  DispatchDetailDrawer,
  HardwareDetailDrawer,
} from './components/modals/OpsDrawersAndModals';
import { RouteOptimizerModal } from './components/modals/RouteOptimizerModal';
import { WorkspaceSettingsModal } from './components/modals/WorkspaceSettingsModal';
import { ActivityLogView } from './components/views/ActivityLogView';
import { DispatchView } from './components/views/DispatchView';
import { HardwareView } from './components/views/HardwareView';
import { IncidentsView } from './components/views/IncidentsView';
import { OverviewView } from './components/views/OverviewView';
import { TeamAccessView } from './components/views/TeamAccessView';
import { VendorPortalView } from './components/views/VendorPortalView';
import {
  auth,
  BOOTSTRAPPED_OWNER_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  ORG_ID,
} from './firebase';
import {
  clearAllOperationalData,
  createDispatchDoc,
  createHardwareUnitDoc,
  createIncidentDoc,
  createRestockOrderDoc,
  createVendorPartnerDoc,
  deleteDispatchDoc,
  deleteHardwareUnitDoc,
  deleteIncidentDoc,
  deleteRestockOrderDoc,
  deleteVendorPartnerDoc,
  ensureUserAccountRecords,
  recordActivityLog,
  saveWorkspaceSettingsDoc,
  seedSampleDemoData,
  updateDispatchOptimizationDoc,
  updateDispatchProgressDoc,
  updateHardwareUnitDoc,
  updateIncidentDoc,
  updateRestockOrderStatusDoc,
  updateTeamMemberRole,
} from './services/opsFirestore';
import {
  ActivityLogCategory,
  ActivityLogRecord,
  ActivityLogSeverity,
  DispatchStatus,
  FleetDispatch,
  IncidentSeverity,
  NavSection,
  OperationalState,
  OpsIncident,
  OpsToast,
  RestockStatus,
  UserProfileRecord,
  UserRoleRecord,
  UserRoleType,
  VendingSlot,
  VendingUnit,
  VendorPartnerRecord,
  VendorRestockOrder,
  WorkspaceSettingsRecord,
} from './types/ops';
import { RouteOptimizationResult } from './utils/routeOptimizer';

const ROLE_ALLOWED_SECTIONS: Record<UserRoleType, NavSection[]> = {
  owner: ['overview', 'dispatch', 'hardware', 'vendors', 'incidents', 'team', 'activity'],
  employee: ['dispatch', 'hardware', 'incidents'],
  vendor: ['vendors', 'dispatch'],
};

const PORTAL_HOME_SECTION: Record<UserRoleType, NavSection> = {
  owner: 'overview',
  employee: 'dispatch',
  vendor: 'vendors',
};

const PORTAL_HASH: Record<UserRoleType, string> = {
  owner: '#owner',
  employee: '#staff',
  vendor: '#vendor',
};

const PORTAL_TITLE: Record<UserRoleType, string> = {
  owner: 'Business Owner Portal',
  employee: 'Staff / Employee Portal',
  vendor: 'Vendor Partner Portal',
};

const PORTAL_STORAGE_KEY = 'opspilot_selected_portal';
const VENDOR_ORG_STORAGE_KEY = 'opspilot_vendor_org';

function parsePortalFromHash(): UserRoleType {
  if (typeof window === 'undefined') return 'owner';
  const hash = window.location.hash.toLowerCase();
  if (hash === '#staff' || hash === '#employee') return 'employee';
  if (hash === '#vendor') return 'vendor';
  if (hash === '#owner') return 'owner';
  try {
    const saved = window.sessionStorage.getItem(PORTAL_STORAGE_KEY);
    if (saved === 'owner' || saved === 'employee' || saved === 'vendor') {
      return saved;
    }
  } catch {
    // Ignore storage access errors in private iframes
  }
  return 'owner';
}

function readSavedVendorOrg(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(VENDOR_ORG_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettingsRecord = {
  id: 'main',
  orgId: ORG_ID,
  companyName: 'OpsPilot',
  regionName: '',
  currencySymbol: '$',
};

const SAMPLE_RECORD_IDS = new Set([
  'DSP-8841',
  'DSP-8842',
  'VND-SFO-14',
  'VND-FIN-02',
  'RST-2091',
]);

function nowTimeString(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMinutesFormatted(minutesFromNow: number): string {
  const dt = new Date(Date.now() + minutesFromNow * 60_000);
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusToState(
  status: DispatchStatus,
  isVendor?: boolean
): OperationalState {
  if (status === 'Maintenance') return 'critical';
  if (status === 'Delayed') return 'warning';
  if (isVendor && status !== 'Delivered') return 'vendor';
  return 'operational';
}

export default function App() {
  // --- Auth & Role State ---
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [roleRecord, setRoleRecord] = useState<UserRoleRecord | null>(null);
  const [profileRecord, setProfileRecord] = useState<UserProfileRecord | null>(null);
  const [selectedPortal, setSelectedPortal] = useState<UserRoleType>(() =>
    parsePortalFromHash()
  );
  const [sessionVendorOrg, setSessionVendorOrg] = useState<string>(() =>
    readSavedVendorOrg()
  );

  const pendingLoginIntentRef = useRef<{
    role: UserRoleType;
    vendorOrg?: string;
  }>({ role: parsePortalFromHash() });

  // --- Live Firestore Operational Collections (Zero Auto-Seeded Demo Defaults) ---
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettingsRecord>(
    DEFAULT_WORKSPACE_SETTINGS
  );
  const [vendorPartners, setVendorPartners] = useState<VendorPartnerRecord[]>([]);
  const [dispatches, setDispatches] = useState<FleetDispatch[]>([]);
  const [hardwareUnits, setHardwareUnits] = useState<VendingUnit[]>([]);
  const [restockOrders, setRestockOrders] = useState<VendorRestockOrder[]>([]);
  const [incidents, setIncidents] = useState<OpsIncident[]>([]);
  const [teamRoles, setTeamRoles] = useState<UserRoleRecord[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<Record<string, UserProfileRecord>>({});
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [dataReady, setDataReady] = useState(false);

  // --- UI State ---
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [inspectedDispatchId, setInspectedDispatchId] = useState<string | null>(null);
  const [inspectedHardwareId, setInspectedHardwareId] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createDispatchOpen, setCreateDispatchOpen] = useState(false);
  const [createHardwareOpen, setCreateHardwareOpen] = useState(false);
  const [createVendorPartnerOpen, setCreateVendorPartnerOpen] = useState(false);
  const [createRestockOpen, setCreateRestockOpen] = useState(false);
  const [createIncidentOpen, setCreateIncidentOpen] = useState(false);
  const [optimizerOpen, setOptimizerOpen] = useState(false);
  const [optimizerTargetId, setOptimizerTargetId] = useState<string | null>(null);

  const [toasts, setToasts] = useState<OpsToast[]>([]);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  const pushToast = (
    title: string,
    detail?: string,
    tone: OpsToast['tone'] = 'indigo'
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, title, detail, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  // Keep selectedPortal synced if user opens a direct #owner / #staff / #vendor URL while signed out
  useEffect(() => {
    const onHashChange = () => {
      if (authUser) return;
      const next = parsePortalFromHash();
      setSelectedPortal(next);
      pendingLoginIntentRef.current = {
        ...pendingLoginIntentRef.current,
        role: next,
      };
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [authUser]);

  // --- Firebase Auth Listener (Clean-Slate: NO automatic demo data seeding) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthUser(null);
        setRoleRecord(null);
        setProfileRecord(null);
        setWorkspaceSettings(DEFAULT_WORKSPACE_SETTINGS);
        setVendorPartners([]);
        setDispatches([]);
        setHardwareUnits([]);
        setRestockOrders([]);
        setIncidents([]);
        setTeamRoles([]);
        setTeamProfiles({});
        setActivityLogs([]);
        setDataReady(false);
        setAuthReady(true);
        return;
      }

      setAuthUser(user);
      try {
        const intent = pendingLoginIntentRef.current;
        const { roleDoc, profileDoc, isNewAccount } = await ensureUserAccountRecords(
          user,
          intent.role,
          intent.vendorOrg
        );
        setRoleRecord(roleDoc);
        setProfileRecord(profileDoc);

        if (isNewAccount) {
          await recordActivityLog({
            category: 'account',
            action: 'Account Registered',
            summary: `${roleDoc.displayName} joined the workspace as ${
              roleDoc.role === 'owner'
                ? 'Business Owner'
                : roleDoc.role === 'vendor'
                ? 'Vendor Partner'
                : 'Staff'
            }.`,
            details:
              roleDoc.requestedRole !== roleDoc.role
                ? `Requested elevated access: ${roleDoc.requestedRole}`
                : roleDoc.vendorOrganization
                ? `Vendor Company: ${roleDoc.vendorOrganization}`
                : undefined,
            targetId: roleDoc.userId,
            targetLabel: roleDoc.displayName,
            actorUid: user.uid,
            actorName: roleDoc.displayName,
            actorRole: roleDoc.role,
            severity: 'info',
          });
        }

        const resolvedPortal: UserRoleType =
          roleDoc.role === 'owner' ? intent.role : roleDoc.role;
        setActiveSection(PORTAL_HOME_SECTION[resolvedPortal]);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setAuthReady(true);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const actualRole: UserRoleType = roleRecord?.role ?? 'employee';
  const isPortalDenied: boolean = Boolean(
    roleRecord && roleRecord.role !== 'owner' && roleRecord.role !== selectedPortal
  );
  const activePortal: UserRoleType =
    roleRecord?.role === 'owner' ? selectedPortal : actualRole;
  const activeVendorOrg = (
    roleRecord?.vendorOrganization ||
    sessionVendorOrg ||
    ''
  ).trim();

  // Keep activeSection strictly within the allowed pages of this isolated portal window
  useEffect(() => {
    const allowed = ROLE_ALLOWED_SECTIONS[activePortal];
    if (!allowed.includes(activeSection)) {
      setActiveSection(allowed[0]);
    }
  }, [activePortal, activeSection]);

  // --- Live Firestore Subscriptions (Strictly Scoped per Isolated Portal Window) ---
  useEffect(() => {
    if (!authReady || !authUser || !roleRecord || !roleRecord.active || isPortalDenied) {
      return;
    }

    // Immediately clear any out-of-scope data when inside an isolated Staff or Vendor window
    if (activePortal !== 'owner') {
      setVendorPartners([]);
      setTeamRoles([]);
      setTeamProfiles({});
      setActivityLogs([]);
    }
    if (activePortal === 'employee') {
      setRestockOrders([]);
    }
    if (activePortal === 'vendor') {
      setIncidents([]);
    }

    const unsubscribers: (() => void)[] = [];

    // 1. Live listener on own userRole doc
    unsubscribers.push(
      onSnapshot(
        doc(db, 'userRoles', authUser.uid),
        (snap) => {
          if (snap.exists()) {
            setRoleRecord(snap.data() as UserRoleRecord);
          }
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.GET, `userRoles/${authUser.uid}`);
          } catch (e) {
            setFatalError(e instanceof Error ? e : new Error(String(e)));
          }
        }
      )
    );

    // 2. Workspace Settings (company branding, region, currency)
    unsubscribers.push(
      onSnapshot(
        doc(db, 'workspaceSettings', 'main'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as WorkspaceSettingsRecord;
            setWorkspaceSettings({
              id: 'main',
              orgId: ORG_ID,
              companyName: data.companyName || 'OpsPilot',
              regionName: data.regionName || '',
              currencySymbol: data.currencySymbol || '$',
              updatedBy: data.updatedBy,
            });
          } else {
            setWorkspaceSettings(DEFAULT_WORKSPACE_SETTINGS);
          }
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.GET, 'workspaceSettings/main');
          } catch (e) {
            setFatalError(e instanceof Error ? e : new Error(String(e)));
          }
        }
      )
    );

    // 3. Registered Vendor Partners (Owner Portal ONLY — hidden from Staff & External Vendors)
    if (activePortal === 'owner') {
      const partnersQuery = query(
        collection(db, 'vendorPartners'),
        where('orgId', '==', ORG_ID)
      );
      unsubscribers.push(
        onSnapshot(
          partnersQuery,
          (snap) => {
            const items = snap.docs
              .map((d) => d.data() as VendorPartnerRecord)
              .sort((a, b) => a.name.localeCompare(b.name));
            setVendorPartners(items);
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'vendorPartners');
            } catch (e) {
              setFatalError(e instanceof Error ? e : new Error(String(e)));
            }
          }
        )
      );
    }

    // 4. Dispatches (Scoped strictly to partner runs in Vendor Portal)
    const dispatchQuery = query(
      collection(db, 'dispatches'),
      where('orgId', '==', ORG_ID)
    );

    unsubscribers.push(
      onSnapshot(
        dispatchQuery,
        (snap) => {
          const items = snap.docs
            .map((d) => d.data() as FleetDispatch)
            .filter((d) => {
              if (activePortal !== 'vendor') return true;
              if (!d.isVendorContractor) return false;
              if (!activeVendorOrg) return true;
              return (
                (d.contractorName ?? '').trim().toLowerCase() ===
                activeVendorOrg.toLowerCase()
              );
            })
            .sort((a, b) => a.id.localeCompare(b.id));
          setDispatches(items);
          setDataReady(true);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, 'dispatches');
          } catch (e) {
            setFatalError(e instanceof Error ? e : new Error(String(e)));
          }
        }
      )
    );

    // 5. Hardware Units (Owner & Staff views; minimal unit IDs for Vendor restock proposal selector)
    const hardwareQuery = query(
      collection(db, 'hardwareUnits'),
      where('orgId', '==', ORG_ID)
    );
    unsubscribers.push(
      onSnapshot(
        hardwareQuery,
        (snap) => {
          const items = snap.docs
            .map((d) => d.data() as VendingUnit)
            .sort((a, b) => a.id.localeCompare(b.id));
          setHardwareUnits(items);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, 'hardwareUnits');
          } catch (e) {
            setFatalError(e instanceof Error ? e : new Error(String(e)));
          }
        }
      )
    );

    // 6. Vendor Restock Orders (Owner Portal & Vendor Portal ONLY — never subscribed in Staff Portal)
    if (activePortal === 'owner' || activePortal === 'vendor') {
      const restockQuery = query(
        collection(db, 'restockOrders'),
        where('orgId', '==', ORG_ID)
      );
      unsubscribers.push(
        onSnapshot(
          restockQuery,
          (snap) => {
            const items = snap.docs
              .map((d) => {
                const raw = d.data() as VendorRestockOrder & { createdAtLabel?: string };
                return {
                  ...raw,
                  createdAt: raw.createdAtLabel ?? '09:00 AM',
                };
              })
              .filter((o) => {
                if (activePortal !== 'vendor' || !activeVendorOrg) return true;
                return (
                  o.vendorName.trim().toLowerCase() === activeVendorOrg.toLowerCase()
                );
              })
              .sort((a, b) => b.id.localeCompare(a.id));
            setRestockOrders(items);
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'restockOrders');
            } catch (e) {
              setFatalError(e instanceof Error ? e : new Error(String(e)));
            }
          }
        )
      );
    }

    // 7. Incidents (Owner Portal & Staff Portal ONLY — never subscribed in Vendor Portal)
    if (activePortal === 'owner' || activePortal === 'employee') {
      const incidentQuery = query(
        collection(db, 'incidents'),
        where('orgId', '==', ORG_ID)
      );
      unsubscribers.push(
        onSnapshot(
          incidentQuery,
          (snap) => {
            const items = snap.docs
              .map((d) => d.data() as OpsIncident)
              .sort((a, b) => b.id.localeCompare(a.id));
            setIncidents(items);
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'incidents');
            } catch (e) {
              setFatalError(e instanceof Error ? e : new Error(String(e)));
            }
          }
        )
      );
    }

    // 8. Team Roles & Private Profiles (Owner Portal + Bootstrapped Owner ONLY)
    const isBootstrappedOwner =
      authUser.emailVerified &&
      (authUser.email ?? '').toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL.toLowerCase();

    if (activePortal === 'owner' && isBootstrappedOwner) {
      unsubscribers.push(
        onSnapshot(
          collection(db, 'userRoles'),
          (snap) => {
            setTeamRoles(snap.docs.map((d) => d.data() as UserRoleRecord));
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'userRoles');
            } catch (e) {
              setFatalError(e instanceof Error ? e : new Error(String(e)));
            }
          }
        )
      );

      unsubscribers.push(
        onSnapshot(
          collection(db, 'userProfiles'),
          (snap) => {
            const map: Record<string, UserProfileRecord> = {};
            snap.docs.forEach((d) => {
              const p = d.data() as UserProfileRecord;
              map[p.userId] = p;
            });
            setTeamProfiles(map);
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'userProfiles');
            } catch (e) {
              setFatalError(e instanceof Error ? e : new Error(String(e)));
            }
          }
        )
      );
    } else if (activePortal === 'owner') {
      setTeamRoles([roleRecord]);
      if (profileRecord) {
        setTeamProfiles({ [profileRecord.userId]: profileRecord });
      }
    }

    // 9. Operational Activity & Audit Log (Owner Portal ONLY — Read-Only Chronological Stream)
    if (activePortal === 'owner') {
      const activityQuery = isBootstrappedOwner
        ? query(collection(db, 'activityLogs'), where('orgId', '==', ORG_ID))
        : query(
            collection(db, 'activityLogs'),
            where('orgId', '==', ORG_ID),
            where('actorUid', '==', authUser.uid)
          );

      unsubscribers.push(
        onSnapshot(
          activityQuery,
          (snap) => {
            const items = snap.docs
              .map((d) => {
                const raw = d.data() as Omit<ActivityLogRecord, 'createdAtMs'> & {
                  createdAt?: { toMillis?: () => number };
                };
                const createdAtMs =
                  typeof raw.createdAt?.toMillis === 'function'
                    ? raw.createdAt.toMillis()
                    : Date.now();
                return {
                  id: raw.id,
                  orgId: raw.orgId,
                  category: raw.category,
                  action: raw.action,
                  summary: raw.summary,
                  details: raw.details,
                  targetId: raw.targetId,
                  targetLabel: raw.targetLabel,
                  actorUid: raw.actorUid,
                  actorName: raw.actorName,
                  actorRole: raw.actorRole,
                  severity: raw.severity,
                  createdAtMs,
                } as ActivityLogRecord;
              })
              .sort((a, b) => b.createdAtMs - a.createdAtMs);
            setActivityLogs(items);
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'activityLogs');
            } catch (e) {
              setFatalError(e instanceof Error ? e : new Error(String(e)));
            }
          }
        )
      );
    }

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [
    authReady,
    authUser,
    roleRecord?.userId,
    roleRecord?.role,
    roleRecord?.active,
    isPortalDenied,
    activePortal,
    activeVendorOrg,
  ]);

  // --- Auth & Portal Door Actions ---
  const handleSelectPortalDoor = (portal: UserRoleType) => {
    setSelectedPortal(portal);
    pendingLoginIntentRef.current = {
      ...pendingLoginIntentRef.current,
      role: portal,
    };
    try {
      window.sessionStorage.setItem(PORTAL_STORAGE_KEY, portal);
    } catch {
      // Ignore storage access errors
    }
  };

  const handleGoogleSignIn = async (role: UserRoleType, vendorOrg?: string) => {
    setAuthError(null);
    setAuthLoading(true);
    setSelectedPortal(role);
    setSessionVendorOrg(vendorOrg ?? '');
    pendingLoginIntentRef.current = { role, vendorOrg };
    try {
      window.sessionStorage.setItem(PORTAL_STORAGE_KEY, role);
      if (vendorOrg) {
        window.sessionStorage.setItem(VENDOR_ORG_STORAGE_KEY, vendorOrg);
      } else {
        window.sessionStorage.removeItem(VENDOR_ORG_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to complete Google sign-in.';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError(
          'Sign-in popup was closed before completing. Please click Sign in again.'
        );
      } else if (msg.includes('popup-blocked')) {
        setAuthError(
          'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.'
        );
      } else {
        setAuthError(msg);
      }
      setAuthLoading(false);
    }
  };

  const handleOpenAssignedPortal = () => {
    if (!roleRecord) return;
    const assigned = roleRecord.role;
    setSelectedPortal(assigned);
    setActiveSection(PORTAL_HOME_SECTION[assigned]);
    try {
      window.sessionStorage.setItem(PORTAL_STORAGE_KEY, assigned);
      window.history.replaceState(null, '', PORTAL_HASH[assigned]);
    } catch {
      // Ignore storage/history errors
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSearchQuery('');
      setInspectedDispatchId(null);
      setInspectedHardwareId(null);
      setSettingsOpen(false);
      setSessionVendorOrg('');
      try {
        window.sessionStorage.removeItem(VENDOR_ORG_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      pushToast(
        'Sign-Out Failed',
        err instanceof Error ? err.message : 'Please try again.',
        'rose'
      );
    }
  };

  // --- Derived Lists & Badges ---
  const teamMemberNames = useMemo(() => {
    const names = new Set<string>();
    teamRoles
      .filter((r) => r.active && r.role !== 'vendor')
      .forEach((r) => {
        if (r.displayName.trim()) names.add(r.displayName.trim());
      });
    if (roleRecord?.displayName) names.add(roleRecord.displayName);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [teamRoles, roleRecord?.displayName]);

  const hasSampleData = useMemo(() => {
    return (
      dispatches.some((d) => SAMPLE_RECORD_IDS.has(d.id)) ||
      hardwareUnits.some((u) => SAMPLE_RECORD_IDS.has(u.id)) ||
      restockOrders.some((o) => SAMPLE_RECORD_IDS.has(o.id))
    );
  }, [dispatches, hardwareUnits, restockOrders]);

  const totalRecordCount =
    dispatches.length +
    hardwareUnits.length +
    restockOrders.length +
    incidents.length +
    vendorPartners.length;

  const criticalIncidentCount = useMemo(
    () => incidents.filter((i) => i.severity === 'Critical').length,
    [incidents]
  );

  const pendingRestockCount = useMemo(
    () =>
      restockOrders.filter((r) =>
        activePortal === 'vendor'
          ? r.status === 'Approved' || r.status === 'Dispatched'
          : r.status === 'Pending Approval'
      ).length,
    [restockOrders, activePortal]
  );

  const pendingRoleRequestCount = useMemo(
    () => teamRoles.filter((r) => r.requestedRole !== r.role).length,
    [teamRoles]
  );

  const inspectedDispatch = useMemo(
    () => dispatches.find((d) => d.id === inspectedDispatchId) ?? null,
    [dispatches, inspectedDispatchId]
  );

  const inspectedHardware = useMemo(
    () => hardwareUnits.find((u) => u.id === inspectedHardwareId) ?? null,
    [hardwareUnits, inspectedHardwareId]
  );

  const handlePrimaryHeaderAction = () => {
    if (activeSection === 'vendors' || activePortal === 'vendor') {
      setCreateRestockOpen(true);
    } else if (activeSection === 'hardware') {
      if (activePortal === 'owner') {
        setCreateHardwareOpen(true);
      } else {
        setCreateIncidentOpen(true);
      }
    } else if (activeSection === 'incidents') {
      setCreateIncidentOpen(true);
    } else if (activeSection !== 'team' && activeSection !== 'activity') {
      setCreateDispatchOpen(true);
    }
  };

  // --- Centralized Immutable Audit Logger ---
  const actorLabel = roleRecord?.displayName || authUser?.displayName || 'Team Member';

  const logActivity = async (entry: {
    category: ActivityLogCategory;
    action: string;
    summary: string;
    details?: string;
    targetId: string;
    targetLabel: string;
    severity?: ActivityLogSeverity;
  }) => {
    if (!authUser || !roleRecord) return;
    await recordActivityLog({
      ...entry,
      actorUid: authUser.uid,
      actorName: actorLabel,
      actorRole: activePortal,
    });
  };

  // --- Workspace Settings & Data Handlers ---
  const handleSaveWorkspaceSettings = async (
    patch: Pick<WorkspaceSettingsRecord, 'companyName' | 'regionName' | 'currencySymbol'>
  ) => {
    if (!authUser || actualRole !== 'owner') return;
    try {
      await saveWorkspaceSettingsDoc(patch, authUser.uid);
      await logActivity({
        category: 'workspace',
        action: 'Workspace Settings Updated',
        summary: `Updated company profile to "${patch.companyName}" (${patch.currencySymbol}).`,
        details: patch.regionName ? `Operating Region: ${patch.regionName}` : undefined,
        targetId: 'main',
        targetLabel: patch.companyName,
        severity: 'info',
      });
      pushToast(
        'Business Profile Saved',
        `${patch.companyName} settings synced live across all users.`,
        'emerald'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleClearAllOperationalData = async () => {
    if (!authUser || actualRole !== 'owner') return;
    try {
      await clearAllOperationalData();
      await logActivity({
        category: 'workspace',
        action: 'Operational Data Cleared',
        summary: 'Removed all routes, vending machines, vendor partners, restock orders, and incidents.',
        details: 'Audit trail records remain preserved.',
        targetId: 'main',
        targetLabel: workspaceSettings.companyName,
        severity: 'warning',
      });
      setInspectedDispatchId(null);
      setInspectedHardwareId(null);
      setSearchQuery('');
      pushToast(
        'Workspace Cleared',
        'All sample and operational records removed. Ready for your real business data.',
        'emerald'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleLoadSampleDemoData = async () => {
    if (!authUser || actualRole !== 'owner') return;
    try {
      await seedSampleDemoData(authUser.uid);
      await logActivity({
        category: 'workspace',
        action: 'Sample Demo Data Loaded',
        summary: 'Populated sample fleet dispatches, vending machines, vendor partners, and restock orders.',
        targetId: 'main',
        targetLabel: workspaceSettings.companyName,
        severity: 'info',
      });
      setSearchQuery('');
      pushToast(
        'Sample Demo Loaded',
        'Demo routes, vending machines, partners, and orders loaded for testing.',
        'indigo'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // --- Fleet Dispatch Handlers ---
  const handleUpdateDispatchStatus = async (id: string, nextStatus: DispatchStatus) => {
    const target = dispatches.find((d) => d.id === id);
    if (!target) return;

    const progressPct =
      nextStatus === 'Delivered'
        ? 100
        : nextStatus === 'En Route' && target.progressPct < 25
        ? 35
        : target.progressPct;
    const etaFormatted =
      nextStatus === 'Delivered'
        ? 'ARRIVED'
        : nextStatus === 'Maintenance'
        ? 'HALTED'
        : target.etaFormatted === 'HALTED' || target.etaFormatted === 'ARRIVED'
        ? addMinutesFormatted(25)
        : target.etaFormatted;
    const stops =
      nextStatus === 'Delivered'
        ? target.stops.map((s) => ({ ...s, completed: true }))
        : target.stops;

    try {
      await updateDispatchProgressDoc(id, {
        status: nextStatus,
        state: statusToState(nextStatus, target.isVendorContractor),
        progressPct,
        etaFormatted,
        etaMinutes:
          nextStatus === 'Delivered' || nextStatus === 'Maintenance'
            ? 0
            : target.etaMinutes,
        stopsCompleted:
          nextStatus === 'Delivered' ? target.stopsTotal : target.stopsCompleted,
        stops,
      });
      await logActivity({
        category: 'dispatch',
        action: 'Dispatch Status Updated',
        summary: `${target.vehicleCode} changed from ${target.status} to ${nextStatus}.`,
        details: `Driver: ${target.driverName} · Corridor: ${target.corridor}`,
        targetId: target.id,
        targetLabel: target.vehicleCode,
        severity:
          nextStatus === 'Delivered'
            ? 'success'
            : nextStatus === 'Maintenance'
            ? 'critical'
            : nextStatus === 'Delayed'
            ? 'warning'
            : 'info',
      });
      pushToast('Route Updated', `${target.vehicleCode} marked as ${nextStatus}.`, 'emerald');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleToggleRouteStop = async (dispatchId: string, stopId: string) => {
    const target = dispatches.find((d) => d.id === dispatchId);
    if (!target) return;

    const toggledStop = target.stops.find((s) => s.id === stopId);
    const nextStops = target.stops.map((s) =>
      s.id === stopId ? { ...s, completed: !s.completed } : s
    );
    const completedCount = nextStops.filter((s) => s.completed).length;
    const pct = Math.round((completedCount / Math.max(nextStops.length, 1)) * 100);
    const isDone = completedCount === nextStops.length;
    const nextStatus: DispatchStatus = isDone
      ? 'Delivered'
      : target.status === 'Delivered'
      ? 'En Route'
      : target.status;

    try {
      await updateDispatchProgressDoc(dispatchId, {
        stops: nextStops,
        stopsCompleted: completedCount,
        progressPct: pct,
        status: nextStatus,
        state: statusToState(nextStatus, target.isVendorContractor),
        etaMinutes: isDone ? 0 : target.etaMinutes,
        etaFormatted: isDone
          ? 'ARRIVED'
          : target.etaFormatted === 'ARRIVED'
          ? addMinutesFormatted(20)
          : target.etaFormatted,
      });
      if (toggledStop) {
        const nowCompleted = !toggledStop.completed;
        await logActivity({
          category: 'dispatch',
          action: nowCompleted ? 'Delivery Stop Completed' : 'Delivery Stop Reopened',
          summary: `${target.vehicleCode} ${
            nowCompleted ? 'completed' : 'reopened'
          } stop "${toggledStop.location}" (${completedCount}/${nextStops.length}).`,
          details: isDone ? 'All route stops completed — marked Delivered.' : undefined,
          targetId: target.id,
          targetLabel: target.vehicleCode,
          severity: isDone || nowCompleted ? 'success' : 'info',
        });
      }
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleCreateDispatch = async (payload: {
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
  }) => {
    if (!authUser) return;
    const id = `DSP-${Date.now().toString().slice(-6)}`;
    const initials =
      payload.driverName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'DR';

    let cumulativeMin = 0;
    const formattedStops = payload.stops.map((s, idx) => {
      const driveMinutes = 12;
      const delayMinutes =
        s.trafficLevel === 'Congested' ? 14 : s.trafficLevel === 'Moderate' ? 6 : 2;
      cumulativeMin += driveMinutes + delayMinutes;
      return {
        id: `S${idx + 1}`,
        location: s.location,
        eta: addMinutesFormatted(cumulativeMin),
        units: s.units,
        completed: false,
        urgency: s.urgency,
        trafficLevel: s.trafficLevel,
        delayMinutes,
        driveMinutes,
      };
    });

    const firstStopEtaMin =
      (formattedStops[0]?.driveMinutes ?? 12) + (formattedStops[0]?.delayMinutes ?? 2);

    const newDispatch: FleetDispatch = {
      id,
      vehicleCode: payload.vehicleCode,
      vehicleType: payload.vehicleType,
      driverName: payload.driverName,
      driverInitials: initials,
      routeCode: `RT-${String(dispatches.length + 1).padStart(2, '0')}`,
      corridor: payload.corridor,
      origin: payload.origin,
      destination: payload.destination,
      status: 'En Route',
      state: payload.isVendorContractor ? 'vendor' : 'operational',
      etaMinutes: firstStopEtaMin,
      etaFormatted: formattedStops[0]?.eta ?? addMinutesFormatted(15),
      progressPct: 0,
      cargoFillPct: payload.cargoFillPct,
      tempCelsius: payload.tempCelsius,
      stopsCompleted: 0,
      stopsTotal: formattedStops.length,
      isVendorContractor: payload.isVendorContractor,
      contractorName: payload.contractorName,
      coords: {
        x: 24 + ((dispatches.length * 13) % 54),
        y: 22 + ((dispatches.length * 17) % 54),
      },
      stops: formattedStops,
    };

    try {
      await createDispatchDoc(newDispatch, authUser.uid);
      await logActivity({
        category: 'dispatch',
        action: 'Dispatch Created',
        summary: `Launched ${newDispatch.vehicleCode} (${newDispatch.routeCode}) with ${formattedStops.length} stop${
          formattedStops.length === 1 ? '' : 's'
        }.`,
        details: `Driver: ${newDispatch.driverName} · ${newDispatch.origin} → ${newDispatch.destination}`,
        targetId: newDispatch.id,
        targetLabel: newDispatch.vehicleCode,
        severity: 'info',
      });
      pushToast(
        'Dispatch Created',
        `${newDispatch.vehicleCode} launched with ${formattedStops.length} stop${
          formattedStops.length === 1 ? '' : 's'
        }.`,
        payload.isVendorContractor ? 'teal' : 'indigo'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleDeleteDispatch = async (dispatchId: string) => {
    if (actualRole !== 'owner') return;
    const target = dispatches.find((d) => d.id === dispatchId);
    try {
      await deleteDispatchDoc(dispatchId);
      await logActivity({
        category: 'dispatch',
        action: 'Dispatch Deleted',
        summary: `Removed route ${target?.vehicleCode ?? dispatchId} from active dispatches.`,
        details: target ? `Corridor: ${target.corridor} · Driver: ${target.driverName}` : undefined,
        targetId: dispatchId,
        targetLabel: target?.vehicleCode ?? dispatchId,
        severity: 'warning',
      });
      if (inspectedDispatchId === dispatchId) setInspectedDispatchId(null);
      pushToast('Route Deleted', `${dispatchId} removed from workspace.`, 'amber');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // --- Route Optimizer Handlers ---
  const handleOpenOptimizer = (dispatchId?: string) => {
    setOptimizerTargetId(dispatchId ?? null);
    setOptimizerOpen(true);
  };

  const handleApplySingleOptimization = async (result: RouteOptimizationResult) => {
    try {
      await updateDispatchOptimizationDoc(result.updatedDispatch);
      await logActivity({
        category: 'dispatch',
        action: 'Route Optimized',
        summary:
          result.minutesSaved > 0
            ? `Optimized ${result.updatedDispatch.vehicleCode}, saving ${result.minutesSaved}m across ${result.reorderedCount} reordered stops.`
            : `Verified ${result.updatedDispatch.vehicleCode} stop sequence against live traffic.`,
        details: `Strategy: ${result.updatedDispatch.optimizationStrategy ?? 'balanced'} · Next ETA: ${result.nextEtaFormatted}`,
        targetId: result.updatedDispatch.id,
        targetLabel: result.updatedDispatch.vehicleCode,
        severity: 'success',
      });
      pushToast(
        `Route Optimized · ${result.updatedDispatch.vehicleCode}`,
        result.minutesSaved > 0
          ? `Saved ${result.minutesSaved}m across ${result.reorderedCount} reordered stops. Next ETA ${result.nextEtaFormatted}.`
          : `Stop sequence verified against live traffic. Next ETA ${result.nextEtaFormatted}.`,
        'emerald'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleApplyBatchOptimization = async (results: RouteOptimizationResult[]) => {
    try {
      await Promise.all(
        results.map((r) => updateDispatchOptimizationDoc(r.updatedDispatch))
      );
      const totalSaved = results.reduce((sum, r) => sum + r.minutesSaved, 0);
      await logActivity({
        category: 'dispatch',
        action: 'Batch Routes Optimized',
        summary: `Optimized ${results.length} active routes (${totalSaved}m total time saved).`,
        details: results.map((r) => r.updatedDispatch.vehicleCode).join(', '),
        targetId: results[0]?.updatedDispatch.id ?? 'BATCH-OPT',
        targetLabel: `${results.length} Active Routes`,
        severity: 'success',
      });
      pushToast(
        `Optimized ${results.length} Active Routes`,
        totalSaved > 0
          ? `Saved ${totalSaved}m total across active delivery routes.`
          : 'All active delivery sequences synced with live traffic.',
        'emerald'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // --- Vending Hardware Handlers ---
  const handleCreateHardwareUnit = async (payload: {
    id: string;
    serial: string;
    model: string;
    siteName: string;
    zone: string;
    targetTempCelsius: number;
    tempCelsius: number;
    assignedVendor: string;
    slots: VendingSlot[];
  }) => {
    if (!authUser || actualRole !== 'owner') return;

    const totalCurrent = payload.slots.reduce((sum, s) => sum + s.current, 0);
    const totalCapacity = payload.slots.reduce((sum, s) => sum + s.capacity, 0);
    const stockPct = Math.round((totalCurrent / Math.max(totalCapacity, 1)) * 100);
    const tempBreach = payload.tempCelsius > payload.targetTempCelsius + 3;
    const status = tempBreach
      ? 'Thermal Alert'
      : stockPct < 25
      ? 'Low Stock'
      : 'Online';
    const state: OperationalState = tempBreach
      ? 'critical'
      : stockPct < 25
      ? 'warning'
      : 'operational';

    const newUnit: VendingUnit = {
      id: payload.id,
      serial: payload.serial,
      model: payload.model,
      siteName: payload.siteName,
      zone: payload.zone,
      status,
      state,
      stockPct,
      tempCelsius: payload.tempCelsius,
      targetTempCelsius: payload.targetTempCelsius,
      cashlessStatus: 'Nominal',
      compressorHealthPct: 98,
      revenue24h: 0,
      transactions24h: 0,
      lastHeartbeat: 'Just now',
      assignedVendor: payload.assignedVendor,
      coords: {
        x: 20 + ((hardwareUnits.length * 15) % 62),
        y: 20 + ((hardwareUnits.length * 19) % 60),
      },
      slots: payload.slots,
    };

    try {
      await createHardwareUnitDoc(newUnit, authUser.uid);
      await logActivity({
        category: 'hardware',
        action: 'Machine Registered',
        summary: `Registered vending unit ${newUnit.id} at ${newUnit.siteName}.`,
        details: `Zone: ${newUnit.zone} · Model: ${newUnit.model} · Vendor: ${newUnit.assignedVendor}`,
        targetId: newUnit.id,
        targetLabel: newUnit.siteName,
        severity: 'info',
      });
      pushToast(
        'Vending Machine Registered',
        `${newUnit.id} at ${newUnit.siteName} is now live.`,
        'emerald'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleDeleteHardwareUnit = async (unitId: string) => {
    if (actualRole !== 'owner') return;
    const unit = hardwareUnits.find((u) => u.id === unitId);
    try {
      await deleteHardwareUnitDoc(unitId);
      await logActivity({
        category: 'hardware',
        action: 'Machine Deleted',
        summary: `Removed vending machine ${unitId} (${unit?.siteName ?? 'Hardware Unit'}).`,
        targetId: unitId,
        targetLabel: unit?.siteName ?? unitId,
        severity: 'warning',
      });
      if (inspectedHardwareId === unitId) setInspectedHardwareId(null);
      pushToast('Machine Removed', `${unitId} deleted from hardware inventory.`, 'amber');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleRebootHardware = async (unitId: string) => {
    const unit = hardwareUnits.find((u) => u.id === unitId);
    if (!unit) return;
    const normalizedTemp =
      unit.tempCelsius > unit.targetTempCelsius + 3
        ? unit.targetTempCelsius + 0.2
        : unit.tempCelsius;
    const nextStatus = unit.stockPct < 25 ? 'Low Stock' : 'Online';

    try {
      await updateHardwareUnitDoc(unitId, {
        status: nextStatus,
        state: nextStatus === 'Low Stock' ? 'warning' : 'operational',
        cashlessStatus: 'Nominal',
        tempCelsius: normalizedTemp,
        compressorHealthPct: Math.max(unit.compressorHealthPct, 90),
        lastHeartbeat: 'Just now',
      });
      await logActivity({
        category: 'hardware',
        action: 'Remote Machine Reboot',
        summary: `Rebooted ${unitId} at ${unit.siteName}; status restored to ${nextStatus}.`,
        details: `Chiller: ${normalizedTemp.toFixed(1)}°C · Cashless Link: Nominal`,
        targetId: unitId,
        targetLabel: unit.siteName,
        severity: 'success',
      });
      pushToast(
        'Machine Rebooted',
        `${unitId} connection and payment reader restored.`,
        'emerald'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleTriggerRestockFromUnit = async (unit: VendingUnit) => {
    if (!authUser) return;
    const matchedPartner = vendorPartners.find(
      (p) => p.name.toLowerCase() === unit.assignedVendor.toLowerCase()
    );
    const orderId = `RST-${Date.now().toString().slice(-6)}`;
    const neededSkus = Math.max(24, Math.round((100 - unit.stockPct) * 1.2));

    const newOrder: VendorRestockOrder = {
      id: orderId,
      vendorName: matchedPartner?.name || unit.assignedVendor || 'Vendor Partner',
      contractorLead: matchedPartner?.lead || 'Partner Dispatch',
      targetSite: unit.siteName,
      unitId: unit.id,
      zone: unit.zone,
      skuCount: neededSkus,
      palletWeightKg: Math.max(5, Math.round(neededSkus * 1.1)),
      estimatedCost: Math.round(neededSkus * 10),
      slaWindow: 'Today · +2h SLA',
      status: 'Pending Approval',
      priority: unit.stockPct < 25 ? 'Urgent' : 'Priority',
      createdAt: nowTimeString(),
      autoTriggered: true,
    };

    try {
      await createRestockOrderDoc(newOrder, authUser.uid);
      await updateHardwareUnitDoc(unit.id, {
        status: 'Restocking',
        state: 'vendor',
      });
      await logActivity({
        category: 'vendor',
        action: 'Restock Order Triggered',
        summary: `Queued ${newOrder.id} (${neededSkus} SKUs) for ${unit.id} via ${newOrder.vendorName}.`,
        details: `Site: ${unit.siteName} · Priority: ${newOrder.priority}`,
        targetId: newOrder.id,
        targetLabel: `${unit.id} · ${newOrder.vendorName}`,
        severity: 'info',
      });
      pushToast(
        'Restock Order Created',
        `${newOrder.id} queued for ${unit.id} via ${newOrder.vendorName}.`,
        'teal'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // --- Vendor Partners & Restock Orders Handlers ---
  const handleCreateVendorPartner = async (payload: {
    name: string;
    lead: string;
    slaTargetPct: number;
    avgTurnaroundMin: number;
    contactNote: string;
  }) => {
    if (!authUser || actualRole !== 'owner') return;
    const id = `VND-PRT-${Date.now().toString().slice(-6)}`;
    try {
      await createVendorPartnerDoc(
        {
          id,
          name: payload.name,
          lead: payload.lead,
          slaTargetPct: payload.slaTargetPct,
          avgTurnaroundMin: payload.avgTurnaroundMin,
          contactNote: payload.contactNote,
        },
        authUser.uid
      );
      await logActivity({
        category: 'vendor',
        action: 'Vendor Partner Added',
        summary: `Added vendor partner "${payload.name}" (Lead: ${payload.lead}).`,
        details: `SLA Target: ${payload.slaTargetPct}% · Turnaround: ${payload.avgTurnaroundMin}m`,
        targetId: id,
        targetLabel: payload.name,
        severity: 'info',
      });
      pushToast('Vendor Partner Added', `${payload.name} added to your partner network.`, 'teal');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleDeleteVendorPartner = async (partnerId: string) => {
    if (actualRole !== 'owner') return;
    const partner = vendorPartners.find((p) => p.id === partnerId);
    try {
      await deleteVendorPartnerDoc(partnerId);
      await logActivity({
        category: 'vendor',
        action: 'Vendor Partner Removed',
        summary: `Removed vendor partner "${partner?.name ?? partnerId}" from registry.`,
        targetId: partnerId,
        targetLabel: partner?.name ?? partnerId,
        severity: 'warning',
      });
      pushToast('Vendor Partner Removed', 'Partner removed from registry.', 'amber');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleBatchApproveOrders = async (orderIds: string[]) => {
    try {
      await Promise.all(
        orderIds.map((id) => updateRestockOrderStatusDoc(id, 'Approved'))
      );
      await logActivity({
        category: 'vendor',
        action: 'Restock Orders Approved',
        summary: `Batch-approved ${orderIds.length} restock order${
          orderIds.length > 1 ? 's' : ''
        } for vendor dispatch.`,
        details: `Orders: ${orderIds.join(', ')}`,
        targetId: orderIds[0] ?? 'BATCH-APPROVE',
        targetLabel: `${orderIds.length} Restock Order${orderIds.length > 1 ? 's' : ''}`,
        severity: 'success',
      });
      pushToast(
        'Orders Approved',
        `${orderIds.length} restock order${
          orderIds.length > 1 ? 's' : ''
        } cleared for vendor delivery.`,
        'teal'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleAdvanceOrderStatus = async (orderId: string, nextStatus: RestockStatus) => {
    const targetOrder = restockOrders.find((o) => o.id === orderId);
    const targetUnit = targetOrder
      ? hardwareUnits.find((u) => u.id === targetOrder.unitId)
      : undefined;

    try {
      await updateRestockOrderStatusDoc(orderId, nextStatus);
      if (nextStatus === 'Completed' && targetUnit) {
        await updateHardwareUnitDoc(targetUnit.id, {
          stockPct: 96,
          status: 'Online',
          state: 'operational',
          slots: targetUnit.slots.map((s) => ({
            ...s,
            current: Math.max(s.current, s.capacity - 1),
          })),
        });
      }
      await logActivity({
        category: 'vendor',
        action: `Restock Order ${nextStatus}`,
        summary: `Order ${orderId} updated to ${nextStatus}${
          targetOrder ? ` for ${targetOrder.unitId} (${targetOrder.vendorName})` : ''
        }.`,
        details:
          nextStatus === 'Completed' && targetOrder
            ? `${targetOrder.unitId} stock level verified at 96%.`
            : targetOrder
            ? `Target site: ${targetOrder.targetSite}`
            : undefined,
        targetId: orderId,
        targetLabel: targetOrder ? `${targetOrder.vendorName} · ${targetOrder.unitId}` : orderId,
        severity: nextStatus === 'Completed' || nextStatus === 'Approved' ? 'success' : 'info',
      });
      pushToast(
        `Order ${orderId} · ${nextStatus}`,
        nextStatus === 'Completed' && targetOrder
          ? `${targetOrder.unitId} refilled and verified at 96% stock.`
          : 'Updated live for Business Owners and Vendors.',
        nextStatus === 'Completed' ? 'emerald' : 'teal'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleCreateRestockOrder = async (payload: {
    vendorName: string;
    contractorLead: string;
    unitId: string;
    skuCount: number;
    estimatedCost: number;
    priority: 'Standard' | 'Priority' | 'Urgent';
  }) => {
    if (!authUser) return;
    const unit = hardwareUnits.find((u) => u.id === payload.unitId);
    if (!unit) return;
    const orderId = `RST-${Date.now().toString().slice(-6)}`;

    const newOrder: VendorRestockOrder = {
      id: orderId,
      vendorName: payload.vendorName,
      contractorLead: payload.contractorLead,
      targetSite: unit.siteName,
      unitId: unit.id,
      zone: unit.zone,
      skuCount: payload.skuCount,
      palletWeightKg: Math.max(5, Math.round(payload.skuCount * 1.1)),
      estimatedCost: payload.estimatedCost,
      slaWindow:
        payload.priority === 'Urgent'
          ? 'Today · +60m SLA'
          : payload.priority === 'Priority'
          ? 'Today · +2h SLA'
          : 'Today · +4h SLA',
      status: 'Pending Approval',
      priority: payload.priority,
      createdAt: nowTimeString(),
      autoTriggered: false,
    };

    try {
      await createRestockOrderDoc(newOrder, authUser.uid);
      await logActivity({
        category: 'vendor',
        action: 'Restock Order Created',
        summary: `Created restock order ${newOrder.id} (${newOrder.skuCount} SKUs) for ${unit.id} via ${newOrder.vendorName}.`,
        details: `Priority: ${newOrder.priority} · Site: ${unit.siteName}`,
        targetId: newOrder.id,
        targetLabel: `${newOrder.vendorName} · ${unit.id}`,
        severity: 'info',
      });
      pushToast(
        'Restock Order Created',
        `${newOrder.id} queued for ${newOrder.vendorName}.`,
        'teal'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleDeleteRestockOrder = async (orderId: string) => {
    if (actualRole !== 'owner') return;
    const order = restockOrders.find((o) => o.id === orderId);
    try {
      await deleteRestockOrderDoc(orderId);
      await logActivity({
        category: 'vendor',
        action: 'Restock Order Deleted',
        summary: `Removed restock order ${orderId}${order ? ` (${order.vendorName})` : ''}.`,
        targetId: orderId,
        targetLabel: order?.vendorName ?? orderId,
        severity: 'warning',
      });
      pushToast('Restock Order Deleted', `${orderId} removed from queue.`, 'amber');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // --- Incident Triage Handlers ---

  const handleAcknowledgeIncident = async (id: string) => {
    const inc = incidents.find((i) => i.id === id);
    if (!inc) return;
    try {
      await updateIncidentDoc(id, {
        acknowledged: true,
        timeline: [
          ...inc.timeline,
          {
            id: `T-${Date.now()}`,
            timestamp: nowTimeString(),
            author: actorLabel,
            message: 'Issue acknowledged and under review.',
          },
        ],
      });
      await logActivity({
        category: 'incident',
        action: 'Incident Acknowledged',
        summary: `Acknowledged ${inc.severity.toLowerCase()} incident "${inc.title}".`,
        details: `Asset: ${inc.assetId} · Zone: ${inc.zone}`,
        targetId: inc.id,
        targetLabel: inc.title,
        severity: 'info',
      });
      pushToast('Issue Acknowledged', `${id} marked as active in the shift log.`, 'indigo');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleResolveIncident = async (id: string) => {
    const inc = incidents.find((i) => i.id === id);
    if (!inc) return;
    try {
      await updateIncidentDoc(id, {
        severity: 'Resolved',
        acknowledged: true,
        slaMinutesRemaining: 0,
        timeline: [
          ...inc.timeline,
          {
            id: `T-${Date.now()}`,
            timestamp: nowTimeString(),
            author: actorLabel,
            message: 'Issue resolved and closed.',
          },
        ],
      });
      await logActivity({
        category: 'incident',
        action: 'Incident Resolved',
        summary: `Closed incident "${inc.title}" on ${inc.assetId}.`,
        details: `Zone: ${inc.zone} · Assigned Tech: ${inc.assignedTech}`,
        targetId: inc.id,
        targetLabel: inc.title,
        severity: 'success',
      });
      pushToast('Issue Resolved', `${id} closed across all live dashboards.`, 'emerald');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleAssignTech = async (id: string, tech: string) => {
    const inc = incidents.find((i) => i.id === id);
    if (!inc) return;
    try {
      await updateIncidentDoc(id, {
        assignedTech: tech,
        acknowledged: true,
        timeline: [
          ...inc.timeline,
          {
            id: `T-${Date.now()}`,
            timestamp: nowTimeString(),
            author: actorLabel,
            message: `Assigned field technician updated to ${tech}.`,
          },
        ],
      });
      await logActivity({
        category: 'incident',
        action: 'Incident Reassigned',
        summary: `Assigned "${inc.title}" to ${tech}.`,
        details: `Previous assignee: ${inc.assignedTech} · Asset: ${inc.assetId}`,
        targetId: inc.id,
        targetLabel: inc.title,
        severity: 'info',
      });
      pushToast('Technician Assigned', `${tech} assigned to ${id}.`, 'indigo');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleAddIncidentNote = async (id: string, message: string) => {
    const inc = incidents.find((i) => i.id === id);
    if (!inc) return;
    try {
      await updateIncidentDoc(id, {
        timeline: [
          ...inc.timeline,
          {
            id: `T-${Date.now()}`,
            timestamp: nowTimeString(),
            author: actorLabel,
            message,
          },
        ],
      });
      await logActivity({
        category: 'incident',
        action: 'Incident Note Added',
        summary: `Added shift log update on ${inc.id} (${inc.assetId}).`,
        details: message,
        targetId: inc.id,
        targetLabel: inc.title,
        severity: 'info',
      });
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleCreateIncident = async (payload: {
    title: string;
    assetId: string;
    assetCategory: 'Vending Hardware' | 'Fleet Unit' | 'Cold-Chain' | 'Payment Gateway';
    zone: string;
    severity: IncidentSeverity;
    assignedTech: string;
    description: string;
  }) => {
    if (!authUser) return;
    const id = `INC-${Date.now().toString().slice(-6)}`;
    const newInc: OpsIncident = {
      id,
      title: payload.title,
      assetId: payload.assetId,
      assetCategory: payload.assetCategory,
      zone: payload.zone,
      severity: payload.severity,
      acknowledged: payload.assignedTech !== 'Unassigned',
      reportedAt: nowTimeString(),
      slaMinutesRemaining: payload.severity === 'Critical' ? 30 : 90,
      assignedTech: payload.assignedTech,
      description: payload.description,
      timeline: [
        {
          id: `T-${Date.now()}`,
          timestamp: nowTimeString(),
          author: actorLabel,
          message: `Reported issue for ${payload.assetId}. Assigned to ${payload.assignedTech}.`,
        },
      ],
    };

    try {
      await createIncidentDoc(newInc, authUser.uid);
      await logActivity({
        category: 'incident',
        action: 'Incident Logged',
        summary: `Logged ${newInc.severity} incident "${newInc.title}" for ${newInc.assetId}.`,
        details: `Category: ${newInc.assetCategory} · Zone: ${newInc.zone} · Assigned: ${newInc.assignedTech}`,
        targetId: newInc.id,
        targetLabel: newInc.title,
        severity: newInc.severity === 'Critical' ? 'critical' : 'warning',
      });
      pushToast(
        `Issue ${newInc.id} Logged`,
        `${newInc.severity} alert saved for ${newInc.assetId}.`,
        payload.severity === 'Critical' ? 'rose' : 'amber'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleDeleteIncident = async (incidentId: string) => {
    if (actualRole !== 'owner') return;
    const inc = incidents.find((i) => i.id === incidentId);
    try {
      await deleteIncidentDoc(incidentId);
      await logActivity({
        category: 'incident',
        action: 'Incident Deleted',
        summary: `Removed incident ${incidentId}${inc ? ` ("${inc.title}")` : ''}.`,
        targetId: incidentId,
        targetLabel: inc?.title ?? incidentId,
        severity: 'warning',
      });
      pushToast('Incident Removed', `${incidentId} deleted from queue.`, 'amber');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // --- Team Management Handler ---
  const handleUpdateTeamMember = async (
    userId: string,
    patch: {
      role: UserRoleType;
      requestedRole: UserRoleType;
      vendorOrganization: string;
      active: boolean;
    }
  ) => {
    const prevMember = teamRoles.find((r) => r.userId === userId);
    const memberName = prevMember?.displayName ?? userId;
    try {
      await updateTeamMemberRole(userId, patch);
      const changes: string[] = [];
      if (prevMember && prevMember.role !== patch.role) {
        changes.push(`Role: ${prevMember.role} → ${patch.role}`);
      } else {
        changes.push(`Role: ${patch.role}`);
      }
      if (prevMember && prevMember.active !== patch.active) {
        changes.push(`Status: ${patch.active ? 'Restored (Active)' : 'Paused'}`);
      }
      if (
        patch.role === 'vendor' &&
        (prevMember?.vendorOrganization ?? '') !== patch.vendorOrganization
      ) {
        changes.push(`Vendor Org: ${patch.vendorOrganization || 'Unassigned'}`);
      }

      await logActivity({
        category: 'account',
        action:
          prevMember && prevMember.active !== patch.active
            ? patch.active
              ? 'Account Access Restored'
              : 'Account Access Paused'
            : 'Account Permissions Updated',
        summary: `Updated account access for ${memberName}.`,
        details: changes.join(' · '),
        targetId: userId,
        targetLabel: memberName,
        severity: !patch.active ? 'warning' : 'info',
      });
      pushToast(
        'Access Updated',
        `Saved ${patch.role} role (${patch.active ? 'Active' : 'Paused'}).`,
        'emerald'
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // --- Loading Splash while checking Auth Session ---
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 text-[#4F46E5] animate-spin" />
          <div className="text-[14px] font-semibold text-[#0F172A]">
            Loading OpsPilot Operations Hub...
          </div>
          <p className="text-[12px] text-[#475569]">
            Verifying your account and workspace access
          </p>
        </div>
      </div>
    );
  }

  // --- Unauthenticated View: 3 Separate Role Portal Doors ---
  if (!authUser || !roleRecord) {
    return (
      <LoginPage
        initialPortal={selectedPortal}
        onSelectPortal={handleSelectPortalDoor}
        onGoogleSignIn={handleGoogleSignIn}
        loading={authLoading}
        errorMessage={authError}
      />
    );
  }

  // --- Suspended Account Gate ---
  if (!roleRecord.active) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-6 elevation-2 text-center">
          <div className="h-12 w-12 rounded-xl bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-[18px] font-semibold text-[#0F172A]">
            Workspace Access Paused
          </h1>
          <p className="text-[13px] text-[#475569] mt-2 leading-5">
            Your account ({profileRecord?.email ?? authUser.email}) is currently paused by the Business Owner. Please contact your administrator to restore access.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-5 h-10 px-5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-medium cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // --- Strict Separate Portal Authorization Gate (Hard Block Cross-Role Access) ---
  if (isPortalDenied) {
    const assignedTitle = PORTAL_TITLE[roleRecord.role];
    const attemptedTitle = PORTAL_TITLE[selectedPortal];
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-[#E2E8F0] rounded-2xl p-7 elevation-2">
          <div className="h-12 w-12 rounded-xl bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-[20px] font-semibold text-[#0F172A] tracking-[-0.015em]">
            Access Denied — Separate Portal Required
          </h1>
          <p className="text-[14px] text-[#475569] mt-2 leading-6">
            Your account{' '}
            <strong className="text-[#0F172A] font-semibold">
              {profileRecord?.email ?? authUser.email}
            </strong>{' '}
            is registered for the{' '}
            <strong className="text-[#0F172A] font-semibold">{assignedTitle}</strong>{' '}
            and does not have permission to open the{' '}
            <strong className="text-[#0F172A] font-semibold">{attemptedTitle}</strong>.
          </p>
          <div className="mt-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 text-[12.5px] text-[#475569] leading-5">
            Each role operates in a strictly isolated window. Only verified Business Owners can access the Owner Portal, and Staff or Vendors cannot view each other&apos;s portals.
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleOpenAssignedPortal}
              className={`flex-1 h-10 px-4 rounded-xl text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                roleRecord.role === 'vendor'
                  ? 'bg-[#0D9488] hover:bg-[#0F766E]'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
              }`}
            >
              <span>Open My {assignedTitle}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="h-10 px-4 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-[13px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4 text-[#64748B]" />
              <span>Sign Out &amp; Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userSubtitle =
    activePortal === 'vendor'
      ? activeVendorOrg || 'Vendor Partner'
      : activePortal === 'owner'
      ? 'Business Owner'
      : 'Staff · Field Operations';

  const optimizerScopedDispatches =
    activePortal === 'vendor'
      ? dispatches.filter((d) => d.isVendorContractor)
      : dispatches;

  const currencySymbol = workspaceSettings.currencySymbol || '$';

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      {/* Strictly Isolated Portal Navigation Rail (Zero Cross-Role Switcher) */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        criticalIncidentCount={criticalIncidentCount}
        pendingRestockCount={pendingRestockCount}
        pendingRoleRequestCount={pendingRoleRequestCount}
        activePortal={activePortal}
        companyName={workspaceSettings.companyName}
        userName={roleRecord.displayName}
        userSubtitle={userSubtitle}
        onSignOut={handleSignOut}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Illuminated Fluid Workspace Canvas */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-0">
        <TopHeader
          activeSection={activeSection}
          effectiveRole={activePortal}
          companyName={workspaceSettings.companyName}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onPrimaryAction={handlePrimaryHeaderAction}
        />

        {roleRecord.requestedRole !== roleRecord.role && (
          <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-4 md:px-6 lg:px-8 py-2 text-[12px] text-[#92400E]">
            Your request for <strong>Business Owner</strong> access has been sent to the primary Business Owner for approval. You are signed into your isolated{' '}
            <strong>{PORTAL_TITLE[activePortal]}</strong> in the meantime.
          </div>
        )}

        <main className="flex-1 px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-[1600px] w-full mx-auto">
          {!dataReady ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-7 w-7 text-[#4F46E5] animate-spin" />
              <div className="text-[14px] font-semibold text-[#0F172A]">
                Loading {PORTAL_TITLE[activePortal]}...
              </div>
            </div>
          ) : (
            <>
              {activePortal === 'owner' && activeSection === 'overview' && (
                <OverviewView
                  dispatches={dispatches}
                  hardwareUnits={hardwareUnits}
                  incidents={incidents}
                  restockOrders={restockOrders}
                  vendorPartners={vendorPartners}
                  workspaceSettings={workspaceSettings}
                  hasSampleData={hasSampleData}
                  searchQuery={searchQuery}
                  effectiveRole={activePortal}
                  onNavigate={setActiveSection}
                  onInspectDispatch={(d) => setInspectedDispatchId(d.id)}
                  onInspectHardware={(u) => setInspectedHardwareId(u.id)}
                  onAcknowledgeIncident={handleAcknowledgeIncident}
                  onResolveIncident={handleResolveIncident}
                  onOpenOptimizer={handleOpenOptimizer}
                  onOpenSettings={() => setSettingsOpen(true)}
                  onOpenAddHardware={() => setCreateHardwareOpen(true)}
                  onOpenAddVendor={() => setCreateVendorPartnerOpen(true)}
                  onOpenCreateDispatch={() => setCreateDispatchOpen(true)}
                  onClearAllData={handleClearAllOperationalData}
                  onLoadSampleData={handleLoadSampleDemoData}
                />
              )}

              {activeSection === 'dispatch' && (
                <DispatchView
                  dispatches={dispatches}
                  hardwareUnits={activePortal === 'vendor' ? [] : hardwareUnits}
                  searchQuery={searchQuery}
                  effectiveRole={activePortal}
                  onInspectDispatch={(d) => setInspectedDispatchId(d.id)}
                  onUpdateDispatchStatus={handleUpdateDispatchStatus}
                  onDeleteDispatch={handleDeleteDispatch}
                  onOpenCreateModal={() => setCreateDispatchOpen(true)}
                  onOpenOptimizer={handleOpenOptimizer}
                />
              )}

              {(activePortal === 'owner' || activePortal === 'employee') &&
                activeSection === 'hardware' && (
                  <HardwareView
                    hardwareUnits={hardwareUnits}
                    searchQuery={searchQuery}
                    effectiveRole={activePortal}
                    currencySymbol={currencySymbol}
                    onInspectHardware={(u) => setInspectedHardwareId(u.id)}
                    onRebootUnit={handleRebootHardware}
                    onTriggerRestock={handleTriggerRestockFromUnit}
                    onOpenAddHardware={() => setCreateHardwareOpen(true)}
                    onDeleteHardware={handleDeleteHardwareUnit}
                  />
                )}

              {(activePortal === 'owner' || activePortal === 'vendor') &&
                activeSection === 'vendors' && (
                  <VendorPortalView
                    restockOrders={restockOrders}
                    vendorPartners={activePortal === 'owner' ? vendorPartners : []}
                    searchQuery={searchQuery}
                    effectiveRole={activePortal}
                    vendorOrganization={activeVendorOrg || undefined}
                    currencySymbol={currencySymbol}
                    onBatchApprove={handleBatchApproveOrders}
                    onAdvanceOrderStatus={handleAdvanceOrderStatus}
                    onOpenNewRestockModal={() => setCreateRestockOpen(true)}
                    onOpenAddPartnerModal={() => setCreateVendorPartnerOpen(true)}
                    onDeletePartner={handleDeleteVendorPartner}
                    onDeleteOrder={handleDeleteRestockOrder}
                  />
                )}

              {(activePortal === 'owner' || activePortal === 'employee') &&
                activeSection === 'incidents' && (
                  <IncidentsView
                    incidents={incidents}
                    teamMembers={teamMemberNames}
                    effectiveRole={activePortal}
                    searchQuery={searchQuery}
                    onAcknowledge={handleAcknowledgeIncident}
                    onResolve={handleResolveIncident}
                    onAssignTech={handleAssignTech}
                    onAddNote={handleAddIncidentNote}
                    onDeleteIncident={handleDeleteIncident}
                    onOpenLogModal={() => setCreateIncidentOpen(true)}
                  />
                )}

              {activePortal === 'owner' && activeSection === 'team' && (
                <TeamAccessView
                  currentUid={authUser.uid}
                  teamRoles={teamRoles}
                  teamProfiles={teamProfiles}
                  vendorPartners={vendorPartners}
                  searchQuery={searchQuery}
                  onUpdateMember={handleUpdateTeamMember}
                />
              )}

              {activePortal === 'owner' && activeSection === 'activity' && (
                <ActivityLogView
                  logs={activityLogs}
                  searchQuery={searchQuery}
                  companyName={workspaceSettings.companyName}
                  isFullOrgAudit={
                    Boolean(
                      authUser.emailVerified &&
                        (authUser.email ?? '').toLowerCase() ===
                          BOOTSTRAPPED_OWNER_EMAIL.toLowerCase()
                    )
                  }
                  onExportComplete={({ filename, rowCount, scope }) => {
                    pushToast(
                      'Activity Log Exported',
                      `Downloaded ${rowCount} audit event${rowCount === 1 ? '' : 's'} to ${filename}.`,
                      'emerald'
                    );
                    void logActivity({
                      category: 'workspace',
                      action: 'Activity Log Exported',
                      summary: `Exported ${rowCount} audit record${
                        rowCount === 1 ? '' : 's'
                      } to CSV (${scope}).`,
                      details: `File: ${filename}`,
                      targetId: 'audit-csv',
                      targetLabel: scope,
                      severity: 'info',
                    });
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Elevation 3/4 Slide-Over Telemetry Drawers */}
      <DispatchDetailDrawer
        dispatch={inspectedDispatch}
        onClose={() => setInspectedDispatchId(null)}
        onToggleStop={handleToggleRouteStop}
        onUpdateStatus={handleUpdateDispatchStatus}
        onOptimizeRoute={(dispatchId) => {
          setInspectedDispatchId(null);
          handleOpenOptimizer(dispatchId);
        }}
        canDelete={activePortal === 'owner'}
        onDelete={handleDeleteDispatch}
      />

      {(activePortal === 'owner' || activePortal === 'employee') && (
        <HardwareDetailDrawer
          unit={inspectedHardware}
          currencySymbol={currencySymbol}
          showFinancials={activePortal === 'owner'}
          onClose={() => setInspectedHardwareId(null)}
          onReboot={handleRebootHardware}
          onTriggerRestock={handleTriggerRestockFromUnit}
          canDelete={activePortal === 'owner'}
          onDelete={handleDeleteHardwareUnit}
        />
      )}

      {/* Elevation 4 Action Modals (Strictly Mounted per Portal) */}
      {activePortal === 'owner' && (
        <WorkspaceSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={workspaceSettings}
          totalRecordCount={totalRecordCount}
          onSaveSettings={handleSaveWorkspaceSettings}
          onClearAllData={handleClearAllOperationalData}
          onLoadSampleData={handleLoadSampleDemoData}
        />
      )}

      <RouteOptimizerModal
        open={optimizerOpen}
        onClose={() => setOptimizerOpen(false)}
        dispatches={optimizerScopedDispatches}
        initialDispatchId={optimizerTargetId}
        onApplySingle={handleApplySingleOptimization}
        onApplyBatchAll={handleApplyBatchOptimization}
      />

      {(activePortal === 'owner' || activePortal === 'employee') && (
        <CreateDispatchModal
          open={createDispatchOpen}
          onClose={() => setCreateDispatchOpen(false)}
          teamMembers={teamMemberNames}
          vendorPartners={vendorPartners}
          onCreate={handleCreateDispatch}
        />
      )}

      {activePortal === 'owner' && (
        <>
          <CreateHardwareModal
            open={createHardwareOpen}
            onClose={() => setCreateHardwareOpen(false)}
            vendorPartners={vendorPartners}
            onCreate={handleCreateHardwareUnit}
          />

          <CreateVendorPartnerModal
            open={createVendorPartnerOpen}
            onClose={() => setCreateVendorPartnerOpen(false)}
            onCreate={handleCreateVendorPartner}
          />
        </>
      )}

      {(activePortal === 'owner' || activePortal === 'vendor') && (
        <CreateRestockModal
          open={createRestockOpen}
          onClose={() => setCreateRestockOpen(false)}
          hardwareUnits={hardwareUnits}
          vendorPartners={activePortal === 'owner' ? vendorPartners : []}
          currencySymbol={currencySymbol}
          canAddHardware={activePortal === 'owner'}
          onRequestAddHardware={() => setCreateHardwareOpen(true)}
          onCreate={handleCreateRestockOrder}
        />
      )}

      {(activePortal === 'owner' || activePortal === 'employee') && (
        <CreateIncidentModal
          open={createIncidentOpen}
          onClose={() => setCreateIncidentOpen(false)}
          hardwareUnits={hardwareUnits}
          dispatches={dispatches}
          teamMembers={teamMemberNames}
          onCreate={handleCreateIncident}
        />
      )}

      {/* Non-Intrusive Toast Feedback Stack */}
      <div
        aria-live="polite"
        className="fixed bottom-20 md:bottom-5 right-4 md:right-6 z-50 flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((toast) => {
          const accent =
            toast.tone === 'emerald'
              ? 'border-l-[#10B981]'
              : toast.tone === 'amber'
              ? 'border-l-[#F59E0B]'
              : toast.tone === 'rose'
              ? 'border-l-[#EF4444]'
              : toast.tone === 'teal'
              ? 'border-l-[#0D9488]'
              : 'border-l-[#4F46E5]';
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-white border border-[#E2E8F0] border-l-4 ${accent} rounded-xl px-4 py-3 elevation-3 flex items-start justify-between gap-3`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-[#0F172A] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#0F172A]">
                    {toast.title}
                  </div>
                  {toast.detail && (
                    <div className="text-[12px] text-[#475569] mt-0.5 leading-4">
                      {toast.detail}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== toast.id))
                }
                className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
