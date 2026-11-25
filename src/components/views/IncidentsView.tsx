import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { IncidentSeverity, OpsIncident, UserRoleType } from '../../types/ops';
import { OpsButton, OpsCard, StatusBadge } from '../ui/OpsPrimitives';

interface IncidentsViewProps {
  incidents: OpsIncident[];
  teamMembers: string[];
  effectiveRole: UserRoleType;
  searchQuery: string;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onAssignTech: (id: string, tech: string) => void;
  onAddNote: (id: string, message: string) => void;
  onDeleteIncident: (id: string) => void;
  onOpenLogModal: () => void;
}

type SeverityFilter = 'All' | IncidentSeverity;

export function IncidentsView({
  incidents,
  teamMembers,
  effectiveRole,
  searchQuery,
  onAcknowledge,
  onResolve,
  onAssignTech,
  onAddNote,
  onDeleteIncident,
  onOpenLogModal,
}: IncidentsViewProps) {
  const isOwner = effectiveRole === 'owner';
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');
  const [selectedId, setSelectedId] = useState<string>(incidents[0]?.id ?? '');
  const [noteDraft, setNoteDraft] = useState('');
  const [customTechDraft, setCustomTechDraft] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return incidents.filter((inc) => {
      if (severityFilter !== 'All' && inc.severity !== severityFilter) return false;
      if (!q) return true;
      return (
        inc.id.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.assetId.toLowerCase().includes(q) ||
        inc.zone.toLowerCase().includes(q) ||
        inc.assignedTech.toLowerCase().includes(q)
      );
    });
  }, [incidents, severityFilter, searchQuery]);

  const activeIncident = useMemo(() => {
    return (
      filtered.find((i) => i.id === selectedId) ??
      incidents.find((i) => i.id === selectedId) ??
      filtered[0] ??
      null
    );
  }, [filtered, incidents, selectedId]);

  const techOptions = useMemo(() => {
    const set = new Set<string>(['Unassigned', ...teamMembers]);
    if (activeIncident?.assignedTech) {
      set.add(activeIncident.assignedTech);
    }
    return Array.from(set);
  }, [teamMembers, activeIncident?.assignedTech]);

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIncident || !noteDraft.trim()) return;
    onAddNote(activeIncident.id, noteDraft.trim());
    setNoteDraft('');
  };

  const handleAssignCustomTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIncident || !customTechDraft.trim()) return;
    onAssignTech(activeIncident.id, customTechDraft.trim());
    setCustomTechDraft('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] md:text-[30px] font-semibold leading-[32px] md:leading-[38px] tracking-[-0.02em] text-[#0F172A]">
            Incident Command &amp; Field Triage
          </h1>
          <p className="text-[14px] text-[#475569] mt-1">
            Split-second fault escalation, field technician dispatch, and immutable shift handoff logs.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center p-1 bg-[#F1F5F9] rounded-lg gap-1 shrink-0">
          {(['All', 'Critical', 'Warning', 'Resolved'] as SeverityFilter[]).map(
            (sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {sev}
              </button>
            )
          )}
        </div>
      </div>

      {/* 12-Col Split Triage Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Queue (7 cols) */}
        <OpsCard
          title={`Incident Queue (${filtered.length})`}
          subtitle="Select an incident to manage field assignment and shift log"
          className="xl:col-span-7"
          bodyClassName="p-0"
        >
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-2" />
              <div className="text-[15px] font-semibold text-[#0F172A]">
                No incidents in this view
              </div>
              <p className="text-[13px] text-[#475569] mt-1">
                Everything looks clear, or log a new field incident below.
              </p>
              <div className="mt-4">
                <OpsButton onClick={onOpenLogModal}>Log Incident</OpsButton>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {filtered.map((inc) => {
                const isSelected = activeIncident?.id === inc.id;
                const badgeState =
                  inc.severity === 'Critical'
                    ? 'critical'
                    : inc.severity === 'Warning'
                    ? 'warning'
                    : 'operational';

                return (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => setSelectedId(inc.id)}
                    className={`w-full text-left px-5 py-4 transition-colors cursor-pointer block focus:outline-none ${
                      isSelected ? 'bg-[#EEF2FF]/65' : 'bg-white hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[12px] font-semibold text-[#475569]">
                            {inc.id}
                          </span>
                          <span className="font-mono text-[12px] font-semibold text-[#2563EB]">
                            {inc.assetId}
                          </span>
                          <span className="text-[12px] text-[#94A3B8]">·</span>
                          <span className="text-[12px] text-[#475569]">
                            {inc.assetCategory}
                          </span>
                        </div>
                        <div className="text-[14px] font-semibold text-[#0F172A] mt-1">
                          {inc.title}
                        </div>
                        <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#475569] tabular-nums-strict">
                          <span>{inc.zone}</span>
                          <span>Tech: {inc.assignedTech}</span>
                          <span>Reported {inc.reportedAt}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <StatusBadge
                          state={badgeState}
                          label={inc.severity}
                          pulse={inc.severity === 'Critical'}
                        />
                        {inc.severity !== 'Resolved' && (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums-strict ${
                              inc.slaMinutesRemaining <= 25
                                ? 'text-[#EF4444]'
                                : 'text-[#475569]'
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {inc.slaMinutesRemaining}m SLA
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </OpsCard>

        {/* Right Incident Detail & Timeline Inspector (5 cols) */}
        <OpsCard
          title={activeIncident ? `${activeIncident.id} · Action Console` : 'Incident Details'}
          subtitle={
            activeIncident
              ? `${activeIncident.assetId} · ${activeIncident.zone}`
              : 'Select an incident from the queue'
          }
          className="xl:col-span-5"
          actions={
            isOwner && activeIncident ? (
              <OpsButton
                variant="ghost"
                size="compact"
                onClick={() => onDeleteIncident(activeIncident.id)}
                title="Delete incident"
                aria-label={`Delete incident ${activeIncident.id}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-[#94A3B8] hover:text-[#EF4444]" />
              </OpsButton>
            ) : undefined
          }
        >
          {!activeIncident ? (
            <div className="py-12 text-center text-[13px] text-[#475569]">
              <AlertTriangle className="h-7 w-7 text-[#94A3B8] mx-auto mb-2" />
              Select an incident row to inspect telemetry context and dispatch field engineers.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Summary & Status */}
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <StatusBadge
                    state={
                      activeIncident.severity === 'Critical'
                        ? 'critical'
                        : activeIncident.severity === 'Warning'
                        ? 'warning'
                        : 'operational'
                    }
                    label={activeIncident.severity}
                  />
                  <span className="text-[12px] text-[#475569] tabular-nums-strict">
                    {activeIncident.acknowledged ? 'Acknowledged' : 'Unacknowledged'}
                  </span>
                </div>
                <h3 className="text-[17px] font-semibold text-[#0F172A] mt-3 leading-6">
                  {activeIncident.title}
                </h3>
                <p className="text-[13px] text-[#475569] leading-5 mt-1.5">
                  {activeIncident.description}
                </p>
              </div>

              {/* Field Engineer Assignment */}
              <div className="pt-4 border-t border-[#F1F5F9] space-y-2">
                <label
                  htmlFor="assign-tech-select"
                  className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569]"
                >
                  Assigned Field Technician
                </label>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-[#4F46E5] shrink-0" />
                  <select
                    id="assign-tech-select"
                    value={activeIncident.assignedTech}
                    onChange={(e) => onAssignTech(activeIncident.id, e.target.value)}
                    disabled={activeIncident.severity === 'Resolved'}
                    className="ops-input w-full px-3 text-[13px]"
                  >
                    {techOptions.map((tech) => (
                      <option key={tech} value={tech}>
                        {tech}
                      </option>
                    ))}
                  </select>
                </div>
                {activeIncident.severity !== 'Resolved' && (
                  <form onSubmit={handleAssignCustomTech} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customTechDraft}
                      onChange={(e) => setCustomTechDraft(e.target.value)}
                      placeholder="Or type another technician name..."
                      maxLength={100}
                      className="ops-input flex-1 h-8 px-2.5 text-[12px]"
                    />
                    <OpsButton
                      type="submit"
                      variant="secondary"
                      size="compact"
                      disabled={!customTechDraft.trim()}
                    >
                      Assign
                    </OpsButton>
                  </form>
                )}
              </div>

              {/* Primary Triage Actions */}
              {activeIncident.severity !== 'Resolved' && (
                <div className="flex items-center gap-2.5 pt-1">
                  {!activeIncident.acknowledged && (
                    <OpsButton
                      variant="secondary"
                      className="flex-1"
                      onClick={() => onAcknowledge(activeIncident.id)}
                    >
                      Acknowledge Alarm
                    </OpsButton>
                  )}
                  <OpsButton
                    variant="primary"
                    className="flex-1"
                    onClick={() => onResolve(activeIncident.id)}
                  >
                    Resolve Incident
                  </OpsButton>
                </div>
              )}

              {/* Activity Timeline */}
              <div className="pt-4 border-t border-[#F1F5F9]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#475569] mb-3">
                  Shift Audit Timeline
                </div>
                <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                  {activeIncident.timeline.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-[#0F172A]">
                          {entry.author}
                        </span>
                        <span className="font-mono text-[#475569] tabular-nums-strict">
                          {entry.timestamp}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#475569] mt-1 leading-5">
                        {entry.message}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Add Handoff Note */}
                <form onSubmit={handleSubmitNote} className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add shift handoff or dispatch update..."
                    className="ops-input flex-1 px-3 text-[13px]"
                  />
                  <OpsButton type="submit" size="compact" disabled={!noteDraft.trim()}>
                    <Send className="h-3.5 w-3.5" />
                    Log
                  </OpsButton>
                </form>
              </div>
            </div>
          )}
        </OpsCard>
      </div>
    </div>
  );
}
