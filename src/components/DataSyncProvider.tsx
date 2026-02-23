import { useEffect, useState } from 'react';
import { syncEngine } from '@/lib/syncEngine';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Component that handles automatic data synchronization with offline-first IndexedDB
export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);

  // Initial cloud pull on login
  useEffect(() => {
    const initSync = async () => {
      if (!user) return;

      if (navigator.onLine) {
        try {
          console.log('[DataSyncProvider] Initial cloud pull...');
          await syncEngine.pullFromCloud();
          console.log('[DataSyncProvider] Initial pull complete');
        } catch (error) {
          console.error('[DataSyncProvider] Initial pull failed:', error);
        }
      }
      setInitialized(true);
    };

    initSync();
  }, [user]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      if (!user) return;
      const hasPending = await syncEngine.hasPendingChanges();
      if (hasPending) {
        toast.info('Syncing offline changes...');
        try {
          await syncEngine.syncAll();
          toast.success('Offline changes synced');
        } catch (error: any) {
          toast.error('Sync failed: ' + error.message);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user]);

  return <>{children}</>;
}
