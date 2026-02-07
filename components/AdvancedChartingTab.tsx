
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Section, DataPoint } from '../types';
import { LineChart as LineChartIcon, BarChart3, Download, Check, ChevronDown } from 'lucide-react';
import DynamicChartRenderer from './DynamicChartRenderer';
import ExportChartButton from './ExportChartButton';
import ChartAnnotationControls from './ChartAnnotationControls';

interface ChartConfig {
    chartType: 'scatter' | 'line';
    title: string;
    xAxis: { key: string; label: string; reversed: boolean };
    yAxes: Array<{ key: string; label: string; orientation: string; yAxisId: string; reversed: boolean }>;
    dataSeries: Array<{ label: string; key: string; yAxisId: string }>;
    zAxis?: { key: string; label: string };
}

interface AdvancedChartingTabProps {
    section: Section;
    proxyLabels: Record<string, string>;
    setToast: (toast: { message: string; type: 'success' | 'error' | 'info'; show: boolean; }) => void;
}

const AdvancedChartingTab: React.FC<AdvancedChartingTabProps> = ({ section, proxyLabels, setToast }) => {
    
    const availableProxies = useMemo<string[]>(() => {
        const proxies = new Set<string>();
        section.dataPoints.forEach(dp => {
            Object.keys(dp).forEach(key => {
                if (typeof dp[key] === 'number') {
                    proxies.add(key);
                }
            });
        });
        return Array.from(proxies).filter(p => p !== 'qcFlag');
    }, [section.dataPoints]);

    const hasAgeData = useMemo(() => section.dataPoints.some(dp => dp.age != null), [section.dataPoints]);

    const [xAxisKey, setXAxisKey] = useState<string>(hasAgeData ? 'age' : 'depth');
    const [yAxisKeys, setYAxisKeys] = useState<Set<string>>(new Set());
    const [zAxisKey, setZAxisKey] = useState<string>('__NONE__'); // '__NONE__' for no selection
    
    const [xAxisReversed, setXAxisReversed] = useState(hasAgeData);
    const [yAxisReversed, setYAxisReversed] = useState(false);
    const [yAxisDropdownOpen, setYAxisDropdownOpen] = useState(false);
    const yAxisDropdownRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        setXAxisKey(hasAgeData ? 'age' : 'depth');
        setXAxisReversed(hasAgeData);
    }, [hasAgeData, section.id]);
    
    useEffect(() => {
        setYAxisKeys(new Set<string>());
    }, [section.id]);

    useEffect(() => {
        setYAxisReversed(yAxisKeys.has('delta18O'));
    }, [yAxisKeys]);
    
    useEffect(() => {
        if (yAxisKeys.size > 1 && zAxisKey !== '__NONE__') {
            setZAxisKey('__NONE__');
        }
    }, [yAxisKeys, zAxisKey]);
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (yAxisDropdownRef.current && !yAxisDropdownRef.current.contains(event.target as Node)) {
                setYAxisDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleYAxisToggle = (key: string) => {
        setYAxisKeys(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const chartConfig = useMemo<ChartConfig | null>(() => {
        if (!xAxisKey || yAxisKeys.size === 0) return null;
        
        const isMultiYAxis = yAxisKeys.size > 1;
        const effectiveZAxisKey = isMultiYAxis ? '__NONE__' : zAxisKey;
        // FIX: Explicitly cast Array.from results to string[] to resolve indexer errors and ensure correct type propagation.
        const yAxisKeysArray = Array.from(yAxisKeys) as string[];
        const firstYKey = yAxisKeysArray[0];

        const yAxes = yAxisKeysArray.map((key, index) => ({
            key: key,
            label: proxyLabels[key] || key,
            orientation: index % 2 === 0 ? 'left' : 'right',
            yAxisId: key, // Use the key as the ID
            reversed: yAxisReversed,
        }));

        const series = yAxisKeysArray.map(key => ({
            label: proxyLabels[key] || key,
            key: key,
            yAxisId: key, // Link to the YAxis
        }));

        const config: ChartConfig = {
            chartType: effectiveZAxisKey !== '__NONE__' ? 'scatter' : 'line',
            title: yAxisKeys.size > 1
                ? `Multiple Proxies vs. ${proxyLabels[xAxisKey] || xAxisKey}`
                : `${proxyLabels[firstYKey] || firstYKey} vs. ${proxyLabels[xAxisKey] || xAxisKey}`,
            xAxis: {
                key: xAxisKey,
                label: proxyLabels[xAxisKey] || xAxisKey,
                reversed: xAxisReversed,
            },
            yAxes: yAxes,
            dataSeries: series,
            zAxis: undefined,
        };

        if (effectiveZAxisKey !== '__NONE__') {
            config.zAxis = {
                key: zAxisKey,
                label: proxyLabels[zAxisKey] || zAxisKey,
            };
             config.dataSeries[0].label = `${section.name}`;
        }

        return config;

    }, [xAxisKey, yAxisKeys, zAxisKey, xAxisReversed, yAxisReversed, proxyLabels, section.name]);

    const chartData = useMemo(() => {
        // FIX: Capture chartConfig in a local variable for better TypeScript narrowing.
        const config = chartConfig;
        if (!config) return [];
    
        const { xAxis, zAxis, dataSeries } = config;
        // FIX: Explicitly type the shared xKey as a string to avoid 'unknown' index errors in sub-scopes.
        const xKey: string = xAxis.key;
    
        if (zAxis && zAxis.key) {
            const yAxis = config.yAxes[0];
            // FIX: Check for existence of yAxis before accessing properties to resolve potential "unknown" or "undefined" indexer issues.
            if (!yAxis) return [];
            const yKey: string = yAxis.key;
            const zKey: string = zAxis.key;
            
            // FIX: Use any-casting for dp and point to allow safe dynamic property access with string keys.
            return section.dataPoints.map((dp: any): Record<string, any> => {
                const point: Record<string, any> = {};
                point[xKey] = dp[xKey];
                point[yKey] = dp[yKey];
                point[zKey] = dp[zKey];
                return point;
            }).filter((p: any) => p[xKey] != null && p[yKey] != null && p[zKey] != null);
        }
    
        const mergedData = new Map<any, any>();
        section.dataPoints.forEach((point: any) => {
            // FIX: Access property using explicitly typed string xKey.
            const xValue = point[xKey];
            if (xValue != null) {
                // FIX: Ensure entry is initialized and updated using string keys.
                let entry: any = mergedData.get(xValue);
                if (!entry) {
                    entry = {};
                    entry[xKey] = xValue;
                }
                let updated = false;
    
                // FIX: Explicitly type and access each data series property as a string.
                dataSeries.forEach((series: { label: string; key: string; yAxisId: string }) => {
                    const sKey: string = series.key;
                    const yValue = point[sKey];
                    if (yValue != null) {
                        const sLabel: string = series.label;
                        entry[sLabel] = yValue;
                        updated = true;
                    }
                });
    
                if (updated) {
                    mergedData.set(xValue, entry);
                }
            }
        });
    
        // FIX: Explicitly use any-casting for sorting to avoid indexer errors on generic objects.
        return Array.from(mergedData.values()).sort((a: any, b: any) => (a[xKey] as number) - (b[xKey] as number));
    }, [chartConfig, section.dataPoints]);

    const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;

    return (
        <div className="space-y-6">
            <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-content-secondary mb-1">X-Axis</label>
                        <select value={xAxisKey} onChange={e => {setXAxisKey(e.target.value); setXAxisReversed(e.target.value === 'age');}} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                            {availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-content-secondary mb-1">Y-Axis (select multiple)</label>
                        <div ref={yAxisDropdownRef} className="relative">
                            <button onClick={() => setYAxisDropdownOpen(p => !p)} className={`${selectClass} text-left flex justify-between items-center`}>
                                <span className="truncate pr-2">{
                                    yAxisKeys.size > 1 
                                        ? `${yAxisKeys.size} proxies selected` 
                                        : (proxyLabels[Array.from(yAxisKeys)[0]] || 'Select proxy')
                                }</span>
                                <ChevronDown size={16} className={`transition-transform ${yAxisDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {yAxisDropdownOpen && (
                                <div className="absolute top-full mt-1 w-full bg-background-primary border border-border-secondary rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto p-2">
                                    {availableProxies.filter(p => p !== xAxisKey).map(p => (
                                        <label key={p} className="flex items-center gap-2 p-2 rounded-md hover:bg-background-tertiary text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={yAxisKeys.has(p)}
                                                onChange={() => handleYAxisToggle(p)}
                                                className="h-4 w-4 rounded border-border-secondary bg-background-interactive text-accent-primary focus:ring-accent-primary"
                                            />
                                            <span>{proxyLabels[p] || p}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                     <div title={yAxisKeys.size > 1 ? "Z-Axis is disabled for multi-line charts" : ""}>
                        <label className="block text-xs font-medium text-content-secondary mb-1">Z-Axis (Color)</label>
                        <select
                            value={zAxisKey}
                            onChange={e => setZAxisKey(e.target.value)}
                            className={selectClass}
                            style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
                            disabled={yAxisKeys.size > 1}
                        >
                           <option value="__NONE__">None (Line Chart)</option>
                           {availableProxies.filter(p => p !== xAxisKey && !yAxisKeys.has(p)).map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-4 justify-self-end">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={xAxisReversed} onChange={e => setXAxisReversed(e.target.checked)} className="h-4 w-4 rounded border-border-secondary bg-background-interactive text-accent-primary focus:ring-accent-primary" />
                            Reverse X
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={yAxisReversed} onChange={e => setYAxisReversed(e.target.checked)} className="h-4 w-4 rounded border-border-secondary bg-background-interactive text-accent-primary focus:ring-accent-primary" />
                            Reverse Y
                        </label>
                    </div>
                </div>
            </div>
             <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50 min-h-[500px] flex flex-col">
                 <div className="flex-grow">
                     {chartConfig && chartData.length > 0 ? (
                            <DynamicChartRenderer config={chartConfig} data={chartData} proxyLabels={proxyLabels} />
                     ) : (
                        <div className="text-content-muted text-center h-full flex-grow flex flex-col justify-center">
                            {availableProxies.length > 0 ? <LineChartIcon size={48} className="mb-4 mx-auto"/> : <BarChart3 size={48} className="mb-4 mx-auto"/>}
                            <h3 className="text-lg font-semibold text-content-primary">{availableProxies.length > 0 ? 'Configure your chart above' : 'No data available'}</h3>
                            <p>{availableProxies.length > 0 ? 'Select variables to plot from the dropdowns.' : 'Add data points in the Data Entry tab to start charting.'}</p>
                        </div>
                     )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedChartingTab;
