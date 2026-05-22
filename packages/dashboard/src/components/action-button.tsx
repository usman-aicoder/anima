'use client';

import { useState } from 'react';
import clsx from 'clsx';

interface Props {
  label: string;
  onClick: () => Promise<void>;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
}

export function ActionButton({ label, onClick, variant = 'primary', disabled }: Props) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-brand-600 text-white hover:bg-brand-700': variant === 'primary',
          'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
          'text-slate-600 hover:text-slate-900 hover:bg-slate-100': variant === 'ghost',
        },
      )}
    >
      {loading ? 'Working…' : label}
    </button>
  );
}
