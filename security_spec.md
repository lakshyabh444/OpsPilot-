# OpsPilot Operations Hub — Security Specification (Phase 0)

## 1. Data Invariants
1. **Verified Identity**: Every read and write across all collections requires a signed-in user with `request.auth.token.email_verified == true`.
2. **PII Isolation**: User email addresses and phone numbers live exclusively inside `/userProfiles/{userId}` and are readable/writable only by the owning user or the Business Owner (`owner` role / bootstrapped owner `lakshyabh444@gmail.com`).
3. **Zero Privilege Escalation**: Non-owner users cannot self-assign `role: "owner"` during registration in `/userRoles/{userId}` and cannot modify their own `role` or `active` fields after creation. Only an active Business Owner can promote or deactivate accounts.
4. **Tiered Operational RBAC**:
   - **Business Owner (`owner`)**: Full read/write across `dispatches`, `hardwareUnits`, `restockOrders`, `incidents`, and team `userRoles`.
   - **Employee (`employee`)**: Can update route stops, optimize routes, update dispatch status, reboot/restock vending units, and acknowledge/resolve/comment on incidents. Cannot approve vendor invoices/orders or alter user roles or delete records.
   - **Vendor (`vendor`)**: Scoped strictly to `restockOrders` (and vendor-channel contractor dispatches) to advance approved orders to `Dispatched` / `Completed` and update partner runs. Cannot modify internal fleet routes, incidents, or user roles.
5. **Terminal State Locking**: Once a `FleetDispatch` reaches `Delivered`, a `VendorRestockOrder` reaches `Completed`, or an `OpsIncident` reaches `Resolved`, non-owner users cannot modify it further.
6. **Temporal & Structural Integrity**: All `createdAt` (on create) and `updatedAt` (on create/update) fields MUST equal `request.time`; `createdAt` and `createdBy` are immutable on update; every string and list enforces explicit `.size()` bounds; every document ID enforces `isValidId()`.
7. **Owner-Only Branding & Partner Registry**: Only an active Business Owner (`isOwner()`) may create, update, or delete `/workspaceSettings/main` or `/vendorPartners/{partnerId}`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: Anonymous client attempts to read `/dispatches/DSP-8841`. Expected: `PERMISSION_DENIED`.
2. **Unverified Email Spoofing**: Authenticated user with `email: "lakshyabh444@gmail.com"` and `email_verified: false` attempts to read `/userProfiles/otherUser`. Expected: `PERMISSION_DENIED`.
3. **Self-Assigned Owner Escalation (Create)**: Regular user creates `/userRoles/{uid}` with `role: "owner"`. Expected: `PERMISSION_DENIED`.
4. **Self-Promotion Escalation (Update)**: Employee updates own `/userRoles/{uid}` changing `role` from `"employee"` to `"owner"`. Expected: `PERMISSION_DENIED`.
5. **PII Blanket Read Attack**: Employee attempts `get` on another user's `/userProfiles/{victimUid}`. Expected: `PERMISSION_DENIED`.
6. **Shadow Field Injection**: Employee updates `/incidents/INC-4901` adding an undeclared ghost key `isApprovedByAdmin: true`. Expected: `PERMISSION_DENIED`.
7. **ID Poisoning Attack**: User creates `/incidents/` with a 250-character document ID containing spaces and slashes. Expected: `PERMISSION_DENIED`.
8. **Value Poisoning Attack**: Employee updates `assignedTech` on `/incidents/INC-4901` with a 5,000-character string. Expected: `PERMISSION_DENIED`.
9. **Terminal State Violation**: Vendor attempts to mutate a `Completed` order in `/restockOrders/RST-2095` back to `Pending Approval`. Expected: `PERMISSION_DENIED`.
10. **Role Boundary Violation (Vendor → Incident)**: Vendor user attempts to resolve `/incidents/INC-4901`. Expected: `PERMISSION_DENIED`.
11. **Role Boundary Violation (Vendor → Approval Bypass)**: Vendor user attempts to self-approve a `Pending Approval` order directly to `Approved`. Expected: `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: User creates `/dispatches/DSP-9999` with a backdated `createdAt` instead of `request.time`. Expected: `PERMISSION_DENIED`.
