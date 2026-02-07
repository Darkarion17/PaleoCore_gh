
import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Section, DataPoint, CustomProxy, Microfossil } from '../types';
import DataTable from './DataTable';
import DataInputManager from './DataInputManager';
import SamplingPlanGenerator from './SamplingPlanGenerator';
import { useToast } from './useToast';
import { calculateAveragesFromDataPoints } from '../services/coreService';
import { Filter, Trash2, Table, Link2, ScanText, Loader2 } from 'lucide-react';
import { digitizeFieldNotes } from '../services/geminiService';

interface DataEntryTabProps {
  section: Section;
  microfossils: Microfossil[];
  onUpdateSection: (section: Section) => void;
  proxyLabels: Record<string, string>;
  commonDataKeys: Record<string, string[]>;
  onOpenCustomProxiesModal: () => void;
  customProxies: CustomProxy[];
  setConfirmModalState: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>>;
}

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors duration-200 ${
            isActive 
                ? 'border-accent-primary text-accent-primary' 
                : 'border-transparent text-content-muted hover:text-content-primary hover:border-border-secondary'
        }`}
        role="tab"
        aria-selected={isActive}
    >
        {label}
    </button>
);


const DataEntryTab: React.FC<DataEntryTabProps> = ({ section, microfossils, onUpdateSection, proxyLabels, commonDataKeys, onOpenCustomProxiesModal, customProxies, setConfirmModalState }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  
  const [sourceProxyToAssociate, setSourceProxyToAssociate] = useState('');
  const [fossilToAssociate, setFossilToAssociate] = useState('');
  const [isDigitizing, setIsDigitizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableProxyTabs = useMemo(() => {
    const proxies = new Set<string>();
    const excludedKeys = ['subsection', 'depth', 'age', 'qcFlag'];
    section.dataPoints.forEach(dp => {
        Object.keys(dp).forEach(key => {
            if (!excludedKeys.includes(key)) {
                proxies.add(key);
            }
        });
    });
    return Array.from(proxies).sort();
  }, [section.dataPoints]);
  
  const unassociatedProxies = useMemo(() => {
      const proxies = new Set<string>();
      section.dataPoints.forEach(dp => {
        Object.keys(dp).forEach(key => {
          if (typeof dp[key] === 'number' && !key.includes('__')) {
              proxies.add(key);
          }
        });
      });
      return Array.from(proxies).sort();
  }, [section.dataPoints]);

  const sectionMicrofossils = useMemo(() => {
      return (section.microfossilRecords || [])
          .map(record => microfossils.find(f => f.id === record.fossilId))
          .filter((f): f is Microfossil => !!f);
  }, [section.microfossilRecords, microfossils]);

  useEffect(() => {
    if (activeTab !== 'all' && !availableProxyTabs.includes(activeTab)) {
        setActiveTab('all');
    }
  }, [section.id, availableProxyTabs, activeTab]);
  
   useEffect(() => {
    // Reset association form when section changes
    setSourceProxyToAssociate(unassociatedProxies[0] || '');
    setFossilToAssociate(sectionMicrofossils[0]?.id || '');
  }, [section.id, unassociatedProxies, sectionMicrofossils]);

  const dataForTable = useMemo(() => {
    if (!section.dataPoints) {
      return [];
    }
    if (activeTab === 'all') {
      return section.dataPoints;
    }
    
    const filteredData = section.dataPoints.filter(dp => dp.hasOwnProperty(activeTab));

    return filteredData.map(dp => {
        const proxyName = proxyLabels[activeTab] || activeTab;
        const originalSubsection = dp.subsection || '';

        if (originalSubsection.includes(`(${proxyName})`)) {
            return dp;
        }

        return {
            ...dp,
            subsection: `${originalSubsection} (${proxyName})`
        };
    });
  }, [activeTab, section.dataPoints, proxyLabels]);

  const handleUpdateDataPoints = (newDataPoints: DataPoint[]) => {
      const newLabAnalysis = calculateAveragesFromDataPoints(newDataPoints);
      const updatedSection = { ...section, dataPoints: newDataPoints, labAnalysis: newLabAnalysis };
      onUpdateSection(updatedSection);
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (activeTab === 'all') {
        // Full row deletion with confirmation
        const pointToDelete = dataForTable[rowIndex];
        setConfirmModalState({
            isOpen: true,
            title: `Delete Row?`,
            message: `Are you sure you want to permanently delete the data point for subsection "${pointToDelete.subsection}"? This action cannot be undone.`,
            onConfirm: () => {
                const newDataPoints = section.dataPoints.filter(dp => dp !== pointToDelete);
                handleUpdateDataPoints(newDataPoints);
                addToast({ message: 'Data point deleted.', type: 'success' });
            }
        });
    } else {
        // Just delete the proxy value from the point, no confirmation needed
        const filteredOriginalData = section.dataPoints.filter(dp => dp.hasOwnProperty(activeTab));
        const originalPointToModify = filteredOriginalData[rowIndex];

        const newDataPoints = section.dataPoints.map(dp => {
            if (dp === originalPointToModify) {
                const { [activeTab]: _, ...rest } = dp;
                return rest;
            }
            return dp;
        });

        const finalDataPoints = newDataPoints.filter(dp => {
            const dataKeys = Object.keys(dp).filter(k => !['subsection', 'depth', 'age', 'qcFlag'].includes(k));
            return dataKeys.length > 0;
        });

        handleUpdateDataPoints(finalDataPoints);
        addToast({ message: `Value for ${proxyLabels[activeTab] || activeTab} removed.`, type: 'info' });
    }
  };

  const handleGeneratePlan = (newPoints: DataPoint[], newProxyKey: string) => {
    if (!newProxyKey) {
        addToast({ message: 'Could not determine proxy for sampling plan.', type: 'error' });
        return;
    }
    const otherData = section.dataPoints
        .map(dp => {
            if (dp.hasOwnProperty(newProxyKey)) {
                const { [newProxyKey]: _, ...rest } = dp;
                const { subsection, ...finalRest } = rest;
                if (subsection && subsection.toString().includes(proxyLabels[newProxyKey])) {
                    return finalRest;
                }
                return rest;
            }
            return dp;
        })
        .filter(dp => {
            const nonMetadataKeys = Object.keys(dp).filter(k => !['subsection', 'depth', 'age', 'qcFlag'].includes(k));
            return nonMetadataKeys.length > 0;
        });

    const toNum = (val: string | number | boolean | null | undefined): number => {
        if (typeof val === 'number') {
            return isNaN(val) ? 0 : val;
        }
        if (typeof val === 'string') {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };
    
    const mergedPointsMap = new Map<number, DataPoint>();

    otherData.forEach(dp => {
        const depthNum = toNum(dp.depth);
        mergedPointsMap.set(depthNum, { ...mergedPointsMap.get(depthNum), ...dp, depth: depthNum });
    });
    
    newPoints.forEach(np => {
        const depthNum = toNum(np.depth);
        mergedPointsMap.set(depthNum, { ...mergedPointsMap.get(depthNum), ...np, qcFlag: 0, depth: depthNum });
    });

    const finalPoints = Array.from(mergedPointsMap.values())
        .sort((a, b) => toNum(a.depth) - toNum(b.depth))
        .map((point, index) => ({
            ...point,
            subsection: point.subsection || `Sample_${index + 1}`
        }));

    const newLabAnalysis = calculateAveragesFromDataPoints(finalPoints);
    const updatedSection = { ...section, dataPoints: finalPoints, labAnalysis: newLabAnalysis };
    onUpdateSection(updatedSection);

    addToast({ message: `Sampling plan for "${proxyLabels[newProxyKey] || newProxyKey}" applied successfully.`, type: 'success' });
    
    setActiveTab(newProxyKey);
  };

  const handleAssociateProxy = () => {
    if (!sourceProxyToAssociate || !fossilToAssociate) {
        addToast({ message: 'Please select a source proxy and a microfossil.', type: 'error'});
        return;
    }
    
    const newKey = `${sourceProxyToAssociate}__${fossilToAssociate}`;

    const updatedDataPoints = section.dataPoints.map(dp => {
        if (dp.hasOwnProperty(sourceProxyToAssociate)) {
            const newPoint = { ...dp };
            newPoint[newKey] = newPoint[sourceProxyToAssociate];
            delete newPoint[sourceProxyToAssociate];
            return newPoint;
        }
        return dp;
    });

    handleUpdateDataPoints(updatedDataPoints);
    
    const fossilName = microfossils.find(f => f.id === fossilToAssociate)?.id || 'selected fossil';
    addToast({ message: `Proxy "${proxyLabels[sourceProxyToAssociate] || sourceProxyToAssociate}" associated with ${fossilName}.`, type: 'success' });

    // Reset form
    setSourceProxyToAssociate('');
  };

  const handleScanNotes = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsDigitizing(true);
      addToast({ message: "Scanning notes... This may take a moment.", type: "info" });

      try {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              const mimeType = file.type;
              
              try {
                  const digitizedData = await digitizeFieldNotes(base64, mimeType);
                  if (digitizedData.length === 0) {
                      addToast({ message: "No tabular data found in image.", type: "error" });
                      return;
                  }

                  // Merge logic
                  const currentData = [...section.dataPoints];
                  let addedCount = 0;
                  
                  digitizedData.forEach(newPoint => {
                      // Check for duplicate depth
                      const existingIndex = currentData.findIndex(dp => Math.abs((dp.depth || 0) - (newPoint.depth || 0)) < 0.01);
                      if (existingIndex >= 0) {
                          currentData[existingIndex] = { ...currentData[existingIndex], ...newPoint };
                      } else {
                          currentData.push(newPoint);
                          addedCount++;
                      }
                  });
                  
                  currentData.sort((a,b) => (a.depth || 0) - (b.depth || 0));
                  handleUpdateDataPoints(currentData);
                  addToast({ message: `Successfully digitized notes! ${addedCount} new points added.`, type: "success" });

              } catch (apiError: any) {
                  addToast({ message: `AI Scanning failed: ${apiError.message}`, type: "error" });
              } finally {
                  setIsDigitizing(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
              }
          };
          reader.readAsDataURL(file);
      } catch (err) {
          setIsDigitizing(false);
          addToast({ message: "Failed to read image file.", type: "error" });
      }
  };
  
    const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;

  return (
    <div className="space-y-6">
      <SamplingPlanGenerator 
        section={section}
        proxyLabels={proxyLabels}
        onGeneratePlan={handleGeneratePlan}
      />
      <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
        <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold text-content-primary">Data Management</h3>
             <div className="flex gap-2">
                 <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isDigitizing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30 transition-colors text-sm font-semibold disabled:opacity-50"
                 >
                     {isDigitizing ? <Loader2 size={16} className="animate-spin"/> : <ScanText size={16}/>}
                     Scan Field Notes
                 </button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={handleScanNotes}
                 />
             </div>
        </div>
        <DataInputManager section={section} microfossils={microfossils} onUpdateSection={onUpdateSection} proxyLabels={proxyLabels} commonDataKeys={commonDataKeys} onOpenCustomProxiesModal={onOpenCustomProxiesModal} customProxies={customProxies} />
        
        <div className="mt-6 pt-6 border-t border-border-primary">
            <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2 mb-2"><Link2 size={20} className="text-accent-primary"/> Associate Proxy with Microfossil</h3>
            <p className="text-xs text-content-muted mb-4">
                If you imported generic proxy data (e.g., a 'd18O' column), use this tool to specify which microfossil it was measured on.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">Source Proxy</label>
                    <select value={sourceProxyToAssociate} onChange={e => setSourceProxyToAssociate(e.target.value)} className={selectClass} style={{backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
                        <option value="">Select proxy...</option>
                        {unassociatedProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1">Select Microfossil</label>
                    <select value={fossilToAssociate} onChange={e => setFossilToAssociate(e.target.value)} className={selectClass} style={{backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
                        <option value="">Select fossil...</option>
                        {sectionMicrofossils.map(f => <option key={f.id} value={f.id}>{f.id}</option>)}
                    </select>
                </div>
                 <button onClick={handleAssociateProxy} disabled={!sourceProxyToAssociate || !fossilToAssociate} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50">
                    Associate
                </button>
            </div>
        </div>
      </div>
      
      <div className="bg-background-tertiary/50 p-4 rounded-xl shadow-lg border border-border-primary/50">
        <div className="flex justify-between items-center mb-2 px-2">
            <h2 className="text-xl font-bold text-content-primary flex items-center gap-2"><Table size={20}/> Raw Data Series</h2>
        </div>
        <div className="border-b border-border-primary">
             <nav className="flex space-x-2 -mb-px overflow-x-auto" aria-label="Tabs">
                 <TabButton label="All Data" isActive={activeTab === 'all'} onClick={() => setActiveTab('all')} />
                 {availableProxyTabs.map(proxy => (
                     <TabButton key={proxy} label={proxyLabels[proxy] || proxy} isActive={activeTab === proxy} onClick={() => setActiveTab(proxy)} />
                 ))}
             </nav>
        </div>
        <div className="mt-4">
            <DataTable 
                section={section} 
                data={dataForTable}
                proxyLabels={proxyLabels}
                onUpdateDataPoints={handleUpdateDataPoints}
                focusedProxy={activeTab}
                onDeleteRow={handleDeleteRow}
            />
        </div>
      </div>
    </div>
  );
};

export default DataEntryTab;
