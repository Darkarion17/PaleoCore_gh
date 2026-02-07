import React, { useState, useMemo, useEffect } from 'react';
import type { Core, Folder, Microfossil, Section } from '../types';
import { Filter, X, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { REGIONS } from '../constants';

interface InteractiveMapFiltersProps {
    cores: Core[];
    folders: Folder[];
    allUserSections: Section[];
    microfossils: Microfossil[];
    onFilterChange: (filteredCoreIds: string[] | null) => void;
}

const FilterSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-t border-white/20">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left text-xs font-bold uppercase text-white/80 hover:text-white p-2">
                <span>{title}</span>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isOpen && <div className="p-2 pt-0 space-y-2">{children}</div>}
        </div>
    );
};


const MapFilters: React.FC<InteractiveMapFiltersProps> = ({ cores, folders, allUserSections, microfossils, onFilterChange }) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState<string>(''); // '' for all
    const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>(''); // '' for all
    const [selectedFossilIds, setSelectedFossilIds] = useState<Set<string>>(new Set());
    const [fossilSearchTerm, setFossilSearchTerm] = useState('');


    const handleClearFilters = () => {
        setSelectedFolderId('');
        setSelectedRegionFilter('');
        setSelectedFossilIds(new Set());
        setFossilSearchTerm('');
    };

    const handleFossilToggle = (fossilId: string) => {
        setSelectedFossilIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fossilId)) {
                newSet.delete(fossilId);
            } else {
                newSet.add(fossilId);
            }
            return newSet;
        });
    };

    useEffect(() => {
        let filteredCores = [...cores];

        // 1. Folder filter
        if (selectedFolderId) {
            if (selectedFolderId === '__UNFILED__') {
                filteredCores = filteredCores.filter(c => !c.folder_id);
            } else {
                filteredCores = filteredCores.filter(c => c.folder_id === selectedFolderId);
            }
        }
        
        // 2. Region filter
        if (selectedRegionFilter && REGIONS[selectedRegionFilter]) {
            const { minLon, maxLon, minLat, maxLat } = REGIONS[selectedRegionFilter];
            filteredCores = filteredCores.filter(core => {
                const { lat, lon } = core.location;
                const latCheck = lat >= minLat && lat <= maxLat;
                let lonCheck;
                if (minLon > maxLon) { // Crosses antimeridian (e.g., Pacific)
                    lonCheck = lon >= minLon || lon <= maxLon;
                } else {
                    lonCheck = lon >= minLon && lon <= maxLon;
                }
                return latCheck && lonCheck;
            });
        }

        // 3. Fossil filter
        if (selectedFossilIds.size > 0) {
            const coreIdsWithFossils = new Set<string>();
            for (const section of allUserSections) {
                if (coreIdsWithFossils.has(section.core_id)) continue;
                for (const record of section.microfossilRecords) {
                    if (selectedFossilIds.has(record.fossilId)) {
                        coreIdsWithFossils.add(section.core_id);
                        break;
                    }
                }
            }
            filteredCores = filteredCores.filter(c => coreIdsWithFossils.has(c.id));
        }

        const finalIds = filteredCores.map(c => c.id);
        const noFiltersApplied = !selectedFolderId && !selectedRegionFilter && selectedFossilIds.size === 0;
        onFilterChange(noFiltersApplied ? null : finalIds);

    }, [selectedFolderId, selectedRegionFilter, selectedFossilIds, cores, allUserSections, onFilterChange]);

    const filteredFossils = useMemo(() => {
        const term = fossilSearchTerm.toLowerCase();
        if (!term) return microfossils;
        return microfossils.filter(f => `${f.taxonomy.genus} ${f.taxonomy.species}`.toLowerCase().includes(term));
    }, [microfossils, fossilSearchTerm]);

    return (
        <div className="absolute top-4 right-4 z-10">
            <button onClick={() => setIsPanelOpen(p => !p)} className="p-3 bg-[#242e42] rounded-lg shadow-lg text-white hover:bg-[#323f59] transition-colors">
                <Filter size={20} />
            </button>
            {isPanelOpen && (
                <div className="mt-2 w-72 bg-[#242e42]/95 backdrop-blur-sm rounded-lg shadow-lg border border-[#323f59] flex flex-col max-h-[70vh]">
                    <div className="p-2 flex justify-between items-center border-b border-white/20 flex-shrink-0">
                        <h3 className="text-md font-bold text-white">Map Filters</h3>
                        <button onClick={handleClearFilters} className="text-xs font-semibold text-white/90 hover:underline">Clear All</button>
                    </div>
                    <div className="overflow-y-auto">
                        <FilterSection title="Region">
                             <select
                                value={selectedRegionFilter}
                                onChange={e => setSelectedRegionFilter(e.target.value)}
                                className="w-full bg-black/20 border border-white/20 rounded-md p-2 text-xs text-white placeholder-white/60 focus:ring-1 focus:ring-white focus:outline-none transition"
                            >
                                <option value="">All Regions</option>
                                {Object.keys(REGIONS).map(regionName => (
                                    <option key={regionName} value={regionName}>{regionName}</option>
                                ))}
                            </select>
                        </FilterSection>
                        <FilterSection title="Folders">
                            <select
                                value={selectedFolderId}
                                onChange={e => setSelectedFolderId(e.target.value)}
                                className="w-full bg-black/20 border border-white/20 rounded-md p-2 text-xs text-white placeholder-white/60 focus:ring-1 focus:ring-white focus:outline-none transition"
                            >
                                <option value="">All Folders</option>
                                <option value="__UNFILED__">Unfiled</option>
                                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </FilterSection>
                        <FilterSection title="Microfossils" defaultOpen>
                            <div className="relative mb-2">
                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/60" />
                                <input
                                    type="text"
                                    placeholder="Search species..."
                                    value={fossilSearchTerm}
                                    onChange={e => setFossilSearchTerm(e.target.value)}
                                    className="w-full bg-black/20 border border-white/20 rounded-md py-1 pl-7 pr-2 text-xs text-white placeholder-white/60 focus:ring-1 focus:ring-white focus:outline-none"
                                />
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                {filteredFossils.map(fossil => (
                                    <label key={fossil.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-black/20 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFossilIds.has(fossil.id)}
                                            onChange={() => handleFossilToggle(fossil.id)}
                                            className="h-4 w-4 rounded border-white/30 bg-black/20 text-accent-secondary focus:ring-white focus:ring-2"
                                        />
                                        <span className="text-white italic text-xs">{fossil.taxonomy.genus} {fossil.taxonomy.species}</span>
                                    </label>
                                ))}
                            </div>
                        </FilterSection>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapFilters;