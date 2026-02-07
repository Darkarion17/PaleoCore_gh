import React, { useState, useMemo } from 'react';
import type { Core, Folder } from '../types';
import { MapPin, Folder as FolderIcon, FolderPlus, Trash2, Edit, Check, X, ChevronDown, ChevronRight, Search, Download, Loader2, Square, CheckSquare, GitCompare, LayoutGrid, XCircle, PlusCircle } from 'lucide-react';

interface CoreSelectorProps {
  cores: Core[];
  folders: Folder[];
  onSelectCore: (core: Core) => void;
  selectedCoreId?: string | null;
  onCreateFolder: (name: string) => void;
  onAddCore: () => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveCore: (coreId: string, folderId: string | null) => void;
  onExportFolder: (folderId: string) => void;
  exportingFolderId: string | null;
  onBulkDelete: (coreIds: Set<string>) => void;
  onBulkMove: (coreIds: Set<string>, folderId: string | null) => void;
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
        <li
            draggable={!isBulkMode}
            onDragStart={(e) => onDragStart(e, core.id)}
            onClick={handleClick}
            className={`w-full text-left p-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-3 group relative ${getClassName()}`}
            title={isBulkMode ? "Click to select/deselect" : "Click to view"}
        >
            {isBulkMode && (isBulkSelected ? <CheckSquare size={18} className="text-accent-primary flex-shrink-0" /> : <Square size={18} className="text-content-muted flex-shrink-0" />)}
            
            <div className="flex-grow">
                <h3 className="font-bold text-sm">{core.id}</h3>
                <p className="text-xs text-content-muted truncate">{core.name}</p>
                <div className="flex items-center mt-1 text-xs text-content-muted">
                    <MapPin size={12} className="mr-1.5"/>
                    <span>{core.location.lat.toFixed(2)}°, {core.location.lon.toFixed(2)}°</span>
                </div>
            </div>

        </li>
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
        <div>
            <div 
                onDrop={(e) => onDrop(e, folder.id)}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className="flex items-center justify-between p-2 rounded-md group drop-target"
            >
                <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 text-content-secondary hover:text-content-primary flex-grow text-left">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <FolderIcon size={18} className="text-accent-primary" />
                    {isEditing ? (
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            className="bg-background-tertiary text-sm p-0.5 rounded-sm outline-none ring-1 ring-accent-primary"
                            autoFocus
                        />
                    ) : (
                        <span className="font-semibold text-sm">{folder.name}</span>
                    )}
                </button>
                {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onExport(folder.id)} disabled={isExporting} className="p-1 text-content-muted hover:text-accent-primary disabled:cursor-wait" title="Export folder to ODV format">
                           {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        </button>
                        <button onClick={() => setIsEditing(true)} className="p-1 text-content-muted hover:text-content-primary"><Edit size={14} /></button>
                        <button onClick={() => onDelete(folder.id)} className="p-1 text-content-muted hover:text-danger-primary"><Trash2 size={14} /></button>
                    </div>
                )}
            </div>
            {isExpanded && <ul className="pl-6 border-l border-border-primary ml-3 space-y-1 py-1">{children}</ul>}
        </div>
    );
};


const CoreSelector: React.FC<CoreSelectorProps> = ({ cores, folders, onSelectCore, selectedCoreId, onCreateFolder, onAddCore, onRenameFolder, onDeleteFolder, onMoveCore, onExportFolder, exportingFolderId, onBulkDelete, onBulkMove }) => {
    const [newFolderName, setNewFolderName] = useState('');
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [bulkSelectedCoreIds, setBulkSelectedCoreIds] = useState<Set<string>>(new Set());

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

    const { visibleFolders, visibleUnfiledCores } = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (!term) {
            return {
                visibleFolders: folders,
                visibleUnfiledCores: cores.filter(c => !c.folder_id)
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

        return { visibleFolders, visibleUnfiledCores };

    }, [searchTerm, cores, folders]);
    
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
        const allVisibleIds = new Set([
            ...visibleUnfiledCores.map(c => c.id),
            ...visibleFolders.flatMap(f => getCoresForFolder(f.id).map(c => c.id))
        ]);
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
                    placeholder="Search cores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-background-tertiary border border-border-secondary rounded-lg py-2 pl-10 pr-4 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                />
            </div>

            <div className="flex-grow overflow-y-auto -mr-2 pr-2 space-y-3 pt-3">
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

                <div 
                    onDrop={(e) => handleDrop(e, null)}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className="pt-2 drop-target rounded-md"
                >
                    <h4 className="text-xs font-semibold uppercase text-content-muted px-2 mb-1">Unfiled</h4>
                    {visibleUnfiledCores.length > 0 ? (
                        <ul className="space-y-1">
                            {visibleUnfiledCores.map(core => (
                                <CoreItem key={core.id} core={core} onSelectCore={onSelectCore} isSelected={selectedCoreId === core.id} onDragStart={handleDragStart} onToggleBulkSelect={handleToggleBulkSelect} isBulkSelected={bulkSelectedCoreIds.has(core.id)} isBulkMode={isBulkSelectMode} />
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-content-muted px-2">
                           {searchTerm ? 'No matching unfiled cores.' : 'Drag cores here to unfile them.'}
                        </p>
                    )}
                </div>

                <div className="mt-4 pt-2 border-t border-border-primary">
                    {isAddingFolder ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New folder name..."
                                className="bg-background-tertiary text-sm p-1 rounded-sm w-full outline-none ring-1 ring-accent-primary"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            />
                            <button onClick={handleCreateFolder} className="p-1 text-success-primary hover:text-white"><Check size={16} /></button>
                            <button onClick={() => setIsAddingFolder(false)} className="p-1 text-danger-primary hover:text-white"><X size={16} /></button>
                        </div>
                    ) : (
                         <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <button onClick={() => setIsAddingFolder(true)} className="flex items-center gap-2 text-sm text-content-muted hover:text-accent-primary p-1 rounded-md w-full text-left">
                                    <FolderPlus size={16} />
                                    <span>Create Folder</span>
                                </button>
                                <button onClick={onAddCore} className="flex items-center gap-2 text-sm text-content-muted hover:text-accent-primary p-1 rounded-md w-full text-left">
                                    <PlusCircle size={16} />
                                    <span>Create Core</span>
                                </button>
                            </div>
                             <button
                                onClick={handleToggleBulkSelectMode}
                                title={isBulkSelectMode ? 'Cancel Selection' : 'Select Multiple Cores'}
                                className={`p-2 rounded-md transition-colors flex-shrink-0 self-end ${isBulkSelectMode ? 'bg-danger-primary/20 text-danger-primary hover:bg-danger-primary/30' : 'text-content-muted hover:bg-background-tertiary hover:text-accent-primary'}`}
                            >
                                {isBulkSelectMode ? <X size={16}/> : <CheckSquare size={16} />}
                            </button>
                        </div>
                    )}
                </div>
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