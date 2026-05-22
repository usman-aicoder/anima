'use client';

import { useRouter } from 'next/navigation';
import { ActionButton } from '@/components/action-button';
import { api } from '@/lib/api';

export function AlertResolveButton({ alert_id }: { alert_id: string }) {
  const router = useRouter();

  async function resolve() {
    await api.qualityAlerts.resolve(alert_id);
    router.refresh();
  }

  return <ActionButton label="Resolve" onClick={resolve} variant="ghost" />;
}
