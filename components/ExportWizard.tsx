import React, { useState, useMemo } from 'react';
import { X, Download, AlertCircle, Loader2 } from 'lucide-react';
import type { Core, Section, Folder, CustomProxy } from '../types';
import { exportFolderToOdv } from '../services/exportService';
import { PROXY_LABELS } from '../constants';

interface ExportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    folder: Folder;
    cores: Core[];
    allSections: Section[];
    customProxies: CustomProxy[];
}

const ExportWizard: React.FC<ExportWizardProps> = ({ isOpen, onClose, folder, cores, allSections, customProxies }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableVariables = useMemo(() => {
        const varSet = new Set<string>();
        const priority = ['depth', 'age', 'delta18O', 'delta13C'];
        allSections.forEach(s => {
            s.dataPoints.forEach(dp => {
                Object.keys(dp).forEach(key => {
                    if (key !== 'subsection' && key !== 'qcFlag') {
                        varSet.add(key);
                    }
                });
            });
        });
        return [
            ...priority.filter(p => varSet.has(p)),
            ...Array.from(varSet).filter(v => !priority.includes(v))
        ];
    }, [allSections]);
    
    const [selectedVariables, setSelectedVariables] = useState<Set<string>>(() => new Set(availableVariables));
    const [excludeFlaggedData, setExcludeFlaggedData] = useState(true);

    const handleToggleVariable = (variable: string) => {
        setSelectedVariables(prev => {
            const newSet = new Set(prev);
            if (newSet.has(variable)) {
                newSet.delete(variable);
            } else {
                newSet.add(variable);
            }
            return newSet;
        });
    };

    const handleExport = () => {
        setIsLoading(true);
        setError(null);
        try {
            if (selectedVariables.size === 0) {
                throw new Error("Please select at least one variable to export.");
            }
            exportFolderToOdv(folder, cores, allSections, customProxies, {
                variables: Array.from(selectedVariables),
                excludeFlaggedData,
            });
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-background-tertiary rounded-xl shadow-2xl p-8 w-full max-w-2xl border border-border-primary m-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-content-primary flex items-center gap-3"><Download /> Export Wizard</h2>
                    <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors"><X size={24} /></button>
                </div>
                <p className="text-sm text-content-muted mb-6">Export data from folder <span className="font-bold text-accent-primary">{folder.name}</span> to ODV Generic Spreadsheet format (.txt).</p>

                <div className="space-y-4 flex-grow overflow-y-auto pr-2 -mr-4">
                    <div>
                        <h3 className="font-semibold text-content-primary mb-2">Variables to Include</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-background-primary/40 rounded-md border border-border-primary max-h-60 overflow-y-auto">
                            {availableVariables.map(variable => (
                                <label key={variable} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-background-tertiary text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedVariables.has(variable)}
                                        onChange={() => handleToggleVariable(variable)}
                                        className="h-4 w-4 rounded border-border-secondary bg-background-interactive text-accent-primary focus:ring-accent-primary focus:ring-2"
                                    />
                                    <span className="text-content-secondary">{PROXY_LABELS[variable] || variable}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-content-primary mb-2">Data Quality</h3>
                         <label className="flex items-center gap-2 p-2 rounded-md hover:bg-background-tertiary text-sm cursor-pointer bg-background-primary/40 border border-border-primary">
                            <input
                                type="checkbox"
                                checked={excludeFlaggedData}
                                onChange={(e) => setExcludeFlaggedData(e.target.checked)}
                                className="h-4 w-4 rounded border-border-secondary bg-background-interactive text-accent-primary focus:ring-accent-primary focus:ring-2"
                            />
                            <span className="text-content-secondary">Exclude data points flagged as 'Suspect' or 'Exclude'</span>
                        </label>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 rounded-lg flex items-center gap-2 text-sm bg-danger-primary/20 text-danger-primary">
                        <AlertCircle size={18}/> {error}
                    </div>
                )}

                <div className="flex justify-end gap-4 pt-6 mt-auto">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-background-interactive text-content-primary hover:bg-background-interactive-hover transition">Cancel</button>
                    <button onClick={handleExport} disabled={isLoading} className="px-6 py-2 rounded-lg bg-accent-primary text-accent-primary-text font-semibold hover:bg-accent-primary-hover transition disabled:bg-background-interactive disabled:cursor-not-allowed flex items-center gap-2">
                       {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                       Export
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportWizard;