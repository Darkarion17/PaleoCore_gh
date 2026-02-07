import React, { useState, useMemo, useEffect } from 'react';
import type { Publication, Core, CorePublicationLink } from '../types';
import { BookCopy, Search, PlusCircle, ExternalLink, Edit, Trash2, Link as LinkIcon } from 'lucide-react';

interface PublicationsTabProps {
    publications: Publication[];
    cores: Core[];
    corePublicationLinks: CorePublicationLink[];
    onAddPublication: () => void;
    onEditPublication: (publication: Publication) => void;
    onDeletePublication: (publicationId: string) => void;
    onLinkCore: (coreId: string, publicationId: string) => void;
    onUnlinkCore: (coreId: string, publicationId: string) => void;
    selectedPublicationId?: string;
    onSelectPublication: (publicationId: string | null) => void;
}

const PublicationsTab: React.FC<PublicationsTabProps> = ({ 
    publications = [], 
    cores = [], 
    corePublicationLinks = [], 
    onAddPublication, 
    onEditPublication, 
    onDeletePublication, 
    onLinkCore, 
    onUnlinkCore, 
    selectedPublicationId, 
    onSelectPublication 
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const selectedPublication = useMemo(() => {
        return publications.find(p => p.id === selectedPublicationId) || null;
    }, [selectedPublicationId, publications]);

    const filteredPublications = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (!term) return publications;
        return publications.filter(p =>
            p.title.toLowerCase().includes(term) ||
            p.authors.toLowerCase().includes(term) ||
            p.journal.toLowerCase().includes(term) ||
            String(p.year).includes(term)
        );
    }, [publications, searchTerm]);

    const linkedCores = useMemo(() => {
        if (!selectedPublication) return [];
        const linkedCoreIds = corePublicationLinks
            .filter(link => link.publication_id === selectedPublication.id)
            .map(link => link.core_id);
        return cores.filter(core => linkedCoreIds.includes(core.id));
    }, [selectedPublication, corePublicationLinks, cores]);

    const unlinkedCores = useMemo(() => {
        if (!selectedPublication) return [];
        const linkedCoreIds = new Set(linkedCores.map(c => c.id));
        return cores.filter(core => !linkedCoreIds.has(core.id));
    }, [selectedPublication, linkedCores, cores]);

    useEffect(() => {
        if (filteredPublications.length > 0 && !selectedPublicationId) {
            onSelectPublication(filteredPublications[0].id);
        }
        if (selectedPublicationId && !filteredPublications.some(p => p.id === selectedPublicationId)) {
            onSelectPublication(filteredPublications[0]?.id || null);
        }
    }, [filteredPublications, selectedPublicationId, onSelectPublication]);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-content-primary flex items-center gap-3"><BookCopy /> Publications</h1>
                <button
                    onClick={onAddPublication}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold"
                >
                    <PlusCircle size={16}/> Add Publication
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 bg-background-tertiary/50 p-4 rounded-xl shadow-lg border border-border-primary/50 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Search title, authors, year..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background-tertiary border border-border-secondary rounded-lg py-2 pl-10 pr-4 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                        />
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2 space-y-1">
                        {filteredPublications.map(pub => (
                            <button
                                key={pub.id}
                                onClick={() => onSelectPublication(pub.id)}
                                className={`w-full text-left p-3 rounded-md transition-colors ${selectedPublication?.id === pub.id ? 'bg-accent-primary/20' : 'hover:bg-background-interactive/50'}`}
                            >
                                <p className={`font-bold truncate ${selectedPublication?.id === pub.id ? 'text-accent-primary-hover' : 'text-content-primary'}`}>{pub.title}</p>
                                <p className="text-xs text-content-secondary truncate">{pub.authors}</p>
                                <p className="text-xs text-content-muted mt-1">{pub.journal}, {pub.year}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50 min-h-[70vh]">
                    {selectedPublication ? (
                        <div className="space-y-6 animate-fade-in-fast">
                            <div className="flex justify-between items-start">
                                <div className="flex-grow pr-4">
                                    <h2 className="text-2xl font-bold text-content-primary">{selectedPublication.title}</h2>
                                    <p className="text-content-secondary mt-1">{selectedPublication.authors}</p>
                                    <p className="text-sm text-content-muted italic mt-1">{selectedPublication.journal}, {selectedPublication.year}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button onClick={() => onEditPublication(selectedPublication)} className="p-2 rounded-md bg-background-interactive text-content-secondary hover:bg-background-interactive-hover hover:text-content-primary" title="Edit"><Edit size={16}/></button>
                                    <button onClick={() => onDeletePublication(selectedPublication.id)} className="p-2 rounded-md bg-danger-primary/20 text-danger-primary hover:bg-danger-primary/30" title="Delete"><Trash2 size={16}/></button>
                                </div>
                            </div>

                             <div className="flex items-center gap-4 text-sm">
                                <span className="font-semibold text-content-secondary">DOI: <a href={`https://doi.org/${selectedPublication.doi}`} target="_blank" rel="noopener noreferrer" className="font-normal text-accent-secondary hover:underline">{selectedPublication.doi}</a></span>
                                {selectedPublication.link && <a href={selectedPublication.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-accent-secondary hover:underline"><ExternalLink size={14}/> View Publication</a>}
                            </div>
                            
                            {selectedPublication.abstract && (
                                <div>
                                    <h3 className="font-semibold text-content-primary mb-2">Abstract</h3>
                                    <p className="text-sm text-content-secondary bg-background-primary/40 p-3 rounded-md max-h-40 overflow-y-auto">{selectedPublication.abstract}</p>
                                </div>
                            )}

                            <div>
                                <h3 className="font-semibold text-content-primary mb-2 flex items-center gap-2"><LinkIcon size={16} /> Linked Cores</h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto bg-background-primary/40 p-2 rounded-md">
                                    {linkedCores.length > 0 ? linkedCores.map(core => (
                                        <div key={core.id} className="flex justify-between items-center p-2 bg-background-interactive/30 rounded">
                                            <div>
                                                <p className="font-semibold text-sm text-content-primary">{core.id}</p>
                                                <p className="text-xs text-content-muted">{core.name}</p>
                                            </div>
                                            <button onClick={() => onUnlinkCore(core.id, selectedPublication.id)} className="p-1 text-danger-primary/70 hover:text-danger-primary"><Trash2 size={14}/></button>
                                        </div>
                                    )) : <p className="text-sm text-content-muted text-center py-2">No cores linked yet.</p>}
                                </div>
                                {unlinkedCores.length > 0 && (
                                     <div className="flex items-center gap-2 mt-2">
                                        <select onChange={(e) => { if(e.target.value) onLinkCore(e.target.value, selectedPublication.id); e.target.value = ''; }} className="w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary" defaultValue="">
                                            <option value="" disabled>Link another core...</option>
                                            {unlinkedCores.map(core => (
                                                <option key={core.id} value={core.id}>{core.id} - {core.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-content-muted">
                            <BookCopy size={48} className="mb-4" />
                            <h3 className="text-xl font-semibold text-content-primary">Select a publication</h3>
                            <p>Choose a publication from the list to view its details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicationsTab;