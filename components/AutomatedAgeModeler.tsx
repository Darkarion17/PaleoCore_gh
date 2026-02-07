

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Core, Section, DataPoint } from '../types';
import { BrainCircuit, X, Wand2, Loader2, AlertCircle, BarChart3, Download, Save } from 'lucide-react';
import { LR04_DATA } from '../data/lr04';
import MultiSectionChart from './MultiSectionChart';
import { useToast } from './useToast';

interface AutomatedAgeModelerProps {
    core1: Core; // Target core
    core2: Core; // Reference core
    allSections: Section[];
    proxyLabels: Record<string, string>;
    onClose: () => void;
    onApplyAgeModel: (updatedSection: Section) => void;
}

type AgeModelResult = {
    sectionId: string;
    sectionName: string;
    dataPoints: (DataPoint & { age: number })[];
};

const AutomatedAgeModeler: React.FC<AutomatedAgeModelerProps> = ({ core1, core2, allSections, proxyLabels, onClose, onApplyAgeModel }) => {
    const { addToast } = useToast();
    const [referenceSource, setReferenceSource] = useState<'core2' | 'lr04'>('core2');
    const [selectedProxy, setSelectedProxy] = useState('delta18O');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<AgeModelResult[] | null>(null);

    const targetCore = core1;
    const referenceCore = core2;

    const commonProxies = useMemo(() => {
        const getProxies = (coreId: string) => {
            const coreProxies = new Set<string>();
            allSections.filter(s => s.core_id === coreId).forEach(s => {
                s.dataPoints.forEach(dp => Object.keys(dp).forEach(key => {
                    if (typeof dp[key] === 'number') coreProxies.add(key);
                }));
            });
            return coreProxies;
        };
        const targetProxies = getProxies(targetCore.id);
        const refProxies = getProxies(referenceCore.id);
        return [...targetProxies].filter(p => refProxies.has(p) && p.toLowerCase().includes('d18o') || p.toLowerCase().includes('delta18o'));
    }, [allSections, targetCore.id, referenceCore.id]);

    useEffect(() => {
        if (!commonProxies.includes(selectedProxy)) {
            setSelectedProxy(commonProxies[0] || '');
        }
    }, [commonProxies, selectedProxy]);

    const handleRunAnalysis = async () => {
        setIsLoading(true);
        setError(null);
        setResults(null);

        await new Promise(res => setTimeout(res, 50)); // Allow UI to update

        try {
            // --- 1. Prepare Data Series ---
            const targetSections = allSections.filter(s => s.core_id === targetCore.id);
            if (targetSections.length === 0) throw new Error(`Target core ${targetCore.id} has no sections with data.`);

            let refSeries: { x: number, y: number }[]; // x is age, y is proxy value
            if (referenceSource === 'lr04') {
                refSeries = LR04_DATA.map(p => ({ x: p.age, y: p.d18O })).sort((a,b) => a.x - b.x);
            } else {
                const refSections = allSections.filter(s => s.core_id === referenceCore.id);
                if (refSections.length === 0) throw new Error(`Reference core ${referenceCore.id} has no sections with data.`);
                const refHasAge = refSections.every(s => s.dataPoints.some(dp => dp.age != null));
                if (!refHasAge) throw new Error(`Reference core ${referenceCore.id} must have a complete age model.`);
                
                refSeries = refSections.flatMap(s => s.dataPoints)
                    .map(dp => ({ x: dp.age as number, y: dp[selectedProxy] as number }))
                    .filter(p => p.x != null && p.y != null)
                    .sort((a,b) => a.x - b.x);
            }

            // --- 2. Process each target section ---
            const allResults: AgeModelResult[] = [];
            for (const targetSection of targetSections) {
                const targetSeries = targetSection.dataPoints
                    .map(dp => ({ x: dp.depth as number, y: dp[selectedProxy] as number }))
                    .filter(p => p.x != null && p.y != null)
                    .sort((a,b) => a.x - b.x);

                if (targetSeries.length < 5 || refSeries.length < 5) continue; // Skip if not enough data
                
                // --- 3. Normalize Data (Z-score) ---
                const normalize = (series: { x: number, y: number }[]) => {
                    const values = series.map(p => p.y);
                    const mean = values.reduce((a, b) => a + b, 0) / values.length;
                    const stdDev = Math.sqrt(values.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / (values.length -1));
                    return series.map(p => ({ ...p, y: stdDev === 0 ? 0 : (p.y - mean) / stdDev }));
                };
                const normRef = normalize(refSeries);
                const normTarget = normalize(targetSeries);

                // --- 4. Dynamic Time Warping (DTW) ---
                const path = dtw(normRef.map(p => p.y), normTarget.map(p => p.y));

                // --- 5. Create Tie-Points from DTW Path ---
                const tiePoints = path.map(([refIndex, targetIndex]) => ({
                    age: refSeries[refIndex].x,
                    depth: targetSeries[targetIndex].x,
                }));
                // Deduplicate and sort tie-points
                const uniqueTiePoints = Array.from(new Map(tiePoints.map(p => [p.depth, p])).values()).sort((a,b) => a.depth - b.depth);

                // --- 6. Apply Age Model via Linear Interpolation ---
                const agedDataPoints = targetSection.dataPoints.map(dp => {
                    if (dp.depth == null) return { ...dp, age: undefined };

                    let p1: {age: number, depth: number} | null = null;
                    let p2: {age: number, depth: number} | null = null;
                    for (const tp of uniqueTiePoints) { if (tp.depth <= dp.depth) p1 = tp; }
                    for (const tp of uniqueTiePoints.slice().reverse()) { if (tp.depth >= dp.depth) p2 = tp; }
                    
                    let age: number;
                    if (p1 && p2) { // Interpolate
                        if (p1.depth === p2.depth) age = p1.age;
                        else age = p1.age + ((dp.depth - p1.depth) / (p2.depth - p1.depth)) * (p2.age - p1.age);
                    } else if (p2) { // Extrapolate before first point
                        const next = uniqueTiePoints[1];
                        const rate = (next.age - p2.age) / (next.depth - p2.depth);
                        age = p2.age - (p2.depth - dp.depth) * rate;
                    } else if (p1) { // Extrapolate after last point
                        const prev = uniqueTiePoints[uniqueTiePoints.length - 2];
                        const rate = (p1.age - prev.age) / (p1.depth - prev.depth);
                        age = p1.age + (dp.depth - p1.depth) * rate;
                    } else { // Not enough points
                        age = NaN;
                    }

                    return { ...dp, age: parseFloat(age.toFixed(4)) };
                }).filter(dp => dp.age != null && !isNaN(dp.age));

                allResults.push({ sectionId: targetSection.id, sectionName: targetSection.name, dataPoints: agedDataPoints as any });
            }

            if (allResults.length === 0) {
                throw new Error("Could not generate an age model. Ensure both reference and target cores have sufficient, comparable data.");
            }
            setResults(allResults);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const dtw = (s: number[], t: number[]): [number, number][] => {
        // DTW implementation with comments
        const n = s.length;
        const m = t.length;
        // 1. Create a cost matrix. DTW[i][j] will be the min cost to align s[:i] and t[:j]
        const DTW = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
        DTW[0][0] = 0;

        // 2. Fill the cost matrix based on the cumulative minimum cost from neighbors
        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                const cost = Math.abs(s[i - 1] - t[j - 1]); // Distance between current points
                const last_min = Math.min(DTW[i - 1][j], DTW[i][j - 1], DTW[i - 1][j - 1]);
                DTW[i][j] = cost + last_min;
            }
        }
        
        // 3. Backtrack from the end to find the optimal path
        let i = n, j = m;
        const path: [number, number][] = [[i-1, j-1]];
        while (i > 1 || j > 1) {
            const min_prev = Math.min(DTW[i - 1][j], DTW[i][j - 1], DTW[i - 1][j - 1]);
            if (min_prev === DTW[i - 1][j - 1]) { i--; j--; }
            else if (min_prev === DTW[i - 1][j]) { i--; }
            else { j--; }
            path.unshift([i-1, j-1]);
        }
        return path;
    };
    
    const handleApplyModel = (result: AgeModelResult) => {
        const originalSection = allSections.find(s => s.id === result.sectionId);
        if (!originalSection) return;
        
        const updatedSection = {
            ...originalSection,
            dataPoints: result.dataPoints,
            ageRange: `${Math.min(...result.dataPoints.map(p => p.age)).toFixed(2)} - ${Math.max(...result.dataPoints.map(p => p.age)).toFixed(2)} Ma`
        };
        onApplyAgeModel(updatedSection);
        addToast({ message: `Age model applied to section ${result.sectionName}`, type: 'success' });
        onClose();
    };

    const handleExportCsv = (result: AgeModelResult) => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `depth,${selectedProxy},estimated_age\n`;
        result.dataPoints.forEach(dp => {
            csvContent += `${dp.depth},${dp[selectedProxy]},${dp.age}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${targetCore.id}_${result.sectionName}_agemodel.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-content-primary flex items-center gap-3"><BrainCircuit /> Automated Age Modeler</h2>
                 <button onClick={onClose} className="p-2 rounded-full text-content-muted hover:bg-background-interactive"><X/></button>
            </div>

            <div className="bg-background-tertiary/50 p-4 rounded-xl border border-border-primary/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="text-xs font-medium text-content-secondary mb-1 block">Target Core</label>
                        <p className="font-bold text-content-primary p-2 rounded-md bg-background-primary/50">{targetCore.id}</p>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-content-secondary mb-1 block">Reference</label>
                        <select value={referenceSource} onChange={e => setReferenceSource(e.target.value as any)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                            <option value="core2">{referenceCore.id}</option>
                            <option value="lr04">LR04 Benthic Stack</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-xs font-medium text-content-secondary mb-1 block">Correlation Proxy</label>
                        <select value={selectedProxy} onChange={e => setSelectedProxy(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                            {commonProxies.length > 0 ? commonProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>) : <option disabled>No common δ18O proxies</option>}
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button onClick={handleRunAnalysis} disabled={isLoading || commonProxies.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition text-sm font-semibold disabled:opacity-50">
                        {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                        {isLoading ? 'Correlating...' : 'Generate Age Model'}
                    </button>
                </div>
            </div>

            {error && <div className="p-3 bg-danger-primary/20 text-danger-primary rounded-md text-sm flex items-center gap-2"><AlertCircle/>{error}</div>}
            
            {results && (
                <div className="space-y-4">
                    {results.map(result => (
                        <div key={result.sectionId} className="bg-background-tertiary/50 p-4 rounded-xl border border-border-primary/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-content-primary">Results for: <span className="text-accent-primary">{result.sectionName}</span></h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleExportCsv(result)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-background-interactive hover:bg-background-interactive-hover"><Download size={14}/>Export CSV</button>
                                    <button onClick={() => handleApplyModel(result)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-success-primary/20 text-success-primary hover:bg-success-primary/30"><Save size={14}/>Apply to Section</button>
                                </div>
                            </div>
                            <div className="h-96 w-full">
                                <MultiSectionChart 
                                    data={result.dataPoints} 
                                    dataSeries={[{label: result.sectionName}]}
                                    xAxisKey="age" 
                                    proxyKey={selectedProxy}
                                    proxyLabels={proxyLabels}
                                    xAxisReversed
                                    yAxisReversed
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {!results && !isLoading && !error && (
                <div className="flex flex-col items-center justify-center h-64 text-content-muted border-2 border-dashed border-border-primary rounded-lg">
                    <BarChart3 size={32} className="mb-2"/>
                    <p>Analysis results will be displayed here.</p>
                </div>
            )}
        </div>
    );
};

export default AutomatedAgeModeler;