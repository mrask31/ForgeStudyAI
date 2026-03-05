/**
 * Integration Panel Component
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 10.1-10.8
 * 
 * Parent Dashboard component for managing LMS connections.
 * Dark Space UI with frosted glass and indigo accents.
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type {
  ConnectLMSRequest,
  ConnectLMSResponse,
  DisconnectLMSRequest,
  DisconnectLMSResponse,
  LMSStatusResponse,
} from '@/lib/lms/types';

interface IntegrationPanelProps {
  studentId: string;
  studentName: string;
}

export function IntegrationPanel({ studentId, studentName }: IntegrationPanelProps) {
  const [connections, setConnections] = useState<LMSStatusResponse['connections']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);

  // Canvas state
  const [canvasInstanceUrl, setCanvasInstanceUrl] = useState('');
  const [canvasPAT, setCanvasPAT] = useState('');
  const [canvasCoppaChecked, setCanvasCoppaChecked] = useState(false);

  // Google Classroom state
  const [googleCoppaChecked, setGoogleCoppaChecked] = useState(false);

  // Fetch connection status
  useEffect(() => {
    fetchConnectionStatus();
  }, [studentId]);

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch(`/api/parent/lms/status/${studentId}`);
      if (!response.ok) throw new Error('Failed to fetch connection status');

      const data: LMSStatusResponse = await response.json();
      setConnections(data.connections);
    } catch (error: any) {
      console.error('[IntegrationPanel] Error fetching status:', error);
      toast.error('Failed to load connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCanvasConnect = async () => {
    if (!canvasInstanceUrl || !canvasPAT) {
      toast.error('Please enter Canvas instance URL and Personal Access Token');
      return;
    }

    if (!canvasCoppaChecked) {
      toast.error('Please accept the authorization agreement');
      return;
    }

    setIsConnecting(true);

    try {
      const payload: ConnectLMSRequest = {
        studentId,
        provider: 'canvas',
        canvasInstanceUrl,
        canvasPAT,
      };

      const response = await fetch('/api/parent/lms/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: ConnectLMSResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to connect Canvas');
      }

      toast.success('Canvas connected successfully! Initial sync started.');
      
      // Clear form
      setCanvasInstanceUrl('');
      setCanvasPAT('');
      setCanvasCoppaChecked(false);

      // Refresh status
      await fetchConnectionStatus();
    } catch (error: any) {
      console.error('[IntegrationPanel] Canvas connection error:', error);
      toast.error(error.message || 'Failed to connect Canvas');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGoogleConnect = async () => {
    if (!googleCoppaChecked) {
      toast.error('Please accept the authorization agreement');
      return;
    }

    toast.error('Google Classroom OAuth flow not yet implemented. Coming soon!');
    // TODO: Implement Google OAuth flow
  };

  const handleDisconnect = async (connectionId: string, provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}? Your student will need to use manual upload.`)) {
      return;
    }

    setIsDisconnecting(connectionId);

    try {
      const payload: DisconnectLMSRequest = { connectionId };

      const response = await fetch('/api/parent/lms/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: DisconnectLMSResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to disconnect');
      }

      toast.success(`${provider} disconnected successfully`);

      // Refresh status
      await fetchConnectionStatus();
    } catch (error: any) {
      console.error('[IntegrationPanel] Disconnect error:', error);
      toast.error(error.message || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(null);
    }
  };

  const getConnectionByProvider = (provider: 'canvas' | 'google_classroom') => {
    return connections.find((c) => c.provider === provider);
  };

  const canvasConnection = getConnectionByProvider('canvas');
  const googleConnection = getConnectionByProvider('google_classroom');

  if (isLoading) {
    return (
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">
          School Integrations & Data Sync
        </h2>
        <p className="text-sm text-slate-400">
          Connect {studentName}'s school accounts to automatically sync assignments
        </p>
      </div>

      {/* Canvas Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-100">Canvas LMS</h3>
            <p className="text-xs text-slate-400">Personal Access Token</p>
          </div>
        </div>

        {canvasConnection && canvasConnection.status !== 'disconnected' ? (
          // Connected state
          <div className="bg-slate-950/60 border border-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  canvasConnection.status === 'active' ? 'bg-green-500' :
                  canvasConnection.status === 'blocked' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-slate-200">
                  {canvasConnection.status === 'active' ? 'Connected' :
                   canvasConnection.status === 'blocked' ? 'Connection Blocked' :
                   'Connection Failed'}
                </span>
              </div>
              <button
                onClick={() => handleDisconnect(canvasConnection.id, 'Canvas')}
                disabled={isDisconnecting === canvasConnection.id}
                className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {isDisconnecting === canvasConnection.id ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
            {canvasConnection.lastSyncAt && (
              <p className="text-xs text-slate-400">
                Last synced: {new Date(canvasConnection.lastSyncAt).toLocaleString()}
              </p>
            )}
            {canvasConnection.status === 'blocked' && (
              <p className="text-xs text-yellow-400">
                Connection blocked due to repeated failures. Manual upload is still available.
              </p>
            )}
          </div>
        ) : (
          // Connection form
          <div className="space-y-3">
            <input
              type="url"
              placeholder="Canvas Instance URL (e.g., https://school.instructure.com)"
              value={canvasInstanceUrl}
              onChange={(e) => setCanvasInstanceUrl(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <input
              type="password"
              placeholder="Personal Access Token"
              value={canvasPAT}
              onChange={(e) => setCanvasPAT(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={canvasCoppaChecked}
                onChange={(e) => setCanvasCoppaChecked(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400 leading-relaxed">
                By connecting these accounts, I authorize ForgeStudy to sync my child's educational data to generate personalized study materials.
              </span>
            </label>
            <button
              onClick={handleCanvasConnect}
              disabled={!canvasCoppaChecked || isConnecting}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : 'Connect Canvas'}
            </button>
          </div>
        )}
      </div>

      {/* Google Classroom Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-100">Google Classroom</h3>
            <p className="text-xs text-slate-400">OAuth 2.0</p>
          </div>
        </div>

        {googleConnection && googleConnection.status !== 'disconnected' ? (
          // Connected state
          <div className="bg-slate-950/60 border border-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  googleConnection.status === 'active' ? 'bg-green-500' :
                  googleConnection.status === 'blocked' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-slate-200">
                  {googleConnection.status === 'active' ? 'Connected' :
                   googleConnection.status === 'blocked' ? 'Connection Blocked' :
                   'Connection Failed'}
                </span>
              </div>
              <button
                onClick={() => handleDisconnect(googleConnection.id, 'Google Classroom')}
                disabled={isDisconnecting === googleConnection.id}
                className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {isDisconnecting === googleConnection.id ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
            {googleConnection.lastSyncAt && (
              <p className="text-xs text-slate-400">
                Last synced: {new Date(googleConnection.lastSyncAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          // Connection form
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={googleCoppaChecked}
                onChange={(e) => setGoogleCoppaChecked(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400 leading-relaxed">
                By connecting these accounts, I authorize ForgeStudy to sync my child's educational data to generate personalized study materials.
              </span>
            </label>
            <button
              onClick={handleGoogleConnect}
              disabled={!googleCoppaChecked}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed"
            >
              Connect Google Classroom
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
