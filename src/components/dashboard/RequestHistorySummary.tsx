import { useLocalDeliveryAcknowledgments } from '@/hooks/useLocalDelivery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';

export function RequestHistorySummary() {
  const { data: deliveryAcks = [] } = useLocalDeliveryAcknowledgments();

  const recentAcks = [...deliveryAcks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Recent Delivery Notes
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {deliveryAcks.length} Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {recentAcks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No delivery notes yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {recentAcks.map((ack) => (
                <div
                  key={ack.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 bg-primary/10 text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        Delivery Note
                      </span>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {ack.acknowledgment_no}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(ack.delivery_date), 'dd MMM yyyy')}
                      </span>
                      {ack.received_by && (
                        <span>Received by: {ack.received_by}</span>
                      )}
                    </div>
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
