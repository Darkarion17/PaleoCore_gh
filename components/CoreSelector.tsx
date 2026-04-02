import React, { useState, useMemo } from 'react';
import type { Core, Folder } from '../types';
import { MapPin, Folder as FolderIcon, FolderPlus, Trash2, Edit, Check, X, ChevronDown, ChevronRight, Search, Download, Loader2, Square, CheckSquare, GitCompare, LayoutGrid, XCircle, PlusCircle, MoreVertical, FolderOpen, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CoreSelectorProps {
  cores: Core[];
  folders: Folder[];
  onSelectCore: (core: Core) => void;
  selectedCoreId?: string | null;
  filterFolderId?: string | null; // New prop to filter by folder
  onCreateFolder: (name: string) => void;
  onAddCore: () => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveCore: (coreId: string, folderId: string | null) => void;
  onExportFolder: (folderId: string) => void;
  exportingFolderId: string | null;
  onBulkDelete: (coreIds: Set<string>) => void;
  onBulkMove: (coreIds: Set<string>, folderId: string | null) => void;
  onGoToExplorer?: () => void; // New prop to navigate back to explorer
}

const CoreItem: React.FC<{
    core: Core;
    onSelectCore: (core: Core) => void;
    onToggleBulkSelect: (coreId: string) => void;
    isSelected: boolean;
    isBulkSelected: boolean;
    onDragStart: (e: React.DragEvent<HTMLLIElement>, coreId: string) => void;
    isBulkMode: boolean;
}> = ({ core, onSelectCore, onToggleBulkSelect, isSelected, isBulkSelected, onDragStart, isBulkMode }) => {
    
    const handleClick = () => {
        if (isBulkMode) {
            onToggleBulkSelect(core.id);
        } else {
            onSelectCore(core);
        }
    };
    
    const getClassName = () => {
        if (isBulkSelected) return 'bg-accent-primary/30 text-content-primary';
        if (isSelected && !isBulkMode) return 'bg-background-interactive text-content-primary';
        return 'text-content-secondary hover:bg-background-tertiary hover:text-content-primary';
    };

    return (
        <motion.li
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            draggable={!isBulkMode}
            onDragStart={(e) => onDragStart(e, core.id)}
            onClick={handleClick}
            className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-3 group relative border border-transparent ${getClassName()}`}
            title={isBulkMode ? "Click to select/deselect" : "Click to view"}
            whileHover={{ scale: 1.01, x: 2 }}
            whileTap={{ scale: 0.98 }}
        >
            {isBulkMode ? (
                <div className="flex-shrink-0">
                    {isBulkSelected ? <CheckSquare size={18} className="text-accent-primary" /> : <Square size={18} className="text-content-muted" />}
                </div>
            ) : (
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-accent-primary/20 text-accent-primary' : 'bg-background-tertiary text-content-muted group-hover:bg-accent-primary/10 group-hover:text-accent-primary'} transition-colors`}>
                    <FileText size={16} />
                </div>
            )}
            
            <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm truncate">{core.id}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background-tertiary text-content-muted uppercase tracking-wider">{core.project}</span>
                </div>
                <p className="text-xs text-content-muted truncate mt-0.5">{core.name}</p>
                <div className="flex items-center mt-1.5 text-[10px] text-content-muted/70 font-medium">
                    <MapPin size={10} className="mr-1"/>
                    <span>{core.location.lat.toFixed(2)}°, {core.location.lon.toFixed(2)}°</span>
                </div>
            </div>

            {!isBulkMode && isSelected && (
                <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 w-1 h-6 bg-accent-primary rounded-r-full"
                />
            )}
        </motion.li>
    );
};

const FolderItem: React.FC<{
    folder: Folder;
    children: React.ReactNode;
    onRename: (id: string, newName: string) => void;
    onDelete: (id: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, folderId: string) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onExport: (folderId: string) => void;
    isExporting: boolean;
}> = ({ folder, children, onRename, onDelete, onDrop, onDragOver, onDragLeave, onExport, isExporting }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(folder.name);

    const handleRename = () => {
        if (name.trim() && name !== folder.name) {
            onRename(folder.id, name.trim());
        }
        setIsEditing(false);
    };

    return (
        <div className="mb-2">
            <div 
                onDrop={(e) => onDrop(e, folder.id)}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className="flex items-center justify-between p-2 rounded-xl group drop-target hover:bg-background-tertiary/30 transition-colors"
            >
                <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-3 text-content-secondary hover:text-content-primary flex-grow text-left">
                    <div className="p-1 rounded-md bg-background-tertiary text-content-muted group-hover:text-accent-primary transition-colors">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    {isExpanded ? <FolderOpen size={18} className="text-accent-primary" /> : <FolderIcon size={18} className="text-accent-primary" />}
                    {isEditing ? (
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            className="bg-background-tertiary text-sm px-2 py-1 rounded-lg outline-none ring-2 ring-accent-primary w-full max-w-[150px]"
                            autoFocus
                        />
                    ) : (
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">{folder.name}</span>
                            <span className="text-[10px] text-content-muted uppercase tracking-tighter">Folder</span>
                        </div>
                    )}
                </button>
                {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => onExport(folder.id)} disabled={isExporting} className="p-1.5 rounded-lg text-content-muted hover:text-accent-primary hover:bg-accent-primary/10 disabled:cursor-wait transition-colors" title="Export folder to ODV format">
                           {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        </button>
                        <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-background-tertiary transition-colors"><Edit size={14} /></button>
                        <button onClick={() => onDelete(folder.id)} className="p-1.5 rounded-lg text-content-muted hover:text-danger-primary hover:bg-danger-primary/10 transition-colors"><Trash2 size={14} /></button>
                    </div>
                )}
            </div>
            <AnimatePresence>
                {isExpanded && (
                    <motion.ul 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="pl-4 border-l-2 border-border-primary/50 ml-4.5 space-y-1.5 py-2 overflow-hidden"
                    >
                        {children}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};


const CoreSelector: React.FC<CoreSelectorProps> = ({ cores, folders, onSelectCore, selectedCoreId, filterFolderId, onCreateFolder, onAddCore, onRenameFolder, onDeleteFolder, onMoveCore, onExportFolder, exportingFolderId, onBulkDelete, onBulkMove, onGoToExplorer }) => {
    const [newFolderName, setNewFolderName] = useState('');
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [bulkSelectedCoreIds, setBulkSelectedCoreIds] = useState<Set<string>>(new Set());

    const isFiltered = filterFolderId !== undefined;
    const folderName = isFiltered ? (folders.find(f => f.id === filterFolderId)?.name || 'Unfiled') : null;

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            onCreateFolder(newFolderName.trim());
            setNewFolderName('');
            setIsAddingFolder(false);
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, coreId: string) => {
        e.dataTransfer.setData("application/vnd.paleocore.core", coreId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDrop = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        const coreId = e.dataTransfer.getData("application/vnd.paleocore.core");
        if (coreId) {
            onMoveCore(coreId, folderId);
        }
        (e.currentTarget as HTMLElement).classList.remove('drop-target-active');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.add('drop-target-active');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).classList.remove('drop-target-active');
    };

    const { visibleFolders, visibleUnfiledCores, filteredCoresInFolder } = useMemo(() => {
        const term = searchTerm.toLowerCase();
        
        if (isFiltered) {
            const coresInFolder = cores.filter(c => c.folder_id === filterFolderId);
            const filtered = term 
                ? coresInFolder.filter(c => 
                    c.id.toLowerCase().includes(term) || 
                    c.name.toLowerCase().includes(term) ||
                    c.project.toLowerCase().includes(term)
                  )
                : coresInFolder;
            return { visibleFolders: [], visibleUnfiledCores: [], filteredCoresInFolder: filtered };
        }

        if (!term) {
            return {
                visibleFolders: folders,
                visibleUnfiledCores: cores.filter(c => !c.folder_id),
                filteredCoresInFolder: []
            };
        }

        const matchingCoreIds = new Set(
            cores.filter(c => 
                c.id.toLowerCase().includes(term) || 
                c.name.toLowerCase().includes(term) ||
                c.project.toLowerCase().includes(term)
            ).map(c => c.id)
        );

        const visibleFolders = folders.filter(f => {
            if (f.name.toLowerCase().includes(term)) return true;
            return cores.some(c => c.folder_id === f.id && matchingCoreIds.has(c.id));
        });

        const visibleUnfiledCores = cores.filter(c => !c.folder_id && matchingCoreIds.has(c.id));

        return { visibleFolders, visibleUnfiledCores, filteredCoresInFolder: [] };

    }, [searchTerm, cores, folders, isFiltered, filterFolderId]);
    
    const getCoresForFolder = (folderId: string) => {
        const term = searchTerm.toLowerCase();
        const coresInFolder = cores.filter(c => c.folder_id === folderId);

        if (!term) return coresInFolder;

        const folderNameMatches = folders.find(f => f.id === folderId)?.name.toLowerCase().includes(term);
        if (folderNameMatches) return coresInFolder;

        return coresInFolder.filter(c => 
            c.id.toLowerCase().includes(term) ||
            c.name.toLowerCase().includes(term) ||
            c.project.toLowerCase().includes(term)
        );
    }
    
    const handleToggleBulkSelectMode = () => {
        setIsBulkSelectMode(prev => !prev);
        setBulkSelectedCoreIds(new Set());
    };

    const handleToggleBulkSelect = (coreId: string) => {
        setBulkSelectedCoreIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(coreId)) {
                newSet.delete(coreId);
            } else {
                newSet.add(coreId);
            }
            return newSet;
        });
    };

    const handleClearSelection = () => {
        setBulkSelectedCoreIds(new Set());
    };

    const handleSelectAllVisible = () => {
        const allVisibleIds = new Set(
            isFiltered 
                ? filteredCoresInFolder.map(c => c.id)
                : [
                    ...visibleUnfiledCores.map(c => c.id),
                    ...visibleFolders.flatMap(f => getCoresForFolder(f.id).map(c => c.id))
                  ]
        );
        setBulkSelectedCoreIds(allVisibleIds);
    };

    const handleBulkMove = (folderId: string | null) => {
        if (bulkSelectedCoreIds.size > 0) {
            onBulkMove(bulkSelectedCoreIds, folderId);
            setIsBulkSelectMode(false);
            setBulkSelectedCoreIds(new Set());
        }
    };

    const handleBulkDelete = () => {
        if (bulkSelectedCoreIds.size > 0) {
            onBulkDelete(bulkSelectedCoreIds);
            setIsBulkSelectMode(false);
            setBulkSelectedCoreIds(new Set());
        }
    };
    
    React.useEffect(() => {
      // Exit bulk select mode if the user starts searching
      if (searchTerm) {
        setIsBulkSelectMode(false);
        setBulkSelectedCoreIds(new Set());
      }
    }, [searchTerm])

    return (
        <div className="h-full flex flex-col relative">
             <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
                <input
                    id="global-search-input"
                    type="text"
                    placeholder={isFiltered ? `Search in ${folderName}...` : "Search cores..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-background-tertiary border border-border-secondary rounded-lg py-2 pl-10 pr-4 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                />
            </div>

            <div className="flex-grow overflow-y-auto -mr-2 pr-2 space-y-4 pt-4 custom-scrollbar">
                {isFiltered ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <FolderOpen size={14} className="text-accent-primary" />
                                <h4 className="text-[10px] font-black uppercase text-content-muted tracking-widest truncate max-w-[120px]">{folderName}</h4>
                            </div>
                            <button 
                                onClick={onGoToExplorer}
                                className="text-[10px] font-black uppercase tracking-tighter text-accent-primary hover:underline"
                            >
                                Change Core
                            </button>
                        </div>
                        <ul className="space-y-1.5">
                            {filteredCoresInFolder.map(core => (
                                <CoreItem key={core.id} core={core} onSelectCore={onSelectCore} isSelected={selectedCoreId === core.id} onDragStart={handleDragStart} onToggleBulkSelect={handleToggleBulkSelect} isBulkSelected={bulkSelectedCoreIds.has(core.id)} isBulkMode={isBulkSelectMode} />
                            ))}
                        </ul>
                        {filteredCoresInFolder.length === 0 && (
                            <div className="text-center py-6 px-4 border-2 border-dashed border-border-primary/30 rounded-xl">
                                <p className="text-[10px] text-content-muted uppercase font-bold">No cores found</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <AnimatePresence mode="popLayout">
                            {visibleFolders.map(folder => (
                                <FolderItem 
                                    key={folder.id} 
                                    folder={folder}
                                    onRename={onRenameFolder}
                                    onDelete={onDeleteFolder}
                                    onDrop={(e) => handleDrop(e, folder.id)}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onExport={onExportFolder}
                                    isExporting={exportingFolderId === folder.id}
                                >
                                    {getCoresForFolder(folder.id).map(core => (
                                        <CoreItem key={core.id} core={core} onSelectCore={onSelectCore} isSelected={selectedCoreId === core.id} onDragStart={handleDragStart} onToggleBulkSelect={handleToggleBulkSelect} isBulkSelected={bulkSelectedCoreIds.has(core.id)} isBulkMode={isBulkSelectMode} />
                                    ))}
                                </FolderItem>
                            ))}
                        </AnimatePresence>

                        <div 
                            onDrop={(e) => handleDrop(e, null)}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className="pt-2 drop-target rounded-xl border border-transparent transition-colors"
                        >
                            <div className="flex items-center justify-between px-2 mb-2">
                                <h4 className="text-[10px] font-black uppercase text-content-muted tracking-widest">Unfiled Cores</h4>
                                <span className="text-[10px] font-bold text-content-muted bg-background-tertiary px-1.5 py-0.5 rounded-full">{visibleUnfiledCores.length}</span>
                            </div>
                            {visibleUnfiledCores.length > 0 ? (
                                <ul className="space-y-1.5">
                                    {visibleUnfiledCores.map(core => (
                                        <CoreItem key={core.id} core={core} onSelectCore={onSelectCore} isSelected={selectedCoreId === core.id} onDragStart={handleDragStart} onToggleBulkSelect={handleToggleBulkSelect} isBulkSelected={bulkSelectedCoreIds.has(core.id)} isBulkMode={isBulkSelectMode} />
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-6 px-4 border-2 border-dashed border-border-primary/30 rounded-xl">
                                    <p className="text-[10px] text-content-muted uppercase font-bold">
                                       {searchTerm ? 'No matching cores' : 'Drag cores here'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {!isFiltered && (
                    <div className="mt-6 pt-4 border-t border-border-primary/50">
                        {isAddingFolder ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 bg-background-tertiary p-2 rounded-xl ring-2 ring-accent-primary/30"
                            >
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Folder name..."
                                    className="bg-transparent text-sm p-1 w-full outline-none font-bold"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                />
                                <div className="flex items-center gap-1">
                                    <button onClick={handleCreateFolder} className="p-1.5 rounded-lg bg-success-primary/20 text-success-primary hover:bg-success-primary hover:text-white transition-all"><Check size={14} /></button>
                                    <button onClick={() => setIsAddingFolder(false)} className="p-1.5 rounded-lg bg-danger-primary/20 text-danger-primary hover:bg-danger-primary hover:text-white transition-all"><X size={14} /></button>
                                </div>
                            </motion.div>
                        ) : (
                             <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => setIsAddingFolder(true)} 
                                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-background-tertiary hover:bg-accent-primary/10 text-content-muted hover:text-accent-primary transition-all border border-transparent hover:border-accent-primary/20 group"
                                >
                                    <FolderPlus size={20} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-tighter">New Folder</span>
                                </button>
                                <button 
                                    onClick={onAddCore} 
                                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-background-tertiary hover:bg-accent-primary/10 text-content-muted hover:text-accent-primary transition-all border border-transparent hover:border-accent-primary/20 group"
                                >
                                    <PlusCircle size={20} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-tighter">New Core</span>
                                </button>
                                
                                <button
                                    onClick={handleToggleBulkSelectMode}
                                    className={`col-span-2 mt-2 flex items-center justify-center gap-2 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isBulkSelectMode ? 'bg-danger-primary text-white shadow-lg shadow-danger-primary/20' : 'bg-background-tertiary text-content-muted hover:bg-background-interactive hover:text-content-primary'}`}
                                >
                                    {isBulkSelectMode ? <><XCircle size={14}/> Cancel Selection</> : <><CheckSquare size={14} /> Bulk Actions</>}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {isBulkSelectMode && (
                <div className="absolute top-[52px] right-0 left-0 bg-background-tertiary p-2 border-y border-border-primary flex items-center justify-between text-xs z-10">
                    <button onClick={handleSelectAllVisible} className="font-semibold text-accent-primary hover:underline">Select All Visible</button>
                    <button onClick={handleClearSelection} disabled={bulkSelectedCoreIds.size === 0} className="font-semibold text-accent-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed">Clear Selection</button>
                </div>
            )}

            {isBulkSelectMode && bulkSelectedCoreIds.size > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-background-secondary p-3 border-t-2 border-accent-primary shadow-lg rounded-t-lg animate-fade-in-fast flex items-center justify-between z-10">
                    <p className="text-sm font-bold text-content-primary">{bulkSelectedCoreIds.size} selected</p>
                    <div className="flex items-center gap-2">
                         <select
                            onChange={(e) => handleBulkMove(e.target.value === '__UNFILED__' ? null : e.target.value)}
                            className="bg-background-interactive border border-border-secondary rounded-md p-1.5 text-xs text-content-primary focus:ring-1 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-6"
                            style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.2rem center', backgroundSize: '1.2em 1.2em'}}
                            defaultValue=""
                          >
                            <option value="" disabled>Move to...</option>
                            <option value="__UNFILED__">Unfiled</option>
                            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        <button onClick={handleBulkDelete} className="p-2 rounded-md bg-danger-primary/20 text-danger-primary hover:bg-danger-primary/30" title="Delete Selected">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CoreSelector;