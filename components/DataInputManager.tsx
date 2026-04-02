

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Section, DataPoint, LabAnalysis, CustomProxy, Microfossil } from '../types';
import { Database, PlusCircle, Beaker, Filter, Bug } from 'lucide-react';
import { calculateAveragesFromDataPoints } from '../services/coreService';
import { FOSSIL_ASSOCIATED_PROXIES } from '../constants';

interface DataInputManagerProps {
  section: Section;
  microfossils: Microfossil[];
  onUpdateSection: (section: Section) => void;
  proxyLabels: Record<string, string>;
  commonDataKeys: Record<string, string[]>;
  onOpenCustomProxiesModal: () => void;
  customProxies: CustomProxy[];
}

const staticManualEntryFields = [
    'depth', 'age', ...FOSSIL_ASSOCIATED_PROXIES
];


const DataInputManager: React.FC<DataInputManagerProps> = ({ section, microfossils, onUpdateSection, proxyLabels, commonDataKeys, onOpenCustomProxiesModal, customProxies }) => {
  const manualEntryFields = useMemo(() => {
    const customProxyKeys = customProxies.map(p => p.key);
    return ['subsection', 'age', ...staticManualEntryFields.filter(f => f !== 'age'), ...customProxyKeys];
  }, [customProxies]);
  
  const createInitialState = useCallback(() => {
    const state: Record<string, string> = {
        subsection: `Sample ${section.dataPoints.length + 1}`
    };
    manualEntryFields.forEach(key => {
        if(key !== 'subsection') {
            state[key] = '';
        }
    });
    return state;
  }, [section.dataPoints.length, manualEntryFields]);

  const [formState, setFormState] = useState(createInitialState);
  
  useEffect(() => {
      setFormState(createInitialState());
  }, [createInitialState]);
  
  const [status, setStatus] = useState<{type: 'success'|'error'|'info', msg: string} | null>(null);
  const [isProxyManagerOpen, setIsProxyManagerOpen] = useState(false);
  const proxyManagerRef = useRef<HTMLDivElement>(null);
  const [selectedFossilId, setSelectedFossilId] = useState<string>('__BULK__');

  const sectionMicrofossils = useMemo(() => {
      return (section.microfossilRecords || [])
          .map(record => microfossils.find(f => f.id === record.fossilId))
          .filter((f): f is Microfossil => !!f);
  }, [section.microfossilRecords, microfossils]);

  const [visibleProxies, setVisibleProxies] = useState<Set<string>>(() => {
    try {
        const saved = localStorage.getItem('paleocore-visible-proxies-v1');
        if (saved) {
            const parsed = JSON.parse(saved);
            return new Set(Array.isArray(parsed) ? parsed : ['subsection', 'depth', 'age', 'delta18O']);
        }
    } catch (e) {
        console.error("Failed to parse visible proxies from localStorage", e);
    }
    return new Set(['subsection', 'depth', 'age', 'delta18O', 'delta13C', 'mgCaRatio']);
  });

  useEffect(() => {
    try {
        localStorage.setItem('paleocore-visible-proxies-v1', JSON.stringify(Array.from(visibleProxies)));
    } catch (e) {
        console.error("Failed to save visible proxies to localStorage", e);
    }
  }, [visibleProxies]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (proxyManagerRef.current && !proxyManagerRef.current.contains(event.target as Node)) {
            setIsProxyManagerOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleProxyVisibility = (key: string) => {
    setVisibleProxies(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        return newSet;
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDataPoint = () => {
    const subsectionId = formState.subsection.trim();
    if (!subsectionId) {
      setStatus({type: 'error', msg: 'Subsection ID is a required field.'});
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    const newPointData: DataPoint = { subsection: subsectionId };
    let hasValue = false;

    for (const key in formState) {
        if (key !== 'subsection' && formState[key as keyof typeof formState]) {
            const numValue = parseFloat(formState[key as keyof typeof formState]);
            if (!isNaN(numValue)) {
                const finalKey = selectedFossilId === '__BULK__' ? key : `${key}__${selectedFossilId}`;
                newPointData[finalKey] = numValue;
                hasValue = true;
            }
        }
    }
    
    if (!hasValue) {
        setStatus({type: 'error', msg: 'At least one data value (e.g., depth) must be provided.'});
        setTimeout(() => setStatus(null), 3000);
        return;
    }

    const existingPointIndex = section.dataPoints.findIndex(dp => dp.subsection === subsectionId);
    let newDataPoints: DataPoint[];

    if (existingPointIndex > -1) {
        newDataPoints = [...section.dataPoints];
        newDataPoints[existingPointIndex] = { ...newDataPoints[existingPointIndex], ...newPointData };
        setStatus({type: 'success', msg: `Subsection "${subsectionId}" updated.`});
    } else {
        newDataPoints = [...section.dataPoints, newPointData];
        setStatus({type: 'success', msg: `Subsection "${subsectionId}" added.`});
    }
    
    newDataPoints.sort((a: DataPoint, b: DataPoint) => (a.depth || 0) - (b.depth || 0));
    
    const newLabAnalysis = calculateAveragesFromDataPoints(newDataPoints);
    onUpdateSection({ ...section, dataPoints: newDataPoints, labAnalysis: newLabAnalysis });
    
    setTimeout(() => setStatus(null), 3000);
  };
  
  const inputClass = "w-full bg-background-interactive border border-border-secondary rounded-md p-2 text-sm text-content-primary placeholder-content-muted focus:ring-1 focus:ring-accent-primary focus:outline-none transition";
  const labelClass = "block text-xs font-medium text-content-secondary mb-1";
  
  return (
    <div className="space-y-6">
      <div className="p-4 bg-background-primary/30 rounded-lg border border-border-primary">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2"><Database size={20} className="text-accent-primary"/> Manual Subsection Entry</h3>
            <div className="relative flex items-center gap-2">
                <button type="button" onClick={onOpenCustomProxiesModal} className="text-xs font-semibold flex items-center gap-1.5 p-2 rounded-md bg-background-interactive text-content-secondary hover:bg-background-interactive-hover hover:text-content-primary transition-colors">
                    <Beaker size={14} /> Manage Custom Proxies
                </button>
                <button type="button" onClick={() => setIsProxyManagerOpen(p => !p)} className="text-xs font-semibold flex items-center gap-1.5 p-2 rounded-md bg-background-interactive text-content-secondary hover:bg-background-interactive-hover hover:text-content-primary transition-colors">
                    <Filter size={14} /> Filter Proxies
                </button>
                {isProxyManagerOpen && (
                    <div ref={proxyManagerRef} className="absolute top-full right-0 mt-2 w-64 bg-background-primary p-3 rounded-lg shadow-2xl border border-border-secondary z-20">
                        <p className="text-sm font-bold mb-2 text-content-primary px-1">Visible Proxies</p>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {manualEntryFields.map(key => (
                                <label key={key} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-background-tertiary text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleProxies.has(key)}
                                        onChange={() => handleToggleProxyVisibility(key)}
                                        disabled={key === 'subsection' || key === 'depth'}
                                        className="h-4 w-4 rounded border-border-secondary bg-background-interactive text-accent-primary focus:ring-2 disabled:opacity-50"
                                    />
                                    <span className={key === 'subsection' || key === 'depth' ? 'text-content-muted' : 'text-content-secondary'}>
                                        {proxyLabels[key] || key}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
        <p className="text-xs text-content-muted mb-4 -mt-2">Enter a unique Subsection ID and one or more data values to add or update a point in the series.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="col-span-2">
                <label htmlFor="subsection" className={`${labelClass} text-accent-primary font-bold`}>{proxyLabels['subsection'] || 'Subsection ID*'}</label>
                <input type="text" name="subsection" value={formState.subsection} onChange={handleFormChange} className={inputClass} required />
            </div>
             <div className="col-span-2">
                <label htmlFor="fossil-association" className={`${labelClass} flex items-center gap-1.5`}><Bug size={12}/> Associate with Microfossil</label>
                <select id="fossil-association" value={selectedFossilId} onChange={e => setSelectedFossilId(e.target.value)} className={`${inputClass} appearance-none bg-no-repeat bg-right pr-8`} style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
                  <option value="__BULK__">None (Bulk Carbonate)</option>
                  {sectionMicrofossils.map(fossil => (
                      <option key={fossil.id} value={fossil.id} className="italic">{fossil.taxonomy.genus} {fossil.taxonomy.species}</option>
                  ))}
                </select>
            </div>
            {manualEntryFields
                .filter(key => key !== 'subsection' && visibleProxies.has(key))
                .map(key => (
                    <div key={key}>
                        <label htmlFor={key} className={labelClass}>{proxyLabels[key] || key}</label>
                        <input type="number" step="any" name={key} value={formState[key] || ''} onChange={handleFormChange} className={inputClass} />
                    </div>
                ))
            }
        </div>
        <div className="flex justify-end mt-4">
            <button onClick={handleAddDataPoint} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold">
                <PlusCircle size={16}/> Add/Update Subsection
            </button>
        </div>
      </div>
    </div>
  );
};

export default DataInputManager;