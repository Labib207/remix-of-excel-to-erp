import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, Download, Upload } from 'lucide-react';
import { syncEngine } from '@/lib/syncEngine';
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
import { useQueryClient } from '@tanstack/react-query';

export function SyncStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<string>('idle');

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to sync engine status
  useEffect(() => {
    const unsub = syncEngine.onStatusChange((status) => {
      setSyncStatus(status);
      if (status === 'syncing') {
        setIsSyncing(true);
      } else if (status === 'synced') {
        setIsSyncing(false);
        setLastSync(new Date());
        setSyncError(null);
        // Invalidate all queries so UI refreshes from IndexedDB
        queryClient.invalidateQueries();
      } else if (status === 'error') {
        setIsSyncing(false);
        setSyncError('Sync failed');
      } else {
        setIsSyncing(false);
      }
    });
    return unsub;
  }, [queryClient]);

  const handlePush = async () => {
    if (!user || !isOnline) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncEngine.pushToCloud();
      queryClient.invalidateQueries();
      toast.success('Data pushed to cloud');
    } catch (error: any) {
      setSyncError(error.message);
      toast.error('Push failed: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePull = async () => {
    if (!user || !isOnline) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncEngine.pullFromCloud();
      queryClient.invalidateQueries();
      toast.success('Data pulled from cloud');
    } catch (error: any) {
      setSyncError(error.message);
      toast.error('Pull failed: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    if (!user || !isOnline) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncEngine.syncAll();
      queryClient.invalidateQueries();
      toast.success('Full sync completed');
    } catch (error: any) {
      setSyncError(error.message);
      toast.error('Sync failed: ' + error.message);
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
              Local Only
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
        ) : syncStatus === 'syncing' ? (
          <Badge variant="outline" className="gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing...
          </Badge>
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
            <DropdownMenuItem onClick={handlePush} disabled={!isOnline}>
              <Upload className="h-4 w-4 mr-2" />
              Push to Cloud
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePull} disabled={!isOnline}>
              <Download className="h-4 w-4 mr-2" />
              Pull from Cloud
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSyncAll} disabled={!isOnline}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Both Ways
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
