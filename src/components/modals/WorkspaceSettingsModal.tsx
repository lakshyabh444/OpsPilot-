import React, { useEffect, useState } from 'react';
import {
  Building2,
  Database,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { WorkspaceSettingsRecord } from '../../types/ops';
import { OpsButton, OpsModal } from '../ui/OpsPrimitives';

interface WorkspaceSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: WorkspaceSettingsRecord;
  totalRecordCount: number;
  onSaveSettings: (
    patch: Pick<WorkspaceSettingsRecord, 'companyName' | 'regionName' | 'currencySymbol'>
  ) => Promise<void>;
  onClearAllData: () => Promise<void>;
  onLoadSampleData: () => Promise<void>;
}

const CURRENCY_OPTIONS = [
  { symbol: '$', label: 'USD / CAD / AUD ($)' },
  { symbol: '€', label: 'EUR (€)' },
  { symbol: '£', label: 'GBP (£)' },
  { symbol: '₹', label: 'INR (₹)' },
  { symbol: '¥', label: 'JPY / CNY (¥)' },
  { symbol: 'AED', label: 'AED' },
];

export function WorkspaceSettingsModal({
  open,
  onClose,
  settings,
  totalRecordCount,
  onSaveSettings,
  onClearAllData,
  onLoadSampleData,
}: WorkspaceSettingsModalProps) {
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [regionName, setRegionName] = useState(settings.regionName);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);
  const [busyAction, setBusyAction] = useState<'clear' | 'sample' | null>(null);

  useEffect(() => {
    if (open) {
      setCompanyName(settings.companyName);
      setRegionName(settings.regionName);
      setCurrencySymbol(settings.currencySymbol);
      setConfirmClear(false);
      setConfirmSample(false);
    }
  }, [open, settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings({
        companyName: companyName.trim() || 'OpsPilot',
        regionName: regionName.trim(),
        currencySymbol: currencySymbol || '$',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setBusyAction('clear');
    try {
      await onClearAllData();
      setConfirmClear(false);
      onClose();
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoadSample = async () => {
    setBusyAction('sample');
    try {
      await onLoadSampleData();
      setConfirmSample(false);
      onClose();
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <OpsModal
      open={open}
      onClose={onClose}
      title="Business Settings & Data"
      subtitle="Customize your workspace branding, currency, and operational data"
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-6">
        {/* Section 1: Business Profile */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
            <Building2 className="h-3.5 w-3.5 text-[#4F46E5]" />
            <span>Business Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ws-company-name"
                className="block text-[12px] font-medium text-[#0F172A] mb-1"
              >
                Company / Workspace Name
              </label>
              <input
                id="ws-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Metro Refresh Logistics"
                className="ops-input w-full px-3 text-[13px]"
              />
            </div>

            <div>
              <label
                htmlFor="ws-region-name"
                className="block text-[12px] font-medium text-[#0F172A] mb-1"
              >
                Operating Region / City (Optional)
              </label>
              <input
                id="ws-region-name"
                type="text"
                value={regionName}
                onChange={(e) => setRegionName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Austin Metro Area"
                className="ops-input w-full px-3 text-[13px]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="ws-currency"
              className="block text-[12px] font-medium text-[#0F172A] mb-1"
            >
              Currency Symbol
            </label>
            <select
              id="ws-currency"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="ops-input w-full sm:w-64 px-3 text-[13px]"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.symbol} value={opt.symbol}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <OpsButton type="button" variant="secondary" size="compact" onClick={onClose}>
              Cancel
            </OpsButton>
            <OpsButton type="submit" variant="primary" size="compact" disabled={saving}>
              {saving ? 'Saving...' : 'Save Business Profile'}
            </OpsButton>
          </div>
        </form>

        {/* Section 2: Clean-Slate Data Management */}
        <div className="pt-5 border-t border-[#E2E8F0] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
              <Database className="h-3.5 w-3.5 text-[#0F172A]" />
              <span>Workspace Operational Data</span>
            </div>
            <span className="text-[11px] font-mono text-[#475569] tabular-nums-strict">
              {totalRecordCount} active record{totalRecordCount === 1 ? '' : 's'}
            </span>
          </div>

          {/* Start Fresh / Wipe Card */}
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2]/60 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-[#991B1B]">
                  Clear All Operational Data (Start Fresh)
                </div>
                <p className="text-[12px] text-[#7F1D1D]/85 mt-0.5 leading-4">
                  Deletes all routes, vending machines, vendor partners, restock orders, and incidents so you can enter 100% real business data. Your team accounts stay intact.
                </p>
              </div>
              {!confirmClear ? (
                <OpsButton
                  type="button"
                  variant="destructive"
                  size="compact"
                  disabled={totalRecordCount === 0 || busyAction !== null}
                  onClick={() => setConfirmClear(true)}
                  className="shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Data
                </OpsButton>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <OpsButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => setConfirmClear(false)}
                    disabled={busyAction !== null}
                  >
                    Cancel
                  </OpsButton>
                  <OpsButton
                    type="button"
                    variant="destructive"
                    size="compact"
                    onClick={handleClear}
                    disabled={busyAction !== null}
                  >
                    {busyAction === 'clear' ? 'Clearing...' : 'Yes, Wipe All'}
                  </OpsButton>
                </div>
              )}
            </div>
          </div>

          {/* Optional Demo Dataset Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-[#0F172A]">
                  Load Optional Sample Demo Data
                </div>
                <p className="text-[12px] text-[#475569] mt-0.5 leading-4">
                  Useful for walkthroughs, training staff, or client sales demos. Replaces current operational records with sample routes and kiosks.
                </p>
              </div>
              {!confirmSample ? (
                <OpsButton
                  type="button"
                  variant="secondary"
                  size="compact"
                  disabled={busyAction !== null}
                  onClick={() => setConfirmSample(true)}
                  className="shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#4F46E5]" />
                  Load Sample
                </OpsButton>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <OpsButton
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => setConfirmSample(false)}
                    disabled={busyAction !== null}
                  >
                    Cancel
                  </OpsButton>
                  <OpsButton
                    type="button"
                    variant="primary"
                    size="compact"
                    onClick={handleLoadSample}
                    disabled={busyAction !== null}
                  >
                    {busyAction === 'sample' ? 'Loading...' : 'Confirm Load'}
                  </OpsButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </OpsModal>
  );
}
