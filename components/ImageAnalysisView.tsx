

import React, { useState } from 'react';
import type { PartialMicrofossil, IdentifiedFossil, FeedbackCorrection, ReinforcementFeedback } from '../types';
import { UploadCloud, Bot, Loader2, AlertCircle, Save, ExternalLink, ChevronDown, BrainCircuit, CheckCircle, AlertTriangle, ThumbsUp, ThumbsDown, History, Check, X, XCircle } from 'lucide-react';
import { identifyFossilsInImage } from '../services/geminiService';

interface ImageAnalysisViewProps {
    onAddFossil: (data: PartialMicrofossil) => void;
    setToast: (toast: { message: string; type: 'success' | 'error' | 'info'; show: boolean }) => void;
}

const ImageAnalysisView: React.FC<ImageAnalysisViewProps> = ({ onAddFossil, setToast }) => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [identifiedFossils, setIdentifiedFossils] = useState<IdentifiedFossil[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    
    const [geologicalAge, setGeologicalAge] = useState('');
    const [location, setLocation] = useState('');
    const [visibleFeatures, setVisibleFeatures] = useState('');

    const [corrections, setCorrections] = useState<FeedbackCorrection[]>([]);
    const [reinforcements, setReinforcements] = useState<ReinforcementFeedback[]>([]);
    const [feedbackState, setFeedbackState] = useState<Record<string, 'correct' | 'incorrect' | 'entering' | null>>({});
    const [correctionInput, setCorrectionInput] = useState<Record<string, string>>({});

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError('File is too large. Please select an image under 4MB.');
                return;
            }
            handleReset(); // Reset previous state when a new image is selected
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAnalyze = async () => {
        if (!imageFile || !imagePreview) return;
        
        setIsLoading(true);
        setError('');
        setIdentifiedFossils([]);

        try {
            const base64Data = imagePreview.split(',')[1];
            const context = { geologicalAge, location, visibleFeatures };
            const results = await identifyFossilsInImage(base64Data, imageFile.type, context, corrections, reinforcements);
            setIdentifiedFossils(results);
            setFeedbackState({});
            setCorrectionInput({});
            if (results.length === 0) {
                 setToast({ message: "The AI could not find any matching species on the web for this image.", type: 'info', show: true });
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during analysis.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveAsFossil = (fossil: IdentifiedFossil) => {
        const nameParts = fossil.speciesName.split(' ');
        const genus = nameParts[0] || 'Unknown';
        const species = nameParts.slice(1).join(' ') || 'species';
    
        const id = `${genus.charAt(0).toUpperCase()}_${species.toLowerCase().replace(' ', '_')}`;
        
        const description = `AI Analysis:\n\nMatching Features:\n- ${fossil.analysis.matchingFeatures.join('\n- ')}\n\nDistinguishing Features:\n- ${fossil.analysis.distinguishingFeatures.join('\n- ')}`;

        const fossilToSave: PartialMicrofossil = {
            id: id,
            taxonomy: {
                genus: genus,
                species: species,
            },
            imageUrl: imagePreview || undefined,
            description: description,
        };
        onAddFossil(fossilToSave);
    };

    const handleFeedback = (speciesName: string, type: 'correct' | 'incorrect') => {
        setFeedbackState(prev => ({ ...prev, [speciesName]: type === 'incorrect' ? 'entering' : 'correct' }));
        
        if (type === 'correct' && imageFile && imagePreview) {
            const newReinforcement: ReinforcementFeedback = {
                correctSpecies: speciesName,
                image: {
                    base64Data: imagePreview.split(',')[1],
                    mimeType: imageFile.type,
                }
            };
            // Avoid adding the exact same image-species pair twice
            if (!reinforcements.some(r => r.image.base64Data === newReinforcement.image.base64Data && r.correctSpecies === speciesName)) {
                 setReinforcements(prev => [...prev, newReinforcement]);
            }
        }
    };

    const handleCorrectionSubmit = (incorrectSpecies: string) => {
        const correctSpecies = correctionInput[incorrectSpecies]?.trim();
        if (correctSpecies) {
            const newCorrection: FeedbackCorrection = { incorrectSpecies, correctSpecies };
            setCorrections(prev => [...prev, newCorrection]);
            setFeedbackState(prev => ({ ...prev, [incorrectSpecies]: 'incorrect' }));
        }
    };
    
    const handleReset = () => {
        setImagePreview(null);
        setImageFile(null);
        setIdentifiedFossils([]);
        setError('');
        setFeedbackState({});
        setCorrectionInput({});
    };


    const inputClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition";

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-content-primary flex items-center gap-3"><BrainCircuit /> AI Fossil Identification</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Column: Upload and Context */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-background-tertiary/50 p-6 rounded-xl border border-border-primary/50">
                        <h2 className="text-xl font-semibold mb-2 text-content-primary">1. Upload Microfossil Image</h2>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-border-secondary border-dashed rounded-lg cursor-pointer bg-background-primary/50 hover:bg-background-tertiary/60">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 mb-2 text-content-muted" />
                                    <p className="text-sm text-content-secondary"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-content-muted">PNG, JPG, WEBP (Max 4MB)</p>
                                </div>
                                <input id="image-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} />
                            </label>
                        </div>
                         {imagePreview && (
                            <div className="mt-4 w-full h-48 bg-background-primary/50 rounded-lg border border-border-secondary flex items-center justify-center overflow-hidden relative">
                                <img src={imagePreview} alt="Microfossil preview" className="max-h-full max-w-full object-contain" />
                            </div>
                       )}
                    </div>
                    
                    <div className="bg-background-tertiary/50 p-6 rounded-xl border border-border-primary/50">
                        <details className="group" open>
                            <summary className="text-xl font-semibold text-content-primary list-none flex justify-between items-center cursor-pointer">
                                2. Add Context (Recommended)
                                <ChevronDown className="group-open:rotate-180 transition-transform" />
                            </summary>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-content-secondary">Geological Age/Epoch</label>
                                    <input type="text" placeholder="e.g., Pleistocene, 0-1.2 Ma" value={geologicalAge} onChange={e => setGeologicalAge(e.target.value)} className={inputClass} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-content-secondary">Location/Region</label>
                                    <input type="text" placeholder="e.g., North Atlantic, ODP-982" value={location} onChange={e => setLocation(e.target.value)} className={inputClass} />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-medium text-content-secondary">Observed Features</label>
                                    <textarea placeholder="e.g., Planoconvex test, umbilical-extraumbilical aperture, smooth wall texture, 5 chambers in final whorl..." value={visibleFeatures} onChange={e => setVisibleFeatures(e.target.value)} className={inputClass} rows={3} />
                                </div>
                            </div>
                        </details>
                    </div>

                    <button 
                        onClick={handleAnalyze} 
                        disabled={!imageFile || isLoading} 
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-accent-primary text-accent-primary-text font-bold hover:bg-accent-primary-hover transition-all duration-200 shadow-lg disabled:bg-background-interactive disabled:cursor-wait"
                    >
                       {isLoading ? <Loader2 className="animate-spin" /> : <Bot />}
                       {isLoading ? 'Analyzing...' : 'Identify Fossil with PaleoAI'}
                    </button>
                </div>

                {/* Right Column: Results & Feedback */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-background-tertiary/50 p-6 rounded-xl border border-border-primary/50 min-h-[504px] flex flex-col">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h2 className="text-xl font-semibold text-content-primary flex items-center gap-3"><Bot /> Identification Results</h2>
                             {(identifiedFossils.length > 0 || error) && !isLoading && (
                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-interactive text-content-secondary hover:bg-background-interactive-hover transition-colors text-xs font-semibold"
                                >
                                    <XCircle size={14} />
                                    Start New Analysis
                                </button>
                            )}
                        </div>
                        
                        <div className="flex-grow flex flex-col">
                            {isLoading && (
                                <div className="flex-grow flex flex-col items-center justify-center text-content-muted">
                                    <Loader2 size={32} className="animate-spin mb-4" />
                                    <p>Performing differential diagnosis...</p>
                                    <p className="text-xs mt-2">This may take a moment.</p>
                                </div>
                            )}

                            {!isLoading && error && (
                                <div className="flex-grow flex flex-col items-center justify-center text-danger-primary bg-danger-primary/10 rounded-lg p-4">
                                    <AlertCircle size={32} className="mb-4" />
                                    <p className="font-semibold">Analysis Failed</p>
                                    <p className="text-sm text-center">{error}</p>
                                </div>
                            )}

                            {!isLoading && !error && identifiedFossils.length > 0 && (
                                <div className="space-y-4 max-h-[calc(80vh - 150px)] overflow-y-auto pr-2 -mr-4">
                                    {identifiedFossils.map((fossil, index) => (
                                        <div key={`${fossil.speciesName}-${index}`} className="p-4 bg-background-primary/50 rounded-lg border border-border-primary space-y-3 animate-fade-in-fast">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-grow pr-2">
                                                    <h3 className="font-bold text-content-primary italic">{fossil.speciesName}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <div className="w-full bg-background-interactive rounded-full h-1.5">
                                                            <div
                                                                className="bg-accent-secondary h-1.5 rounded-full transition-all duration-500"
                                                                style={{ width: `${fossil.confidenceScore}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-semibold text-content-secondary w-12 text-right">
                                                            {fossil.confidenceScore.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleSaveAsFossil(fossil)}
                                                    className="p-2 rounded-md bg-background-interactive text-content-secondary hover:bg-accent-primary/30 hover:text-accent-primary transition-colors flex-shrink-0"
                                                    title="Save to Micropaleontology Wiki"
                                                >
                                                    <Save size={16}/>
                                                </button>
                                            </div>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-24 h-24 bg-background-secondary rounded-md overflow-hidden flex-shrink-0 relative group">
                                                    <img src={fossil.sourceImageUrl} alt={`Source for ${fossil.speciesName}`} className="w-full h-full object-cover" />
                                                    <a href={fossil.sourceImageUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity" title="View Source Image">
                                                        <ExternalLink size={20} />
                                                    </a>
                                                </div>
                                                <div className="text-xs space-y-2 flex-grow">
                                                    <div>
                                                        <h4 className="font-semibold text-content-secondary flex items-center gap-1.5 mb-1"><CheckCircle size={14} className="text-success-primary"/> Matching Features</h4>
                                                        <ul className="list-disc list-inside space-y-0.5 text-content-secondary pl-2">
                                                            {fossil.analysis.matchingFeatures.map((feat, i) => <li key={i}>{feat}</li>)}
                                                            {fossil.analysis.matchingFeatures.length === 0 && <li>No specific matching features highlighted by AI.</li>}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-content-secondary flex items-center gap-1.5 mb-1"><AlertTriangle size={14} className="text-danger-primary"/> Distinguishing Features</h4>
                                                        <ul className="list-disc list-inside space-y-0.5 text-content-muted pl-2">
                                                            {fossil.analysis.distinguishingFeatures.map((feat, i) => <li key={i}>{feat}</li>)}
                                                            {fossil.analysis.distinguishingFeatures.length === 0 && <li>No specific distinguishing features highlighted by AI.</li>}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-border-secondary">
                                                <span className="text-xs font-semibold text-content-muted">Was this identification correct?</span>
                                                {feedbackState[fossil.speciesName] === 'entering' ? (
                                                    <div className="flex items-center gap-2 animate-fade-in-fast w-full ml-4">
                                                        <input
                                                            type="text"
                                                            placeholder="Enter correct species..."
                                                            value={correctionInput[fossil.speciesName] || ''}
                                                            onChange={(e) => setCorrectionInput(prev => ({ ...prev, [fossil.speciesName]: e.target.value }))}
                                                            className={`${inputClass} text-xs p-1.5`}
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handleCorrectionSubmit(fossil.speciesName)} className="p-1.5 rounded-md bg-success-primary/20 text-success-primary" title="Submit Correction"><Check size={16} /></button>
                                                        <button onClick={() => setFeedbackState(prev => ({ ...prev, [fossil.speciesName]: null }))} className="p-1.5 rounded-md bg-danger-primary/20 text-danger-primary" title="Cancel"><X size={16} /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleFeedback(fossil.speciesName, 'correct')}
                                                            disabled={!!feedbackState[fossil.speciesName]}
                                                            className={`p-1.5 rounded-md transition-colors ${feedbackState[fossil.speciesName] === 'correct' ? 'bg-success-primary/20 text-success-primary' : 'text-content-muted hover:text-success-primary disabled:opacity-50'}`}
                                                            title="Correct"
                                                        >
                                                            <ThumbsUp size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleFeedback(fossil.speciesName, 'incorrect')}
                                                            disabled={!!feedbackState[fossil.speciesName]}
                                                            className={`p-1.5 rounded-md transition-colors ${feedbackState[fossil.speciesName] === 'incorrect' ? 'bg-danger-primary/20 text-danger-primary' : 'text-content-muted hover:text-danger-primary disabled:opacity-50'}`}
                                                            title="Incorrect"
                                                        >
                                                            <ThumbsDown size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isLoading && !error && identifiedFossils.length === 0 && (
                                <div className="flex-grow flex flex-col items-center justify-center text-content-muted text-center">
                                    <Bot size={48} className="mb-4" />
                                    <h3 className="text-lg font-semibold text-content-primary">Ready for Analysis</h3>
                                    <p>Upload an image and provide context to begin.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reinforcements.length > 0 && (
                            <div className="bg-background-tertiary/50 p-4 rounded-xl border border-border-primary/50 animate-fade-in-fast">
                                <h3 className="text-md font-semibold text-content-primary flex items-center gap-2 mb-3"><CheckCircle size={18} className="text-success-primary"/> Session Examples</h3>
                                <ul className="space-y-2 text-sm max-h-40 overflow-y-auto pr-2 -mr-2">
                                    {reinforcements.map((r, i) => (
                                        <li key={i} className="flex items-center gap-3 bg-background-primary/50 p-2 rounded-md">
                                            <img src={`data:${r.image.mimeType};base64,${r.image.base64Data}`} alt={r.correctSpecies} className="w-10 h-10 object-cover rounded-md" />
                                            <span className="text-success-primary font-semibold italic">{r.correctSpecies}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                         {corrections.length > 0 && (
                            <div className="bg-background-tertiary/50 p-4 rounded-xl border border-border-primary/50 animate-fade-in-fast">
                                <h3 className="text-md font-semibold text-content-primary flex items-center gap-2 mb-3"><History size={18} /> Session Corrections</h3>
                                <ul className="space-y-2 text-sm max-h-40 overflow-y-auto pr-2 -mr-2">
                                    {corrections.map((c, i) => (
                                        <li key={i} className="flex items-center justify-between bg-background-primary/50 p-2 rounded-md">
                                            <span className="text-danger-primary line-through">{c.incorrectSpecies}</span>
                                            <span className="font-bold mx-2">→</span>
                                            <span className="text-success-primary font-semibold">{c.correctSpecies}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
             <style>{`
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ImageAnalysisView;