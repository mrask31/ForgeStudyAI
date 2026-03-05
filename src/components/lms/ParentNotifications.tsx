/**
 * Parent Notifications Component
 * Requirements: 9.1, 9.2, 9.3, 9.4
 * 
 * Displays LMS sync notifications for parents.
 * Dark Space UI with glassmorphic styling.
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';

interface ParentNotification {
  id: string;
  notificationType: 'lms_connected' | 'lms_auth_failed' | 'lms_firewall_blocked' | 'lms_restored' | 'lms_disconnected';
  title: string;
  message: string;
  isRead: boolean;
  metadata: {
    provider?: string;
    studentName?: string;
  };
  createdAt: string;
}

interface ParentNotificationsProps {
  parentId: string;
}

export function ParentNotifications({ parentId }: ParentNotificationsProps) {
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [parentId]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/parent/notifications');
      if (!response.ok) {
        console.error('[ParentNotifications] Failed to fetch notifications');
        return;
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('[ParentNotifications] Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/parent/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      }
    } catch (error) {
      console.error('[ParentNotifications] Error marking as read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: ParentNotification['notificationType']) => {
    switch (type) {
      case 'lms_connected':
      case 'lms_restored':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'lms_auth_failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'lms_firewall_blocked':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'lms_disconnected':
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-slate-900/40 backdrop-blur-md border border-slate-800 hover:bg-slate-800/60 transition-all"
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-12 w-96 max-h-[32rem] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-50">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="divide-y divide-slate-800">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-800/40 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-indigo-500/5' : ''
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.notificationType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-slate-200">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mb-2">
                          {notification.message}
                        </p>
                        {notification.metadata.provider && (
                          <p className="text-xs text-slate-500 mb-1">
                            Provider: {notification.metadata.provider}
                          </p>
                        )}
                        {notification.metadata.studentName && (
                          <p className="text-xs text-slate-500 mb-1">
                            Student: {notification.metadata.studentName}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
