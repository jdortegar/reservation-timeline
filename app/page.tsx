import { TimelineView } from '@/components/app/timeline/TimelineView';

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="px-6 py-4 border-b-2 border-gray-300 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Reservation Timeline</h1>
        <p className="text-sm text-gray-600 mt-1">Manage restaurant reservations</p>
      </div>
      <div className="flex-1 overflow-hidden bg-white">
        <TimelineView />
      </div>
    </div>
  );
}
