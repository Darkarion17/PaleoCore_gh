
import React, { useState, useEffect, useMemo } from 'react';
import type { Section, DataPoint } from '../types';
import { SlidersHorizontal, PlusCircle } from 'lucide-react';
import { useToast } from './useToast';

interface SamplingPlanGeneratorProps {
    section: Section;
    proxyLabels: Record<string, string>;
    onGeneratePlan: (newPoints: DataPoint[], proxyKey: string) => void;
}

const SamplingPlanGenerator: React.FC<SamplingPlanGeneratorProps> = ({ section, proxyLabels, onGeneratePlan }) => {
    
    const plannableProxies = useMemo(() => {
        const excludedKeys = ['subsection', 'age', 'depth', 'qcFlag'];
        return Object.entries(proxyLabels)
            .filter(([key]) => !excludedKeys.includes(key) && !key.endsWith('_count') && !key.endsWith('_percentage'))
            .sort(([, labelA]: [string, string], [, labelB]: [string, string]) => labelA.localeCompare(labelB));
    }, [proxyLabels]);
    
    const [selectedProxy, setSelectedProxy] = useState(plannableProxies[0]?.[0] || '');
    const [resolution, setResolution] = useState(0.05); // Default to 5cm
    const [startDepth, setStartDepth] = useState(0);
    const [endDepth, setEndDepth] = useState(section.sectionDepth || 0);

    const { addToast } = useToast();

    useEffect(() => {
        setEndDepth(section.sectionDepth || 0);
        setStartDepth(0);
    }, [section.id, section.sectionDepth]);
    
     useEffect(() => {
        // Set a default proxy when the list becomes available
        if (!selectedProxy && plannableProxies.length > 0) {
            setSelectedProxy(plannableProxies[0][0]);
        }
    }, [plannableProxies, selectedProxy]);

    const handleGenerate = () => {
        if (resolution <= 0) {
            addToast({ message: 'Sampling resolution must be greater than 0.', type: 'error' });
            return;
        }
        if (startDepth >= endDepth) {
            addToast({ message: 'Start depth must be less than end depth.', type: 'error' });
            return;
        }
        if (!selectedProxy) {
            addToast({ message: 'Please select a proxy.', type: 'error' });
            return;
        }
        
        const newDepths = [];
        for (let depth = startDepth; depth <= endDepth; depth += resolution) {
            newDepths.push(parseFloat(depth.toFixed(4)));
        }

        const proxyNameForLabel = proxyLabels[selectedProxy] || selectedProxy;

        const newPoints: DataPoint[] = newDepths.map((depth, index) => ({
            depth: depth,
            subsection: `Sample_${index + 1} ${proxyNameForLabel} (${depth.toFixed(2)}) m`,
            [selectedProxy]: null,
        }));
        
        onGeneratePlan(newPoints, selectedProxy);
    };

    const inputClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition";
    const selectClass = `${inputClass} appearance-none bg-no-repeat bg-right pr-8`;
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;


    return (
        <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
            <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2 mb-2">
                <SlidersHorizontal size={20} className="text-accent-primary" /> Sampling Plan Generator
            </h3>
            <p className="text-xs text-content-muted mb-4">
                Automatically generate a template of sample points for a specific proxy and resolution. The generated points will be merged into the data table below, ready for data entry.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-content-secondary mb-1">Proxy</label>
                    <select value={selectedProxy} onChange={e => setSelectedProxy(e.target.value)} className={selectClass} style={{backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
                        {plannableProxies.map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                 <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">Resolution (m)</label>
                    <input type="number" value={resolution} onChange={e => setResolution(parseFloat(e.target.value))} className={inputClass} step="0.01" min="0.01"/>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-content-secondary mb-1">Start (m)</label>
                        <input type="number" value={startDepth} onChange={e => setStartDepth(parseFloat(e.target.value))} className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-content-secondary mb-1">End (m)</label>
                        <input type="number" value={endDepth} onChange={e => setEndDepth(parseFloat(e.target.value))} className={inputClass} />
                    </div>
                </div>
            </div>
            <div className="flex justify-end mt-4">
                <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold"
                >
                    <PlusCircle size={16} /> Apply Sampling Plan
                </button>
            </div>
        </div>
    );
};

export default SamplingPlanGenerator;