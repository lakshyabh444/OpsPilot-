import React, { useMemo, useState } from 'react';
import {
  CheckCheck,
  Clock,
  PackageCheck,
  Plus,
  Trash2,
  Truck,
  Warehouse,
} from 'lucide-react';
import {
  RestockStatus,
  UserRoleType,
  VendorPartnerRecord,
  VendorRestockOrder,
} from '../../types/ops';
import {
  OpsButton,
  OpsCard,
  OpsCheckbox,
  StatusBadge,
} from '../ui/OpsPrimitives';

interface VendorPortalViewProps {
  restockOrders: VendorRestockOrder[];
  vendorPartners: VendorPartnerRecord[];
  searchQuery: string;
  effectiveRole: UserRoleType;
  vendorOrganization?: string;
  currencySymbol: string;
  onBatchApprove: (orderIds: string[]) => void;
  onAdvanceOrderStatus: (orderId: string, nextStatus: RestockStatus) => void;
  onOpenNewRestockModal: () => void;
  onOpenAddPartnerModal: () => void;
  onDeletePartner: (partnerId: string) => void;
  onDeleteOrder: (orderId: string) => void;
}

type OrderFilter = 'All' | RestockStatus;

export function VendorPortalView({
  restockOrders,
  vendorPartners,
  searchQuery,
  effectiveRole,
  vendorOrganization,
  currencySymbol,
  onBatchApprove,
  onAdvanceOrderStatus,
  onOpenNewRestockModal,
  onOpenAddPartnerModal,
  onDeletePartner,
  onDeleteOrder,
}: VendorPortalViewProps) {
  const isOwner = effectiveRole === 'owner';
  const [statusFilter, setStatusFilter] = useState<OrderFilter>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return restockOrders.filter((o) => {
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.vendorName.toLowerCase().includes(q) ||
        o.targetSite.toLowerCase().includes(q) ||
        o.unitId.toLowerCase().includes(q) ||
        o.zone.toLowerCase().includes(q)
      );
    });
  }, [restockOrders, statusFilter, searchQuery]);

  const approvableIds = useMemo(
    () =>
      filtered
        .filter((o) => o.status === 'Pending Approval')
        .map((o) => o.id),
    [filtered]
  );

  const selectedApprovable = selectedIds.filter((id) =>
    approvableIds.includes(id)
  );

  const allApprovableChecked =
    approvableIds.length > 0 &&
    approvableIds.every((id) => selectedIds.includes(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allApprovableChecked) {
      setSelectedIds([]);
    } else {
      setSelectedIds(approvableIds);
    }
  };

  const handleApproveSelected = () => {
    if (selectedApprovable.length === 0) return;
    onBatchApprove(selectedApprovable);
    setSelectedIds([]);
  };

  const totals = useMemo(() => {
    const pending = restockOrders.filter((o) => o.status === 'Pending Approval');
    const approved = restockOrders.filter((o) => o.status === 'Approved');
    const dispatched = restockOrders.filter((o) => o.status === 'Dispatched');
    const completed = restockOrders.filter((o) => o.status === 'Completed');
    const totalPendingCost = pending.reduce((sum, o) => sum + o.estimatedCost, 0);
    const totalSkus = restockOrders
      .filter((o) => o.status !== 'Completed')
      .reduce((sum, o) => sum + o.skuCount, 0);
    const avgSla =
      vendorPartners.length > 0
        ? (
            vendorPartners.reduce((sum, p) => sum + p.slaTargetPct, 0) /
            vendorPartners.length
          ).toFixed(1)
        : null;
    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      dispatchedCount: dispatched.length,
      activeVendorCount: approved.length + dispatched.length,
      completedCount: completed.length,
      totalPendingCost,
      totalSkus,
      avgSla,
    };
  }, [restockOrders, vendorPartners]);

  return (
    <div className="space-y-6">
      {/* Header with Teal Vendor Channel Indicator */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="mb-2">
            <StatusBadge state="vendor" label="Vendor & Partner Channel" />
          </div>
          <h1 className="text-[24px] md:text-[30px] font-semibold leading-[32px] md:leading-[38px] tracking-[-0.02em] text-[#0F172A]">
            {isOwner
              ? 'Vendor Restocking & Approvals'
              : `Vendor Restocking Portal${vendorOrganization ? ` · ${vendorOrganization}` : ''}`}
          </h1>
          <p className="text-[14px] text-[#475569] mt-1">
            {isOwner
              ? 'Manage your registered vendor partners, approve pending restock orders, and track completed machine refills.'
              : 'View your assigned restock orders below. Mark Approved orders as Dispatched when on the way, and Confirm Fill once restocked.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isOwner && selectedApprovable.length > 0 && (
            <OpsButton variant="vendor" size="compact" onClick={handleApproveSelected}>
              <CheckCheck className="h-4 w-4" />
              Approve Selected ({selectedApprovable.length})
            </OpsButton>
          )}
          {isOwner && (
            <OpsButton variant="secondary" size="compact" onClick={onOpenAddPartnerModal}>
              <Plus className="h-3.5 w-3.5" />
              Add Vendor Partner
            </OpsButton>
          )}
          <OpsButton
            variant="vendor"
            size="compact"
            onClick={onOpenNewRestockModal}
          >
            {isOwner ? 'New Restock Order' : 'Submit Restock Proposal'}
          </OpsButton>
        </div>
      </div>

      {/* Partner Channel Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Awaiting Approval
            </span>
            <Clock className="h-4 w-4 text-[#0D9488]" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
              {totals.pendingCount}
            </span>
            {isOwner ? (
              <span className="text-[12px] font-mono font-semibold text-[#115E59] tabular-nums-strict">
                {currencySymbol}
                {totals.totalPendingCost.toLocaleString()} est.
              </span>
            ) : (
              <span className="text-[12px] font-medium text-[#475569]">
                Pending owner review
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              {isOwner ? 'Active Partner Runs' : 'Ready & In Transit'}
            </span>
            <Truck className="h-4 w-4 text-[#0D9488]" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
              {isOwner ? totals.dispatchedCount : totals.activeVendorCount}
            </span>
            <span className="text-[12px] text-[#475569] tabular-nums-strict">
              {totals.totalSkus} SKUs in pipeline
            </span>
          </div>
        </div>

        {isOwner ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                Registered Partners
              </span>
              <PackageCheck className="h-4 w-4 text-[#10B981]" />
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
                {vendorPartners.length}
              </span>
              <span className="text-[12px] font-medium text-[#065F46]">
                {totals.avgSla ? `${totals.avgSla}% avg SLA target` : 'Add partners below'}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                Completed Refills
              </span>
              <PackageCheck className="h-4 w-4 text-[#10B981]" />
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <span className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0F172A] tabular-nums-strict">
                {totals.completedCount}
              </span>
              <span className="text-[12px] font-medium text-[#065F46]">
                Verified deliveries
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live Registered Partner Contractors Grid (Owner Only — Hidden from External Vendors) */}
      {isOwner && (vendorPartners.length === 0 ? (
        <OpsCard
          title="Registered Vendor Partners"
          subtitle="Add your suppliers and third-party logistics partners"
        >
          <div className="py-6 text-center">
            <Warehouse className="h-8 w-8 text-[#94A3B8] mx-auto mb-2" />
            <div className="text-[14px] font-semibold text-[#0F172A]">
              No vendor partners added yet
            </div>
            <p className="text-[12px] text-[#475569] mt-1 max-w-md mx-auto">
              Register your real vendor companies so their contacts, SLA targets, and order volumes track automatically here.
            </p>
            {isOwner && (
              <div className="mt-4">
                <OpsButton variant="vendor" size="compact" onClick={onOpenAddPartnerModal}>
                  <Plus className="h-3.5 w-3.5" />
                  Add First Vendor Partner
                </OpsButton>
              </div>
            )}
          </div>
        </OpsCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {vendorPartners.map((partner) => {
            const partnerOrders = restockOrders.filter(
              (o) => o.vendorName.toLowerCase() === partner.name.toLowerCase()
            );
            const activeCount = partnerOrders.filter(
              (o) => o.status !== 'Completed'
            ).length;
            const totalUnits = partnerOrders.reduce((sum, o) => sum + o.skuCount, 0);

            return (
              <div
                key={partner.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1 elevation-2-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-[#0F172A] truncate">
                      {partner.name}
                    </h3>
                    <p className="text-[12px] text-[#475569] mt-0.5 truncate">
                      Dispatch Lead: {partner.lead}
                    </p>
                    {partner.contactNote && (
                      <p className="text-[11px] text-[#64748B] mt-1 truncate">
                        {partner.contactNote}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge
                      state={partner.slaTargetPct >= 95 ? 'vendor' : 'warning'}
                      label={`${partner.slaTargetPct}% SLA`}
                      pulse={false}
                    />
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => onDeletePartner(partner.id)}
                        title="Remove vendor partner"
                        aria-label={`Remove ${partner.name}`}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F1F5F9] grid grid-cols-3 gap-2 tabular-nums-strict">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                      Active Orders
                    </div>
                    <div className="text-[16px] font-semibold text-[#0F172A] mt-0.5">
                      {activeCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                      Turnaround
                    </div>
                    <div className="text-[16px] font-semibold text-[#0F172A] mt-0.5">
                      {partner.avgTurnaroundMin}m
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                      Order SKUs
                    </div>
                    <div className="text-[16px] font-semibold text-[#0F172A] mt-0.5">
                      {totalUnits.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Automated Restocking Queue Table */}
      <OpsCard
        title={isOwner ? 'Restocking Orders Queue' : 'My Assigned Restocking Orders'}
        subtitle={
          isOwner
            ? 'Select pending orders for batch approval or advance individual partner handoffs'
            : 'Advance approved orders to Dispatched when on the way, then Confirm Fill after restocking'
        }
        bodyClassName="p-0"
        actions={
          <div className="inline-flex flex-wrap items-center p-1 bg-[#F1F5F9] rounded-lg gap-1">
            {(['All', 'Pending Approval', 'Approved', 'Dispatched', 'Completed'] as OrderFilter[]).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
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
        }
      >
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Warehouse className="h-8 w-8 text-[#94A3B8] mx-auto mb-2" />
            <div className="text-[15px] font-semibold text-[#0F172A]">
              No restock orders in this queue
            </div>
            <p className="text-[13px] text-[#475569] mt-1">
              Trigger a restock from Vending Machines or create a new vendor order.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-b-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  {isOwner && (
                    <th className="py-3 pl-4 pr-2 w-10">
                      <OpsCheckbox
                        checked={allApprovableChecked}
                        onChange={toggleSelectAll}
                        ariaLabel="Select all pending restock orders"
                        disabled={approvableIds.length === 0}
                      />
                    </th>
                  )}
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Order / Target Unit
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Contractor Partner
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    Status
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                    {isOwner ? 'Load / Cost' : 'Load / Weight'}
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                    SLA Window
                  </th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] text-right">
                    Workflow
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((order) => {
                  const canCheck = order.status === 'Pending Approval';
                  const badgeState =
                    order.status === 'Completed'
                      ? 'operational'
                      : order.status === 'Pending Approval'
                      ? order.priority === 'Urgent'
                        ? 'warning'
                        : 'vendor'
                      : 'vendor';

                  return (
                    <tr
                      key={order.id}
                      className="h-[56px] bg-white hover:bg-[#F8FAFC] transition-colors"
                    >
                      {isOwner && (
                        <td className="pl-4 pr-2 py-2.5">
                          <OpsCheckbox
                            checked={selectedIds.includes(order.id)}
                            onChange={() => toggleSelect(order.id)}
                            ariaLabel={`Select restock order ${order.id}`}
                            disabled={!canCheck}
                          />
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-semibold text-[#0F172A]">
                            {order.id}
                          </span>
                          <span className="font-mono text-[12px] text-[#0D9488] font-medium">
                            {order.unitId}
                          </span>
                          {order.autoTriggered && (
                            <span className="text-[11px] text-[#475569]">· Auto</span>
                          )}
                        </div>
                        <div className="text-[12px] text-[#475569] truncate max-w-[230px]">
                          {order.targetSite}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-[13px] font-medium text-[#0F172A] whitespace-nowrap">
                          {order.vendorName}
                        </div>
                        <div className="text-[12px] text-[#475569]">
                          Lead: {order.contractorLead} · {order.zone}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          state={badgeState}
                          label={order.status}
                          pulse={false}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums-strict whitespace-nowrap">
                        {isOwner ? (
                          <>
                            <div className="font-mono text-[13px] font-semibold text-[#0F172A]">
                              {currencySymbol}
                              {order.estimatedCost.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-[#475569]">
                              {order.skuCount} SKUs · {order.palletWeightKg}kg
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-mono text-[13px] font-semibold text-[#0F172A]">
                              {order.skuCount} SKUs
                            </div>
                            <div className="text-[11px] text-[#475569]">
                              {order.palletWeightKg}kg pallet
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-[#0F172A] tabular-nums-strict whitespace-nowrap">
                        {order.slaWindow}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {order.status === 'Pending Approval' &&
                            (isOwner ? (
                              <OpsButton
                                variant="vendor"
                                size="compact"
                                onClick={() => onAdvanceOrderStatus(order.id, 'Approved')}
                              >
                                Approve
                              </OpsButton>
                            ) : (
                              <span className="text-[12px] font-medium text-[#92400E]">
                                Awaiting Owner Approval
                              </span>
                            ))}
                          {order.status === 'Approved' && (
                            <OpsButton
                              variant="primary"
                              size="compact"
                              onClick={() => onAdvanceOrderStatus(order.id, 'Dispatched')}
                            >
                              Mark Dispatched
                            </OpsButton>
                          )}
                          {order.status === 'Dispatched' && (
                            <OpsButton
                              variant="secondary"
                              size="compact"
                              onClick={() => onAdvanceOrderStatus(order.id, 'Completed')}
                            >
                              Confirm Fill
                            </OpsButton>
                          )}
                          {order.status === 'Completed' && (
                            <span className="text-[12px] font-medium text-[#065F46]">
                              Verified
                            </span>
                          )}
                          {isOwner && (
                            <OpsButton
                              variant="ghost"
                              size="compact"
                              onClick={() => onDeleteOrder(order.id)}
                              title="Delete order"
                              aria-label={`Delete order ${order.id}`}
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
