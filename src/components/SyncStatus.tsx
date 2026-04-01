import { Badge } from '@/components/ui/badge';
import { Cloud } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SyncStatus() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1.5 text-success border-success/30">
            <Cloud className="h-3 w-3" />
            Cloud
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>All data is stored in the cloud</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
