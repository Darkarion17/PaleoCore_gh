import React, { useState, useMemo, useEffect } from 'react';
import type { Section, Microfossil } from '../types';
import { Save } from 'lucide-react';
import { useToast } from './useToast';

interface CountingSheetViewProps {
    sections: Section[];
    allFossils: Microfossil[];
    onUpdateSection: (section: Section) => void;
}

const CountingSheetView: React.FC<CountingSheetViewProps> = ({ sections, allFossils, onUpdateSection }) => {
    const { addToast } = useToast();
    const [selectedSectionId, setSelectedSectionId] = useState<string>('');
    const [counts, setCounts] = useState<Record<string, Record<string, number | undefined>>>({});

    useEffect(() => {
        if (!selectedSectionId && sections.length > 0) {
            setSelectedSectionId(sections[0].id);
        }
        if (selectedSectionId && !sections.some(s => s.id === selectedSectionId)) {
            setSelectedSectionId(sections[0]?.id || '');
        }
    }, [sections, selectedSectionId]);

    const selectedSection = useMemo(() => sections.find(s => s.id === selectedSectionId), [sections, selectedSectionId]);

    useEffect(() => {
        if (selectedSection) {
            const initialCounts: Record<string, Record<string, number | undefined>> = {};
            selectedSection.dataPoints.forEach((dp, sampleIndex) => {
                Object.keys(dp).forEach(key => {
                    if (key.endsWith('_count')) {
                        const fossilId = key.replace('_count', '');
                        if (!initialCounts[fossilId]) {
                            initialCounts[fossilId] = {};
                        }
                        initialCounts[fossilId][sampleIndex] = dp[key] as number;
                    }
                });
            });
            setCounts(initialCounts);
        } else {
            setCounts({});
        }
    }, [selectedSection]);


    const handleCountChange = (fossilId: string, sampleIndex: number, value: string) => {
        const newCount = value === '' ? undefined : parseInt(value, 10);
        setCounts(prev => ({
            ...prev,
            [fossilId]: {
                ...prev[fossilId],
                [sampleIndex]: isNaN(newCount!) ? undefined : newCount,
            }
        }));
    };
    
    const totalsBySample = useMemo(() => {
        const totals: Record<number, number> = {};
        if (selectedSection) {
            selectedSection.dataPoints.forEach((_, sampleIndex) => {
                let total = 0;
                Object.keys(counts).forEach(fossilId => {
                    total += counts[fossilId]?.[sampleIndex] || 0;
                });
                totals[sampleIndex] = total;
            });
        }
        return totals;
    }, [counts, selectedSection]);

    const handleSaveChanges = () => {
        if (!selectedSection) return;

        const updatedDataPoints = selectedSection.dataPoints.map(dp => ({ ...dp }));
        
        const allCountedFossilIds = new Set<string>(Object.keys(counts));
        selectedSection.dataPoints.forEach(dp => {
            Object.keys(dp).forEach(key => {
                if (key.endsWith('_count')) {
                    allCountedFossilIds.add(key.replace('_count', ''));
                }
            });
        });

        updatedDataPoints.forEach((dp, sampleIndex) => {
            const totalForSample = totalsBySample[sampleIndex] || 0;

            allCountedFossilIds.forEach(fossilId => {
                const count = counts[fossilId]?.[sampleIndex];
                const countKey = `${fossilId}_count`;
                const percentageKey = `${fossilId}_percentage`;

                if (count !== undefined && count !== null && count >= 0) {
                    dp[countKey] = count;
                    dp[percentageKey] = totalForSample > 0 ? parseFloat(((count / totalForSample) * 100).toFixed(2)) : 0;
                } else {
                    delete dp[countKey];
                    delete dp[percentageKey];
                }
            });
        });

        const updatedSection = { ...selectedSection, dataPoints: updatedDataPoints };
        onUpdateSection(updatedSection);
        addToast({ message: `Counts saved for section ${selectedSection.name}. Data is now available for plotting.`, type: 'success' });
    };

    const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;
    const fossilsForColumns = selectedSection ? allFossils.filter(f => selectedSection.microfossilRecords.some(r => r.fossilId === f.id)) : [];

    return (
        <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
            <div className="flex justify-between items-end">
                <div className="w-full max-w-sm">
                    <label className="block text-sm font-medium text-content-secondary mb-1">Select Section to Count</label>
                    <select
                        value={selectedSectionId}
                        onChange={e => setSelectedSectionId(e.target.value)}
                        className={selectClass}
                        style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
                    >
                        {sections.length > 0 ? (
                           sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                        ) : (
                           <option value="">-- No Sections available --</option>
                        )}
                    </select>
                </div>
                 <button
                    onClick={handleSaveChanges}
                    disabled={!selectedSection}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary text-accent-primary-text font-semibold hover:bg-accent-primary-hover transition disabled:bg-background-interactive"
                >
                    <Save size={16}/> Save Counts to Section
                </button>
            </div>

            {selectedSection ? (
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-background-secondary">
                                <th className="sticky left-0 bg-background-secondary p-2 border border-border-primary font-semibold text-content-secondary">Sample (Depth)</th>
                                {fossilsForColumns.map(fossil => (
                                    <th key={fossil.id} className="p-2 border border-border-primary font-semibold text-content-secondary italic" title={`${fossil.taxonomy.genus} ${fossil.taxonomy.species}`}>{fossil.id}</th>
                                ))}
                                <th className="p-2 border border-border-primary font-semibold text-accent-primary">Total Count</th>
                                <th className="p-2 border border-border-primary font-semibold text-accent-secondary">Percentages</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedSection.dataPoints.map((dp, sampleIndex) => (
                                <tr key={sampleIndex} className="hover:bg-background-secondary/50">
                                    <td className="sticky left-0 bg-background-tertiary p-2 border border-border-primary text-content-primary font-mono">{dp.depth} m</td>
                                    {fossilsForColumns.map(fossil => (
                                        <td key={fossil.id} className="p-0 border border-border-primary">
                                            <input
                                                type="number"
                                                min="0"
                                                value={counts[fossil.id]?.[sampleIndex] || ''}
                                                onChange={e => handleCountChange(fossil.id, sampleIndex, e.target.value)}
                                                className="w-24 bg-transparent p-2 text-center text-content-primary outline-none focus:bg-background-interactive"
                                            />
                                        </td>
                                    ))}
                                    <td className="p-2 border border-border-primary text-center font-bold text-accent-primary">{totalsBySample[sampleIndex] || 0}</td>
                                    <td className="p-2 border border-border-primary text-center text-accent-secondary">
                                        {totalsBySample[sampleIndex] > 0 ? (
                                            <div className="flex flex-col text-xs">
                                                {fossilsForColumns.map(fossil => {
                                                     const percentage = ((counts[fossil.id]?.[sampleIndex] || 0) / totalsBySample[sampleIndex]) * 100;
                                                     return <span key={fossil.id}>{fossil.id}: {percentage.toFixed(1)}%</span>
                                                })}
                                            </div>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="mt-6 flex flex-col items-center justify-center h-64 text-content-muted border-2 border-dashed border-border-primary rounded-lg">
                    <p>Select a section to begin counting microfossils.</p>
                </div>
            )}
        </div>
    );
};

export default CountingSheetView;
