
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { DataPoint, PaleoEvent, Section } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, Label, Brush, ReferenceLine } from 'recharts';
import { Download, Plus, Minus, Crosshair } from 'lucide-react';
import ExportChartButton from './ExportChartButton';
import { useToast } from './useToast';

interface SingleSectionChartProps {
  section: Section;
  chartData: DataPoint[];
  xAxisKey: 'depth' | 'age';
  yAxisKey: string;
  events?: PaleoEvent[];
  proxyLabels: Record<string, string>;
  hoveredValue: number | null;
  setHoveredValue: (value: number | null) => void;
}

const CustomTooltip = ({ active, payload, label, xAxisKey, yAxisLabel }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background-tertiary/90 border border-accent-primary/50 p-3 rounded-lg shadow-2xl backdrop-blur-md font-mono text-[10px] space-y-1">
        <div className="flex justify-between gap-4 border-b border-border-primary pb-1 mb-1">
          <span className="text-content-muted uppercase">Coordinate</span>
          <span className="text-accent-primary font-bold">{label.toFixed(3)} <span className="text-[8px]">{xAxisKey === 'age' ? 'ka' : 'm'}</span></span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-content-muted uppercase">Value</span>
          <span className="text-content-primary font-bold">{payload[0].value.toFixed(4)}</span>
        </div>
        <div className="text-[8px] text-content-muted mt-2 pt-1 border-t border-border-primary/30 uppercase tracking-widest">
          {yAxisLabel}
        </div>
      </div>
    );
  }
  return null;
};

const SingleSectionChart: React.FC<SingleSectionChartProps> = ({ section, chartData, xAxisKey, yAxisKey, events = [], proxyLabels, hoveredValue, setHoveredValue }) => {
  const [domains, setDomains] = useState<{ x?: [number, number]; y?: [number, number] } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  const handleResetZoom = () => setDomains(null);

  const tickFormatter = (value: any) => typeof value === 'number' ? parseFloat(value.toFixed(2)) : value;

  if (chartData.length === 0) {
      return (
          <div className="flex items-center justify-center h-full min-h-[400px] text-content-muted border border-dashed border-border-primary rounded-xl bg-background-tertiary/10">
              <p className="font-mono text-xs uppercase tracking-widest">No telemetry data available</p>
          </div>
      );
  }

  const yAxisLabel = proxyLabels[yAxisKey] || yAxisKey;
  const xAxisLabel = xAxisKey === 'age' ? 'AGE (ka)' : (proxyLabels.depth || 'DEPTH (mbsf)');

  return (
    <div className="relative w-full group">
        <div className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExportChartButton
                chartRef={chartContainerRef}
                fileName={`${section.core_id}_${section.name}_${yAxisKey}`}
                setToast={addToast}
            />
        </div>
        <div ref={chartContainerRef} className="w-full">
            <ResponsiveContainer width="100%" height={400}>
                <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 20, bottom: 40 }}
                    onDoubleClick={handleResetZoom}
                >
                    <CartesianGrid strokeDasharray="1 4" stroke="var(--recharts-grid-stroke)" vertical={false} />
                    <XAxis 
                        dataKey={xAxisKey} 
                        type="number" 
                        domain={domains?.x || ['dataMin', 'dataMax']} 
                        reversed={xAxisKey === 'age'}
                        tick={{ fontSize: 10, fill: 'var(--recharts-axis-stroke)', fontFamily: 'JetBrains Mono' }}
                        label={{ value: xAxisLabel, position: 'insideBottom', offset: -25, fontSize: 10, fill: 'var(--recharts-axis-stroke)', fontFamily: 'JetBrains Mono', fontWeight: 'bold', letterSpacing: '0.1em' }}
                        allowDataOverflow={true} 
                        tickFormatter={tickFormatter} 
                        stroke="var(--recharts-axis-stroke)"
                        axisLine={{ stroke: 'var(--recharts-grid-stroke)', strokeWidth: 1 }}
                        tickLine={{ stroke: 'var(--recharts-grid-stroke)' }}
                    />
                    <YAxis
                        yAxisId={yAxisKey} 
                        domain={domains?.y || ['auto', 'auto']}
                        tick={{ fontSize: 10, fill: 'var(--recharts-axis-stroke)', fontFamily: 'JetBrains Mono' }} 
                        allowDataOverflow={true} 
                        tickFormatter={tickFormatter} 
                        stroke="var(--recharts-axis-stroke)"
                        axisLine={false}
                        tickLine={false}
                    >
                        <Label 
                          value={yAxisLabel.toUpperCase()} 
                          angle={-90} 
                          position="insideLeft" 
                          style={{ textAnchor: 'middle', fontSize: 10, fill: 'var(--recharts-axis-stroke)', fontFamily: 'JetBrains Mono', fontWeight: 'bold', letterSpacing: '0.1em' }} 
                          dx={-10} 
                        />
                    </YAxis>
                    <Tooltip 
                      content={<CustomTooltip xAxisKey={xAxisKey} yAxisLabel={yAxisLabel} />}
                      cursor={{ stroke: 'var(--accent-primary)', strokeWidth: 1, strokeDasharray: '5 5' }}
                    />
                    <Line 
                        yAxisId={yAxisKey} 
                        type="monotone" 
                        dataKey={yAxisKey}
                        stroke={"var(--accent-primary)"} 
                        strokeWidth={1.5} 
                        dot={false} 
                        activeDot={{ r: 4, fill: 'var(--accent-primary)', stroke: 'var(--bg-primary)', strokeWidth: 2 }}
                        name={yAxisLabel} 
                        connectNulls
                        animationDuration={1000}
                    />
                    <Brush 
                      dataKey={xAxisKey} 
                      height={20} 
                      stroke="var(--accent-primary)" 
                      fill="var(--background-tertiary)" 
                      y={370}
                      travellerWidth={10}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default SingleSectionChart;
