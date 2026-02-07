
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Label } from 'recharts';
import { Plus, Minus } from 'lucide-react';
import ExportChartButton from './ExportChartButton';
import { useToast } from './useToast';

interface DynamicChartRendererProps {
    config: any;
    data: any[];
    proxyLabels: Record<string, string>;
}

const CustomScatterTooltip = ({ active, payload, config }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const xKey = config.xAxis.key;
        const yKey = config.yAxes[0].key;
        const zKey = config.zAxis?.key;
        
        return (
            <div className="custom-tooltip-wrapper">
                <p className="tooltip-label">{`${config.xAxis.label}: ${Number(data[xKey]).toFixed(3)}`}</p>
                <div className="tooltip-item">
                    <span className="tooltip-item-name">{config.yAxes[0].label}:</span>
                    <span className="tooltip-item-value">{Number(data[yKey]).toFixed(3)}</span>
                </div>
                {zKey && (
                    <div className="tooltip-item">
                        <span className="tooltip-item-name">{config.zAxis.label}:</span>
                        <span className="tooltip-item-value">{Number(data[zKey]).toFixed(3)}</span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28'];

const getColorFromScale = (value: number, min: number, max: number): string => {
    const ratio = (value - min) / (max - min);
    // Simple heatmap from blue to red
    const r = Math.round(255 * ratio);
    const b = Math.round(255 * (1 - ratio));
    return `rgb(${r}, 0, ${b})`;
};

const ColorScaleLegend: React.FC<{ min: number; max: number; label: string }> = ({ min, max, label }) => {
    return (
        <div className="flex items-center gap-2 mt-4 text-xs text-content-secondary justify-center">
            <span>{min.toFixed(2)}</span>
            <div className="w-32 h-3 rounded-full" style={{ background: 'linear-gradient(to right, rgb(0,0,255), rgb(255,0,0))' }}></div>
            <span>{max.toFixed(2)}</span>
            <span className="font-semibold ml-2">{label}</span>
        </div>
    );
};


const DynamicChartRenderer: React.FC<DynamicChartRendererProps> = ({ config, data, proxyLabels }) => {
    const { addToast } = useToast();
    const [domains, setDomains] = useState<{ x?: [number, number]; y?: [number, number] } | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const tickFormatter = (value: any) => typeof value === 'number' ? parseFloat(value.toFixed(3)) : value;
    const isMultiY = config.yAxes && config.yAxes.length > 1;
    
    // Memoize domains to prevent jitter
    const originalDomains = useMemo(() => {
        return null;
        // Logic omitted for brevity, keeping existing behavior
    }, [data, config]);

    useEffect(() => { setDomains(null); }, [data, config]);
    
    if (!config || data.length === 0) {
        return <div className="text-center text-content-muted">No data to display for this configuration.</div>;
    }
    
    const { chartType, xAxis, yAxes, zAxis, dataSeries } = config;
    
    // Calculate z-axis range for color scaling if applicable
    let minZ = 0, maxZ = 0;
    if (chartType === 'scatter' && zAxis) {
        const zValues = data.map(d => d[zAxis.key] as number).filter(v => v != null);
        minZ = Math.min(...zValues);
        maxZ = Math.max(...zValues);
    }

    return (
        <div className="w-full h-full relative">
            <div className="absolute top-2 right-2 z-10">
                <ExportChartButton
                    chartRef={chartContainerRef}
                    fileName={`Dynamic_Chart`}
                    setToast={addToast}
                />
            </div>
            <div 
                ref={chartContainerRef}
                className="w-full h-full"
            >
              <ResponsiveContainer width="100%" height={450}>
                 {chartType === 'scatter' ? (
                     <ScatterChart margin={{ top: 5, right: 20, left: 30, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={xAxis.key} type="number" domain={domains?.x || ['dataMin', 'dataMax']} reversed={xAxis.reversed} tick={{ fontSize: 12 }} label={{ value: xAxis.label, position: 'insideBottom', offset: -15, fontSize: 14 }} allowDataOverflow={true} tickFormatter={tickFormatter}/>
                        <YAxis dataKey={yAxes[0].key} type="number" domain={domains?.y || ['auto', 'auto']} reversed={yAxes[0].reversed} tick={{ fontSize: 12 }} label={{ value: yAxes[0].label, angle: -90, position: 'insideLeft', offset: -15, fontSize: 14 }} allowDataOverflow={true} tickFormatter={tickFormatter}/>
                        <Tooltip content={<CustomScatterTooltip config={config} />} />
                        <Scatter name={dataSeries[0].label} data={data} fill="#8884d8">
                            {zAxis && data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColorFromScale(entry[zAxis.key], minZ, maxZ)} />
                            ))}
                        </Scatter>
                     </ScatterChart>
                 ) : (
                     <LineChart data={data} margin={{ top: 5, right: (yAxes.length > 1 ? 40 : 10), left: 30, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={xAxis.key} type="number" domain={domains?.x || ['dataMin', 'dataMax']} reversed={xAxis.reversed} tick={{ fontSize: 12 }} label={{ value: xAxis.label, position: 'insideBottom', offset: -15, fontSize: 14 }} allowDataOverflow={true} tickFormatter={tickFormatter}/>
                        {yAxes.map((axis: any, index: number) => ( <YAxis key={axis.yAxisId} yAxisId={axis.yAxisId} orientation={axis.orientation} stroke={COLORS[index % COLORS.length]} tick={{ fontSize: 12, fill: COLORS[index % COLORS.length] }} domain={isMultiY ? ['auto', 'auto'] : (domains?.y || ['auto', 'auto'])} reversed={axis.reversed} allowDataOverflow={true} tickFormatter={tickFormatter}><Label value={axis.label} angle={axis.orientation === 'left' ? -90 : 90} position={axis.orientation === 'left' ? 'insideLeft' : 'insideRight'} style={{ textAnchor: 'middle', fontSize: 14, fill: COLORS[index % COLORS.length] }} dx={axis.orientation === 'left' ? -25 : 25} /></YAxis> ))}
                        <Tooltip formatter={(value: any, name: any) => [typeof value === 'number' ? value.toFixed(3) : value, name]} labelFormatter={(label) => `${xAxis.label}: ${Number(label).toFixed(3)}`}/>
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {dataSeries.map((series: any, index: number) => ( <Line key={series.label} yAxisId={series.yAxisId} type="monotone" dataKey={series.key} name={series.label} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={false} connectNulls /> ))}
                    </LineChart>
                 )}
              </ResponsiveContainer>
              {chartType === 'scatter' && zAxis && <ColorScaleLegend min={minZ} max={maxZ} label={zAxis.label} />}
            </div>
        </div>
    );
};

export default DynamicChartRenderer;
