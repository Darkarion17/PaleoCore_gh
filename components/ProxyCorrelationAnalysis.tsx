import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Section } from '../types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Line } from 'recharts';
import { GitMerge, AlertCircle, Plus, Minus } from 'lucide-react';

interface ProxyCorrelationAnalysisProps {
    allCoreSections: Section[];
    proxyLabels: Record<string, string>;
}

// Helper function to approximate the CDF of the standard normal distribution
// This is used for calculating the p-value from the t-statistic.
// It's a reasonable approximation, especially for larger sample sizes (n > 30).
const normalCdf = (z: number) => {
    // Abramowitz and Stegun formula 26.2.17 for the error function erf(x)
    const erf = (x: number) => {
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
        const sign = x >= 0 ? 1 : -1;
        const absX = Math.abs(x);
        const t = 1.0 / (1.0 + p * absX);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
        return sign * y;
    };
    return 0.5 * (1 + erf(z / Math.sqrt(2)));
};


const ProxyCorrelationAnalysis: React.FC<ProxyCorrelationAnalysisProps> = ({ allCoreSections, proxyLabels }) => {
    const [proxyX, setProxyX] = useState('');
    const [proxyY, setProxyY] = useState('');
    const [domains, setDomains] = useState<{ x?: [number, number]; y?: [number, number] } | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
    const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
    const chartDivRef = useRef<HTMLDivElement>(null);

    const tickFormatter = (value: any) => typeof value === 'number' ? parseFloat(value.toFixed(3)) : value;

    const allDataPoints = useMemo(() => {
        if (!allCoreSections) return [];
        return allCoreSections.flatMap(s => s.dataPoints);
    }, [allCoreSections]);

    const availableProxies = useMemo(() => {
        const proxies = new Set<string>();
        allDataPoints.forEach(dp => {
            Object.keys(dp).forEach(key => {
                if (typeof dp[key] === 'number' && key !== 'depth' && key !== 'age' && key !== 'qcFlag') {
                    proxies.add(key);
                }
            });
        });
        return Array.from(proxies).sort((a, b) => (proxyLabels[a] || a).localeCompare(proxyLabels[b] || b));
    }, [allDataPoints, proxyLabels]);

    React.useEffect(() => {
        if (availableProxies.length > 0) {
            setProxyX(availableProxies.includes('delta18O') ? 'delta18O' : availableProxies[0]);
            if (availableProxies.length > 1) {
                const defaultY = availableProxies.includes('delta13C') ? 'delta13C' : availableProxies[1];
                setProxyY(defaultY === proxyX ? availableProxies[0] : defaultY);
            } else {
                setProxyY('');
            }
        }
    }, [availableProxies]);

    const correlationData = useMemo(() => {
        if (!proxyX || !proxyY || proxyX === proxyY) return [];
        return allDataPoints
            .map(dp => ({
                x: dp[proxyX] as number,
                y: dp[proxyY] as number,
            }))
            .filter(p => p.x != null && p.y != null);
    }, [allDataPoints, proxyX, proxyY]);

    const stats = useMemo(() => {
        if (correlationData.length < 3) return null; // Need at least 3 for df > 0

        const n = correlationData.length;
        const sumX = correlationData.reduce((acc, p) => acc + p.x, 0);
        const sumY = correlationData.reduce((acc, p) => acc + p.y, 0);
        const meanX = sumX / n;
        const meanY = sumY / n;

        let numerator = 0;
        let denX = 0; // Sum of squared deviations for X
        for (const p of correlationData) {
            numerator += (p.x - meanX) * (p.y - meanY);
            denX += (p.x - meanX) ** 2;
        }

        if (denX === 0) return null;

        const slope = numerator / denX;
        const intercept = meanY - slope * meanX;

        let sst = 0; // Total sum of squares
        let sse = 0; // Sum of squared errors (residuals)
        for (const p of correlationData) {
            const predictedY = slope * p.x + intercept;
            sse += (p.y - predictedY) ** 2;
            sst += (p.y - meanY) ** 2;
        }

        if (sst === 0) return null;

        const rSquared = 1 - (sse / sst);
        const r = Math.sqrt(Math.max(0, rSquared)) * (slope >= 0 ? 1 : -1);
        
        const df = n - 2;
        if (df <= 0) {
            return { r, rSquared, slope, intercept, n, pValue: null, ci95: null };
        }

        const mse = sse / df; // Mean Squared Error
        const seSlope = Math.sqrt(mse / denX);
        const tStat = seSlope === 0 ? Infinity : slope / seSlope;

        const pValue = 2 * (1 - normalCdf(Math.abs(tStat)));

        const t_critical = 1.96; // Approximation for 95% CI (z-score for large n)
        const marginOfError = t_critical * seSlope;
        const ci95 = {
            lower: slope - marginOfError,
            upper: slope + marginOfError
        };

        return { r, rSquared, slope, intercept, n, pValue, ci95 };
    }, [correlationData]);

    const regressionLineData = useMemo(() => {
        if (!stats || correlationData.length < 2) return [];
        const xValues = correlationData.map(p => p.x);
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);
        return [
            { x: minX, y: stats.slope * minX + stats.intercept },
            { x: maxX, y: stats.slope * maxX + stats.intercept },
        ];
    }, [correlationData, stats]);
    
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
        if (correlationData.length < 2) return null;
        return {
          x: getAxisDomain(correlationData, 'x', 0.05),
          y: getAxisDomain(correlationData, 'y', 0.05),
        };
    }, [correlationData]);

    useEffect(() => {
        setDomains(null);
    }, [correlationData]);

    const handleZoom = (zoomFactor: number) => {
        if (!originalDomains) return;
        const { x: currentXDomain, y: currentYDomain } = domains || originalDomains;
        const zoomDomain = (domain: [number, number], originalDomain: [number, number]): [number, number] => {
            const [min, max] = domain;
            const center = (min + max) / 2;
            const newRange = (max - min) * zoomFactor;
            let newMin = center - newRange / 2;
            let newMax = center + newRange / 2;
            if (zoomFactor > 1 && newMin <= originalDomain[0] && newMax >= originalDomain[1]) return originalDomain;
            return [newMin, newMax];
        };
        setDomains({
            x: zoomDomain(currentXDomain, originalDomains.x),
            y: zoomDomain(currentYDomain, originalDomains.y),
        });
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
        const dy = e.clientY - panStart.y;
        const { x: currentX, y: currentY } = domains || originalDomains;
        const panDomain = (domain: [number, number], delta: number, originalDomain: [number, number], scale: number): [number, number] => {
            let [min, max] = domain; let newMin = min - delta * scale; let newMax = max - delta * scale; const range = max - min;
            if (newMin < originalDomain[0]) { newMin = originalDomain[0]; newMax = newMin + range; }
            if (newMax > originalDomain[1]) { newMax = originalDomain[1]; newMin = newMax - range; }
            return [newMin, newMax];
        };
        const chartWidth = e.currentTarget.clientWidth; const chartHeight = e.currentTarget.clientHeight; if (chartWidth === 0 || chartHeight === 0) return;
        const xPanScale = (currentX[1] - currentX[0]) / chartWidth; const yPanScale = (currentY[1] - currentY[0]) / chartHeight;
        setDomains({ x: panDomain(currentX, dx, originalDomains.x, xPanScale), y: panDomain(currentY, -dy, originalDomains.y, yPanScale) });
        setPanStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUpOrLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsPanning(false); setPanStart(null);
    };

    const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;
    
    const yAxisLabel = proxyLabels[proxyY] || proxyY;
    const yAxisLabelLength = yAxisLabel.length;
    const yAxisFontSize = yAxisLabelLength > 25 ? 10 : (yAxisLabelLength > 18 ? 12 : 14);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2">
                <GitMerge size={20} className="text-accent-primary" /> Core-wide Proxy vs. Proxy Correlation
            </h3>
            <p className="text-sm text-content-muted">Explore the linear relationship between two proxy variables across all sections in this core.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">X-Axis Proxy</label>
                    <select value={proxyX} onChange={e => setProxyX(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                        {availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">Y-Axis Proxy</label>
                    <select value={proxyY} onChange={e => setProxyY(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                        {availableProxies.filter(p => p !== proxyX).map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div ref={chartDivRef} tabIndex={-1} className="outline-none md:col-span-2 h-96 w-full pt-4 relative" 
                    style={{ cursor: isPanning ? 'grabbing' : (keysPressed.has('m') ? 'grab' : 'crosshair') }} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={(e) => { handleMouseUpOrLeave(e); setKeysPressed(new Set()); }} onDoubleClick={handleResetZoom} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onMouseEnter={() => chartDivRef.current?.focus()} onBlur={() => setKeysPressed(new Set())}
                    title="Focus chart: A/D + scroll to zoom, M + drag to pan, double-click to reset."
                >
                    {correlationData.length > 1 ? (
                        <>
                            <ResponsiveContainer>
                                <ScatterChart margin={{ top: 5, right: 20, bottom: 40, left: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" dataKey="x" name={proxyLabels[proxyX] || proxyX} domain={domains?.x || ['auto', 'auto']} tickFormatter={tickFormatter} tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} stroke="var(--recharts-axis-stroke)" allowDataOverflow={true}>
                                        <Label value={proxyLabels[proxyX] || proxyX} offset={-25} position="insideBottom" fill="var(--recharts-axis-stroke)" />
                                    </XAxis>
                                    <YAxis type="number" dataKey="y" name={proxyLabels[proxyY] || proxyY} domain={domains?.y || ['auto', 'auto']} tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} stroke="var(--recharts-axis-stroke)" tickFormatter={tickFormatter} allowDataOverflow={true}>
                                        <Label
                                            value={yAxisLabel}
                                            angle={-90}
                                            position="insideLeft"
                                            style={{ textAnchor: 'middle', fontSize: yAxisFontSize, fill: 'var(--recharts-axis-stroke)' }}
                                            dx={-10}
                                        />
                                    </YAxis>
                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        contentStyle={{ backgroundColor: 'var(--recharts-tooltip-bg)', border: '1px solid var(--recharts-tooltip-border)' }}
                                    />
                                    <Scatter data={correlationData} fill="var(--accent-secondary)" />
                                    <Line data={regressionLineData} dataKey="y" stroke="var(--accent-primary)" strokeWidth={2} dot={false} isAnimationActive={false} legendType="none" />
                                </ScatterChart>
                            </ResponsiveContainer>
                             <div className="absolute top-2 right-5 z-10 flex flex-col gap-1">
                                <button onClick={() => handleZoom(0.9)} className="w-7 h-7 flex items-center justify-center bg-background-interactive/70 text-content-primary rounded-md hover:bg-background-interactive-hover transition-colors" title="Zoom In"><Plus size={16} /></button>
                                <button onClick={() => handleZoom(1.1)} className="w-7 h-7 flex items-center justify-center bg-background-interactive/70 text-content-primary rounded-md hover:bg-background-interactive-hover transition-colors" title="Zoom Out"><Minus size={16} /></button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-content-muted border-2 border-dashed border-border-primary rounded-lg">
                            <p>Select two different proxies to see their correlation.</p>
                        </div>
                    )}
                </div>
                <div className="bg-background-primary/30 p-4 rounded-lg border border-border-secondary">
                    <h4 className="font-bold text-content-primary mb-3">Regression Statistics</h4>
                    {stats ? (
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-xs text-content-muted">Pearson's r</p>
                                <p className="font-mono text-lg font-bold text-accent-primary">{stats.r.toFixed(4)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-content-muted">R-squared (R²)</p>
                                <p className="font-mono text-lg text-content-secondary">{stats.rSquared.toFixed(4)}</p>
                            </div>
                            {stats.pValue !== null && (
                                <div>
                                    <p className="text-xs text-content-muted">p-value</p>
                                    <p className="font-mono text-content-secondary">
                                        {stats.pValue < 0.0001 ? '< 0.0001' : stats.pValue.toFixed(4)}
                                    </p>
                                </div>
                            )}
                             <div>
                                <p className="text-xs text-content-muted">Equation</p>
                                <p className="font-mono text-content-secondary break-all">{`y = ${stats.slope.toFixed(3)}x + ${stats.intercept.toFixed(3)}`}</p>
                            </div>
                            {stats.ci95 && (
                                <div>
                                    <p className="text-xs text-content-muted">95% CI (slope)</p>
                                    <p className="font-mono text-content-secondary">
                                        [{stats.ci95.lower.toFixed(3)}, {stats.ci95.upper.toFixed(3)}]
                                    </p>
                                </div>
                            )}
                             <div>
                                <p className="text-xs text-content-muted">Sample size (n)</p>
                                <p className="font-mono text-content-secondary">{stats.n}</p>
                            </div>
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-full text-content-muted text-sm">
                            <p>Not enough data points for calculation.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProxyCorrelationAnalysis;