
import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { X, UploadCloud, CheckCircle, AlertCircle, Loader2, Wand2, ArrowRight, ClipboardPaste } from 'lucide-react';
import type { DataPoint, Microfossil } from '../types';
import { FOSSIL_ASSOCIATED_PROXIES } from '../constants';

interface DataImportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onImportConfirm: (data: DataPoint[]) => { message: string, type: 'success' | 'error' | 'info', show: boolean };
    commonDataKeys: Record<string, string[]>;
    microfossils: Microfossil[];
    proxyLabels: Record<string, string>;
}

type Step = 'source' | 'mapping' | 'confirm';

const mapHeadersWithRules = (
    csvHeaders: string[],
    standardKeys: Record<string, string[]>,
    fossils: Microfossil[]
): Record<string, string | null> => {
    const mapping: Record<string, string | null> = {};
    
    // Create lookup maps for fast searching
    const standardKeyMap = new Map<string, string>(); // alias -> standardKey
    for (const key in standardKeys) {
        for (const alias of standardKeys[key]) {
            standardKeyMap.set(alias.toLowerCase(), key);
        }
    }
    const fossilMap = new Map<string, string>(); // fuzzy name -> fossilId
    fossils.forEach(fossil => {
        const fullName = `${fossil.taxonomy.genus} ${fossil.taxonomy.species}`.toLowerCase();
        const shortName = `${fossil.taxonomy.genus.charAt(0)}. ${fossil.taxonomy.species}`.toLowerCase();
        fossilMap.set(fullName, fossil.id);
        fossilMap.set(shortName, fossil.id);
        fossilMap.set(fossil.id.toLowerCase(), fossil.id);
        fossilMap.set(fossil.id.toLowerCase().replace(/_/g, ' '), fossil.id);
    });

    const headerRegex = /(.+?)\s*[\(\[_-](.+?)[\)\]_-]?$/; // e.g., "d18O (G. ruber)" or "d18O_G_ruber"

    for (const header of csvHeaders) {
        const headerLower = header.toLowerCase().trim();
        
        // 1. Check for a direct standard key match
        if (standardKeyMap.has(headerLower)) {
            mapping[header] = standardKeyMap.get(headerLower)!;
            continue;
        }

        // 2. Try to parse "proxy (fossil)" format
        const match = header.match(headerRegex);
        if (match) {
            const proxyPart = match[1].trim().toLowerCase();
            const fossilPart = match[2].trim().toLowerCase();

            const standardProxy = standardKeyMap.get(proxyPart);
            let fossilId = fossilMap.get(fossilPart);

            // Try another common pattern like G ruber -> g_ruber
            if (!fossilId) {
                fossilId = fossilMap.get(fossilPart.replace(/\s/g, '_'));
            }
            
            if (standardProxy && fossilId) {
                mapping[header] = `${standardProxy}__${fossilId}`;
                continue;
            }
        }
        
        // No match found
        mapping[header] = null;
    }
    return mapping;
};


const DataImportWizard: React.FC<DataImportWizardProps> = ({ isOpen, onClose, onImportConfirm, commonDataKeys, microfossils, proxyLabels }) => {
    const [step, setStep] = useState<Step>('source');
    const [pastedData, setPastedData] = useState('');
    const [fileName, setFileName] = useState('');
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [headerMap, setHeaderMap] = useState<Record<string, string | null>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const possibleMappings = useMemo(() => {
        const options: { value: string, label: string }[] = [];
        // Standard keys first
        for (const key in commonDataKeys) {
            options.push({ value: key, label: proxyLabels[key] || key });
        }
        // Then fossil-specific keys
        microfossils.forEach(fossil => {
            FOSSIL_ASSOCIATED_PROXIES.forEach(proxyKey => {
                const value = `${proxyKey}__${fossil.id}`;
                const fossilName = `${fossil.taxonomy.genus.charAt(0)}. ${fossil.taxonomy.species}`;
                const label = `${proxyLabels[proxyKey] || proxyKey} (${fossilName})`;
                options.push({ value, label });
            });
        });
        return options.sort((a, b) => a.label.localeCompare(b.label));
    }, [commonDataKeys, microfossils, proxyLabels]);


    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
            setStep('source');
            setPastedData('');
            setFileName('');
            setParsedData([]);
            setHeaders([]);
            setHeaderMap({});
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen]);

    const handleDataParse = (data: string, isFile = false) => {
        if (!data.trim()) {
            setError('Pasted data is empty.');
            return;
        }
        setIsLoading(true);
        setError(null);

        Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            preview: isFile ? 0 : 500, // Process full file, but only preview of pasted data for speed
            complete: (results) => {
                if (results.errors.length) {
                    setError(`Parsing Error: ${results.errors[0].message}`);
                    setIsLoading(false);
                    return;
                }
                const detectedHeaders = results.meta.fields || [];
                if (detectedHeaders.length === 0) {
                    setError('Could not detect any headers in the data.');
                    setIsLoading(false);
                    return;
                }
                setHeaders(detectedHeaders);
                setParsedData(results.data);

                // Rule-based mapping
                try {
                    const ruleMap = mapHeadersWithRules(detectedHeaders, commonDataKeys, microfossils);
                    setHeaderMap(ruleMap);
                    setStep('mapping');
                } catch (mapError: any) {
                    setError(`Header Mapping Failed: ${mapError.message}. Please map headers manually.`);
                    setHeaderMap(detectedHeaders.reduce((acc, h) => ({...acc, [h]: null }), {}));
                    setStep('mapping');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (event) => {
                handleDataParse(event.target?.result as string, true);
            };
            reader.readAsText(file);
        }
    };
    
    const handleMapChange = (header: string, newKey: string) => {
        setHeaderMap(prev => ({ ...prev, [header]: newKey === '__NULL__' ? null : newKey }));
    };

    const handleFinalImport = () => {
        const mappedData: DataPoint[] = parsedData.map(row => {
            const newRow: DataPoint = {};
            for (const header of headers) {
                const mappedKey = headerMap[header];
                if (mappedKey && row[header] !== null && row[header] !== undefined) {
                     if (mappedKey === 'subsection') {
                        newRow[mappedKey] = String(row[header]);
                    } else {
                        const numValue = parseFloat(String(row[header]).replace(',', '.'));
                        if (!isNaN(numValue)) {
                           newRow[mappedKey] = numValue;
                        }
                    }
                }
            }
            return newRow;
        }).filter(dp => Object.keys(dp).length > 1 || (Object.keys(dp).length === 1 && !('subsection' in dp)));
        
        onImportConfirm(mappedData);
        onClose();
    };

    const StepIndicator: React.FC<{ currentStep: Step }> = ({ currentStep }) => {
        const steps: { id: Step; label: string }[] = [
            { id: 'source', label: 'Provide Data' },
            { id: 'mapping', label: 'Map Columns' },
            { id: 'confirm', label: 'Confirm Import' },
        ];
        return (
            <nav className="flex items-center justify-center" aria-label="Progress">
                {steps.map((stepInfo, index) => {
                    const isActive = stepInfo.id === currentStep;
                    const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                    return (
                        <React.Fragment key={stepInfo.id}>
                            <div className="flex items-center">
                                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isCompleted ? 'bg-accent-primary' : isActive ? 'border-2 border-accent-primary' : 'border-2 border-border-primary'}`}>
                                    {isCompleted ? <CheckCircle size={20} className="text-white"/> : <span className={`font-bold ${isActive ? 'text-accent-primary' : 'text-content-muted'}`}>{index + 1}</span>}
                                </span>
                                <span className={`ml-2 text-sm font-semibold ${isActive || isCompleted ? 'text-content-primary' : 'text-content-muted'}`}>{stepInfo.label}</span>
                            </div>
                            {index < steps.length - 1 && <div className="h-0.5 w-12 bg-border-primary mx-4" />}
                        </React.Fragment>
                    );
                })}
            </nav>
        );
    };

    const renderSourceStep = () => (
        <>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                    <h3 className="font-semibold text-content-primary mb-2 flex items-center gap-2"><ClipboardPaste /> Paste Data</h3>
                    <textarea
                        value={pastedData}
                        onChange={(e) => setPastedData(e.target.value)}
                        placeholder="Paste data from Excel, Google Sheets, or a CSV file here..."
                        rows={10}
                        className="flex-grow w-full bg-background-interactive border border-border-secondary rounded-lg p-3 text-sm text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                    />
                </div>
                <div className="flex flex-col items-center justify-center">
                    <h3 className="font-semibold text-content-primary mb-2 flex items-center gap-2"><UploadCloud /> Upload File</h3>
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full border-2 border-border-secondary border-dashed rounded-lg cursor-pointer bg-background-primary/50 hover:bg-background-tertiary/60">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                            <UploadCloud className="w-8 h-8 mb-2 text-content-muted" />
                            <p className="text-sm text-content-secondary"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-content-muted">CSV or ODV (.txt)</p>
                            {fileName && <p className="text-xs text-accent-primary mt-2 font-semibold">{fileName}</p>}
                        </div>
                        <input id="file-upload" type="file" className="hidden" accept=".csv,.txt" onChange={handleFileChange} />
                    </label>
                </div>
             </div>
             <div className="flex justify-end mt-6">
                <button onClick={() => handleDataParse(pastedData)} disabled={!pastedData.trim()} className="px-6 py-2 rounded-lg bg-accent-primary text-accent-primary-text font-semibold hover:bg-accent-primary-hover transition disabled:bg-background-interactive flex items-center gap-2">
                   Next <ArrowRight size={16} />
                </button>
             </div>
        </>
    );
    
    const renderMappingStep = () => (
         <>
            <p className="text-slate-400 mb-4 text-sm">Review and adjust the column mappings. Only mapped columns will be imported.</p>
            <div className="flex-grow overflow-y-auto pr-2 max-h-96">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-content-muted uppercase bg-background-secondary sticky top-0">
                        <tr>
                            <th className="px-4 py-3">Your Column Header</th>
                            <th className="px-4 py-3">Map to Standard Key</th>
                            <th className="px-4 py-3">Sample Data</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary">
                        {headers.map(header => (
                            <tr key={header}>
                                <td className="px-4 py-3 font-medium text-content-secondary truncate" title={header}>{header}</td>
                                <td className="px-4 py-3">
                                    <select
                                        value={headerMap[header] || '__NULL__'}
                                        onChange={(e) => handleMapChange(header, e.target.value)}
                                        className="w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8"
                                        style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                                    >
                                        <option value="__NULL__">-- Do Not Import --</option>
                                        {possibleMappings.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3 text-content-muted font-mono truncate" title={parsedData[0]?.[header]}>
                                    {parsedData[0]?.[header] ?? 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <div className="flex justify-between mt-6">
                <button onClick={() => setStep('source')} className="px-6 py-2 rounded-lg bg-background-interactive text-content-primary hover:bg-background-interactive-hover transition">Back</button>
                <button onClick={handleFinalImport} className="px-6 py-2 rounded-lg bg-accent-primary text-accent-primary-text font-semibold hover:bg-accent-primary-hover transition flex items-center gap-2">
                   Import Data
                </button>
             </div>
         </>
    );

    const renderContent = () => {
        if (isLoading) {
            return <div className="h-64 flex flex-col items-center justify-center text-content-muted"><Loader2 size={32} className="animate-spin mb-4" /> <p>Processing data...</p></div>;
        }
        if (error) {
            return <div className="h-64 flex flex-col items-center justify-center text-danger-primary bg-danger-primary/10 p-4 rounded-lg">
                <AlertCircle size={32} className="mb-4" />
                <p className="font-semibold">An Error Occurred</p>
                <p>{error}</p>
                <button onClick={() => { setError(null); setStep('source'); setIsLoading(false); }} className="mt-4 px-4 py-1 rounded-md bg-background-interactive text-content-primary">Try Again</button>
            </div>;
        }

        switch (step) {
            case 'source': return renderSourceStep();
            case 'mapping': return renderMappingStep();
            // Confirm step is integrated into mapping step's final button for simplicity.
            default: return renderSourceStep();
        }
    }


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-background-tertiary rounded-xl shadow-2xl p-8 w-full max-w-4xl border border-border-primary m-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-content-primary flex items-center gap-3"><Wand2 /> Data Import Wizard</h2>
                    <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors"><X size={24} /></button>
                </div>
                <div className="mb-6"><StepIndicator currentStep={step} /></div>
                
                <div className="flex-grow min-h-0 flex flex-col">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default DataImportWizard;