import { useEffect } from 'react';
import { dataSync } from '@/lib/dataSync';
import { useCuttingStore } from '@/store/cuttingStore';
import { useRequirementStore } from '@/store/requirementStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Component that handles automatic data synchronization
export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const cuttingStore = useCuttingStore();
  const requirementStore = useRequirementStore();

  // Load cloud data on login
  useEffect(() => {
    const loadAndMerge = async () => {
      if (!user || !navigator.onLine) return;

      try {
        const result = await dataSync.mergeFromCloud();
        if (result.success) {
          console.log('Data synced from cloud');
        }
      } catch (error) {
        console.error('Failed to merge cloud data:', error);
      }
    };

    loadAndMerge();
  }, [user]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      if (!user) return;
      
      if (dataSync.hasPendingChanges()) {
        toast.info('Syncing offline changes...');
        
        try {
          const result = await dataSync.fullSyncToCloud({
            orders: cuttingStore.orders,
            cutPlans: cuttingStore.cutPlans,
            markerPlans: cuttingStore.markerPlans,
            requirements: requirementStore.requirements,
          });

          if (result.success) {
            toast.success('Offline changes synced to cloud');
          } else {
            toast.error('Failed to sync: ' + result.error);
          }
        } catch (error: any) {
          toast.error('Sync failed: ' + error.message);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, cuttingStore.orders, cuttingStore.cutPlans, cuttingStore.markerPlans, requirementStore.requirements]);

  // Mark pending changes when stores update (debounced)
  useEffect(() => {
    if (!user) return;
    
    // Just mark that there are pending changes
    dataSync.markPendingChanges();
  }, [
    user,
    cuttingStore.orders, 
    cuttingStore.cutPlans, 
    cuttingStore.markerPlans,
    requirementStore.requirements
  ]);

  return <>{children}</>;
}
