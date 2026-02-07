

import React, { useState, useMemo } from 'react';
import type { Section, ProcessingPipeline, DataPoint } from '../types';
import { TestTube, PlusCircle, Save, Trash2, Calculator, Thermometer } from 'lucide-react';
import { useToast } from './useToast';

interface ProcessingPipelineTabProps {
    section: Section;
    onUpdateSection: (section: Section) => void;
    proxyLabels: Record<string, string>;
}

const ProcessingPipelineTab: React.FC<ProcessingPipelineTabProps> = ({ section, onUpdateSection, proxyLabels }) => {
    const { addToast } = useToast();
    const [pipelines, setPipelines] = useState<ProcessingPipeline[]>(section.pipelines || []);
    
    // Moving Average State
    const [newPipelineName, setNewPipelineName] = useState('');
    const [newPipelineSource, setNewPipelineSource] = useState('');
    const [movingAverageWindow, setMovingAverageWindow] = useState(3);

    // Delta Notation State
    const [deltaSourceProxy, setDeltaSourceProxy] = useState('');
    const [deltaStandardRatio, setDeltaStandardRatio] = useState('');
    const [deltaNewProxyName, setDeltaNewProxyName] = useState('');

    // Paleotemperature State
    const [tempSourceProxy, setTempSourceProxy] = useState('');
    const [tempWaterProxy, setTempWaterProxy] = useState('-1.0');
    const [tempNewProxyName, setTempNewProxyName] = useState('');
    
    const availableProxies = useMemo(() => {
        const proxies = new Set<string>();
        section.dataPoints.forEach(dp => {
            Object.keys(dp).forEach(key => {
                if (typeof dp[key] === 'number' && key !== 'depth' && key !== 'age') {
                    proxies.add(key);
                }
            });
        });
        return Array.from(proxies).sort();
    }, [section.dataPoints]);

    const handleAddPipeline = () => {
        if (!newPipelineName.trim() || !newPipelineSource) return;
        const newPipeline: ProcessingPipeline = {
            id: `pipe_${Date.now()}`,
            name: newPipelineName.trim(),
            sourceProxy: newPipelineSource,
            steps: [{ type: 'movingAverage', window: movingAverageWindow }],
        };
        const updatedPipelines = [...pipelines, newPipeline];
        setPipelines(updatedPipelines);
        onUpdateSection({ ...section, pipelines: updatedPipelines });
        setNewPipelineName('');
        setNewPipelineSource('');
        setMovingAverageWindow(3);
        addToast({ message: 'Moving average pipeline created.', type: 'success' });
    };

    const handleDeletePipeline = (id: string) => {
        const updatedPipelines = pipelines.filter(p => p.id !== id);
        setPipelines(updatedPipelines);
        onUpdateSection({ ...section, pipelines: updatedPipelines });
        addToast({ message: 'Pipeline deleted.', type: 'info' });
    };

    const handleCalculateProxy = (
        sourceProxy: string,
        newProxyName: string,
        calculationFn: (dp: DataPoint) => number | null
    ) => {
        if (!sourceProxy || !newProxyName) {
            addToast({ message: 'Source proxy and new proxy name are required.', type: 'error' });
            return;
        }

        const updatedDataPoints = section.dataPoints.map(dp => {
            const newValue = calculationFn(dp);
            if (newValue !== null && isFinite(newValue)) {
                return { ...dp, [newProxyName]: newValue };
            }
            return dp;
        });

        onUpdateSection({ ...section, dataPoints: updatedDataPoints });
        addToast({ message: `New proxy "${newProxyName}" calculated successfully.`, type: 'success' });
    };

    const handleCalculateDelta = () => {
        const standard = parseFloat(deltaStandardRatio);
        if (isNaN(standard)) {
            addToast({ message: 'Standard Ratio must be a valid number.', type: 'error' });
            return;
        }
        handleCalculateProxy(
            deltaSourceProxy,
            deltaNewProxyName,
            (dp) => {
                const sampleRatio = dp[deltaSourceProxy] as number;
                if (typeof sampleRatio === 'number') {
                    return ((sampleRatio / standard) - 1) * 1000;
                }
                return null;
            }
        );
    };

    const handleCalculateTemperature = () => {
        const d18Ow = parseFloat(tempWaterProxy);
        if (isNaN(d18Ow)) {
            addToast({ message: 'δ¹⁸O of Water must be a valid number.', type: 'error' });
            return;
        }
        handleCalculateProxy(
            tempSourceProxy,
            tempNewProxyName,
            (dp) => {
                const d18Oc = dp[tempSourceProxy] as number;
                if (typeof d18Oc === 'number') {
                    const diff = d18Oc - d18Ow;
                    return 16.9 - 4.38 * diff + 0.1 * (diff * diff);
                }
                return null;
            }
        );
    };


    const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8 disabled:cursor-not-allowed disabled:bg-background-tertiary";
    const inputClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition";
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;

    return (
        <div className="space-y-6">
            <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
                <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2 mb-2">
                    <Calculator size={20} className="text-accent-primary" /> Isotope Calculators
                </h3>
                <div className="space-y-4 divide-y divide-border-primary">
                    {/* Delta Notation */}
                    <div className="pt-4">
                        <h4 className="font-semibold text-content-secondary mb-2">δ Notation Calculator</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-content-secondary mb-1">Source Ratio Proxy</label>
                                <select value={deltaSourceProxy} onChange={e => setDeltaSourceProxy(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                                    <option value="">Select a ratio...</option>
                                    {availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-content-secondary mb-1">Standard Ratio</label>
                                <input type="number" value={deltaStandardRatio} onChange={e => setDeltaStandardRatio(e.target.value)} className={inputClass} placeholder="e.g., 0.0020052 for VSMOW ¹⁸O/¹⁶O" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-content-secondary mb-1">New Proxy Name</label>
                                <input type="text" value={deltaNewProxyName} onChange={e => setDeltaNewProxyName(e.target.value)} className={inputClass} placeholder="e.g., d18O" />
                            </div>
                        </div>
                         <button onClick={handleCalculateDelta} disabled={!deltaSourceProxy || !deltaStandardRatio || !deltaNewProxyName} className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50">
                            Calculate δ Value
                        </button>
                    </div>
                    {/* Paleothermometer */}
                    <div className="pt-4">
                        <h4 className="font-semibold text-content-secondary mb-2">Oxygen Paleothermometer</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-content-secondary mb-1">Source δ¹⁸O (calcite)</label>
                                <select value={tempSourceProxy} onChange={e => setTempSourceProxy(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                                    <option value="">Select δ¹⁸O proxy...</option>
                                    {availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-content-secondary mb-1">δ¹⁸O of Water (‰)</label>
                                <input type="number" value={tempWaterProxy} onChange={e => setTempWaterProxy(e.target.value)} className={inputClass} placeholder="e.g., -1.0 for ice-free" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-content-secondary mb-1">New Temperature Proxy Name</label>
                                <input type="text" value={tempNewProxyName} onChange={e => setTempNewProxyName(e.target.value)} className={inputClass} placeholder="e.g., SST_d18O" />
                            </div>
                        </div>
                        <button onClick={handleCalculateTemperature} disabled={!tempSourceProxy || !tempWaterProxy || !tempNewProxyName} className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50">
                            Calculate Temperature
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
                <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2 mb-2">
                    <TestTube size={20} className="text-accent-primary" /> Create New Processing Pipeline
                </h3>
                <p className="text-xs text-content-muted mb-4">
                    Create new "virtual" proxies by applying non-destructive processing steps to your raw data.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-content-secondary mb-1">1. Select Source Proxy</label>
                        <select value={newPipelineSource} onChange={e => setNewPipelineSource(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                            <option value="">Select a proxy...</option>
                            {availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-content-secondary mb-1">2. Define Processing (Moving Average)</label>
                        <input
                            type="number"
                            value={movingAverageWindow}
                            onChange={e => setMovingAverageWindow(Math.max(2, parseInt(e.target.value, 10)))}
                            min="2"
                            className={inputClass}
                            placeholder="Window size (e.g., 3)"
                        />
                    </div>
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                         <div>
                            <label className="block text-xs font-medium text-content-secondary mb-1">3. Name New Virtual Proxy</label>
                            <input
                                type="text"
                                value={newPipelineName}
                                onChange={e => setNewPipelineName(e.target.value)}
                                className={inputClass}
                                placeholder="e.g., d18O_smoothed"
                            />
                        </div>
                        <button onClick={handleAddPipeline} disabled={!newPipelineName || !newPipelineSource} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50">
                            <PlusCircle size={16} /> Save New Pipeline
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-background-tertiary/50 p-4 rounded-xl shadow-lg border border-border-primary/50">
                 <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2 mb-3">Saved Pipelines</h3>
                 <div className="space-y-3 max-h-64 overflow-y-auto pr-2 -mr-2">
                    {pipelines.length > 0 ? pipelines.map(p => (
                        <div key={p.id} className="bg-background-primary/50 p-3 rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-bold text-content-primary">{p.name}</p>
                                <p className="text-xs text-content-muted">
                                    Source: {proxyLabels[p.sourceProxy] || p.sourceProxy} | Steps: {p.steps.map(s => `MA(${s.window})`).join(', ')}
                                </p>
                            </div>
                            <button onClick={() => handleDeletePipeline(p.id)} className="p-2 rounded-full text-content-muted hover:text-danger-primary hover:bg-danger-primary/10 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )) : (
                        <p className="text-sm text-content-muted text-center py-4">No processing pipelines have been created for this section yet.</p>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default ProcessingPipelineTab;