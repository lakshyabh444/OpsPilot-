import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cpu,
  Download,
  Lock,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import {
  ActivityLogCategory,
  ActivityLogRecord,
  UserRoleType,
} from '../../types/ops';
import { exportActivityLogToCsv } from '../../utils/activityExport';
import { OpsButton, OpsCard } from '../ui/OpsPrimitives';

interface ActivityLogViewProps {
  logs: ActivityLogRecord[];
  searchQuery: string;
  companyName: string;
  isFullOrgAudit: boolean;
  onExportComplete?: (meta: { filename: string; rowCount: number; scope: string }) => void;
}

type CategoryFilter = 'all' | ActivityLogCategory;
type ActorRoleFilter = 'all' | UserRoleType;

const CATEGORY_META: Record<
  ActivityLogCategory,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconText: string;
  }
> = {
  dispatch: {
    label: 'Dispatch',
    icon: Truck,
    iconBg: 'bg-[#EEF2FF]',
    iconText: 'text-[#4F46E5]',
  },
  hardware: {
    label: 'Hardware',
    icon: Cpu,
    iconBg: 'bg-[#EFF6FF]',
    iconText: 'text-[#2563EB]',
  },
  vendor: {
    label: 'Vendors',
    icon: Warehouse,
    iconBg: 'bg-[#F0FDFA]',
    iconText: 'text-[#0D9488]',
  },
  incident: {
    label: 'Incidents',
    icon: AlertTriangle,
    iconBg: 'bg-[#FFFBEB]',
    iconText: 'text-[#D97706]',
  },
  account: {
    label: 'Accounts',
    icon: Users,
    iconBg: 'bg-[#F5F3FF]',
    iconText: 'text-[#6D28D9]',
  },
  workspace: {
    label: 'Workspace',
    icon: Settings,
    iconBg: 'bg-[#F1F5F9]',
    iconText: 'text-[#334155]',
  },
};

const ROLE_DISPLAY: Record<
  UserRoleType,
  { label: string; bg: string; text: string }
> = {
  owner: {
    label: 'Owner',
    bg: 'bg-[#EEF2FF]',
    text: 'text-[#4338CA]',
  },
  employee: {
    label: 'Staff',
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1D4ED8]',
  },
  vendor: {
    label: 'Vendor',
    bg: 'bg-[#F0FDFA]',
    text: 'text-[#0F766E]',
  },
};

const SEVERITY_DOT: Record<ActivityLogRecord['severity'], string> = {
  info: 'bg-[#6366F1]',
  success: 'bg-[#10B981]',
  warning: 'bg-[#F59E0B]',
  critical: 'bg-[#EF4444]',
};

function formatDateGroupLabel(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
  const diffDays = Math.round((startOfToday - startOfTarget) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatExactTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function ActivityLogView({
  logs,
  searchQuery,
  companyName,
  isFullOrgAudit,
  onExportComplete,
}: ActivityLogViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [roleFilter, setRoleFilter] = useState<ActorRoleFilter>('all');
  const [recentExportScope, setRecentExportScope] = useState<'filtered' | 'all' | null>(
    null
  );

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) {
        return false;
      }
      if (roleFilter !== 'all' && entry.actorRole !== roleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q) ||
        (entry.details ?? '').toLowerCase().includes(q) ||
        entry.actorName.toLowerCase().includes(q) ||
        entry.targetId.toLowerCase().includes(q) ||
        entry.targetLabel.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q)
      );
    });
  }, [logs, categoryFilter, roleFilter, searchQuery]);

  const groupedLogs = useMemo(() => {
    const groups: { dateLabel: string; items: ActivityLogRecord[] }[] = [];
    for (const item of filteredLogs) {
      const label = formatDateGroupLabel(item.createdAtMs);
      const last = groups[groups.length - 1];
      if (last && last.dateLabel === label) {
        last.items.push(item);
      } else {
        groups.push({ dateLabel: label, items: [item] });
      }
    }
    return groups;
  }, [filteredLogs]);

  const summary = useMemo(() => {
    const opsUpdates = logs.filter(
      (l) =>
        l.category === 'dispatch' ||
        l.category === 'hardware' ||
        l.category === 'vendor'
    ).length;
    const incidentEvents = logs.filter((l) => l.category === 'incident').length;
    const accountAndSettings = logs.filter(
      (l) => l.category === 'account' || l.category === 'workspace'
    ).length;
    return {
      total: logs.length,
      opsUpdates,
      incidentEvents,
      accountAndSettings,
    };
  }, [logs]);

  const isFiltered =
    categoryFilter !== 'all' ||
    roleFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const triggerExport = (mode: 'filtered' | 'all') => {
    const recordsToExport = mode === 'all' ? logs : filteredLogs;
    if (recordsToExport.length === 0) return;

    const filterParts: string[] = [];
    if (mode === 'filtered') {
      if (categoryFilter !== 'all') filterParts.push(categoryFilter);
      if (roleFilter !== 'all') filterParts.push(roleFilter);
      if (searchQuery.trim()) filterParts.push('search');
    }

    const result = exportActivityLogToCsv(recordsToExport, {
      companyName,
      filterSuffix: filterParts.length > 0 ? filterParts.join('-') : undefined,
    });

    if (result) {
      setRecentExportScope(mode);
      window.setTimeout(() => {
        setRecentExportScope((prev) => (prev === mode ? null : prev));
      }, 2400);

      onExportComplete?.({
        filename: result.filename,
        rowCount: result.rowCount,
        scope:
          mode === 'all' || !isFiltered
            ? 'Full Activity Log'
            : `Filtered (${filterParts.join(', ')})`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#EEF2FF] border border-[#C7D2FE] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#4338CA] mb-2">
            <Lock className="h-3 w-3" />
            <span>Read-Only Audit Stream</span>
          </div>
          <h1 className="text-[24px] md:text-[30px] font-semibold leading-[32px] md:leading-[38px] tracking-[-0.02em] text-[#0F172A]">
            Activity &amp; Audit Log
          </h1>
          <p className="text-[14px] text-[#475569] mt-1">
            Chronological, tamper-proof record of every operational change, status update, incident log, and account modification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isFiltered && (
            <OpsButton
              variant="secondary"
              size="compact"
              disabled={logs.length === 0}
              onClick={() => triggerExport('all')}
              title="Download the complete unfiltered Activity Log as CSV"
            >
              {recentExportScope === 'all' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                  Exported All
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Export All ({logs.length})
                </>
              )}
            </OpsButton>
          )}
          <OpsButton
            variant="primary"
            size="compact"
            disabled={filteredLogs.length === 0}
            onClick={() => triggerExport('filtered')}
            title="Download the current Activity Log view as a CSV audit file"
          >
            {recentExportScope === 'filtered' ? (
              <>
                <Check className="h-3.5 w-3.5" />
                CSV Downloaded
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                {isFiltered
                  ? `Export Filtered CSV (${filteredLogs.length})`
                  : `Export CSV (${filteredLogs.length})`}
              </>
            )}
          </OpsButton>
        </div>
      </div>

      {/* Audit Summary Strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 tabular-nums-strict">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Recorded Events
            </span>
            <ScrollText className="h-4 w-4 text-[#4F46E5]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-bold leading-8 text-[#0F172A]">
              {summary.total}
            </span>
            <span className="text-[12px] text-[#475569]">Immutable</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Ops &amp; Status Updates
            </span>
            <Truck className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-bold leading-8 text-[#0F172A]">
              {summary.opsUpdates}
            </span>
            <span className="text-[12px] text-[#475569]">Routes, Units, Restocks</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Incident Audit Trail
            </span>
            <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-bold leading-8 text-[#0F172A]">
              {summary.incidentEvents}
            </span>
            <span className="text-[12px] text-[#475569]">Logs &amp; Resolutions</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 elevation-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              Account &amp; Workspace
            </span>
            <ShieldCheck className="h-4 w-4 text-[#10B981]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[28px] font-bold leading-8 text-[#0F172A]">
              {summary.accountAndSettings}
            </span>
            <span className="text-[12px] text-[#475569]">Roles &amp; Settings</span>
          </div>
        </div>
      </div>

      {/* Category & Actor Role Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center p-1 bg-[#F1F5F9] rounded-lg gap-1">
          {(
            [
              { id: 'all', label: 'All Events' },
              { id: 'dispatch', label: 'Dispatch' },
              { id: 'hardware', label: 'Hardware' },
              { id: 'vendor', label: 'Vendors' },
              { id: 'incident', label: 'Incidents' },
              { id: 'account', label: 'Accounts' },
              { id: 'workspace', label: 'Workspace' },
            ] as { id: CategoryFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="inline-flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-[#64748B]">Actor Role:</span>
          <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-lg gap-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'owner', label: 'Owner' },
                { id: 'employee', label: 'Staff' },
                { id: 'vendor', label: 'Vendor' },
              ] as { id: ActorRoleFilter; label: string }[]
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoleFilter(r.id)}
                className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  roleFilter === r.id
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chronological Read-Only Stream */}
      <OpsCard
        title={`Operational Audit Stream (${filteredLogs.length})`}
        subtitle={
          isFullOrgAudit
            ? 'Showing live changes across Business Owner, Staff, and Vendor portals · Entries cannot be edited or deleted'
            : 'Showing your recorded Owner audit events · Entries cannot be edited or deleted'
        }
        bodyClassName="p-0"
      >
        {groupedLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="h-8 w-8 text-[#94A3B8] mx-auto mb-2" />
            <div className="text-[15px] font-semibold text-[#0F172A]">
              {logs.length === 0
                ? 'No operational activity recorded yet'
                : 'No audit entries match your current filter'}
            </div>
            <p className="text-[13px] text-[#475569] mt-1 max-w-md mx-auto">
              {logs.length === 0
                ? 'Every route status update, machine reboot, vendor restock handoff, incident update, and account role change will appear here automatically.'
                : 'Try switching the category or role filter, or clearing your search query.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {groupedLogs.map((group) => (
              <div key={group.dateLabel}>
                <div className="bg-[#F8FAFC] px-5 py-2 border-b border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569]">
                    {group.dateLabel}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748B] tabular-nums-strict">
                    {group.items.length} event{group.items.length === 1 ? '' : 's'}
                  </span>
                </div>

                <ol className="divide-y divide-[#F1F5F9]">
                  {group.items.map((entry) => {
                    const cat = CATEGORY_META[entry.category];
                    const CatIcon = cat.icon;
                    const roleBadge = ROLE_DISPLAY[entry.actorRole];

                    return (
                      <li
                        key={entry.id}
                        className="px-5 py-3.5 bg-white hover:bg-[#F8FAFC]/80 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cat.iconBg} ${cat.iconText}`}
                          >
                            <CatIcon className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[entry.severity]}`}
                                aria-hidden="true"
                              />
                              <span className="text-[13.5px] font-semibold text-[#0F172A]">
                                {entry.action}
                              </span>
                              <span className="font-mono text-[11.5px] font-medium text-[#475569] bg-[#F1F5F9] border border-[#E2E8F0] px-1.5 py-0.5 rounded-md">
                                {entry.targetId}
                              </span>
                              <span className="text-[12px] text-[#64748B] truncate">
                                {entry.targetLabel}
                              </span>
                            </div>

                            <p className="text-[13px] text-[#334155] mt-1 leading-5">
                              {entry.summary}
                            </p>

                            {entry.details && (
                              <p className="text-[12px] text-[#64748B] mt-0.5 leading-4">
                                {entry.details}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5 shrink-0 pl-12 sm:pl-0">
                          <span className="font-mono text-[12px] font-medium text-[#475569] tabular-nums-strict whitespace-nowrap">
                            {formatExactTime(entry.createdAtMs)}
                          </span>
                          <div className="inline-flex items-center gap-1.5">
                            <span className="text-[12px] font-medium text-[#0F172A] max-w-[140px] truncate">
                              {entry.actorName}
                            </span>
                            <span
                              className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md ${roleBadge.bg} ${roleBadge.text}`}
                            >
                              {roleBadge.label}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </OpsCard>
    </div>
  );
}
