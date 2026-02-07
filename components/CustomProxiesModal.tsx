

import React, { useState, useEffect } from 'react';
import type { CustomProxy } from '../types';
import { X, Save, Plus, Trash2, Loader2, Beaker, AlertTriangle } from 'lucide-react';

interface CustomProxiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialProxies: CustomProxy[];
    onSave: (proxies: CustomProxy[]) => void;
    isSaving: boolean;
}

const CustomProxiesModal: React.FC<CustomProxiesModalProps> = ({ isOpen, onClose, initialProxies, onSave, isSaving }) => {
    const [proxies, setProxies] = useState<CustomProxy[]>(initialProxies);
    const [newProxyKey, setNewProxyKey] = useState('');
    const [newProxyLabel, setNewProxyLabel] = useState('');
    const [newProxyUnit, setNewProxyUnit] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setProxies(initialProxies);
            setError(null);
        }
    }, [isOpen, initialProxies]);

    const handleAddProxy = () => {
        setError(null);
        const keyTrimmed = newProxyKey.trim();
        const labelTrimmed = newProxyLabel.trim();
        const unitTrimmed = newProxyUnit.trim();

        if (!keyTrimmed || !labelTrimmed) {
            setError("Proxy Key and Label cannot be empty.");
            return;
        }
        if (/\s/.test(keyTrimmed)) {
            setError("Proxy Key cannot contain spaces.");
            return;
        }
        if (proxies.some(p => p.key.toLowerCase() === keyTrimmed.toLowerCase())) {
            setError("Proxy Key must be unique.");
            return;
        }
        const newProxy: CustomProxy = {
            key: keyTrimmed,
            label: labelTrimmed,
            unit: unitTrimmed,
        };
        setProxies([...proxies, newProxy]);
        setNewProxyKey('');
        setNewProxyLabel('');
        setNewProxyUnit('');
    };

    const handleDeleteProxy = (keyToDelete: string) => {
        setProxies(proxies.filter(p => p.key !== keyToDelete));
    };
    
    const handleSave = () => {
        onSave(proxies);
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-background-tertiary rounded-xl shadow-2xl p-8 w-full max-w-2xl border border-border-primary m-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-content-primary flex items-center gap-3"><Beaker /> Manage Custom Proxies</h2>
                    <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 -mr-4 space-y-4">
                    <p className="text-sm text-content-muted">Define your own proxies for use in charts, tables, and data imports. The 'Proxy Key' should be a short, unique identifier without spaces (e.g., `B_Si`), and the 'Label' is its full name for display (e.g., `Biogenic Silica (%)`).</p>
                    {error && <div className="p-3 rounded-lg flex items-center gap-2 text-sm bg-danger-primary/20 text-danger-primary"><AlertTriangle size={18}/>{error}</div>}
                    
                    <div className="space-y-2">
                        {proxies.length > 0 ? proxies.map(proxy => (
                            <div key={proxy.key} className="flex items-center justify-between bg-background-primary/30 p-2 rounded-md">
                                <div>
                                    <p className="font-bold text-content-primary">{proxy.key}</p>
                                    <p className="text-xs text-content-muted">{proxy.label} {proxy.unit && `(${proxy.unit})`}</p>
                                </div>
                                <button onClick={() => handleDeleteProxy(proxy.key)} className="p-1.5 text-content-muted hover:text-danger-primary rounded-full transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )) : (
                            <p className="text-sm text-center text-content-muted py-4">No custom proxies defined yet.</p>
                        )}
                    </div>

                     <div className="border-t border-border-primary pt-4 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                                <label htmlFor="proxy-key-input" className="text-xs font-medium text-content-secondary">Proxy Key</label>
                                <input id="proxy-key-input" type="text" value={newProxyKey} onChange={e => setNewProxyKey(e.target.value)} className="w-full bg-background-interactive border border-border-secondary rounded-md p-1.5 text-sm" placeholder="e.g., B_Si" />
                            </div>
                            <div>
                                <label htmlFor="proxy-label-input" className="text-xs font-medium text-content-secondary">Label</label>
                                <input id="proxy-label-input" type="text" value={newProxyLabel} onChange={e => setNewProxyLabel(e.target.value)} className="w-full bg-background-interactive border border-border-secondary rounded-md p-1.5 text-sm" placeholder="e.g., Biogenic Silica" />
                            </div>
                            <div>
                                <label htmlFor="proxy-unit-input" className="text-xs font-medium text-content-secondary">Unit</label>
                                <input id="proxy-unit-input" type="text" value={newProxyUnit} onChange={e => setNewProxyUnit(e.target.value)} className="w-full bg-background-interactive border border-border-secondary rounded-md p-1.5 text-sm" placeholder="e.g., wt%" />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleAddProxy} className="p-2 flex items-center gap-1 text-xs font-semibold rounded-md bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors">
                                <Plus size={14} /> Add Proxy
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 mt-auto">
                     <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-background-interactive text-content-primary hover:bg-background-interactive-hover transition">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 rounded-lg bg-accent-primary text-accent-primary-text font-semibold hover:bg-accent-primary-hover transition disabled:bg-background-interactive disabled:cursor-not-allowed flex items-center gap-2">
                       {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                       Save Changes
                    </button>
                </div>
                 <style>{`
                    @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                    .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
                `}</style>
            </div>
        </div>
    );
};
export default CustomProxiesModal;