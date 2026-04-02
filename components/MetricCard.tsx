
import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, icon, trend }) => {
  return (
    <div className="bg-background-tertiary/30 border border-border-primary rounded-xl p-4 flex flex-col justify-between hover:border-accent-primary/30 transition-all group">
      <div className="flex justify-between items-start mb-2">
        <span className="micro-label">{label}</span>
        {icon && <div className="text-accent-primary opacity-70 group-hover:opacity-100 transition-opacity">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono text-content-primary tracking-tight">
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-content-muted uppercase tracking-wider">{unit}</span>}
      </div>
      {trend && (
        <div className={`mt-2 text-[10px] font-bold flex items-center gap-1 ${trend.isPositive ? 'text-success-primary' : 'text-danger-primary'}`}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          <span className="text-content-muted font-normal">vs avg</span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
