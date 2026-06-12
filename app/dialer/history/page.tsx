import CallHistory from '@/components/dialer/CallHistory';

export default function HistoryPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <h1 className="text-xl font-bold text-navy font-bricolage">Call History</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <CallHistory />
      </div>
    </div>
  );
}
