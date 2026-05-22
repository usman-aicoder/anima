'use client';

import { useRouter } from 'next/navigation';
import { ActionButton } from '@/components/action-button';
import { api } from '@/lib/api';

export function GoalApproveButton({ goal_id }: { goal_id: string }) {
  const router = useRouter();

  async function approve() {
    await api.goals.approve(goal_id);
    router.refresh();
  }

  return <ActionButton label="Approve" onClick={approve} variant="primary" />;
}
