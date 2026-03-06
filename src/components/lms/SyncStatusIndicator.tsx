/**
 * Sync Status Indicator Component
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.2
 * 
 * Displays color-coded status badges for LMS sync connections.
 * Dark Space UI with glassmorphic styling.
 */

'use client';

interface SyncStatusConnection {
  provider: 'canvas' | 'google_classroom';
  status: 'active' | 'failed' | 'blocked' | 'disconnected' | 'expired';
  lastSyncAt: string | null;
  minutesSinceSync: number | null;
  newAssignmentsCount: number;
}

interface SyncStatusIndicatorProps {
  connections: SyncStatusConnection[];
}

export function SyncStatusIndicator({ connections }: SyncStatusIndicatorProps) {
  // Filter out disconnected connections
  const activeConnections = connections.filter((c) => c.status !== 'disconnected');

  if (activeConnections.length === 0) {
    return (
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-slate-600"></div>
          <div>
            <p className="text-sm font-medium text-slate-300">No LMS Connected</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your assignments manually or ask your parent to connect your school account
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-lg p-4 space-y-3">
      {activeConnections.map((connection) => {
        const providerName = connection.provider === 'canvas' ? 'Canvas' : 'Google Classroom';
        const statusColor =
          connection.status === 'active' ? 'bg-green-500' :
          connection.status === 'blocked' ? 'bg-yellow-500' :
          'bg-red-500';
        
        const statusEmoji =
          connection.status === 'active' ? '🟢' :
          connection.status === 'blocked' ? '🟡' :
          '🔴';

        let statusMessage = '';
        if (connection.status === 'active') {
          if (connection.minutesSinceSync !== null) {
            if (connection.minutesSinceSync < 1) {
              statusMessage = 'Synced just now';
            } else if (connection.minutesSinceSync < 60) {
              statusMessage = `Synced ${connection.minutesSinceSync} min${connection.minutesSinceSync > 1 ? 's' : ''} ago`;
            } else {
              const hours = Math.floor(connection.minutesSinceSync / 60);
              statusMessage = `Synced ${hours} hour${hours > 1 ? 's' : ''} ago`;
            }
          } else {
            statusMessage = 'Connected';
          }
        } else if (connection.status === 'blocked') {
          statusMessage = 'Connection blocked by school firewall';
        } else {
          statusMessage = 'Connection failed';
        }

        return (
          <div key={connection.provider} className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-1.5 ${statusColor}`}></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">{providerName}</span>
                <span className="text-xs">{statusEmoji}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{statusMessage}</p>
              {connection.newAssignmentsCount > 0 && connection.status === 'active' && (
                <p className="text-xs text-indigo-400 mt-1 font-medium">
                  {connection.newAssignmentsCount} new assignment{connection.newAssignmentsCount > 1 ? 's' : ''} synced
                </p>
              )}
              {connection.status === 'blocked' && (
                <p className="text-xs text-yellow-400 mt-1">
                  Manual upload is still available
                </p>
              )}
              {connection.status === 'failed' && (
                <p className="text-xs text-red-400 mt-1">
                  Ask your parent to reconnect
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
