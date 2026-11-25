/**
 * Phase 0 Security Rules Verification Matrix (Dirty Dozen Payloads)
 * Documents and validates the 12 adversarial test cases enforced by firestore.rules.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  actor: {
    uid: string | null;
    email?: string;
    emailVerified?: boolean;
    role?: 'owner' | 'employee' | 'vendor';
  };
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Read of Fleet Dispatch',
    actor: { uid: null },
    operation: 'get',
    path: '/dispatches/DSP-8841',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerifiedUser() gate on /dispatches/{dispatchId}',
  },
  {
    id: 2,
    name: 'Unverified Email Admin Spoof Attempt',
    actor: {
      uid: 'spoof-uid',
      email: 'lakshyabh444@gmail.com',
      emailVerified: false,
    },
    operation: 'get',
    path: '/userProfiles/victim-uid',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerifiedUser() requires request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'Self-Assigned Business Owner Role on Registration',
    actor: {
      uid: 'new-user-1',
      email: 'intruder@example.com',
      emailVerified: true,
    },
    operation: 'create',
    path: '/userRoles/new-user-1',
    payload: {
      userId: 'new-user-1',
      orgId: 'opspilot-main',
      displayName: 'Intruder',
      role: 'owner',
      requestedRole: 'owner',
      active: true,
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'Non-bootstrapped users restricted to role in [employee, vendor] on create',
  },
  {
    id: 4,
    name: 'Employee Self-Promotion to Owner',
    actor: {
      uid: 'emp-1',
      email: 'emp1@example.com',
      emailVerified: true,
      role: 'employee',
    },
    operation: 'update',
    path: '/userRoles/emp-1',
    payload: { role: 'owner' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'Self-update affectedKeys().hasOnly([displayName, vendorOrganization, requestedRole, updatedAt])',
  },
  {
    id: 5,
    name: 'Cross-User Private PII Profile Access',
    actor: {
      uid: 'emp-1',
      email: 'emp1@example.com',
      emailVerified: true,
      role: 'employee',
    },
    operation: 'get',
    path: '/userProfiles/vendor-1',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'PII isolation restricts /userProfiles/{userId} get to isSelf(userId) || isOwner()',
  },
  {
    id: 6,
    name: 'Shadow Field Injection on Incident Update',
    actor: {
      uid: 'emp-1',
      email: 'emp1@example.com',
      emailVerified: true,
      role: 'employee',
    },
    operation: 'update',
    path: '/incidents/INC-4901',
    payload: { acknowledged: true, isApprovedByAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidIncident() hasOnly() + action affectedKeys().hasOnly() reject ghost keys',
  },
  {
    id: 7,
    name: 'Document ID Poisoning with Oversized/Invalid Characters',
    actor: {
      uid: 'emp-1',
      email: 'emp1@example.com',
      emailVerified: true,
      role: 'employee',
    },
    operation: 'create',
    path: `/incidents/${'bad id!'.repeat(40)}`,
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidId(incidentId) enforces <= 128 chars matching ^[a-zA-Z0-9_\\-]+$',
  },
  {
    id: 8,
    name: 'Value Poisoning on Allowed Update Field',
    actor: {
      uid: 'emp-1',
      email: 'emp1@example.com',
      emailVerified: true,
      role: 'employee',
    },
    operation: 'update',
    path: '/incidents/INC-4901',
    payload: { assignedTech: 'X'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidIncident(incoming()) enforces assignedTech.size() <= 100 on every update',
  },
  {
    id: 9,
    name: 'Terminal State Tampering on Completed Restock Order',
    actor: {
      uid: 'vendor-1',
      email: 'vendor1@example.com',
      emailVerified: true,
      role: 'vendor',
    },
    operation: 'update',
    path: '/restockOrders/RST-2095',
    payload: { status: 'Pending Approval' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'Terminal state lock existing().status != Completed for non-owner updates',
  },
  {
    id: 10,
    name: 'Vendor Attempting to Modify Internal Field Incident',
    actor: {
      uid: 'vendor-1',
      email: 'vendor1@example.com',
      emailVerified: true,
      role: 'vendor',
    },
    operation: 'update',
    path: '/incidents/INC-4901',
    payload: { severity: 'Resolved' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: '/incidents updates require isOwner() || isEmployee()',
  },
  {
    id: 11,
    name: 'Vendor Self-Approval Bypass on Pending Restock Order',
    actor: {
      uid: 'vendor-1',
      email: 'vendor1@example.com',
      emailVerified: true,
      role: 'vendor',
    },
    operation: 'update',
    path: '/restockOrders/RST-2091',
    payload: { status: 'Approved' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'Pending Approval -> Approved transition restricted strictly to isOwner()',
  },
  {
    id: 12,
    name: 'Backdated Client Timestamp Forgery',
    actor: {
      uid: 'emp-1',
      email: 'emp1@example.com',
      emailVerified: true,
      role: 'employee',
    },
    operation: 'create',
    path: '/dispatches/DSP-9999',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'Strict temporal integrity incoming().createdAt == request.time',
  },
];
