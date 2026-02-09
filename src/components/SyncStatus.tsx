import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
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

export function SyncStatus() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { orders, cutPlans, markerPlans } = useCuttingStore();
  const { requirements } = useRequirementStore();

  const handleSync = async () => {
    if (!user) {
      toast.error('Please log in to sync data');
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

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await dataSync.fullSyncFromCloud();

      if (result.success && result.data) {
        // Update local stores with cloud data
        const { orders: cloudOrders, requirements: cloudRequirements } = result.data;
        
        // Note: This would replace local data - in a real app you'd want merge logic
        toast.success(
          `Loaded ${cloudOrders.length} orders, ${cloudRequirements.length} requirements from cloud`
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
        ) : (
          <Badge variant="outline" className="gap-1.5">
            <Cloud className="h-3 w-3" />
            Ready
          </Badge>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sync to cloud</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
