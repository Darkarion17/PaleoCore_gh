import React, { useState, useEffect, useCallback } from 'react';
import type { Core, NearbyCore } from '../types';
import { findNearbyCores } from '../services/noaaService';
import { X, Compass, Loader2, AlertCircle, ExternalLink, MapPin, Droplet, Users } from 'lucide-react';

interface NearbyCoresModalProps {
    isOpen: boolean;
    onClose: () => void;
    core: Core;
}

const NearbyCoresModal: React.FC<NearbyCoresModalProps> = ({ isOpen, onClose, core }) => {
    const [results, setResults] = useState<NearbyCore[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [radius, setRadius] = useState(250); // Default search radius in km

    const handleSearch = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setResults([]);

        try {
            const searchResults = await findNearbyCores(core.location.lat, core.location.lon, radius);
            setResults(searchResults);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [core.location, radius]);
    
    // Auto-search when modal opens
    useEffect(() => {
        if (isOpen) {
            handleSearch();
        }
    }, [isOpen, handleSearch]);
    
    if (!isOpen) return null;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-content-muted">
                    <Loader2 size={32} className="animate-spin mb-4" />
                    <p>Searching NOAA database within {radius}km...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-danger-primary bg-danger-primary/10 rounded-lg p-4">
                    <AlertCircle size={32} className="mb-4" />
                    <p className="font-semibold">Failed to fetch data from NOAA</p>
                    <p className="text-sm text-center">{error}</p>
                </div>
            );
        }

        if (results.length === 0) {
            return (
                 <div className="flex flex-col items-center justify-center h-64 text-content-muted">
                    <Compass size={32} className="mb-4" />
                    <p>No other public cores found within {radius}km.</p>
                    <p className="text-sm">Try increasing the search radius.</p>
                </div>
            );
        }

        return (
            <ul className="space-y-3">
                {results.map((item, index) => (
                    <li key={item.dataUrl + index} className="bg-background-secondary/50 p-4 rounded-lg border border-border-secondary transition-all hover:border-accent-primary hover:bg-background-secondary">
                        <a href={item.dataUrl} target="_blank" rel="noopener noreferrer" className="flex justify-between items-start group">
                            <div className="flex-grow pr-4">
                                <h4 className="font-bold text-content-primary group-hover:text-accent-primary transition-colors">{item.studyName}</h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-muted mt-2">
                                    <span className="flex items-center gap-1.5" title="Location"><MapPin size={12}/> {item.lat.toFixed(3)}°, {item.lon.toFixed(3)}°</span>
                                    {item.waterDepth && <span className="flex items-center gap-1.5" title="Water Depth"><Droplet size={12}/> {item.waterDepth} m</span>}
                                    <span className="flex items-center gap-1.5 truncate" title="Investigators"><Users size={12}/> {item.investigators || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="ml-4 flex-shrink-0 text-content-muted group-hover:text-accent-primary transition-colors pt-1">
                                <ExternalLink size={18} />
                            </div>
                        </a>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-background-tertiary rounded-xl shadow-2xl p-8 w-full max-w-3xl border border-border-primary m-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-primary">
                    <div>
                        <h2 className="text-2xl font-bold text-content-primary flex items-center gap-3"><Compass /> Nearby Cores from NOAA</h2>
                        <p className="text-sm text-content-muted">Publicly archived data near {core.id} ({core.location.lat.toFixed(2)}°, {core.location.lon.toFixed(2)}°)</p>
                    </div>
                    <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors"><X size={24} /></button>
                </div>

                <div className="flex items-center gap-4 mb-4 p-2 bg-background-secondary/40 rounded-md">
                    <label htmlFor="radius-slider" className="text-sm font-semibold text-content-secondary whitespace-nowrap">Search Radius: <span className="font-bold text-accent-primary">{radius} km</span></label>
                    <input
                        id="radius-slider"
                        type="range"
                        min="50"
                        max="2000"
                        step="50"
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        onMouseUp={handleSearch}
                        onTouchEnd={handleSearch}
                        className="w-full h-2 bg-background-interactive rounded-lg appearance-none cursor-pointer"
                        disabled={isLoading}
                    />
                </div>
                
                <div className="flex-grow overflow-y-auto -mr-3 pr-3">
                   {renderContent()}
                </div>

                <div className="text-xs text-content-muted text-right mt-4 pt-4 border-t border-border-primary">
                    Data provided by <a href="https://www.noaa.gov/ncei" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-secondary hover:underline">NOAA NCEI</a>
                </div>
            </div>
            <style>{`
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default NearbyCoresModal;