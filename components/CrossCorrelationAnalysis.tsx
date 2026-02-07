import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Section } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, ReferenceLine } from 'recharts';
import { Loader2, GitCommit, AlertCircle, Plus, Minus } from 'lucide-react';

interface CrossCorrelationAnalysisProps {
    section: Section;
    proxyLabels: Record<string, string>;
}

const CrossCorrelationAnalysis: React.FC<CrossCorrelationAnalysisProps> = ({ section, proxyLabels }) => {
    const [proxy1, setProxy1] = useState('');
    const [proxy2, setProxy2] = useState('');
    const [results, setResults] = useState<{ lag: number; correlation: number }[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [domains, setDomains] = useState<{ x?: [number, number]; y?: [number, number] } | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
    const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
    const chartDivRef = useRef<HTMLDivElement>(null);

    const tickFormatter = (value: any) => typeof value === 'number' ? parseFloat(value.toFixed(3)) : value;

    const availableProxies = useMemo(() => {
        const proxies = new Set<string>();
        section.dataPoints.forEach(dp => {
            Object.keys(dp).forEach(key => {
                if (typeof dp[key] === 'number' && key !== 'depth' && key !== 'age') {
                    proxies.add(key);
                }
            });
        });
        return Array.from(proxies);
    }, [section.dataPoints]);

    React.useEffect(() => {
        if (availableProxies.length > 0) {
            setProxy1(availableProxies[0]);
            if (availableProxies.length > 1) {
                setProxy2(availableProxies[1]);
            }
        }
    }, [availableProxies]);

    const handleRunAnalysis = () => {
        setIsLoading(true);
        setResults(null);
        setError(null);
        setTimeout(() => {
            try {
                const series1raw = section.dataPoints
                    .map(dp => ({ x: dp.depth as number, y: dp[proxy1] as number }))
                    .filter(p => p.x != null && p.y != null)
                    .sort((a, b) => a.x - b.x);

                const series2raw = section.dataPoints
                    .map(dp => ({ x: dp.depth as number, y: dp[proxy2] as number }))
                    .filter(p => p.x != null && p.y != null)
                    .sort((a, b) => a.x - b.x);

                if (series1raw.length < 10 || series2raw.length < 10) {
                    throw new Error("Both proxies need at least 10 data points to perform cross-correlation.");
                }

                // 1. Create a common, evenly spaced domain (depth)
                const allX = [...series1raw.map(p => p.x), ...series2raw.map(p => p.x)];
                const minX = Math.min(...allX);
                const maxX = Math.max(...allX);
                const numPoints = Math.max(series1raw.length, series2raw.length);
                const interval = (maxX - minX) / (numPoints - 1);
                
                const commonDomain = Array.from({ length: numPoints }, (_, i) => minX + i * interval);
                
                const interpolate = (series: {x: number, y: number}[], domain: number[]) => {
                    return domain.map(x => {
                        const nextPointIndex = series.findIndex(p => p.x >= x);
                        if (nextPointIndex === -1) return series[series.length - 1].y;
                        if (nextPointIndex === 0) return series[0].y;
                        const prevPoint = series[nextPointIndex - 1];
                        const nextPoint = series[nextPointIndex];
                        if (nextPoint.x === prevPoint.x) return prevPoint.y;
                        const t = (x - prevPoint.x) / (nextPoint.x - prevPoint.x);
                        return prevPoint.y + t * (nextPoint.y - prevPoint.y);
                    });
                };

                const series1 = interpolate(series1raw, commonDomain);
                const series2 = interpolate(series2raw, commonDomain);
                
                // 2. Normalize series (z-score)
                const normalize = (series: number[]) => {
                    const mean = series.reduce((a, b) => a + b, 0) / series.length;
                    const stdDev = Math.sqrt(series.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / series.length);
                    if (stdDev === 0) return series.map(() => 0);
                    return series.map(x => (x - mean) / stdDev);
                };

                const norm1 = normalize(series1);
                const norm2 = normalize(series2);
                
                // 3. Calculate cross-correlation
                const N = norm1.length;
                const maxLag = Math.floor(N / 2) - 1;
                const correlations = [];
                
                for (let lag = -maxLag; lag <= maxLag; lag++) {
                    let sum = 0;
                    for (let i = 0; i < N; i++) {
                        const j = i + lag;
                        if (j >= 0 && j < N) {
                            sum += norm1[i] * norm2[j];
                        }
                    }
                    correlations.push({ lag: lag * interval, correlation: sum / N });
                }
                
                setResults(correlations);
            } catch(e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        }, 100);
    };

    const getAxisDomain = (data: any[], key: string, padding = 0.05): [number, number] => {
        const values = data.map(p => p[key]).filter((v): v is number => typeof v === 'number');
        if (values.length === 0) return [0, 1];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        if (range === 0) return [min - 1, max + 1];
        return [min - range * padding, max + range * padding];
    };
    
    const originalDomains = useMemo(() => {
        if (!results || results.length < 2) return null;
        return {
            x: getAxisDomain(results, 'lag', 0),
            y: [-1, 1] as [number, number],
        };
    }, [results]);

    useEffect(() => {
        setDomains(null);
    }, [results]);

    const handleZoom = (zoomFactor: number) => {
        if (!originalDomains) return;
        const { x: currentXDomain } = domains || {};
        const finalXDomain = currentXDomain || originalDomains.x;

        const zoomDomain = (domain: [number, number], originalDomain: [number, number]): [number, number] => {
            const [min, max] = domain;
            const center = (min + max) / 2;
            const newRange = (max - min) * zoomFactor;
            let newMin = center - newRange / 2;
            let newMax = center + newRange / 2;
            if (zoomFactor > 1 && newMin <= originalDomain[0] && newMax >= originalDomain[1]) return originalDomain;
            return [newMin, newMax];
        };
        
        setDomains({ x: zoomDomain(finalXDomain, originalDomains.x) });
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const isZoomInMode = keysPressed.has('a');
        const isZoomOutMode = keysPressed.has('d');
        if (!isZoomInMode && !isZoomOutMode) return;
        
        e.preventDefault();
        const zoomFactor = isZoomInMode ? 0.9 : 1.1;
        handleZoom(zoomFactor);
    };

    const handleResetZoom = () => setDomains(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const key = e.key.toLowerCase();
        e.stopPropagation();
        if (['a', 'd', 'm'].includes(key) && !e.repeat) {
            e.preventDefault();
            setKeysPressed(prev => new Set(prev).add(key));
        }
    };
    
    const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const key = e.key.toLowerCase();
        e.stopPropagation();
        if (['a', 'd', 'm'].includes(key)) {
            e.preventDefault();
            setKeysPressed(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0 || !keysPressed.has('m')) return;
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning || !panStart || !originalDomains) return;

        const dx = e.clientX - panStart.x;
        
        const { x: currentXDomain } = domains || { x: originalDomains.x };

        const panDomain = (domain: [number, number], delta: number, originalDomain: [number, number], scale: number): [number, number] => {
            let [min, max] = domain;
            let newMin = min - delta * scale;
            let newMax = max - delta * scale;
            
            const range = max - min;
            if (newMin < originalDomain[0]) { newMin = originalDomain[0]; newMax = newMin + range; }
            if (newMax > originalDomain[1]) { newMax = originalDomain[1]; newMin = newMax - range; }
            
            return [newMin, newMax];
        };
        
        const chartWidth = e.currentTarget.clientWidth;
        if (chartWidth === 0) return;
        
        const xPanScale = (currentXDomain[1] - currentXDomain[0]) / chartWidth;
        const newXDomain = panDomain(currentXDomain, dx, originalDomains.x, xPanScale);

        setDomains({ x: newXDomain });
        setPanStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUpOrLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsPanning(false);
        setPanStart(null);
    };
    
    const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2">
                <GitCommit size={20} className="text-accent-primary" /> Cross-Correlation (Leads/Lags)
            </h3>
            <p className="text-sm text-content-muted">Analyze the relationship between two proxies in the depth domain to determine which one leads or lags the other.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">Proxy 1 (Reference)</label>
                    <select value={proxy1} onChange={e => setProxy1(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                        {availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">Proxy 2</label>
                    <select value={proxy2} onChange={e => setProxy2(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                        {availableProxies.filter(p => p !== proxy1).map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                    </select>
                </div>
                <button onClick={handleRunAnalysis} disabled={isLoading || !proxy1 || !proxy2 || proxy1 === proxy2} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50">
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <GitCommit size={16} />}
                    Run Analysis
                </button>
            </div>
             {error && (
                <div className="p-3 rounded-lg flex items-center gap-2 text-sm bg-danger-primary/20 text-danger-primary">
                   <AlertCircle size={18}/> {error}
               </div>
            )}
            <div 
                ref={chartDivRef}
                tabIndex={-1}
                className="outline-none h-96 w-full pt-4 relative"
                style={{ cursor: isPanning ? 'grabbing' : (keysPressed.has('m') ? 'grab' : 'crosshair') }}
                onWheel={handleWheel} 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={(e) => {
                    handleMouseUpOrLeave(e);
                    setKeysPressed(new Set());
                }}
                onDoubleClick={handleResetZoom}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onMouseEnter={() => chartDivRef.current?.focus()}
                onBlur={() => setKeysPressed(new Set())}
                title="Focus chart: A/D + scroll to zoom, M + drag to pan, double-click to reset."
            >
                 {results ? (
                    <>
                        <ResponsiveContainer>
                            <LineChart data={results} margin={{ top: 5, right: 20, bottom: 40, left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="lag" 
                                    type="number" 
                                    domain={domains?.x || ['auto', 'auto']} 
                                    tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} 
                                    stroke="var(--recharts-axis-stroke)"
                                    tickFormatter={tickFormatter}
                                    allowDataOverflow={true}
                                >
                                    <Label value={`Lag (m) (positive = ${proxyLabels[proxy2] || proxy2} lags ${proxyLabels[proxy1] || proxy1})`} offset={-25} position="insideBottom" fill="var(--recharts-axis-stroke)" />
                                </XAxis>
                                <YAxis type="number" domain={[-1, 1]} tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} stroke="var(--recharts-axis-stroke)" tickFormatter={tickFormatter}>
                                    <Label value="Correlation Coeff." angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} dx={-10} />
                                </YAxis>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--recharts-tooltip-bg)', border: '1px solid var(--recharts-tooltip-border)' }}
                                    labelFormatter={(label) => `Lag: ${Number(label).toFixed(2)}m`}
                                    formatter={(value: number) => [value.toFixed(3), 'Correlation']}
                                />
                                <ReferenceLine y={0} stroke="var(--border-secondary)" />
                                <Line type="monotone" dataKey="correlation" stroke="var(--accent-secondary)" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="absolute top-2 right-5 z-10 flex flex-col gap-1">
                            <button onClick={() => handleZoom(0.9)} className="w-7 h-7 flex items-center justify-center bg-background-interactive/70 text-content-primary rounded-md hover:bg-background-interactive-hover transition-colors" title="Zoom In">
                                <Plus size={16} />
                            </button>
                            <button onClick={() => handleZoom(1.1)} className="w-7 h-7 flex items-center justify-center bg-background-interactive/70 text-content-primary rounded-md hover:bg-background-interactive-hover transition-colors" title="Zoom Out">
                                <Minus size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                     <div className="flex items-center justify-center h-full text-content-muted border-2 border-dashed border-border-primary rounded-lg">
                        <p>{isLoading ? 'Calculating...' : 'Analysis results will be displayed here.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CrossCorrelationAnalysis;