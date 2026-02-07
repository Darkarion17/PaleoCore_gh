
import React, { useState } from 'react';
import type { Section, TiePoint } from '../types';
import { Plus, Wand2, Atom, Beaker, ListChecks, Loader2 } from 'lucide-react';
import { useToast } from './useToast';

type DatumSuggestion = {
  id: string;
  type: 'radiocarbon';
  sectionId: string;
  sectionName: string;
  depth: number;
  age: number;
};

interface AgeModelAssistantProps {
  sections: Section[];
  tiePoints: TiePoint[];
  onTiePointsChange: (newTiePoints: TiePoint[]) => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${active ? 'text-accent-primary border-accent-primary' : 'text-content-muted border-transparent hover:text-content-primary'}`}
    >
        {children}
    </button>
);

const AgeModelAssistant: React.FC<AgeModelAssistantProps> = ({ sections, tiePoints, onTiePointsChange }) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'radiocarbon' | 'uranium_thorium' | 'autodetect'>('manual');
    const { addToast } = useToast();

    // Manual state
    const [manualSection, setManualSection] = useState<string>(sections[0]?.id || '');
    const [manualDepth, setManualDepth] = useState<string>('');
    const [manualAge, setManualAge] = useState<string>('');
    
    // Radiocarbon state
    const [rcSection, setRcSection] = useState<string>(sections[0]?.id || '');
    const [rcDepth, setRcDepth] = useState<string>('');
    const [rcMeasuredAge, setRcMeasuredAge] = useState<string>('');
    const [rcDeltaR, setRcDeltaR] = useState<string>('400');

    // Uranium-Thorium state
    const [utSection, setUtSection] = useState<string>(sections[0]?.id || '');
    const [utDepth, setUtDepth] = useState<string>('');
    const [utMeasuredRatio, setUtMeasuredRatio] = useState<string>('');
    const [utInitialRatio, setUtInitialRatio] = useState<string>('0.02');

    // Autodetect state
    const [suggestions, setSuggestions] = useState<DatumSuggestion[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    const handleAddManualTiePoint = () => {
        if (manualSection && manualDepth && manualAge) {
            const newTiePoint: TiePoint = {
                id: `manual-${Date.now()}`,
                sectionId: manualSection,
                depth: parseFloat(manualDepth),
                age: parseFloat(manualAge),
            };
            onTiePointsChange([...tiePoints, newTiePoint].sort((a,b) => a.depth - b.depth));
            setManualDepth('');
            setManualAge('');
            addToast({ message: 'Manual tie-point added.', type: 'success' });
        }
    };
    
    const handleCalculateRadiocarbon = () => {
        const measuredAge = parseFloat(rcMeasuredAge);
        const deltaR = parseFloat(rcDeltaR);
        const depth = parseFloat(rcDepth);

        if (isNaN(measuredAge) || isNaN(deltaR) || isNaN(depth) || !rcSection) {
            addToast({ message: 'Please fill all fields with valid numbers.', type: 'error' });
            return;
        }

        const correctedAgeYears = measuredAge - deltaR;
        const ageInKa = correctedAgeYears / 1000;

        const newTiePoint: TiePoint = {
            id: `c14-${Date.now()}`,
            sectionId: rcSection,
            depth: depth,
            age: parseFloat(ageInKa.toFixed(3)),
        };
        onTiePointsChange([...tiePoints, newTiePoint].sort((a,b) => a.depth - b.depth));
        addToast({ message: `Radiocarbon tie-point added: ${ageInKa.toFixed(3)} ka.`, type: 'success' });
        
        // Reset form
        setRcDepth('');
        setRcMeasuredAge('');
    };

    const handleCalculateUraniumThorium = () => {
        const measuredRatio = parseFloat(utMeasuredRatio);
        const initialRatio = parseFloat(utInitialRatio);
        const depth = parseFloat(utDepth);

        if (isNaN(measuredRatio) || isNaN(initialRatio) || isNaN(depth) || !utSection) {
            addToast({ message: 'Please fill all fields with valid numbers.', type: 'error' });
            return;
        }
        
        // Constant for 230Th decay in years^-1
        const U230_THORIUM_DECAY_CONSTANT = 9.1705e-6; 

        // Calculation based on the formula: t = (1/λ) * ln(1 + ((meas-ini)/(1-meas)))
        const ratioTerm = (measuredRatio - initialRatio) / (1 - measuredRatio);
        const ageInYears = (1 / U230_THORIUM_DECAY_CONSTANT) * Math.log(1 + ratioTerm);
        const ageInKa = ageInYears / 1000;
        
        if (isNaN(ageInKa) || !isFinite(ageInKa)) {
            addToast({ message: 'Calculation resulted in an invalid age. Check your ratio values.', type: 'error'});
            return;
        }

        const newTiePoint: TiePoint = {
            id: `uth-${Date.now()}`,
            sectionId: utSection,
            depth: depth,
            age: parseFloat(ageInKa.toFixed(3)),
        };
        onTiePointsChange([...tiePoints, newTiePoint].sort((a,b) => a.depth - b.depth));
        addToast({ message: `Uranium-Thorium tie-point added: ${ageInKa.toFixed(3)} ka.`, type: 'success' });

        // Reset form
        setUtDepth('');
        setUtMeasuredRatio('');
    };
    
    const handleScan = () => {
        setIsScanning(true);
        setSuggestions([]);
        
        setTimeout(() => {
            const foundDatums: DatumSuggestion[] = [];
            sections.forEach(section => {
                section.dataPoints.forEach(dp => {
                    if (dp.radiocarbonDate != null && dp.depth != null) {
                        const ageInKa = dp.radiocarbonDate as number; // Assuming it's already in ka
                        const exists = tiePoints.some(tp => 
                            tp.sectionId === section.id && Math.abs(tp.depth - Number(dp.depth!)) < 0.01
                        );
                        if (!exists) {
                            foundDatums.push({
                                id: `${section.id}-${dp.depth}-${ageInKa}`,
                                type: 'radiocarbon',
                                sectionId: section.id,
                                sectionName: section.name,
                                depth: dp.depth as number,
                                age: ageInKa,
                            });
                        }
                    }
                });
            });
            const uniqueSuggestions = Array.from(new Map(foundDatums.map(item => [item.id, item])).values());
            setSuggestions(uniqueSuggestions);
            setIsScanning(false);
            addToast({ message: `Scan complete. Found ${uniqueSuggestions.length} potential tie-points.`, type: 'info' });
        }, 200);
    };
    
    const handleAddSuggestion = (suggestion: DatumSuggestion) => {
        const newTiePoint: TiePoint = {
            id: suggestion.id,
            sectionId: suggestion.sectionId,
            depth: suggestion.depth,
            age: suggestion.age,
        };
        onTiePointsChange([...tiePoints, newTiePoint].sort((a,b) => a.depth - b.depth));
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        addToast({ message: 'Suggested tie-point added.', type: 'success' });
    };

    const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
    const inputClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition";
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;

    return (
        <>
            <h3 className="text-md font-semibold text-content-primary flex items-center gap-2 mb-2">
                <Plus size={18} className="text-accent-primary"/> Add Tie-Point
            </h3>
            <div className="border-b border-border-primary mb-4">
                <nav className="flex space-x-2 -mb-px overflow-x-auto">
                    <TabButton active={activeTab === 'manual'} onClick={() => setActiveTab('manual')}><ListChecks size={16}/> Manual</TabButton>
                    <TabButton active={activeTab === 'radiocarbon'} onClick={() => setActiveTab('radiocarbon')}><Atom size={16}/> Radiocarbon ¹⁴C</TabButton>
                    <TabButton active={activeTab === 'uranium_thorium'} onClick={() => setActiveTab('uranium_thorium')}><Beaker size={16}/> Uranium-Thorium</TabButton>
                    <TabButton active={activeTab === 'autodetect'} onClick={() => setActiveTab('autodetect')}><Wand2 size={16}/> Auto-detect</TabButton>
                </nav>
            </div>
            
            {activeTab === 'manual' && (
                <div className="space-y-3 animate-fade-in-fast">
                    <select value={manualSection} onChange={e => setManualSection(e.target.value)} className={selectClass} style={{backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div className="flex items-center gap-3">
                        <input type="number" placeholder="Depth (mbsf)" value={manualDepth} onChange={e => setManualDepth(e.target.value)} className={inputClass} />
                        <input type="number" placeholder="Age (ka)" value={manualAge} onChange={e => setManualAge(e.target.value)} className={inputClass} />
                    </div>
                     <button onClick={handleAddManualTiePoint} disabled={!manualSection || !manualDepth || !manualAge} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50">Add Point</button>
                </div>
            )}
            
            {activeTab === 'radiocarbon' && (
                 <div className="space-y-3 animate-fade-in-fast">
                    <p className="text-xs text-content-muted">Calculate age from a measured radiocarbon date and apply marine reservoir correction (ΔR).</p>
                    <select value={rcSection} onChange={e => setRcSection(e.target.value)} className={selectClass} style={{backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="number" placeholder="Depth (mbsf)" value={rcDepth} onChange={e => setRcDepth(e.target.value)} className={inputClass} />
                        <input type="number" placeholder="Measured ¹⁴C Age (yrs BP)" value={rcMeasuredAge} onChange={e => setRcMeasuredAge(e.target.value)} className={inputClass} />
                        <input type="number" placeholder="ΔR (yrs)" value={rcDeltaR} onChange={e => setRcDeltaR(e.target.value)} className={inputClass} />
                     </div>
                     <button onClick={handleCalculateRadiocarbon} disabled={!rcSection || !rcDepth || !rcMeasuredAge} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50">Calculate & Add Tie-Point</button>
                </div>
            )}
            
             {activeTab === 'uranium_thorium' && (
                 <div className="space-y-3 animate-fade-in-fast">
                    <p className="text-xs text-content-muted">Calculate age from Uranium-Thorium activity ratios, typically used for corals.</p>
                     <select value={utSection} onChange={e => setUtSection(e.target.value)} className={selectClass} style={{backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="number" placeholder="Depth (mbsf)" value={utDepth} onChange={e => setUtDepth(e.target.value)} className={inputClass} />
                        <input type="number" placeholder="Measured (²³⁰Th/²³⁴U)" value={utMeasuredRatio} onChange={e => setUtMeasuredRatio(e.target.value)} className={inputClass} step="any" />
                        <input type="number" placeholder="Initial (²³⁰Th/²³⁴U)" value={utInitialRatio} onChange={e => setUtInitialRatio(e.target.value)} className={inputClass} step="any" />
                     </div>
                     <button onClick={handleCalculateUraniumThorium} disabled={!utSection || !utDepth || !utMeasuredRatio} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50">Calculate & Add Tie-Point</button>
                </div>
            )}

            {activeTab === 'autodetect' && (
                 <div className="space-y-3 animate-fade-in-fast">
                     <button onClick={handleScan} disabled={isScanning} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50">
                        {isScanning ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16}/>}
                        Scan for ¹⁴C Datums in Data
                    </button>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {suggestions.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-2 bg-background-primary/40 rounded-md text-xs">
                                <div className="flex items-center gap-3">
                                    <Atom size={16} className="text-accent-secondary"/>
                                    <div>
                                        <p className="font-semibold text-content-secondary">{s.sectionName}</p>
                                        <p className="text-content-muted">Depth: {s.depth}m, Age: {s.age} ka</p>
                                    </div>
                                </div>
                                <button onClick={() => handleAddSuggestion(s)} className="px-3 py-1 text-xs rounded-md bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 font-semibold">Add</button>
                            </div>
                        ))}
                        {!isScanning && suggestions.length === 0 && <p className="text-xs text-center text-content-muted py-2">No unused ¹⁴C datums found.</p>}
                    </div>
                </div>
            )}
            <style>{`.animate-fade-in-fast { animation: fade-in-fast 0.3s ease-out; } @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }`}</style>
        </>
    );
};

export default AgeModelAssistant;
