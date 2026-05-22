'use client';

import { useRouter } from 'next/navigation';
import { ActionButton } from '@/components/action-button';
import { api } from '@/lib/api';

export function TaskCompleteButton({ task_id }: { task_id: string }) {
  const router = useRouter();

  async function complete() {
    await api.tasks.complete(task_id);
    router.refresh();
  }

  return <ActionButton label="Mark done" onClick={complete} variant="primary" />;
}
