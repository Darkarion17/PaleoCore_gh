
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { DataPoint, PaleoEvent, Section } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, Label, Brush, ReferenceLine } from 'recharts';
import { Download, Plus, Minus } from 'lucide-react';
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

const SingleSectionChart: React.FC<SingleSectionChartProps> = ({ section, chartData, xAxisKey, yAxisKey, events = [], proxyLabels, hoveredValue, setHoveredValue }) => {
  const [domains, setDomains] = useState<{ x?: [number, number]; y?: [number, number] } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const chartContainerRef = useRef<HTMLDivElement>(null); // For export
  const { addToast } = useToast();

  const handleResetZoom = () => setDomains(null);

  const series = useMemo(() => [{
    key: yAxisKey,
    name: proxyLabels[yAxisKey] || yAxisKey
  }], [yAxisKey, proxyLabels]);

  const tickFormatter = (value: any) => typeof value === 'number' ? parseFloat(value.toFixed(3)) : value;

  // Zoom and Pan logic could be here (omitted for brevity as per original component logic structure)

  if (chartData.length === 0) {
      return (
          <div className="flex items-center justify-center h-full min-h-[400px] text-content-muted border-2 border-dashed border-border-primary rounded-lg">
              <p>No data available for this proxy.</p>
          </div>
      );
  }

  const yAxisLabel = proxyLabels[yAxisKey] || yAxisKey;
  const xAxisLabel = xAxisKey === 'age' ? 'Age (ka)' : (proxyLabels.depth || 'Depth (mbsf)');
  const yAxisFontSize = yAxisLabel.length > 25 ? 10 : (yAxisLabel.length > 18 ? 12 : 14);

  return (
    <div className="relative w-full">
        <div className="absolute top-2 right-2 z-10">
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
                    margin={{ top: 5, right: 30, left: 30, bottom: 40 }}
                    onDoubleClick={handleResetZoom}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        dataKey={xAxisKey} type="number" domain={domains?.x || ['dataMin', 'dataMax']} reversed={xAxisKey === 'age'}
                        tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }}
                        label={{ value: xAxisLabel, position: 'insideBottom', offset: -25, fontSize: 14, fill: 'var(--recharts-axis-stroke)' }}
                        allowDataOverflow={true} tickFormatter={tickFormatter} stroke="var(--recharts-axis-stroke)"
                    />
                    <YAxis
                        yAxisId={yAxisKey} domain={domains?.y || ['auto', 'auto']}
                        tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} allowDataOverflow={true} tickFormatter={tickFormatter} stroke="var(--recharts-axis-stroke)"
                    >
                        <Label value={yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: yAxisFontSize, fill: 'var(--recharts-axis-stroke)' }} dx={-20} />
                    </YAxis>
                    <Tooltip content={() => null} />
                    <Legend wrapperStyle={{ paddingTop: '35px' }} />
                    <Line 
                        yAxisId={yAxisKey} type="monotone" dataKey={yAxisKey}
                        stroke={"var(--accent-primary)"} strokeWidth={2} dot={false} name={yAxisLabel} connectNulls
                    />
                    <Brush dataKey={xAxisKey} height={30} stroke="var(--accent-secondary)" fill="var(--bg-tertiary)" y={360} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default SingleSectionChart;
