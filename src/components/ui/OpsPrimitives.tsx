import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { OperationalState } from '../../types/ops';

interface StatusBadgeProps {
  state: OperationalState;
  label: string;
  pulse?: boolean;
}

const BADGE_STYLES: Record<
  OperationalState,
  { bg: string; text: string; dot: string }
> = {
  operational: {
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#065F46]',
    dot: 'bg-[#10B981]',
  },
  warning: {
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#92400E]',
    dot: 'bg-[#F59E0B]',
  },
  critical: {
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#991B1B]',
    dot: 'bg-[#EF4444]',
  },
  vendor: {
    bg: 'bg-[#F0FDFA]',
    text: 'text-[#115E59]',
    dot: 'bg-[#0D9488]',
  },
};

export function StatusBadge({ state, label, pulse }: StatusBadgeProps) {
  const style = BADGE_STYLES[state];
  const shouldPulse = pulse ?? state === 'critical';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] leading-[14px] whitespace-nowrap shrink-0 ${style.bg} ${style.text}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {shouldPulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping ${style.dot}`}
          />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${style.dot}`} />
      </span>
      {label}
    </span>
  );
}

interface OpsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'vendor' | 'ghost';
  size?: 'compact' | 'default';
}

export function OpsButton({
  variant = 'primary',
  size = 'default',
  className = '',
  children,
  ...props
}: OpsButtonProps) {
  const heightClass = size === 'compact' ? 'h-9 px-3.5 text-[13px]' : 'h-10 px-4 text-[13px]';
  const variantClasses: Record<NonNullable<OpsButtonProps['variant']>, string> = {
    primary:
      'bg-[#4F46E5] text-white ops-btn-primary hover:bg-[#4338CA] active:bg-[#3730A3] focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2',
    secondary:
      'bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1] focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2',
    destructive:
      'bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C] focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-2',
    vendor:
      'bg-[#0D9488] text-white ops-btn-primary hover:bg-[#0F766E] active:bg-[#115E59] focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2',
    ghost:
      'bg-transparent text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] focus-visible:ring-2 focus-visible:ring-[#6366F1]',
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none ${heightClass} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

interface OpsCardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  hoverable?: boolean;
}

export function OpsCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  bodyClassName = 'p-5',
  hoverable = false,
}: OpsCardProps) {
  return (
    <section
      className={`bg-white border border-[#E2E8F0] rounded-2xl elevation-1 ${
        hoverable ? 'elevation-2-hover' : ''
      } ${className}`}
    >
      {(title || actions) && (
        <div className="min-h-[48px] px-5 py-3 border-b border-[#F1F5F9] flex items-center justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[16px] font-semibold leading-6 tracking-[-0.01em] text-[#0F172A] truncate">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[12px] text-[#475569] leading-4 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

interface OpsCheckboxProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
}

export function OpsCheckbox({ checked, onChange, ariaLabel, disabled }: OpsCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`h-[18px] w-[18px] rounded-[4px] inline-flex items-center justify-center transition-colors duration-150 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked
          ? 'bg-[#4F46E5] border-[1.5px] border-[#4F46E5] text-white'
          : 'bg-white border-[1.5px] border-[#CBD5E1] hover:border-[#94A3B8]'
      }`}
    >
      {checked && <Check className="h-3 w-3 stroke-[3]" />}
    </button>
  );
}

interface OpsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function OpsModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-lg',
}: OpsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${maxWidthClass} bg-white border border-[#E2E8F0] rounded-2xl elevation-4 overflow-hidden`}
      >
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold leading-6 tracking-[-0.01em] text-[#0F172A] truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[12px] text-[#475569] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

interface OpsDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerBadge?: React.ReactNode;
  children: React.ReactNode;
}

export function OpsDrawer({
  open,
  onClose,
  title,
  subtitle,
  headerBadge,
  children,
}: OpsDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0F172A]/40 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md bg-white border-l border-[#E2E8F0] elevation-4 h-full flex flex-col"
      >
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-[16px] font-semibold leading-6 tracking-[-0.01em] text-[#0F172A]">
                {title}
              </h3>
              {headerBadge}
            </div>
            {subtitle && (
              <p className="text-[13px] text-[#475569] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail drawer"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>
  );
}
