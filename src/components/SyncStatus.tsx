import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Download, Upload } from 'lucide-react';
import { dataSync } from '@/lib/dataSync';
import { useCuttingStore } from '@/store/cuttingStore';
import { useRequirementStore } from '@/store/requirementStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function SyncStatus() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const { orders, cutPlans, markerPlans } = useCuttingStore();
  const { requirements } = useRequirementStore();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      if (user && hasPendingChanges) {
        handleSync();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, hasPendingChanges]);

  // Auto-fetch from cloud on login
  useEffect(() => {
    if (user && isOnline) {
      handleMerge();
    }
  }, [user]);

  // Track pending changes
  useEffect(() => {
    setHasPendingChanges(dataSync.hasPendingChanges());
  }, [orders, cutPlans, markerPlans, requirements]);

  const handleSync = async () => {
    if (!user) {
      toast.error('Please log in to sync data');
      return;
    }

    if (!isOnline) {
      dataSync.markPendingChanges();
      setHasPendingChanges(true);
      toast.info('Offline - changes will sync when online');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await dataSync.fullSyncToCloud({
        orders,
        cutPlans,
        markerPlans,
        requirements,
      });

      if (result.success) {
        setLastSync(new Date());
        setHasPendingChanges(false);
        toast.success(
          `Synced ${result.synced.orders} orders, ${result.synced.cutPlans} cut plans, ${result.synced.requirements} requirements`
        );
      } else {
        setSyncError(result.error || 'Sync failed');
        toast.error('Sync failed: ' + result.error);
      }
    } catch (error: any) {
      setSyncError(error.message);
      toast.error('Sync failed: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePull = async () => {
    if (!user) {
      toast.error('Please log in to sync data');
      return;
    }

    if (!isOnline) {
      toast.error('Cannot pull data while offline');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await dataSync.fullSyncFromCloud();

      if (result.success && result.data) {
        // Update local stores with cloud data
        useCuttingStore.setState({ orders: result.data.orders });
        useRequirementStore.setState({ requirements: result.data.requirements });
        
        toast.success(
          `Loaded ${result.data.orders.length} orders, ${result.data.requirements.length} requirements from cloud`
        );
        setLastSync(new Date());
      } else {
        setSyncError(result.error || 'Pull failed');
        toast.error('Pull failed: ' + result.error);
      }
    } catch (error: any) {
      setSyncError(error.message);
      toast.error('Pull failed: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMerge = async () => {
    if (!user || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await dataSync.mergeFromCloud();
      if (result.success) {
        setLastSync(new Date());
        setHasPendingChanges(false);
      }
    } catch (error: any) {
      console.error('Merge error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!user) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1.5 text-muted-foreground">
              <CloudOff className="h-3 w-3" />
              Offline
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Log in to enable cloud sync</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Online/Offline status */}
        {!isOnline && (
          <Badge variant="secondary" className="gap-1.5">
            <CloudOff className="h-3 w-3" />
            Offline
          </Badge>
        )}

        {/* Sync status */}
        {syncError ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="gap-1.5">
                <AlertCircle className="h-3 w-3" />
                Sync Error
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{syncError}</p>
            </TooltipContent>
          </Tooltip>
        ) : hasPendingChanges ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1.5 text-warning border-warning/30">
                <Upload className="h-3 w-3" />
                Pending
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Changes waiting to sync</p>
            </TooltipContent>
          </Tooltip>
        ) : lastSync ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1.5 text-success border-success/30">
                <Check className="h-3 w-3" />
                Synced
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Last synced: {lastSync.toLocaleTimeString()}</p>
            </TooltipContent>
          </Tooltip>
        ) : isOnline ? (
          <Badge variant="outline" className="gap-1.5">
            <Cloud className="h-3 w-3" />
            Ready
          </Badge>
        ) : null}

        {/* Sync dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSync} disabled={!isOnline}>
              <Upload className="h-4 w-4 mr-2" />
              Push to Cloud
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePull} disabled={!isOnline}>
              <Download className="h-4 w-4 mr-2" />
              Pull from Cloud
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleMerge} disabled={!isOnline}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Both Ways
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
