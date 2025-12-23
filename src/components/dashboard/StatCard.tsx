import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function StatCard({ title, value, subtitle, icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-6 shadow-card transition-all duration-300 hover:shadow-lg",
      variant === 'primary' && "border-primary/20 bg-primary/5",
      variant === 'success' && "border-success/20 bg-success/5",
      variant === 'warning' && "border-warning/20 bg-warning/5",
      variant === 'default' && "border-border bg-card"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {trend && (
              <span className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          variant === 'primary' && "bg-primary/10 text-primary",
          variant === 'success' && "bg-success/10 text-success",
          variant === 'warning' && "bg-warning/10 text-warning",
          variant === 'default' && "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
