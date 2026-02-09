import { useEffect, useCallback } from 'react';
import { dataSync } from '@/lib/dataSync';
import { useCuttingStore } from '@/store/cuttingStore';
import { useRequirementStore } from '@/store/requirementStore';
import { useAuth } from '@/contexts/AuthContext';

// Hook to enable automatic syncing when data changes
export function useAutoSync() {
  const { user } = useAuth();
  const { orders, cutPlans, markerPlans } = useCuttingStore();
  const { requirements } = useRequirementStore();

  // Debounced sync function
  const performSync = useCallback(async () => {
    if (!user) return;
    
    if (!navigator.onLine) {
      dataSync.markPendingChanges();
      return;
    }

    try {
      await dataSync.fullSyncToCloud({
        orders,
        cutPlans,
        markerPlans,
        requirements,
      });
    } catch (error) {
      console.error('Auto-sync error:', error);
      dataSync.markPendingChanges();
    }
  }, [user, orders, cutPlans, markerPlans, requirements]);

  // Auto-sync when data changes (debounced)
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      dataSync.markPendingChanges();
      // Don't auto-push on every change - just mark as pending
      // User can manually sync or it will sync when coming online
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [orders, cutPlans, markerPlans, requirements, user]);

  // Sync when coming online
  useEffect(() => {
    const handleOnline = async () => {
      if (user && dataSync.hasPendingChanges()) {
        await performSync();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, performSync]);

  return { performSync };
}

// Hook for initial data load from cloud
export function useCloudData() {
  const { user } = useAuth();

  useEffect(() => {
    const loadCloudData = async () => {
      if (!user || !navigator.onLine) return;

      try {
        await dataSync.mergeFromCloud();
      } catch (error) {
        console.error('Failed to load cloud data:', error);
      }
    };

    loadCloudData();
  }, [user]);
}
