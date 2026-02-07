
import React, { useState, useEffect } from 'react';
import type { Publication } from '../types';
import { X, Save, Wand2, Loader2 } from 'lucide-react';

interface AddPublicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (publication: Omit<Publication, 'id' | 'user_id' | 'created_at'> & { id?: string }) => void;
    publicationToEdit: Publication | null;
}

const InputField: React.FC<{ id: string, label: string, type: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean, placeholder?: string }> = 
({ id, label, type, value, onChange, required = false, placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-content-secondary mb-1">{label}</label>
        <input
            type={type}
            id={id}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className="w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
        />
    </div>
);

const AddPublicationModal: React.FC<AddPublicationModalProps> = ({ isOpen, onClose, onSave, publicationToEdit }) => {
    const [title, setTitle] = useState('');
    const [authors, setAuthors] = useState('');
    const [journal, setJournal] = useState('');
    const [year, setYear] = useState<string>('');
    const [doi, setDoi] = useState('');
    const [link, setLink] = useState('');
    const [abstract, setAbstract] = useState('');
    
    const [isFetchingDoi, setIsFetchingDoi] = useState(false);
    const [doiError, setDoiError] = useState<string | null>(null);

    const isEditMode = !!publicationToEdit;

    useEffect(() => {
        if (isOpen) {
            setTitle(publicationToEdit?.title || '');
            setAuthors(publicationToEdit?.authors || '');
            setJournal(publicationToEdit?.journal || '');
            setYear(publicationToEdit?.year.toString() || '');
            setDoi(publicationToEdit?.doi || '');
            setLink(publicationToEdit?.link || '');
            setAbstract(publicationToEdit?.abstract || '');
            setDoiError(null);
        }
    }, [isOpen, publicationToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const publicationData = {
            id: publicationToEdit?.id,
            title,
            authors,
            journal,
            year: parseInt(year, 10),
            doi,
            link,
            abstract
        };
        onSave(publicationData);
    };
    
    const handleFetchDoi = async () => {
        if (!doi.trim()) return;
        setIsFetchingDoi(true);
        setDoiError(null);
    
        // 1. Try CrossRef
        try {
            const crossrefResponse = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi.trim())}`);
            if (crossrefResponse.ok) {
                const data = await crossrefResponse.json();
                const item = data.message;
    
                if (item.title && item.title.length > 0) setTitle(item.title[0]);
                if (item.author && Array.isArray(item.author) && item.author.length > 0) {
                    const firstAuthor = item.author[0];
                    let authorString = `${firstAuthor.family}${firstAuthor.given ? `, ${firstAuthor.given.charAt(0)}.` : ''}`;
                    if (item.author.length > 1) {
                        authorString += ' et al.';
                    }
                    setAuthors(authorString);
                }
                if (item['container-title'] && item['container-title'].length > 0) setJournal(item['container-title'][0]);
                if (item.published && item.published['date-parts'] && item.published['date-parts'][0]) {
                    setYear(item.published['date-parts'][0][0].toString());
                }
                if (item.URL) setLink(item.URL);
                if (item.abstract) {
                     const abstractElement = document.createElement('div');
                     abstractElement.innerHTML = item.abstract;
                     setAbstract(abstractElement.textContent || abstractElement.innerText || "");
                }
    
                setIsFetchingDoi(false);
                return;
            }
        } catch (e) {
            console.warn("CrossRef fetch failed, trying DataCite.", e);
        }
    
        // 2. Try DataCite if CrossRef fails
        try {
            const dataciteResponse = await fetch(`https://api.datacite.org/dois/${encodeURIComponent(doi.trim())}`);
            if (dataciteResponse.ok) {
                const data = await dataciteResponse.json();
                const attrs = data.data.attributes;
    
                if (attrs.titles && attrs.titles.length > 0) setTitle(attrs.titles[0].title);
                if (attrs.creators && Array.isArray(attrs.creators) && attrs.creators.length > 0) {
                    const firstCreator = attrs.creators[0];
                    let authorString = '';
                    if (firstCreator.name) {
                        authorString = firstCreator.name.split(',')[0].trim();
                    } else if (firstCreator.familyName) {
                        authorString = `${firstCreator.familyName}${firstCreator.givenName ? `, ${firstCreator.givenName.charAt(0)}.` : ''}`;
                    }
                    
                    if(attrs.creators.length > 1) {
                        authorString += ' et al.';
                    }
                    setAuthors(authorString);
                }
                if (attrs.container?.title) setJournal(attrs.container.title);
                if (attrs.publicationYear) setYear(attrs.publicationYear.toString());
                if (attrs.url) setLink(attrs.url);
                if (attrs.descriptions && attrs.descriptions.length > 0) {
                     const abstractData = attrs.descriptions.find((d: any) => d.descriptionType === 'Abstract');
                     if (abstractData) setAbstract(abstractData.description);
                }
    
                setIsFetchingDoi(false);
                return;
            }
            // If DataCite also fails
            throw new Error('Publication not found on CrossRef or DataCite.');
    
        } catch (error: any) {
            setDoiError(error.message || 'Failed to fetch DOI data from all sources.');
        } finally {
            setIsFetchingDoi(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={onClose}>
            <div className="bg-background-tertiary rounded-xl shadow-2xl p-8 w-full max-w-2xl border border-border-primary m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-content-primary">{isEditMode ? 'Edit Publication' : 'Add New Publication'}</h2>
                    <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputField id="title" label="Title" type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                    <InputField id="authors" label="Authors" type="text" value={authors} onChange={e => setAuthors(e.target.value)} required placeholder="e.g., Shackleton, N.J., Imbrie, J., Hall, M.A."/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField id="journal" label="Journal" type="text" value={journal} onChange={e => setJournal(e.target.value)} required />
                        <InputField id="year" label="Year" type="number" value={year} onChange={e => setYear(e.target.value)} required />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="doi" className="block text-sm font-medium text-content-secondary mb-1">DOI</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="doi"
                                    value={doi}
                                    onChange={e => setDoi(e.target.value)}
                                    required
                                    placeholder="e.g., 10.1029/PA001004"
                                    className="w-full bg-background-interactive border border-border-secondary rounded-lg p-2 pr-28 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                                />
                                <button
                                    type="button"
                                    onClick={handleFetchDoi}
                                    disabled={isFetchingDoi || !doi.trim()}
                                    className="absolute inset-y-0 right-0 flex items-center gap-1.5 px-3 m-1 rounded-md text-xs font-semibold bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isFetchingDoi ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                    {isFetchingDoi ? 'Fetching...' : 'Autofill'}
                                </button>
                            </div>
                            {doiError && <p className="text-xs text-danger-primary mt-1">{doiError}</p>}
                        </div>
                        <InputField id="link" label="Link (URL)" type="url" value={link} onChange={e => setLink(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="abstract" className="block text-sm font-medium text-content-secondary mb-1">Abstract</label>
                        <textarea
                            id="abstract"
                            value={abstract}
                            onChange={e => setAbstract(e.target.value)}
                            rows={5}
                            className="w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                        />
                    </div>
                     <div className="flex justify-end gap-4 pt-6">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-background-interactive text-content-primary hover:bg-background-interactive-hover transition">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-accent-primary text-accent-primary-text font-semibold hover:bg-accent-primary-hover transition flex items-center gap-2">
                           <Save size={18} />
                           {isEditMode ? 'Save Changes' : 'Save Publication'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPublicationModal;
