import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  INITIAL_DISPATCHES,
  INITIAL_HARDWARE,
  INITIAL_INCIDENTS,
  INITIAL_RESTOCK_ORDERS,
  VENDOR_PARTNERS,
} from '../data/initialOpsData';
import {
  BOOTSTRAPPED_OWNER_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
  ORG_ID,
} from '../firebase';
import {
  ActivityLogCategory,
  ActivityLogSeverity,
  FleetDispatch,
  OpsIncident,
  UserProfileRecord,
  UserRoleRecord,
  UserRoleType,
  VendingUnit,
  VendorPartnerRecord,
  VendorRestockOrder,
  WorkspaceSettingsRecord,
} from '../types/ops';

function clampString(value: string, max: number, fallback = 'N/A'): string {
  const cleaned = (value || '').trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, max);
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 128);
  return cleaned || `ID-${Date.now()}`;
}

export async function ensureUserAccountRecords(
  user: User,
  selectedRole: UserRoleType,
  vendorOrganization?: string
): Promise<{
  roleDoc: UserRoleRecord;
  profileDoc: UserProfileRecord;
  isNewAccount: boolean;
}> {
  const uid = sanitizeId(user.uid);
  const email = clampString(user.email ?? '', 200, 'user@opspilot.app');
  const displayName = clampString(
    user.displayName ?? email.split('@')[0] ?? 'Team Member',
    100,
    'Team Member'
  );
  const isBootstrappedOwner =
    user.emailVerified && email.toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL.toLowerCase();

  const profileRef = doc(db, 'userProfiles', uid);
  const roleRef = doc(db, 'userRoles', uid);

  let existingProfile: UserProfileRecord | null = null;
  try {
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      existingProfile = snap.data() as UserProfileRecord;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `userProfiles/${uid}`);
  }

  if (!existingProfile) {
    const profilePayload = {
      userId: uid,
      email,
      displayName,
      photoURL: clampString(user.photoURL ?? '', 500, ''),
      organization: clampString(vendorOrganization ?? '', 120, ''),
      phone: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(profileRef, profilePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `userProfiles/${uid}`);
    }
    existingProfile = {
      userId: uid,
      email,
      displayName,
      photoURL: profilePayload.photoURL,
      organization: profilePayload.organization,
      phone: '',
    };
  }

  let existingRole: UserRoleRecord | null = null;
  try {
    const snap = await getDoc(roleRef);
    if (snap.exists()) {
      existingRole = snap.data() as UserRoleRecord;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `userRoles/${uid}`);
  }

  let isNewAccount = false;

  if (!existingRole) {
    isNewAccount = true;
    // Non-bootstrapped users cannot self-assign 'owner' on creation (enforced in Firestore rules).
    // If they select 'owner', they start as 'employee' with requestedRole: 'owner' for Owner approval.
    const assignedRole: UserRoleType = isBootstrappedOwner
      ? 'owner'
      : selectedRole === 'vendor'
      ? 'vendor'
      : 'employee';

    const rolePayload = {
      userId: uid,
      orgId: ORG_ID,
      displayName,
      role: assignedRole,
      requestedRole: isBootstrappedOwner ? 'owner' : selectedRole,
      vendorOrganization: clampString(vendorOrganization ?? '', 120, ''),
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(roleRef, rolePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `userRoles/${uid}`);
    }
    existingRole = {
      userId: uid,
      orgId: ORG_ID,
      displayName,
      role: assignedRole,
      requestedRole: rolePayload.requestedRole,
      vendorOrganization: rolePayload.vendorOrganization,
      active: true,
    };
  }

  return { roleDoc: existingRole, profileDoc: existingProfile, isNewAccount };
}

export async function updateOwnRoleRequest(
  uid: string,
  requestedRole: UserRoleType,
  vendorOrganization?: string
) {
  const path = `userRoles/${uid}`;
  try {
    await updateDoc(doc(db, 'userRoles', uid), {
      requestedRole,
      vendorOrganization: clampString(vendorOrganization ?? '', 120, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateTeamMemberRole(
  targetUid: string,
  patch: {
    role: UserRoleType;
    requestedRole: UserRoleType;
    vendorOrganization: string;
    active: boolean;
  }
) {
  const path = `userRoles/${targetUid}`;
  try {
    await updateDoc(doc(db, 'userRoles', targetUid), {
      role: patch.role,
      requestedRole: patch.requestedRole,
      vendorOrganization: clampString(patch.vendorOrganization, 120, ''),
      active: patch.active,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// =========================================================================
// Workspace Settings (Owner-managed branding, region & currency)
// =========================================================================
export async function saveWorkspaceSettingsDoc(
  settings: Pick<WorkspaceSettingsRecord, 'companyName' | 'regionName' | 'currencySymbol'>,
  ownerUid: string
) {
  const path = 'workspaceSettings/main';
  const ref = doc(db, 'workspaceSettings', 'main');
  const uid = sanitizeId(ownerUid);
  const companyName = clampString(settings.companyName, 100, 'OpsPilot');
  const regionName = clampString(settings.regionName, 100, '');
  const currencySymbol = clampString(settings.currencySymbol, 5, '$');

  let existsAlready = false;
  try {
    const snap = await getDoc(ref);
    existsAlready = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (existsAlready) {
    try {
      await updateDoc(ref, {
        companyName,
        regionName,
        currencySymbol,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(ref, {
        id: 'main',
        orgId: ORG_ID,
        companyName,
        regionName,
        currencySymbol,
        updatedBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

// =========================================================================
// Vendor Partners Registry
// =========================================================================
export async function createVendorPartnerDoc(
  partner: Omit<VendorPartnerRecord, 'orgId'>,
  ownerUid: string
) {
  const id = sanitizeId(partner.id);
  const path = `vendorPartners/${id}`;
  try {
    await setDoc(doc(db, 'vendorPartners', id), {
      id,
      orgId: ORG_ID,
      name: clampString(partner.name, 120, 'Partner Co'),
      lead: clampString(partner.lead, 80, 'Dispatch Lead'),
      slaTargetPct: Math.max(0, Math.min(100, Number(partner.slaTargetPct) || 95)),
      avgTurnaroundMin: Math.max(1, Math.min(1440, Number(partner.avgTurnaroundMin) || 45)),
      contactNote: clampString(partner.contactNote ?? '', 200, ''),
      createdBy: sanitizeId(ownerUid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteVendorPartnerDoc(partnerId: string) {
  const id = sanitizeId(partnerId);
  const path = `vendorPartners/${id}`;
  try {
    await deleteDoc(doc(db, 'vendorPartners', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================================
// Clean-Slate Clear & Optional Sample Demo Loader (Owner-only)
// =========================================================================
export async function clearAllOperationalData() {
  // Delete restockOrders BEFORE hardwareUnits to respect referential structure
  const collectionsToClear = [
    'restockOrders',
    'dispatches',
    'incidents',
    'hardwareUnits',
    'vendorPartners',
  ] as const;

  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(
        query(collection(db, colName), where('orgId', '==', ORG_ID))
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, colName);
    }
  }
}

export async function seedSampleDemoData(ownerUid: string) {
  const uid = sanitizeId(ownerUid);

  // Clear existing records first so sample demo loads cleanly
  await clearAllOperationalData();

  // 1. Seed sample vendorPartners
  for (let i = 0; i < VENDOR_PARTNERS.length; i++) {
    const partner = VENDOR_PARTNERS[i];
    const id = `VND-PRT-0${i + 1}`;
    const path = `vendorPartners/${id}`;
    try {
      await setDoc(doc(db, 'vendorPartners', id), {
        id,
        orgId: ORG_ID,
        name: partner.name,
        lead: partner.lead,
        slaTargetPct: partner.slaCompliancePct,
        avgTurnaroundMin: partner.avgTurnaroundMin,
        contactNote: 'Sample demonstration partner',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 2. Seed hardwareUnits FIRST (required by exists() guard on restockOrders)
  for (const unit of INITIAL_HARDWARE) {
    const path = `hardwareUnits/${unit.id}`;
    try {
      await setDoc(doc(db, 'hardwareUnits', unit.id), {
        ...unit,
        orgId: ORG_ID,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 3. Seed dispatches
  for (const dispatch of INITIAL_DISPATCHES) {
    const path = `dispatches/${dispatch.id}`;
    try {
      await setDoc(doc(db, 'dispatches', dispatch.id), {
        ...dispatch,
        orgId: ORG_ID,
        channel: dispatch.isVendorContractor ? 'vendor' : 'internal',
        isVendorContractor: Boolean(dispatch.isVendorContractor),
        contractorName: dispatch.contractorName ?? '',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 4. Seed restockOrders
  for (const order of INITIAL_RESTOCK_ORDERS) {
    const path = `restockOrders/${order.id}`;
    try {
      await setDoc(doc(db, 'restockOrders', order.id), {
        id: order.id,
        orgId: ORG_ID,
        channel: 'vendor',
        vendorName: order.vendorName,
        contractorLead: order.contractorLead,
        targetSite: order.targetSite,
        unitId: order.unitId,
        zone: order.zone,
        skuCount: order.skuCount,
        palletWeightKg: order.palletWeightKg,
        estimatedCost: order.estimatedCost,
        slaWindow: order.slaWindow,
        status: order.status,
        priority: order.priority,
        createdAtLabel: order.createdAt,
        autoTriggered: order.autoTriggered,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // 5. Seed incidents
  for (const incident of INITIAL_INCIDENTS) {
    const path = `incidents/${incident.id}`;
    try {
      await setDoc(doc(db, 'incidents', incident.id), {
        ...incident,
        orgId: ORG_ID,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  return true;
}

// =========================================================================
// Fleet Dispatches CRUD
// =========================================================================
export async function createDispatchDoc(dispatch: FleetDispatch, actorUid: string) {
  const id = sanitizeId(dispatch.id);
  const path = `dispatches/${id}`;
  try {
    await setDoc(doc(db, 'dispatches', id), {
      id,
      orgId: ORG_ID,
      channel: dispatch.isVendorContractor ? 'vendor' : 'internal',
      vehicleCode: clampString(dispatch.vehicleCode, 40, 'VEH-01'),
      vehicleType: dispatch.vehicleType,
      driverName: clampString(dispatch.driverName, 100, 'Assigned Driver'),
      driverInitials: clampString(dispatch.driverInitials, 4, 'DR'),
      routeCode: clampString(dispatch.routeCode, 40, 'RT-01'),
      corridor: clampString(dispatch.corridor, 160, 'Primary Corridor'),
      origin: clampString(dispatch.origin, 120, 'Main Hub'),
      destination: clampString(dispatch.destination, 120, 'Destination'),
      status: dispatch.status,
      state: dispatch.state,
      etaMinutes: Math.max(0, Math.min(1440, dispatch.etaMinutes)),
      etaFormatted: clampString(dispatch.etaFormatted, 30, 'TBD'),
      progressPct: Math.max(0, Math.min(100, dispatch.progressPct)),
      cargoFillPct: Math.max(0, Math.min(100, dispatch.cargoFillPct)),
      tempCelsius: Math.max(-30, Math.min(60, dispatch.tempCelsius)),
      stopsCompleted: dispatch.stopsCompleted,
      stopsTotal: Math.max(1, Math.min(25, dispatch.stopsTotal)),
      isVendorContractor: Boolean(dispatch.isVendorContractor),
      contractorName: clampString(dispatch.contractorName ?? '', 120, ''),
      coords: dispatch.coords,
      stops: dispatch.stops.slice(0, 25),
      createdBy: sanitizeId(actorUid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDispatchProgressDoc(
  dispatchId: string,
  patch: Pick<
    FleetDispatch,
    | 'status'
    | 'state'
    | 'progressPct'
    | 'etaFormatted'
    | 'etaMinutes'
    | 'stopsCompleted'
    | 'stops'
  >
) {
  const id = sanitizeId(dispatchId);
  const path = `dispatches/${id}`;
  try {
    await updateDoc(doc(db, 'dispatches', id), {
      status: patch.status,
      state: patch.state,
      progressPct: Math.max(0, Math.min(100, patch.progressPct)),
      etaFormatted: clampString(patch.etaFormatted, 30),
      etaMinutes: Math.max(0, Math.min(1440, patch.etaMinutes)),
      stopsCompleted: patch.stopsCompleted,
      stops: patch.stops.slice(0, 25),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateDispatchOptimizationDoc(dispatch: FleetDispatch) {
  const id = sanitizeId(dispatch.id);
  const path = `dispatches/${id}`;
  try {
    await updateDoc(doc(db, 'dispatches', id), {
      stops: dispatch.stops.slice(0, 25),
      etaMinutes: Math.max(0, Math.min(1440, dispatch.etaMinutes)),
      etaFormatted: clampString(dispatch.etaFormatted, 30),
      destination: clampString(dispatch.destination, 120),
      status: dispatch.status,
      state: dispatch.state,
      lastOptimizedAt: clampString(dispatch.lastOptimizedAt ?? '', 30, 'Now'),
      minutesSaved: Math.max(0, Math.min(600, dispatch.minutesSaved ?? 0)),
      optimizationStrategy: dispatch.optimizationStrategy ?? 'balanced',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDispatchDoc(dispatchId: string) {
  const id = sanitizeId(dispatchId);
  const path = `dispatches/${id}`;
  try {
    await deleteDoc(doc(db, 'dispatches', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================================
// Vending Hardware Units CRUD
// =========================================================================
export async function createHardwareUnitDoc(unit: VendingUnit, ownerUid: string) {
  const id = sanitizeId(unit.id);
  const path = `hardwareUnits/${id}`;
  try {
    await setDoc(doc(db, 'hardwareUnits', id), {
      id,
      orgId: ORG_ID,
      serial: clampString(unit.serial, 60, `SN-${id}`),
      model: clampString(unit.model, 80, 'Smart Kiosk'),
      siteName: clampString(unit.siteName, 140, 'Primary Site'),
      zone: clampString(unit.zone, 80, 'Main Zone'),
      status: unit.status,
      state: unit.state,
      stockPct: Math.max(0, Math.min(100, unit.stockPct)),
      tempCelsius: Math.max(-30, Math.min(60, unit.tempCelsius)),
      targetTempCelsius: Math.max(-30, Math.min(30, unit.targetTempCelsius)),
      cashlessStatus: unit.cashlessStatus,
      compressorHealthPct: Math.max(0, Math.min(100, unit.compressorHealthPct)),
      revenue24h: Math.max(0, Math.min(1000000, unit.revenue24h)),
      transactions24h: Math.max(0, Math.min(100000, unit.transactions24h)),
      lastHeartbeat: clampString(unit.lastHeartbeat, 40, 'Just now'),
      assignedVendor: clampString(unit.assignedVendor, 120, 'Internal Team'),
      coords: unit.coords,
      slots: unit.slots.slice(0, 24),
      createdBy: sanitizeId(ownerUid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateHardwareUnitDoc(
  unitId: string,
  patch: Partial<
    Pick<
      VendingUnit,
      | 'status'
      | 'state'
      | 'cashlessStatus'
      | 'tempCelsius'
      | 'compressorHealthPct'
      | 'lastHeartbeat'
      | 'stockPct'
      | 'slots'
    >
  >
) {
  const id = sanitizeId(unitId);
  const path = `hardwareUnits/${id}`;
  try {
    await updateDoc(doc(db, 'hardwareUnits', id), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteHardwareUnitDoc(unitId: string) {
  const id = sanitizeId(unitId);
  const path = `hardwareUnits/${id}`;
  try {
    await deleteDoc(doc(db, 'hardwareUnits', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================================
// Vendor Restock Orders CRUD
// =========================================================================
export async function createRestockOrderDoc(
  order: VendorRestockOrder,
  actorUid: string
) {
  const id = sanitizeId(order.id);
  const path = `restockOrders/${id}`;
  try {
    await setDoc(doc(db, 'restockOrders', id), {
      id,
      orgId: ORG_ID,
      channel: 'vendor',
      vendorName: clampString(order.vendorName, 120, 'Vendor Partner'),
      contractorLead: clampString(order.contractorLead, 80, 'Dispatch Lead'),
      targetSite: clampString(order.targetSite, 140, 'Kiosk Site'),
      unitId: sanitizeId(order.unitId),
      zone: clampString(order.zone, 80, 'Main Zone'),
      skuCount: Math.max(1, Math.min(5000, order.skuCount)),
      palletWeightKg: Math.max(1, Math.min(10000, order.palletWeightKg)),
      estimatedCost: Math.max(0, Math.min(500000, order.estimatedCost)),
      slaWindow: clampString(order.slaWindow, 60, 'Today'),
      status: order.status,
      priority: order.priority,
      createdAtLabel: clampString(order.createdAt, 30, 'Now'),
      autoTriggered: Boolean(order.autoTriggered),
      createdBy: sanitizeId(actorUid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateRestockOrderStatusDoc(
  orderId: string,
  status: VendorRestockOrder['status']
) {
  const id = sanitizeId(orderId);
  const path = `restockOrders/${id}`;
  try {
    await updateDoc(doc(db, 'restockOrders', id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteRestockOrderDoc(orderId: string) {
  const id = sanitizeId(orderId);
  const path = `restockOrders/${id}`;
  try {
    await deleteDoc(doc(db, 'restockOrders', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================================
// Operational Incidents CRUD
// =========================================================================
export async function createIncidentDoc(incident: OpsIncident, actorUid: string) {
  const id = sanitizeId(incident.id);
  const path = `incidents/${id}`;
  try {
    await setDoc(doc(db, 'incidents', id), {
      id,
      orgId: ORG_ID,
      title: clampString(incident.title, 160, 'Field Incident'),
      assetId: sanitizeId(incident.assetId),
      assetCategory: incident.assetCategory,
      zone: clampString(incident.zone, 80, 'General'),
      severity: incident.severity,
      acknowledged: Boolean(incident.acknowledged),
      reportedAt: clampString(incident.reportedAt, 30, 'Now'),
      slaMinutesRemaining: Math.max(0, Math.min(10000, incident.slaMinutesRemaining)),
      assignedTech: clampString(incident.assignedTech, 100, 'Unassigned'),
      description: clampString(incident.description, 1000, 'Reported field issue.'),
      timeline: incident.timeline.slice(0, 100),
      createdBy: sanitizeId(actorUid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateIncidentDoc(
  incidentId: string,
  patch: Partial<
    Pick<
      OpsIncident,
      'acknowledged' | 'assignedTech' | 'timeline' | 'severity' | 'slaMinutesRemaining'
    >
  >
) {
  const id = sanitizeId(incidentId);
  const path = `incidents/${id}`;
  try {
    await updateDoc(doc(db, 'incidents', id), {
      ...patch,
      ...(patch.timeline ? { timeline: patch.timeline.slice(0, 100) } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteIncidentDoc(incidentId: string) {
  const id = sanitizeId(incidentId);
  const path = `incidents/${id}`;
  try {
    await deleteDoc(doc(db, 'incidents', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// =========================================================================
// Immutable Operational Activity & Audit Log (Append-Only)
// =========================================================================
export interface RecordActivityLogInput {
  category: ActivityLogCategory;
  action: string;
  summary: string;
  details?: string;
  targetId: string;
  targetLabel: string;
  actorUid: string;
  actorName: string;
  actorRole: UserRoleType;
  severity?: ActivityLogSeverity;
}

function clampMinTwo(value: string, max: number, fallback: string): string {
  const cleaned = clampString(value, max, fallback);
  return cleaned.length < 2 ? fallback : cleaned;
}

export async function recordActivityLog(input: RecordActivityLogInput) {
  const id = sanitizeId(
    `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  );
  const path = `activityLogs/${id}`;

  const payload: Record<string, unknown> = {
    id,
    orgId: ORG_ID,
    category: input.category,
    action: clampMinTwo(input.action, 80, 'Operational Update'),
    summary: clampMinTwo(input.summary, 240, 'Operational record updated.'),
    targetId: sanitizeId(input.targetId),
    targetLabel: clampString(input.targetLabel, 120, 'Record'),
    actorUid: sanitizeId(input.actorUid),
    actorName: clampString(input.actorName, 100, 'Team Member'),
    actorRole: input.actorRole,
    severity: input.severity ?? 'info',
    createdAt: serverTimestamp(),
  };

  if (input.details && input.details.trim()) {
    payload.details = clampString(input.details, 400, '');
  }

  try {
    await setDoc(doc(db, 'activityLogs', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
