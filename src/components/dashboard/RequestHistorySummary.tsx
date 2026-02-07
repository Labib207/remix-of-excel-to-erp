import { useRequestStore } from '@/store/requestStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Calendar, Package, User } from 'lucide-react';
import { format } from 'date-fns';

export function RequestHistorySummary() {
  const { submittedRequests } = useRequestStore();

  // Get recent requests
  const recentRequests = [...submittedRequests]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 10);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'raw-material':
        return 'Raw Material';
      case 'general-supplies':
        return 'General Supply';
      case 'material-return':
        return 'Material Return';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'raw-material':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'general-supplies':
        return 'bg-secondary/50 text-secondary-foreground border-secondary/20';
      case 'material-return':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Recent Requests
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {submittedRequests.length} Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {recentRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No requests submitted yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${getTypeColor(request.type)}`}>
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {getTypeLabel(request.type)}
                      </span>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {request.docNumber}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.form.date), 'dd MMM yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {request.form.department}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {request.items.length} item(s)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}