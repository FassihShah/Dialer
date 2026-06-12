'use client';
import FollowUpsList from '@/components/dialer/FollowUpsList';
import { useRouter } from 'next/navigation';

export default function FollowUpsPage() {
  const router = useRouter();
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <h1 className="text-xl font-bold text-navy font-bricolage">Follow-ups</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <FollowUpsList onCallLead={() => router.push('/dialer')} />
      </div>
    </div>
  );
}
