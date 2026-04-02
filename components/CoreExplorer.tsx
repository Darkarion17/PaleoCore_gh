import React, { useState, useMemo } from 'react';
import { Database, Folder as FolderIcon, FolderPlus, Search, PlusCircle, LayoutGrid, List, MapPin, ChevronRight, ChevronDown, MoreVertical, Trash2, Edit, Download, Loader2, CheckSquare, Square, XCircle, FileText, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Core, Folder } from '../types';

interface CoreExplorerProps {
  cores: Core[];
  folders: Folder[];
  onSelectCore: (core: Core) => void;
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

const CoreExplorer: React.FC<CoreExplorerProps> = ({
  cores,
  folders,
  onSelectCore,
  onCreateFolder,
  onAddCore,
  onRenameFolder,
  onDeleteFolder,
  onMoveCore,
  onExportFolder,
  exportingFolderId,
  onBulkDelete,
  onBulkMove
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(folders.map(f => f.id)));
  const [bulkSelectedCoreIds, setBulkSelectedCoreIds] = useState<Set<string>>(new Set());
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedFolders(newExpanded);
  };

  const filteredCores = useMemo(() => {
    return cores.filter(c => 
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.project.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cores, searchTerm]);

  const filteredFolders = useMemo(() => {
    if (!searchTerm) return folders;
    return folders.filter(f => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cores.some(c => c.folder_id === f.id && (
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  }, [folders, cores, searchTerm]);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  const handleToggleBulkSelect = (coreId: string) => {
    const newSelected = new Set(bulkSelectedCoreIds);
    if (newSelected.has(coreId)) newSelected.delete(coreId);
    else newSelected.add(coreId);
    setBulkSelectedCoreIds(newSelected);
  };

  const handleDragStart = (e: React.DragEvent, coreId: string) => {
    e.dataTransfer.setData('coreId', coreId);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const coreId = e.dataTransfer.getData('coreId');
    if (coreId) {
      onMoveCore(coreId, folderId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-accent-primary/10');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-accent-primary/10');
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-content-primary flex items-center gap-3">
            <Database size={32} className="text-accent-primary" />
            Core Explorer
          </h1>
          <p className="text-content-muted font-medium">Browse and organize your research collection.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
            <input
              type="text"
              placeholder="Search cores, projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-background-secondary border border-border-primary/50 rounded-2xl text-sm focus:ring-2 focus:ring-accent-primary/30 focus:outline-none w-64 transition-all"
            />
          </div>
          <div className="flex bg-background-secondary p-1 rounded-xl border border-border-primary/50">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent-primary text-white shadow-sm' : 'text-content-muted hover:text-content-primary'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-accent-primary text-white shadow-sm' : 'text-content-muted hover:text-content-primary'}`}
            >
              <List size={18} />
            </button>
          </div>
          <button 
            onClick={onAddCore}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:shadow-lg transition-all"
          >
            <PlusCircle size={18} />
            New Core
          </button>
        </div>
      </header>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {filteredFolders.map(folder => (
            <motion.section 
              key={folder.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div 
                onDrop={(e) => handleDrop(e, folder.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className="flex items-center justify-between p-4 rounded-3xl bg-background-secondary/50 border border-border-primary/30 group transition-all"
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleFolder(folder.id)}
                    className="p-2 rounded-xl bg-background-tertiary text-content-muted hover:text-accent-primary transition-all"
                  >
                    {expandedFolders.has(folder.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  <div className="p-3 rounded-2xl bg-accent-primary/10 text-accent-primary">
                    {expandedFolders.has(folder.id) ? <FolderOpen size={24} /> : <FolderIcon size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-content-primary">{folder.name}</h2>
                    <p className="text-xs font-bold text-content-muted uppercase tracking-widest">
                      {cores.filter(c => c.folder_id === folder.id).length} Cores
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <button 
                    onClick={() => onExportFolder(folder.id)}
                    className="p-2 rounded-xl text-content-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all"
                    title="Export Folder"
                  >
                    {exportingFolderId === folder.id ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                  </button>
                  <button className="p-2 rounded-xl text-content-muted hover:text-content-primary hover:bg-background-tertiary transition-all">
                    <Edit size={20} />
                  </button>
                  <button 
                    onClick={() => onDeleteFolder(folder.id)}
                    className="p-2 rounded-xl text-content-muted hover:text-danger-primary hover:bg-danger-primary/10 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedFolders.has(folder.id) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                      {filteredCores.filter(c => c.folder_id === folder.id).map(core => (
                        <CoreCard 
                          key={core.id} 
                          core={core} 
                          onClick={() => onSelectCore(core)} 
                          onDragStart={handleDragStart}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          ))}
        </AnimatePresence>

        <section className="space-y-4">
          <div 
            onDrop={(e) => handleDrop(e, null)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className="flex items-center justify-between p-4 rounded-3xl bg-background-secondary/30 border border-dashed border-border-primary/50"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-background-tertiary text-content-muted">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-content-primary">Unfiled Cores</h2>
                <p className="text-xs font-bold text-content-muted uppercase tracking-widest">
                  {cores.filter(c => !c.folder_id).length} Cores
                </p>
              </div>
            </div>
          </div>

          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {filteredCores.filter(c => !c.folder_id).map(core => (
              <CoreCard 
                key={core.id} 
                core={core} 
                onClick={() => onSelectCore(core)} 
                onDragStart={handleDragStart}
                viewMode={viewMode}
              />
            ))}
          </div>
        </section>

        <div className="pt-8 border-t border-border-primary/50 flex justify-center">
          {isAddingFolder ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 bg-background-secondary p-3 rounded-3xl border border-accent-primary/30 shadow-xl"
            >
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="bg-transparent px-4 py-2 outline-none font-bold text-content-primary"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <button 
                onClick={handleCreateFolder}
                className="p-2 rounded-2xl bg-accent-primary text-white hover:shadow-lg transition-all"
              >
                <PlusCircle size={20} />
              </button>
              <button 
                onClick={() => setIsAddingFolder(false)}
                className="p-2 rounded-2xl bg-background-tertiary text-content-muted hover:text-content-primary transition-all"
              >
                <XCircle size={20} />
              </button>
            </motion.div>
          ) : (
            <button 
              onClick={() => setIsAddingFolder(true)}
              className="flex items-center gap-3 px-8 py-4 rounded-[2.5rem] bg-background-secondary border border-border-primary hover:border-accent-primary/30 hover:shadow-xl transition-all group"
            >
              <FolderPlus size={24} className="text-accent-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-black uppercase tracking-widest text-content-primary">Create New Folder</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface CoreCardProps {
  core: Core;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  viewMode: 'grid' | 'list';
}

const CoreCard: React.FC<CoreCardProps> = ({ core, onClick, onDragStart, viewMode }) => {
  if (viewMode === 'list') {
    return (
      <motion.button
        layout
        draggable
        onDragStart={(e) => onDragStart(e, core.id)}
        onClick={onClick}
        className="flex items-center gap-6 p-4 rounded-2xl bg-background-secondary border border-border-primary/50 hover:border-accent-primary/30 hover:shadow-md transition-all group text-left"
      >
        <div className="p-2 rounded-xl bg-background-tertiary text-content-muted group-hover:text-accent-primary transition-colors">
          <FileText size={20} />
        </div>
        <div className="flex-grow grid grid-cols-4 gap-4 items-center">
          <div className="col-span-1">
            <h3 className="font-black text-content-primary truncate">{core.id}</h3>
            <span className="text-[10px] font-bold text-accent-primary uppercase tracking-widest">{core.project}</span>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-content-muted truncate">{core.name}</p>
          </div>
          <div className="col-span-1 flex items-center gap-2 text-[10px] font-bold text-content-muted uppercase">
            <MapPin size={12} />
            <span>{core.location.lat.toFixed(1)}°, {core.location.lon.toFixed(1)}°</span>
          </div>
        </div>
        <ChevronRight size={18} className="text-content-muted opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
      </motion.button>
    );
  }

  return (
    <motion.button
      layout
      draggable
      onDragStart={(e) => onDragStart(e, core.id)}
      onClick={onClick}
      className="flex flex-col gap-4 p-6 rounded-[2rem] bg-background-secondary border border-border-primary/50 hover:border-accent-primary/30 hover:shadow-xl transition-all group text-left relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <MoreVertical size={16} className="text-content-muted" />
      </div>
      <div className="p-3 rounded-2xl bg-background-tertiary text-content-muted group-hover:text-accent-primary transition-colors w-fit">
        <FileText size={24} />
      </div>
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-accent-primary">{core.project}</span>
        <h3 className="text-lg font-black text-content-primary truncate mt-1">{core.id}</h3>
        <p className="text-xs text-content-muted truncate">{core.name}</p>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-content-muted uppercase">
        <MapPin size={12} />
        <span>{core.location.lat.toFixed(2)}°, {core.location.lon.toFixed(2)}°</span>
      </div>
    </motion.button>
  );
};

export default CoreExplorer;
