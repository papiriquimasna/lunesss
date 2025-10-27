import React from 'react';
import { LucideProps, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<LucideProps>;
  trend?: 'up' | 'down';
  trendValue?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, trendValue }: StatCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend === 'up' ? 'text-green-500' : 'text-red-500';

  return (
    <div className="bg-card p-6 rounded-lg border flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <div className="flex items-center text-sm mt-1">
          {trend && trendValue && (
            <div className={cn('flex items-center mr-2', trendColor)}>
              <TrendIcon className="h-4 w-4 mr-1" />
              <span>{trendValue}</span>
            </div>
          )}
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
