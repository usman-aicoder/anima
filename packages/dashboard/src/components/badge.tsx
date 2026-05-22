import clsx from 'clsx';

const VARIANTS = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-orange-100 text-orange-700',
  emergency: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-500',
  active: 'bg-green-100 text-green-700',
  at_risk: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
};

type Variant = keyof typeof VARIANTS;

export function Badge({ label, variant = 'default' }: { label: string; variant?: Variant }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', VARIANTS[variant])}>
      {label}
    </span>
  );
}

export function statusVariant(status: string): Variant {
  if (status in VARIANTS) return status as Variant;
  return 'default';
}
