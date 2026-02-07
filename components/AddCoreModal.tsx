
import React, { useState, useEffect } from 'react';
import type { Core, Section, Microfossil, SectionFossilRecord, Folder, PartialMicrofossil, FossilAbundance, FossilPreservation } from '../types';
import { X, Save, Plus, Trash2, Wand2, Loader2, Sparkles, Camera } from 'lucide-react';
import AddFossilModal from './AddFossilModal';
import { suggestAgeFromFossils, analyzeSectionImage } from '../services/geminiService';
import { useToast } from './useToast';

interface AddCoreModalProps {
    mode: 'core' | 'section';
    onClose: () => void;
    
    // Core mode props
    onSaveCore?: (core: Core) => void;
    coreToEdit?: Core | null;
    folders?: Folder[];
    onDeleteCore?: (coreId: string) => void;

    // Section mode props
    parentCoreId?: string;
    onSaveSection?: (section: Section) => void;
    sectionToEdit?: Section | null;
    microfossils?: Microfossil[];
    onAddFossil?: (fossil: PartialMicrofossil) => void;
}

const InputField = ({ id, label, type, value, onChange, required = false, step, readOnly = false, placeholder }: {id: string, label: string, type: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean, step?: string, readOnly?: boolean, placeholder?: string }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-content-secondary mb-1">{label}</label>
        <input
            type={type}
            id={id}
            value={value}
            onChange={onChange}
            required={required}
            step={step}
            readOnly={readOnly}
            placeholder={placeholder}
            className={`w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition ${readOnly ? 'bg-background-tertiary cursor-not-allowed' : ''}`}
        />
    </div>
);

interface SelectFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
    required?: boolean;
    disabled?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({ id, label, value, onChange, children, required = false, disabled = false }) => {
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-content-secondary mb-1">{label}</label>
            <select
                id={id}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                className="w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8 disabled:bg-background-tertiary disabled:text-content-muted/50 disabled:cursor-not-allowed"
                style={{backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
            >
                {children}
            </select>
        </div>
    );
};


const AddCoreModal: React.FC<AddCoreModalProps> = (props) => {
    const { mode, onClose } = props;
    const { addToast } = useToast();
    const isCoreMode = mode === 'core';
    const isEditMode = !!(isCoreMode ? props.coreToEdit : props.sectionToEdit);

    // Core state
    const [coreId, setCoreId] = useState('');
    const [coreName, setCoreName] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [waterDepth, setWaterDepth] = useState('');
    const [project, setProject] = useState('');
    const [folderId, setFolderId] = useState<string>('');
    
    // Section state
    const [sectionId, setSectionId] = useState('');
    const [sectionName, setSectionName] = useState('');
    const [recoveryDate, setRecoveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [epoch, setEpoch] = useState('Pleistocene');
    const [geologicalPeriod, setGeologicalPeriod] = useState<'Glacial' | 'Interglacial' | 'Indeterminate'>('Indeterminate');
    const [ageRange, setAgeRange] = useState('');
    const [sectionImage, setSectionImage] = useState('');
    const [sectionImagePreview, setSectionImagePreview] = useState<string | null>(null);
    const [sectionImageError, setSectionImageError] = useState<string | null>(null);
    const [microfossilRecords, setMicrofossilRecords] = useState<SectionFossilRecord[]>([]);
    const [fossilToAdd, setFossilToAdd] = useState<string>('');
    const [collector, setCollector] = useState('');
    const [lithology, setLithology] = useState('');
    const [munsellColor, setMunsellColor] = useState('');
    const [grainSize, setGrainSize] = useState('');
    const [tephraLayers, setTephraLayers] = useState('');
    const [paleomagneticReversals, setPaleomagneticReversals] = useState('');
    const [sectionDepth, setSectionDepth] = useState('');
    const [sampleInterval, setSampleInterval] = useState('');
    const [collectionTime, setCollectionTime] = useState('');
    const [summary, setSummary] = useState('');

    const [isAddFossilModalOpen, setIsAddFossilModalOpen] = useState(false);
    const [isSuggestingAge, setIsSuggestingAge] = useState(false);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

    useEffect(() => {
        if (isCoreMode) {
            const c = props.coreToEdit;
            setCoreId(c?.id || '');
            setCoreName(c?.name || '');
            setLat(c?.location.lat.toString() || '');
            setLon(c?.location.lon.toString() || '');
            setWaterDepth(c?.waterDepth.toString() || '');
            setProject(c?.project || '');
            setFolderId(c?.folder_id || '');
        } else { // section mode
            const s = props.sectionToEdit;
            setSectionId(s?.id || '');
            setSectionName(s?.name || '');
            setRecoveryDate(s?.recoveryDate || new Date().toISOString().split('T')[0]);
            setEpoch(s?.epoch || 'Pleistocene');
            setGeologicalPeriod(s?.geologicalPeriod || 'Indeterminate');
            setAgeRange(s?.ageRange || '');
            setSectionImage(s?.sectionImage || '');
            setSectionImagePreview(s?.sectionImage || null);
            setSectionImageError(null);
            setMicrofossilRecords(s?.microfossilRecords || []);
            setCollector(s?.collector || '');
            setLithology(s?.lithology || '');
            setMunsellColor(s?.munsellColor || '');
            setGrainSize(s?.grainSize || '');
            setTephraLayers(s?.tephraLayers || '');
            setPaleomagneticReversals(s?.paleomagneticReversals || '');
            setSectionDepth(s?.sectionDepth?.toString() || '');
            setSampleInterval(s?.sampleInterval?.toString() || '');
            setCollectionTime(s?.collectionTime || '');
            setSummary(s?.summary || '');
        }
    }, [props.coreToEdit, props.sectionToEdit, isCoreMode]);


    const isCoreFormValid = coreId && coreName && lat && lon && waterDepth;
    const isSectionFormValid = sectionName && recoveryDate && ageRange;
    const isFormValid = isCoreMode ? isCoreFormValid : isSectionFormValid;

    const handleAddRecord = () => {
        if (fossilToAdd && !microfossilRecords.some(r => r.fossilId === fossilToAdd)) {
            setMicrofossilRecords(prev => [...prev, {
                fossilId: fossilToAdd,
                abundance: 'Present',
                preservation: 'Moderate',
                observations: ''
            }]);
            setFossilToAdd('');
        }
    };

    const handleRemoveRecord = (fossilIdToRemove: string) => {
        setMicrofossilRecords(prev => prev.filter(r => r.fossilId !== fossilIdToRemove));
    };

    const handleRecordChange = (fossilId: string, field: 'abundance' | 'preservation' | 'observations', value: string) => {
        setMicrofossilRecords(prev => prev.map(r => 
            r.fossilId === fossilId ? { ...r, [field]: value as any } : r
        ));
    };
    
    const handleSectionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setSectionImageError(null);
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setSectionImageError('File is too large. Please select an image under 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setSectionImagePreview(result);
                setSectionImage(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        
        if (isCoreMode && props.onSaveCore) {
            const coreData: Core = {
                id: coreId,
                name: coreName,
                location: { lat: parseFloat(lat), lon: parseFloat(lon) },
                waterDepth: parseInt(waterDepth, 10),
                project,
                folder_id: folderId || undefined,
            };
            props.onSaveCore(coreData);
        } else if (!isCoreMode && props.onSaveSection && props.parentCoreId) {
            const sectionData: Section = {
                id: sectionId, // Will be ignored on create, used on update
                core_id: props.parentCoreId,
                name: sectionName,
                sectionDepth: sectionDepth ? parseFloat(sectionDepth) : 0,
                sampleInterval: sampleInterval ? parseFloat(sampleInterval) : undefined,
                recoveryDate,
                collectionTime: collectionTime || undefined,
                epoch,
                geologicalPeriod,
                ageRange,
                dataPoints: isEditMode && props.sectionToEdit ? props.sectionToEdit.dataPoints : [],
                microfossilRecords: microfossilRecords,
                labAnalysis: isEditMode && props.sectionToEdit ? props.sectionToEdit.labAnalysis : {},
                summary: summary,
                sectionImage: sectionImage || `data:image/svg+xml,${encodeURIComponent(`<svg width="800" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="100" fill="#1e293b" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#94a3b8">${sectionName}</text></svg>`)}`,
                collector, lithology, munsellColor, grainSize, tephraLayers, paleomagneticReversals,
            };
            props.onSaveSection(sectionData);
        }
    };
    
    const handleDelete = () => {
        if (isCoreMode && isEditMode && props.onDeleteCore && props.coreToEdit) {
            props.onDeleteCore(props.coreToEdit.id);
        }
    };
    
    const handleSaveNewFossil = (newFossil: Microfossil) => {
        if (props.onAddFossil) {
           props.onAddFossil(newFossil);
           // Immediately add the new fossil to the current section's records
           setMicrofossilRecords(prev => [...prev, {
                fossilId: newFossil.id,
                abundance: 'Present',
                preservation: 'Moderate',
                observations: ''
            }]);
        }
        setIsAddFossilModalOpen(false);
    };

    const handleSuggestAge = async () => {
        if (!props.microfossils || microfossilRecords.length === 0) return;
        setIsSuggestingAge(true);
        try {
            const result = await suggestAgeFromFossils(microfossilRecords, props.microfossils);
            if (result.epoch) setEpoch(result.epoch);
            if (result.ageRange) setAgeRange(result.ageRange);
        } catch (error) {
            console.error("Failed to suggest age:", error);
        } finally {
            setIsSuggestingAge(false);
        }
    };

    const handleAutoAnalyzeImage = async () => {
        if (!sectionImage) return;
        setIsAnalyzingImage(true);
        try {
            const base64 = sectionImage.split(',')[1];
            const mimeType = sectionImage.substring(sectionImage.indexOf(':') + 1, sectionImage.indexOf(';'));
            const result = await analyzeSectionImage(base64, mimeType);
            
            if (result.lithology) setLithology(result.lithology);
            if (result.munsellColor) setMunsellColor(result.munsellColor);
            if (result.grainSize) setGrainSize(result.grainSize);
            if (result.tephraLayers) setTephraLayers(result.tephraLayers);
            if (result.observations) {
                // Append observations to summary if not empty
                setSummary(prev => prev ? `${prev}\n\nAI Observations: ${result.observations}` : result.observations);
            }
            addToast({ message: "Image analyzed successfully! Fields updated.", type: 'success' });
        } catch (err: any) {
            addToast({ message: `Analysis failed: ${err.message}`, type: 'error' });
        } finally {
            setIsAnalyzingImage(false);
        }
    };

    const abundanceOptions: FossilAbundance[] = ['Present', 'Abundant', 'Common', 'Few', 'Rare', 'Barren'];
    const preservationOptions: FossilPreservation[] = ['Good', 'Moderate', 'Poor'];
    
    const renderCoreForm = () => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField id="id" label="Core ID (e.g., ODP-982)" type="text" value={coreId} onChange={e => setCoreId(e.target.value)} required readOnly={isEditMode} />
            <InputField id="name" label="Core Name / Expedition" type="text" value={coreName} onChange={e => setCoreName(e.target.value)} required placeholder="e.g., North Atlantic Drilling Project"/>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField id="project" label="Project" type="text" value={project} placeholder="e.g., Ocean Drilling Program Leg 162" onChange={e => setProject(e.target.value)}/>
            <SelectField id="folderId" label="Folder" value={folderId} onChange={e => setFolderId(e.target.value)}>
                <option value="">Unfiled</option>
                {props.folders && props.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </SelectField>
        </div>
        <div className="p-4 bg-background-secondary/40 rounded-lg border border-border-primary space-y-4">
            <h3 className="text-md font-semibold text-content-secondary -mb-2">Site Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField id="lat" label="Latitude" type="number" value={lat} onChange={e => setLat(e.target.value)} required step="0.01"/>
                <InputField id="lon" label="Longitude" type="number" value={lon} onChange={e => setLon(e.target.value)} required step="0.01"/>
                <InputField id="waterDepth" label="Water Depth (m)" type="number" value={waterDepth} onChange={e => setWaterDepth(e.target.value)} required />
            </div>
        </div>
      </>
    );
    
    const renderSectionForm = () => {
        const availableFossils = props.microfossils?.filter(f => !microfossilRecords.some(r => r.fossilId === f.id)) || [];

        return (
          <>
            <InputField id="name" label="Section Name / Hole ID" type="text" value={sectionName} onChange={e => setSectionName(e.target.value)} required placeholder="e.g., Hole 982A" />
            <div className="p-4 bg-background-secondary/40 rounded-lg border border-border-primary space-y-4">
                <div className="flex justify-between items-center -mb-2">
                    <h3 className="text-md font-semibold text-content-secondary">Geological Context</h3>
                     <button
                        type="button"
                        onClick={handleSuggestAge}
                        disabled={isSuggestingAge || microfossilRecords.length === 0}
                        className="flex items-center gap-1.5 text-xs text-accent-primary hover:text-accent-primary-hover transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Use AI to suggest Epoch and Age Range based on selected fossils"
                     >
                        {isSuggestingAge ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        Suggest Age
                     </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField id="ageRange" label="Age Range (e.g., 0-1.2 Ma)" type="text" value={ageRange} onChange={e => setAgeRange(e.target.value)} required />
                    <SelectField id="epoch" label="Epoch" value={epoch} onChange={e => setEpoch(e.target.value)} required>
                        <option>Pleistocene</option>
                        <option>Holocene</option>
                        <option>Pliocene</option>
                        <option>Miocene</option>
                        <option>Oligocene</option>
                        <option>Eocene</option>
                        <option>Paleocene</option>
                    </SelectField>
                     <SelectField id="geologicalPeriod" label="Climatic Period" value={geologicalPeriod} onChange={e => setGeologicalPeriod(e.target.value as any)} required>
                        <option value="Indeterminate">Indeterminate</option>
                        <option value="Glacial">Glacial</option>
                        <option value="Interglacial">Interglacial</option>
                    </SelectField>
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField id="recoveryDate" label="Recovery Date" type="date" value={recoveryDate} onChange={e => setRecoveryDate(e.target.value)} required />
                <InputField id="collectionTime" label="Collection Time (24h)" type="time" value={collectionTime} onChange={e => setCollectionTime(e.target.value)} />
            </div>
             <div>
                <label htmlFor="section-image-upload" className="block text-sm font-medium text-content-secondary mb-1">Section Image (Max 2MB)</label>
                <div className="flex flex-wrap items-center gap-4">
                    <input id="section-image-upload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleSectionImageChange} className="w-full text-sm text-content-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-background-interactive file:text-content-primary hover:file:bg-background-interactive-hover" />
                    {sectionImagePreview && (
                        <div className="relative group w-48 h-16 bg-background-secondary rounded-lg border border-border-secondary flex-shrink-0">
                            <img src={sectionImagePreview} alt="Section preview" className="w-full h-full object-cover rounded-lg" />
                            <button
                                type="button"
                                onClick={() => {
                                    setSectionImagePreview(null);
                                    setSectionImage('');
                                    const input = document.getElementById('section-image-upload') as HTMLInputElement;
                                    if (input) input.value = '';
                                }}
                                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                    {sectionImagePreview && (
                        <button 
                            type="button" 
                            onClick={handleAutoAnalyzeImage}
                            disabled={isAnalyzingImage}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30 transition-colors text-sm font-semibold disabled:opacity-50"
                        >
                            {isAnalyzingImage ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            Auto-Analyze Image
                        </button>
                    )}
                </div>
                {sectionImageError && <p className="text-xs text-danger-primary mt-1">{sectionImageError}</p>}
            </div>
            
            <div className="p-4 bg-background-secondary/40 rounded-lg border border-border-primary space-y-4">
                 <h3 className="text-md font-semibold text-content-secondary -mb-2">Reporting Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <InputField id="sectionDepth" label="Section Depth (mbsf)" type="number" value={sectionDepth} onChange={e => setSectionDepth(e.target.value)} placeholder="e.g., 2.0"/>
                     <InputField id="sampleInterval" label="Sample Interval (m)" type="number" value={sampleInterval} onChange={e => setSampleInterval(e.target.value)} placeholder="e.g., 0.1"/>
                     <InputField id="collector" label="Collector" type="text" value={collector} onChange={e => setCollector(e.target.value)} placeholder="e.g., JOIDES Resolution"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <InputField id="lithology" label="Lithology" type="text" value={lithology} onChange={e => setLithology(e.target.value)} placeholder="e.g., Calcareous Ooze"/>
                     <InputField id="munsellColor" label="Munsell Color" type="text" value={munsellColor} onChange={e => setMunsellColor(e.target.value)} placeholder="e.g., 10YR 4/10"/>
                     <InputField id="grainSize" label="Grain Size" type="text" value={grainSize} onChange={e => setGrainSize(e.target.value)} placeholder="e.g., 63-125 Microns"/>
                     <InputField id="tephraLayers" label="Tephra Layers" type="text" value={tephraLayers} onChange={e => setTephraLayers(e.target.value)} placeholder="e.g., L1 @ 50; L2 @ 120"/>
                     <InputField id="paleomagneticReversals" label="Paleomagnetic Reversals" type="text" value={paleomagneticReversals} onChange={e => setPaleomagneticReversals(e.target.value)} placeholder="e.g., 0.01"/>
                </div>
            </div>

            <div className="p-4 bg-background-secondary/40 rounded-lg border border-border-primary space-y-4">
                <div className="flex justify-between items-center">
                     <h3 className="text-md font-semibold text-content-secondary">Microfossil Records</h3>
                     <button type="button" onClick={() => setIsAddFossilModalOpen(true)} className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-primary-hover transition-colors font-semibold">
                         <Plus size={14}/>
                         Add New Species to DB
                     </button>
                </div>
                <div className="flex items-end gap-2 border-b border-border-primary pb-4">
                    <div className="flex-grow">
                        <label htmlFor="fossil-select" className="block text-sm font-medium text-content-secondary mb-1">Add Fossil Record</label>
                         <SelectField id="fossil-select" label="" value={fossilToAdd} onChange={(e) => setFossilToAdd(e.target.value)} disabled={availableFossils.length === 0}>
                            <option value="">{availableFossils.length > 0 ? 'Select a species...' : 'All species added'}</option>
                            {availableFossils.map(fossil => (
                                <option key={fossil.id} value={fossil.id} className="italic">{fossil.taxonomy.genus} {fossil.taxonomy.species}</option>
                            ))}
                        </SelectField>
                    </div>
                    <button type="button" onClick={handleAddRecord} disabled={!fossilToAdd} className="px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                        Add
                    </button>
                </div>
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2 -mr-2">
                    {microfossilRecords.map(record => {
                        const fossil = props.microfossils?.find(f => f.id === record.fossilId);
                        if (!fossil) return null;
                        return (
                            <div key={record.fossilId} className="bg-background-tertiary/60 p-3 rounded-lg border border-border-primary animate-fade-in-fast">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-content-primary italic">{fossil.taxonomy.genus} {fossil.taxonomy.species}</h4>
                                    <button type="button" onClick={() => handleRemoveRecord(record.fossilId)} className="p-1 text-content-muted hover:text-danger-primary transition">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <SelectField
                                            id={`abundance-${fossil.id}`}
                                            label="Abundance"
                                            value={record.abundance}
                                            onChange={(e) => handleRecordChange(fossil.id, 'abundance', e.target.value)}
                                        >
                                            {abundanceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </SelectField>
                                        <SelectField
                                            id={`preservation-${fossil.id}`}
                                            label="Preservation"
                                            value={record.preservation}
                                            onChange={(e) => handleRecordChange(fossil.id, 'preservation', e.target.value)}
                                        >
                                            {preservationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </SelectField>
                                    </div>
                                    <div>
                                        <label htmlFor={`obs-${fossil.id}`} className="block text-sm font-medium text-content-secondary mb-1">Observations</label>
                                        <textarea
                                            id={`obs-${fossil.id}`}
                                            value={record.observations}
                                            onChange={(e) => handleRecordChange(fossil.id, 'observations', e.target.value)}
                                            rows={4}
                                            className="w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {microfossilRecords.length === 0 && (
                        <p className="text-center text-content-muted text-sm py-4">No fossil records added for this section.</p>
                    )}
                </div>
            </div>
          </>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-background-tertiary rounded-xl shadow-2xl p-8 w-full max-w-4xl border border-border-primary m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-content-primary">
                      {isEditMode 
                        ? (isCoreMode ? `Edit Core: ${props.coreToEdit?.id}`: `Edit Section: ${props.sectionToEdit?.name}`) 
                        : (isCoreMode ? 'Add New Core' : 'Add New Section')}
                    </h2>
                    <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {isCoreMode ? renderCoreForm() : renderSectionForm()}
                    
                    <div className="flex justify-between items-center gap-4 pt-6">
                        <div>
                           {isCoreMode && isEditMode && props.onDeleteCore && (
                                <button type="button" onClick={handleDelete} className="px-6 py-2 rounded-lg bg-danger-primary text-content-inverted hover:bg-danger-secondary transition flex items-center gap-2">
                                   <Trash2 size={18} />
                                   Delete Core
                                </button>
                           )}
                        </div>
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-background-interactive text-content-primary hover:bg-background-interactive-hover transition">Cancel</button>
                            <button type="submit" disabled={!isFormValid} className="px-6 py-2 rounded-lg bg-accent-primary text-accent-primary-text font-semibold hover:bg-accent-primary-hover transition disabled:bg-background-interactive disabled:cursor-not-allowed flex items-center gap-2">
                               <Save size={18} />
                               {isEditMode ? 'Save Changes' : (isCoreMode ? 'Save Core' : 'Save Section')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            {isAddFossilModalOpen && (
                 <AddFossilModal 
                    onSaveFossil={handleSaveNewFossil} 
                    onClose={() => setIsAddFossilModalOpen(false)}
                 />
             )}
             <style>{`
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default AddCoreModal;
