import React, { useState, useMemo } from 'react';
import type { Publication } from '../types';
import { X, Search, Link } from 'lucide-react';

interface LinkPublicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    coreId: string;
    allPublications: Publication[];
    linkedPublicationIds: string[];
    onLink: (coreId: string, publicationId: string) => void;
}

const LinkPublicationModal: React.FC<LinkPublicationModalProps> = ({ 
    isOpen, 
    onClose, 
    coreId, 
    allPublications = [], 
    linkedPublicationIds = [], 
    onLink 
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const unlinkedPublications = useMemo(() => {
        const linkedIds = new Set(linkedPublicationIds);
        const term = searchTerm.toLowerCase();
        return allPublications.filter(p => 
            !linkedIds.has(p.id) &&
            (p.title.toLowerCase().includes(term) || p.authors.toLowerCase().includes(term))
        );
    }, [allPublications, linkedPublicationIds, searchTerm]);

    const handleLink = (publicationId: string) => {
        onLink(coreId, publicationId);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={onClose}>
            <div className="bg-background-tertiary rounded-xl shadow-2xl p-8 w-full max-w-xl border border-border-primary m-4 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-content-primary">Link Publication to Core</h2>
                    <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors"><X size={24} /></button>
                </div>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Search publications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background-interactive border border-border-secondary rounded-lg py-2 pl-10 pr-4 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                    />
                </div>
                <div className="flex-grow overflow-y-auto -mr-4 pr-4 space-y-2">
                    {unlinkedPublications.length > 0 ? (
                        unlinkedPublications.map(pub => (
                            <div key={pub.id} className="flex justify-between items-center p-3 rounded-md bg-background-primary/50 hover:bg-background-interactive/30">
                                <div>
                                    <p className="font-semibold text-content-primary truncate">{pub.title}</p>
                                    <p className="text-xs text-content-muted truncate">{pub.authors} ({pub.year})</p>
                                </div>
                                <button onClick={() => handleLink(pub.id)} className="p-2 rounded-md bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors flex-shrink-0 ml-4" title="Link this publication">
                                    <Link size={16} />
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-content-muted pt-8">
                            {searchTerm ? 'No matching publications found.' : 'All publications are already linked.'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LinkPublicationModal;
