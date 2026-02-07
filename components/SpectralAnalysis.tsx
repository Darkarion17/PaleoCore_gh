import React, { useState, useMemo } from 'react';
import type { Section } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { Loader2, AreaChart, AlertCircle } from 'lucide-react';

interface SpectralAnalysisProps {
    section: Section;
    proxyLabels: Record<string, string>;
}

const SpectralAnalysis: React.FC<SpectralAnalysisProps> = ({ section, proxyLabels }) => {
    const [selectedProxy, setSelectedProxy] = useState('');
    const [selectedDomain, setSelectedDomain] = useState<'age' | 'depth'>('depth');
    const [results, setResults] = useState<{ frequency: number; power: number; period: number; }[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        if (availableProxies.length > 0 && !availableProxies.includes(selectedProxy)) {
            setSelectedProxy(availableProxies.includes('delta18O') ? 'delta18O' : availableProxies[0]);
        }
    }, [availableProxies, selectedProxy]);

    const handleRunAnalysis = () => {
        setIsLoading(true);
        setResults(null);
        setError(null);

        setTimeout(() => {
            try {
                const dataSeries = section.dataPoints
                    .map(dp => ({ x: dp[selectedDomain] as number, y: dp[selectedProxy] as number }))
                    .filter(p => p.x != null && p.y != null)
                    .sort((a, b) => a.x - b.x);

                if (dataSeries.length < 10) {
                    throw new Error("Not enough data points for spectral analysis. A minimum of 10 is required.");
                }
                
                // 1. Interpolate data to be evenly spaced
                const xValues = dataSeries.map(p => p.x);
                const minX = xValues[0];
                const maxX = xValues[xValues.length - 1];
                const intervals = dataSeries.length - 1;
                const samplingInterval = (maxX - minX) / intervals;
                
                const evenlySpacedY = [];
                for (let i = 0; i <= intervals; i++) {
                    const currentX = minX + i * samplingInterval;
                    const nextPointIndex = dataSeries.findIndex(p => p.x >= currentX);

                    if (nextPointIndex === -1) {
                        evenlySpacedY.push(dataSeries[dataSeries.length - 1].y);
                        continue;
                    }
                    if (nextPointIndex === 0) {
                        evenlySpacedY.push(dataSeries[0].y);
                        continue;
                    }

                    const prevPoint = dataSeries[nextPointIndex - 1];
                    const nextPoint = dataSeries[nextPointIndex];
                    
                    if (nextPoint.x === prevPoint.x) {
                         evenlySpacedY.push(prevPoint.y);
                         continue;
                    }
                    
                    const t = (currentX - prevPoint.x) / (nextPoint.x - prevPoint.x);
                    const interpolatedY = prevPoint.y + t * (nextPoint.y - prevPoint.y);
                    evenlySpacedY.push(interpolatedY);
                }
                
                // 2. Compute Power Spectrum using Discrete Fourier Transform
                const N = evenlySpacedY.length;
                const meanY = evenlySpacedY.reduce((a, b) => a + b, 0) / N;
                const signal = evenlySpacedY.map(y => y - meanY); // Remove DC component

                const powerSpectrum = [];
                const samplingFrequency = 1 / samplingInterval;

                for (let k = 1; k < N / 2; k++) { // Only need first half of frequencies (Nyquist)
                    let real = 0;
                    let imag = 0;
                    for (let n = 0; n < N; n++) {
                        const angle = (2 * Math.PI * k * n) / N;
                        real += signal[n] * Math.cos(angle);
                        imag -= signal[n] * Math.sin(angle);
                    }
                    const power = (real * real + imag * imag) / (N * N);
                    const frequency = (k * samplingFrequency) / N;
                    
                    if (frequency > 0) {
                        const period = 1 / frequency;
                        powerSpectrum.push({ frequency, period, power });
                    }
                }

                // Normalize power for better visualization
                if (powerSpectrum.length > 0) {
                    const maxPower = Math.max(...powerSpectrum.map(p => p.power));
                    const normalizedSpectrum = powerSpectrum.map(p => ({ ...p, power: p.power / maxPower }));
                    setResults(normalizedSpectrum);
                } else {
                    throw new Error("Could not compute power spectrum.");
                }

            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        }, 100);
    };
    
    const hasAgeData = useMemo(() => section.dataPoints.some(dp => dp.age !== undefined && dp.age !== null), [section.dataPoints]);
    const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2">
                <AreaChart size={20} className="text-accent-primary" /> Spectral Analysis (Periodogram)
            </h3>
            <p className="text-sm text-content-muted">Detect cyclical patterns in your data, such as Milankovitch cycles, by analyzing their frequency components.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">Proxy</label>
                    <select value={selectedProxy} onChange={e => setSelectedProxy(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                        {availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">Domain</label>
                    <select value={selectedDomain} onChange={e => setSelectedDomain(e.target.value as any)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                        <option value="depth">Depth</option>
                        <option value="age" disabled={!hasAgeData}>Age (ka)</option>
                    </select>
                </div>
                <button onClick={handleRunAnalysis} disabled={isLoading || !selectedProxy} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50">
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <AreaChart size={16} />}
                    Run Analysis
                </button>
            </div>
             {error && (
                <div className="p-3 rounded-lg flex items-center gap-2 text-sm bg-danger-primary/20 text-danger-primary">
                   <AlertCircle size={18}/> {error}
               </div>
            )}
            <div className="h-96 w-full pt-4">
                {results ? (
                    <ResponsiveContainer>
                        <BarChart data={results} margin={{ top: 5, right: 20, bottom: 40, left: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" type="number" domain={[0, 'dataMax']} tickFormatter={tickFormatter} tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} stroke="var(--recharts-axis-stroke)">
                                <Label value={`Period (${selectedDomain === 'age' ? 'ka' : 'm'})`} offset={-25} position="insideBottom" fill="var(--recharts-axis-stroke)" />
                            </XAxis>
                            <YAxis 
                                tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} 
                                stroke="var(--recharts-axis-stroke)"
                                tickFormatter={tickFormatter}>
                                <Label value="Normalized Power" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: 12, fill: 'var(--recharts-axis-stroke)' }} dx={-10} />
                            </YAxis>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--recharts-tooltip-bg)', border: '1px solid var(--recharts-tooltip-border)' }}
                                labelFormatter={(label) => `Period: ${Number(label).toFixed(1)}`}
                                formatter={(value: number) => [value.toFixed(3), 'Power']}
                            />
                            <Bar dataKey="power" fill="var(--accent-secondary)" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                     <div className="flex items-center justify-center h-full text-content-muted border-2 border-dashed border-border-primary rounded-lg">
                        <p>{isLoading ? 'Calculating...' : 'Analysis results will be displayed here.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpectralAnalysis;