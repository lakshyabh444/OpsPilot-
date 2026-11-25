import { ActivityLogCategory, ActivityLogRecord, UserRoleType } from '../types/ops';

const CATEGORY_LABELS: Record<ActivityLogCategory, string> = {
  dispatch: 'Dispatch',
  hardware: 'Hardware',
  vendor: 'Vendors',
  incident: 'Incidents',
  account: 'Accounts',
  workspace: 'Workspace',
};

const ROLE_LABELS: Record<UserRoleType, string> = {
  owner: 'Business Owner',
  employee: 'Staff',
  vendor: 'Vendor Partner',
};

const CSV_HEADERS = [
  'Event ID',
  'Timestamp (ISO UTC)',
  'Local Date & Time',
  'Category',
  'Action',
  'Target ID',
  'Target',
  'Summary',
  'Details',
  'Actor Name',
  'Actor UID',
  'Actor Role',
  'Severity',
] as const;

/**
 * Escapes a CSV cell per RFC 4180 and neutralizes spreadsheet formula injection
 * (cells beginning with =, +, -, @, tab, or carriage return).
 */
export function sanitizeCsvCell(rawValue: string | number | undefined | null): string {
  const str = String(rawValue ?? '');
  const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  const escaped = neutralized.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Formats an array of ActivityLogRecord items into a UTF-8 BOM-prefixed,
 * RFC-4180 compliant CSV string ready for spreadsheet and compliance auditing.
 */
export function buildActivityLogCsv(logs: ActivityLogRecord[]): string {
  const headerRow = CSV_HEADERS.map((col) => sanitizeCsvCell(col)).join(',');

  const dataRows = logs.map((entry) => {
    const dt = new Date(entry.createdAtMs);
    const isoUtc = Number.isNaN(dt.getTime()) ? '' : dt.toISOString();
    const localFormatted = Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString();

    return [
      sanitizeCsvCell(entry.id),
      sanitizeCsvCell(isoUtc),
      sanitizeCsvCell(localFormatted),
      sanitizeCsvCell(CATEGORY_LABELS[entry.category] ?? entry.category),
      sanitizeCsvCell(entry.action),
      sanitizeCsvCell(entry.targetId),
      sanitizeCsvCell(entry.targetLabel),
      sanitizeCsvCell(entry.summary),
      sanitizeCsvCell(entry.details ?? ''),
      sanitizeCsvCell(entry.actorName),
      sanitizeCsvCell(entry.actorUid),
      sanitizeCsvCell(ROLE_LABELS[entry.actorRole] ?? entry.actorRole),
      sanitizeCsvCell(entry.severity.toUpperCase()),
    ].join(',');
  });

  // Prefix UTF-8 BOM so Microsoft Excel & Google Sheets preserve special characters cleanly
  return `\uFEFF${[headerRow, ...dataRows].join('\r\n')}`;
}

export interface ExportActivityCsvOptions {
  companyName?: string;
  filterSuffix?: string;
}

export interface ExportActivityCsvResult {
  filename: string;
  rowCount: number;
}

function slugifySegment(raw: string, fallback: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return cleaned || fallback;
}

/**
 * Generates and downloads a timestamped CSV audit file for the provided Activity Log entries.
 */
export function exportActivityLogToCsv(
  logs: ActivityLogRecord[],
  options: ExportActivityCsvOptions = {}
): ExportActivityCsvResult | null {
  if (logs.length === 0) return null;

  const csvContent = buildActivityLogCsv(logs);
  const now = new Date();
  const datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const companySlug = slugifySegment(options.companyName ?? 'opspilot', 'opspilot');
  const scopeSlug = options.filterSuffix
    ? `-${slugifySegment(options.filterSuffix, 'filtered')}`
    : '';
  const filename = `${companySlug}-activity-log${scopeSlug}-${datePart}_${timePart}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Defer revoking the object URL slightly so Safari/Firefox finish starting the download
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    filename,
    rowCount: logs.length,
  };
}
