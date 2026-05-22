'use client';

import { useRouter } from 'next/navigation';
import { ActionButton } from '@/components/action-button';
import { api } from '@/lib/api';

export function EscalationDecideButtons({ escalation_id }: { escalation_id: string }) {
  const router = useRouter();

  async function approve() {
    await api.escalations.decide(escalation_id, 'approved', 'Approved by human proxy.');
    router.refresh();
  }

  async function reject() {
    await api.escalations.decide(escalation_id, 'rejected', 'Rejected by human proxy.');
    router.refresh();
  }

  return (
    <div className="flex gap-2 flex-shrink-0">
      <ActionButton label="Approve" onClick={approve} variant="primary" />
      <ActionButton label="Reject" onClick={reject} variant="danger" />
    </div>
  );
}
