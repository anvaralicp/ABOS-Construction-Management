'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState, LoadingState, ErrorState } from '@/components/ui/states';
import { fetchApi } from '@/lib/api';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Conceptual boundary for the Notifications API integration
    fetchApi('/notifications')
      .then(data => setNotifications(data.data || []))
      .catch(err => {
        // We catch the error to display the state, but we don't fabricate fake data
        setError('Failed to load notifications or API is not yet available.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-surface-900">Notifications</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} />}
          {!loading && !error && notifications.length === 0 && (
            <EmptyState 
              title="No notifications" 
              description="You're all caught up. We'll notify you when there's new activity." 
            />
          )}
          {!loading && !error && notifications.length > 0 && (
            <div className="space-y-4">
              {notifications.map((n, i) => (
                <div key={i} className="p-4 rounded-lg bg-surface-50 border border-surface-200">
                  <p className="font-medium text-surface-900">{n.title}</p>
                  <p className="text-sm text-surface-600">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
