
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Section, DataPoint } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import ExportChartButton from './ExportChartButton';
import { useToast } from './useToast';

interface ChartSeries {
    label: string;
    yAxisId?: 'left' | 'right';
    color?: string;
}

interface MultiSectionChartProps {
  data: any[];
  sections?: Section[]; // For backwards compatibility
  dataSeries?: ChartSeries[];
  spliceData?: DataPoint[];
  proxyKey?: string;
  xAxisKey: 'depth' | 'age';
  showLr04?: boolean;
  lr04Data?: { age: number; d18O: number }[];
  proxyLabels: Record<string, string>;
  xAxisReversed?: boolean;
  yAxisReversed?: boolean;
  manualXDomain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax'];
  manualYDomain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax'];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28', '#a4de6c', '#d0ed57', '#ffc658'];
const LR04_COLOR = 'var(--text-muted)';
const SPLICE_COLOR = 'var(--accent-primary)';


const CustomTooltip = ({ active, payload, label, xAxisLabel }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip-wrapper">
                <p className="tooltip-label">{`${xAxisLabel}: ${Number(label).toFixed(3)}`}</p>
                {payload.map((pld: any, index: number) => (
                    <div key={index} className="tooltip-item" style={{ color: pld.color }}>
                        <div className="tooltip-color-swatch" style={{ backgroundColor: pld.stroke }} />
                        <span className="tooltip-item-name">{pld.name}:</span>
                        <span className="tooltip-item-value">{Number(pld.value).toFixed(3)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};


const MultiSectionChart: React.FC<MultiSectionChartProps> = (props) => {
    const { data, dataSeries, spliceData = [], proxyKey, xAxisKey, proxyLabels, xAxisReversed = false, yAxisReversed = false, manualXDomain, manualYDomain } = props;
    const { addToast } = useToast();
    
    const [domains, setDomains] = useState<{ x?: [number, number]; left?: [number, number]; right?: [number, number] } | null>(null);
    const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const tickFormatter = (value: any) => typeof value === 'number' ? parseFloat(value.toFixed(3)) : value;
    
    const seriesToRender = useMemo(() => {
        if (dataSeries) return dataSeries;
        if (props.sections) {
            const series: ChartSeries[] = props.sections.map(s => ({ label: s.name, yAxisId: 'left' }));
            if (spliceData && spliceData.length > 0) series.push({ label: 'Composite Splice', yAxisId: 'left', color: SPLICE_COLOR });
            if (props.showLr04 && xAxisKey === 'age') series.push({ label: 'LR04 Benthic Stack', yAxisId: 'right', color: LR04_COLOR });
            return series;
        }
        return [];
    }, [dataSeries, props.sections, spliceData, props.showLr04, xAxisKey]);

    const yAxisLabel = proxyLabels[proxyKey || ''] || proxyKey;
    const leftSeries = useMemo(() => seriesToRender.filter(s => s.yAxisId !== 'right'), [seriesToRender]);
    const rightSeries = useMemo(() => seriesToRender.filter(s => s.yAxisId === 'right'), [seriesToRender]);
    const hasLeftAxis = leftSeries.length > 0;
    const hasRightAxis = rightSeries.length > 0;
    const leftAxisDisplayLabel = useMemo(() => {
        const mainSeries = leftSeries.filter(s => s.label !== 'Composite Splice');
        if (mainSeries.length > 0) { const coreId = mainSeries[0].label.split(' / ')[0]; return `${coreId} (${yAxisLabel})`; }
        return yAxisLabel;
    }, [leftSeries, yAxisLabel]);
    const rightAxisDisplayLabel = useMemo(() => {
        if (rightSeries.length > 0) { if (rightSeries[0].label === 'LR04 Benthic Stack') return "LR04 δ¹⁸O (‰)"; const coreId = rightSeries[0].label.split(' / ')[0]; return `${coreId} (${yAxisLabel})`; }
        return yAxisLabel;
    }, [rightSeries, yAxisLabel]);
    const leftAxisColor = leftSeries.length > 0 && leftSeries[0].color ? leftSeries[0].color : 'var(--recharts-axis-stroke)';
    const rightAxisColor = rightSeries.length > 0 && rightSeries[0].color ? rightSeries[0].color : 'var(--recharts-axis-stroke)';
    const xAxisLabel = xAxisKey === 'age' ? 'Age (ka)' : (proxyLabels.depth || 'Depth (mbsf)');

  return (
    <div className="w-full h-full relative group">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExportChartButton
              chartRef={chartContainerRef}
              fileName={`Multi_Section_Chart`}
              setToast={addToast}
          />
      </div>
      <div 
        ref={chartContainerRef}
        className="w-full h-full"
      >
        <ResponsiveContainer>
            <LineChart 
                data={data} 
                margin={{ top: 10, right: hasRightAxis ? 40 : 20, left: hasLeftAxis ? 30 : 20, bottom: 20 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                    dataKey={xAxisKey} 
                    type="number" 
                    domain={manualXDomain || domains?.x || ['dataMin', 'dataMax']} 
                    tick={{ fontSize: 12 }} 
                    label={{ value: xAxisLabel, position: 'insideBottom', offset: -15, fontSize: 14 }} 
                    allowDuplicatedCategory={false} 
                    reversed={xAxisReversed} 
                    tickFormatter={tickFormatter} 
                    allowDataOverflow={true}
                />
                {hasLeftAxis && <YAxis yAxisId="left" domain={manualYDomain || domains?.left || ['auto', 'auto']} tick={{ fontSize: 12, fill: leftAxisColor }} stroke={leftAxisColor} tickFormatter={tickFormatter} reversed={yAxisReversed} allowDataOverflow={true}><Label value={leftAxisDisplayLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: 12, fill: leftAxisColor }} dx={-25}/></YAxis>}
                {hasRightAxis && <YAxis yAxisId="right" orientation="right" domain={manualYDomain || domains?.right || ['auto', 'auto']} tick={{ fontSize: 12, fill: rightAxisColor }} stroke={rightAxisColor} tickFormatter={tickFormatter} reversed={yAxisReversed || (props.showLr04 && xAxisKey === 'age')} allowDataOverflow={true}><Label value={rightAxisDisplayLabel} angle={90} position="insideRight" style={{ textAnchor: 'middle', fontSize: 12, fill: rightAxisColor }} dx={25} /></YAxis>}
                <Tooltip content={<CustomTooltip xAxisLabel={xAxisLabel} />} cursor={{ stroke: 'var(--text-secondary)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                 {seriesToRender.map((series, index) => (
                    <Line key={series.label} yAxisId={series.yAxisId || 'left'} dataKey={series.label} name={series.label} stroke={series.color || COLORS[index % COLORS.length]} strokeWidth={series.label === 'Composite Splice' ? 3 : 1.5} strokeDasharray={series.label === 'LR04 Benthic Stack' ? "5 5" : undefined} dot={false} connectNulls type="monotone" hide={hiddenSeries[series.label]} />
                 ))}
            </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MultiSectionChart;
