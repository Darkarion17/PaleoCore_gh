
import React, { useState, useEffect, useMemo } from 'react';
// FIX: Added CustomProxy to the type import to resolve missing type definition.
import type { Core, Section, Microfossil, PartialMicrofossil, Folder, Publication, CorePublicationLink, SidebarView, ToastType, CustomProxy } from './types';
import CoreSelector from './components/CoreSelector';
import CoreDashboard from './components/CoreDashboard';
import AddCoreModal from './components/AddCoreModal';
import { BarChart3, Microscope, PlusCircle, LogOut, List, Map as MapIcon, Image, Info, Settings, Search, Edit, Trash2, GitCompare } from 'lucide-react';
import Logo from './components/Logo';
import { supabase } from './services/supabaseClient';
import * as coreService from './services/coreService';
import { type Session } from '@supabase/supabase-js';
import AuthPage from './components/AuthPage';
import CoreMap from './components/CoreMap';
import { PROXY_LABELS, COMMON_DATA_KEYS, SAMPLE_DATA, FOSSIL_ASSOCIATED_PROXIES } from './constants';
import ImageAnalysisView from './components/ImageAnalysisView';
import MicropaleontologyTab from './components/MicropaleontologyTab';
import AccountModal from './components/AccountModal';
import ConfirmModal from './components/ConfirmModal';
import AddFossilModal from './components/AddFossilModal';
import Toast from './components/Toast';
import NearbyCoresModal from './components/NearbyCoresModal';
import ShortcutsModal from './components/ShortcutsModal';
import CustomProxiesModal from './components/CustomProxiesModal';
import CommandPalette from './components/CommandPalette';
import type { Command } from './components/CommandPalette';
import ExportWizard from './components/ExportWizard';
import { ToastProvider } from './components/useToast';
import AddPublicationModal from './components/AddPublicationModal';
import CoreComparisonView from './components/CoreComparisonView';


const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [cores, setCores] = useState<Core[]>([]);
  const [allUserSections, setAllUserSections] = useState<Section[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [microfossils, setMicrofossils] = useState<Microfossil[]>([]);
  const [customProxies, setCustomProxies] = useState<CustomProxy[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [corePublicationLinks, setCorePublicationLinks] = useState<CorePublicationLink[]>([]);
  const [selectedCore, setSelectedCore] = useState<Core | null>(null);
  const [isCoreModalOpen, setIsCoreModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isCustomProxiesModalOpen, setIsCustomProxiesModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSavingProxies, setIsSavingProxies] = useState(false);
  const [editingCore, setEditingCore] = useState<Core | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>('list');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [synthesisShortcutTrigger, setSynthesisShortcutTrigger] = useState(0);
  
  const [isFossilModalOpen, setIsFossilModalOpen] = useState(false);
  const [fossilModalData, setFossilModalData] = useState<Microfossil | PartialMicrofossil | null>(null);

  const [isPublicationModalOpen, setIsPublicationModalOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  
  const [toast, setToast] = useState<ToastType | null>(null);

  const [confirmModalState, setConfirmModalState] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {},
  });
  
  const [isNearbyCoresModalOpen, setIsNearbyCoresModalOpen] = useState(false);
  const [coreForNearbySearch, setCoreForNearbySearch] = useState<Core | null>(null);
  
  const [isExportWizardOpen, setIsExportWizardOpen] = useState(false);
  const [folderForExport, setFolderForExport] = useState<Folder | null>(null);
  
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  const addToast = (newToast: Omit<ToastType, 'show'>) => {
    setToast({ ...newToast, show: true });
  };

  useEffect(() => {
    if (selectedCore) {
        setCompareSelection([selectedCore.id]);
    }
  }, [selectedCore]);

  const fossilSpecificProxyLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    microfossils.forEach(fossil => {
        const fossilName = `${fossil.taxonomy.genus.charAt(0)}. ${fossil.taxonomy.species}`;
        FOSSIL_ASSOCIATED_PROXIES.forEach(proxyKey => {
            if (PROXY_LABELS[proxyKey]) {
                const newKey = `${proxyKey}__${fossil.id}`;
                labels[newKey] = `${PROXY_LABELS[proxyKey]} (${fossilName})`;
            }
        });
    });
    return labels;
  }, [microfossils]);


  const mergedProxyLabels = useMemo(() => {
    const customLabels = Object.fromEntries(
        customProxies.map(p => [p.key, p.unit ? `${p.label} (${p.unit})` : p.label])
    );
    
    const fossilProxyLabels: Record<string, string> = {};
    microfossils.forEach(fossil => {
        const name = `${fossil.taxonomy.genus} ${fossil.taxonomy.species}`;
        fossilProxyLabels[`${fossil.id}_count`] = `${name} (Count)`;
        fossilProxyLabels[`${fossil.id}_percentage`] = `${name} (%)`;
    });

    return { ...PROXY_LABELS, ...fossilProxyLabels, ...customLabels, ...fossilSpecificProxyLabels };
  }, [customProxies, microfossils, fossilSpecificProxyLabels]);

  const mergedCommonDataKeys = useMemo(() => {
    const newKeys = { ...COMMON_DATA_KEYS };
    customProxies.forEach(p => {
        newKeys[p.key] = [p.key.toLowerCase(), p.label.toLowerCase()];
    });
    return newKeys;
  }, [customProxies]);

  const handleOpenNearbyCoresModal = (core: Core) => {
    setCoreForNearbySearch(core);
    setIsNearbyCoresModalOpen(true);
  };
  
  const handleSelectForComparison = (coreId: string) => {
      if (compareSelection[0]) {
          setCompareSelection([compareSelection[0], coreId]);
      }
  };

  const handleClearCompare = () => {
    if (compareSelection[0]) {
        setCompareSelection([compareSelection[0]]);
    }
  };

  const handleExportFolder = (folderId: string) => {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
          setFolderForExport(folder);
          setIsExportWizardOpen(true);
      }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_OUT') {
        // Reset state on logout
        setCores([]);
        setFolders([]);
        setAllUserSections([]);
        setPublications([]);
        setCorePublicationLinks([]);
        setSelectedCore(null);
        setInitialDataLoaded(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!session?.user) return;
    try {
        const [coresAndFolders, fetchedSections, { microfossils: fetchedFossils }, publicationsAndLinks] = await Promise.all([
            coreService.fetchFoldersAndCores(session.user.id),
            coreService.fetchAllUserSections(session.user.id),
            coreService.fetchMicrofossils(),
            coreService.fetchPublicationsAndLinks(session.user.id),
        ]);
        const { cores: fetchedCores, folders: fetchedFolders } = coresAndFolders;
        const { publications: fetchedPubs, links: fetchedLinks } = publicationsAndLinks;

        const userCustomProxies = session.user.user_metadata?.custom_proxies || [];
        setCustomProxies(userCustomProxies);

        // Load sample data for new users
        if (fetchedCores.length === 0 && fetchedFolders.length === 0 && !initialDataLoaded) {
            setToast({ message: 'Welcome! Loading some sample data to get you started...', type: 'info', show: true });
            await coreService.loadSampleData(SAMPLE_DATA, session.user.id);
            // Re-fetch after loading sample data
            await fetchData();
            return;
        }

        setFolders(fetchedFolders);
        setCores(fetchedCores);
        setAllUserSections(fetchedSections);
        setMicrofossils(fetchedFossils);
        setPublications(fetchedPubs);
        setCorePublicationLinks(fetchedLinks);
        
        if (!selectedCore && fetchedCores.length > 0) {
            setSelectedCore(fetchedCores[0]);
        } else if (selectedCore) {
            // Ensure selected core is still valid
            const stillExists = fetchedCores.some(c => c.id === selectedCore.id);
            if (!stillExists) {
                setSelectedCore(fetchedCores[0] || null);
            }
        }
        
        setInitialDataLoaded(true);

    } catch (error: any) {
        setToast({ message: `Error fetching data: ${error.message}`, type: 'error', show: true });
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, initialDataLoaded]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? e.metaKey : e.ctrlKey;
        const isInputFocused = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

        if (modKey && e.key === 'k') {
            e.preventDefault();
            setIsCommandPaletteOpen(true);
        }
        if (e.key === 'f' && !isInputFocused) {
            e.preventDefault();
            setIsCommandPaletteOpen(true);
        }
        if (e.key === '?' && !isInputFocused) {
            e.preventDefault();
            setIsShortcutsModalOpen(true);
        }
        if (modKey && e.key === ',') {
            e.preventDefault();
            setIsAccountModalOpen(true);
        }

        // Global shortcuts (only when no modal is open and not typing)
        if (!isInputFocused && !isCoreModalOpen && !isAccountModalOpen && !isShortcutsModalOpen && !isCustomProxiesModalOpen && !isCommandPaletteOpen && !isPublicationModalOpen) {
             if (e.key >= '1' && e.key <= '4') {
                e.preventDefault();
                const views: SidebarView[] = ['list', 'map', 'imageAnalysis', 'wiki'];
                setSidebarView(views[parseInt(e.key) - 1]);
            }
            if (modKey && e.key === 'n') {
                e.preventDefault();
                handleOpenCoreModal(null);
            }
            if (selectedCore) {
                 if (modKey && (e.key === 'Backspace' || e.key === 'Delete')) {
                    e.preventDefault();
                    handleDeleteCore(selectedCore.id);
                 }
                 if (e.key.toLowerCase() === 'e') {
                     e.preventDefault();
                     handleOpenCoreModal(selectedCore);
                 }
            }
            if (e.key.toLowerCase() === 's') {
                e.preventDefault();
                setSynthesisShortcutTrigger(prev => prev + 1);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCore, isCoreModalOpen, isAccountModalOpen, isShortcutsModalOpen, isCustomProxiesModalOpen, isCommandPaletteOpen, isPublicationModalOpen]);

  const handleSaveCore = async (coreToSave: Core) => {
    if (!session?.user) return;
    try {
      await coreService.saveCore(coreToSave, session.user.id, !!editingCore);
      await fetchData();
      setToast({ message: `Core "${coreToSave.id}" saved.`, type: 'success', show: true });
      setIsCoreModalOpen(false);
      setEditingCore(null);
    } catch (error: any) {
      setToast({ message: `Error: ${error.message}`, type: 'error', show: true });
    }
  };
  
  const handleOpenCoreModal = (core: Core | null) => {
      setEditingCore(core);
      setIsCoreModalOpen(true);
  };
  
  const handleDeleteCore = (coreId: string) => {
      const core = cores.find(c => c.id === coreId);
      setConfirmModalState({
          isOpen: true,
          title: `Delete Core ${core?.id}?`,
          message: `Are you sure you want to permanently delete this core and all its associated sections and data? This action cannot be undone.`,
          onConfirm: async () => {
              try {
                  await coreService.deleteCore(coreId);
                  setToast({ message: `Core "${coreId}" deleted.`, type: 'success', show: true });
                  if (selectedCore?.id === coreId) {
                      setSelectedCore(cores.filter(c => c.id !== coreId)[0] || null);
                  }
                  await fetchData();
              } catch (error: any) {
                  setToast({ message: `Error deleting core: ${error.message}`, type: 'error', show: true });
              }
          }
      });
  };

  const handleBulkDelete = (coreIds: Set<string>) => {
    setConfirmModalState({
        isOpen: true,
        title: `Delete ${coreIds.size} Cores?`,
        message: `Are you sure you want to permanently delete ${coreIds.size} cores and all their data? This action cannot be undone.`,
        onConfirm: async () => {
            try {
                await coreService.deleteMultipleCores(Array.from(coreIds));
                setToast({ message: `${coreIds.size} cores deleted.`, type: 'success', show: true });
                if (selectedCore && coreIds.has(selectedCore.id)) {
                    setSelectedCore(cores.filter(c => !coreIds.has(c.id))[0] || null);
                }
                await fetchData();
            } catch (error: any) {
                setToast({ message: `Error deleting cores: ${error.message}`, type: 'error', show: true });
            }
        }
    });
  };

  const handleBulkMove = async (coreIds: Set<string>, folderId: string | null) => {
    try {
        await coreService.moveMultipleCores(Array.from(coreIds), folderId);
        setToast({ message: `${coreIds.size} cores moved.`, type: 'success', show: true });
        await fetchData();
    } catch (error: any) {
        setToast({ message: `Error moving cores: ${error.message}`, type: 'error', show: true });
    }
  };
  
  const handleCreateFolder = async (name: string) => {
    if (!session?.user) return;
    try {
      await coreService.createFolder(name, session.user.id);
      await fetchData();
      setToast({ message: `Folder "${name}" created.`, type: 'success', show: true });
    } catch (error: any) {
      setToast({ message: `Error creating folder: ${error.message}`, type: 'error', show: true });
    }
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    try {
      await coreService.renameFolder(id, newName);
      await fetchData();
      setToast({ message: 'Folder renamed.', type: 'success', show: true });
    } catch (error: any) {
      setToast({ message: `Error renaming folder: ${error.message}`, type: 'error', show: true });
    }
  };

  const handleDeleteFolder = (id: string) => {
      const folder = folders.find(f => f.id === id);
      const coresInFolder = cores.filter(c => c.folder_id === id);
      setConfirmModalState({
          isOpen: true,
          title: `Delete Folder "${folder?.name}"?`,
          message: `Are you sure? The folder will be deleted, and ${coresInFolder.length} core(s) inside will become "unfiled". The cores themselves will not be deleted.`,
          onConfirm: async () => {
              try {
                  await coreService.deleteFolder(id);
                  await fetchData();
                  setToast({ message: `Folder deleted.`, type: 'success', show: true });
              } catch (error: any) {
                  setToast({ message: `Error deleting folder: ${error.message}`, type: 'error', show: true });
              }
          }
      });
  };
  
  const handleMoveCore = async (coreId: string, folderId: string | null) => {
    try {
        await coreService.moveCore(coreId, folderId);
        await fetchData();
    } catch(error: any) {
        setToast({ message: `Error moving core: ${error.message}`, type: 'error', show: true });
    }
  };
  
  const handleSaveFossil = async (fossil: Microfossil) => {
    const isEditing = microfossils.some(f => f.id === fossil.id);
    
    try {
        if (isEditing) {
            const updatedFossil = await coreService.updateFossil(fossil);
            setMicrofossils(prevFossils => 
                prevFossils.map(f => f.id === updatedFossil.id ? updatedFossil : f)
            );
            setToast({ message: 'Fossil updated successfully.', type: 'success', show: true });
        } else {
            const newFossil = await coreService.addFossil(fossil);
            setMicrofossils(prevFossils => [...prevFossils, newFossil].sort((a, b) => a.id.localeCompare(b.id)));
            setToast({ message: 'Fossil added successfully.', type: 'success', show: true });
        }
        setIsFossilModalOpen(false);
        setFossilModalData(null);
    } catch (error: any) {
        setToast({ message: `Error saving fossil: ${error.message}`, type: 'error', show: true });
    }
  };

  const handleEditFossil = (fossil: Microfossil) => {
      setFossilModalData(fossil);
      setIsFossilModalOpen(true);
  };
  
  const handleDeleteFossil = (fossilId: string) => {
      const fossil = microfossils.find(f => f.id === fossilId);
      setConfirmModalState({
          isOpen: true,
          title: `Delete Fossil ${fossil?.id}?`,
          message: 'Are you sure you want to delete this fossil from the database? This cannot be undone.',
          onConfirm: async () => {
              try {
                  await coreService.deleteFossil(fossilId);
                  setMicrofossils(prevFossils => prevFossils.filter(f => f.id !== fossilId));
                  setToast({ message: 'Fossil deleted.', type: 'success', show: true });
              } catch (error: any) {
                  setToast({ message: `Error deleting fossil: ${error.message}`, type: 'error', show: true });
              }
          }
      });
  };

  const handleSaveCustomProxies = async (proxiesToSave: CustomProxy[]) => {
      if (!session?.user) return;
      setIsSavingProxies(true);
      try {
          const { data, error } = await supabase.auth.updateUser({
              data: { custom_proxies: proxiesToSave }
          });
          if (error) throw error;
          if (data.user) {
              setCustomProxies(data.user.user_metadata.custom_proxies || []);
              setToast({ message: 'Custom proxies saved successfully.', type: 'success', show: true });
              setIsCustomProxiesModalOpen(false);
          }
      } catch (error: any) {
          setToast({ message: `Error saving proxies: ${error.message}`, type: 'error', show: true });
      } finally {
          setIsSavingProxies(false);
      }
  };

  const handleOpenPublicationModal = (pub: Publication | null) => {
    setEditingPublication(pub);
    setIsPublicationModalOpen(true);
  };

  const handleSavePublication = async (pubData: Omit<Publication, 'user_id' | 'created_at'>) => {
    if (!session?.user) return;
    const isEditing = !!pubData.id;
    try {
        await coreService.savePublication(pubData, session.user.id, isEditing);
        await fetchData();
        setToast({ message: `Publication saved.`, type: 'success', show: true });
        setIsPublicationModalOpen(false);
        setEditingPublication(null);
    } catch(err: any) {
        setToast({ message: `Error saving publication: ${err.message}`, type: 'error', show: true });
    }
  };

  const handleDeletePublication = (publicationId: string) => {
    const pub = publications.find(p => p.id === publicationId);
    setConfirmModalState({
        isOpen: true,
        title: 'Delete Publication?',
        message: `Are you sure you want to delete "${pub?.title}"? This will also remove all links to cores. This action cannot be undone.`,
        onConfirm: async () => {
            try {
                await coreService.deletePublication(publicationId);
                await fetchData();
                setToast({ message: 'Publication deleted.', type: 'success', show: true });
            } catch(err: any) {
                setToast({ message: `Error deleting publication: ${err.message}`, type: 'error', show: true });
            }
        }
    });
  };

  const handleLinkCoreToPublication = async (coreId: string, publicationId: string) => {
    try {
        await coreService.linkCoreToPublication(coreId, publicationId);
        await fetchData(); // Refetch all data to update links
        setToast({ message: 'Core linked to publication.', type: 'success', show: true });
    } catch(err: any) {
        setToast({ message: `Error linking core: ${err.message}`, type: 'error', show: true });
    }
  };

  const handleUnlinkCoreFromPublication = async (coreId: string, publicationId: string) => {
    try {
        await coreService.unlinkCoreFromPublication(coreId, publicationId);
        await fetchData();
        setToast({ message: 'Core unlinked from publication.', type: 'info', show: true });
    } catch(err: any) {
        setToast({ message: `Error unlinking core: ${err.message}`, type: 'error', show: true });
    }
  };


  const commands: Command[] = useMemo(() => [
      { id: 'add-core', title: 'Add New Core', category: 'Core Actions', icon: <PlusCircle size={18} />, onExecute: () => { handleOpenCoreModal(null); setIsCommandPaletteOpen(false); }, shortcut: ['⌘', 'N'] },
      ...(selectedCore ? [
          { id: 'edit-core', title: `Edit Core: ${selectedCore.id}`, category: 'Core Actions', icon: <Edit size={18} />, onExecute: () => { handleOpenCoreModal(selectedCore); setIsCommandPaletteOpen(false); }, shortcut: ['E'] },
          { id: 'delete-core', title: `Delete Core: ${selectedCore.id}`, category: 'Core Actions', icon: <Trash2 size={18} />, onExecute: () => { handleDeleteCore(selectedCore.id); setIsCommandPaletteOpen(false); }, shortcut: ['⌘', '⌫'] },
      ] : []),
      { id: 'view-list', title: 'Switch to List View', category: 'Navigation', icon: <List size={18} />, onExecute: () => { setSidebarView('list'); setIsCommandPaletteOpen(false); }, shortcut: ['1'] },
      { id: 'view-map', title: 'Switch to Map View', category: 'Navigation', icon: <MapIcon size={18} />, onExecute: () => { setSidebarView('map'); setIsCommandPaletteOpen(false); }, shortcut: ['2'] },
      { id: 'view-image', title: 'Switch to Image Analysis', category: 'Navigation', icon: <Image size={18} />, onExecute: () => { setSidebarView('imageAnalysis'); setIsCommandPaletteOpen(false); }, shortcut: ['3'] },
      { id: 'view-wiki', title: 'Switch to Micropaleontology Wiki', category: 'Navigation', icon: <Microscope size={18} />, onExecute: () => { setSidebarView('wiki'); setIsCommandPaletteOpen(false); }, shortcut: ['4'] },
      { id: 'account', title: 'Account Settings', category: 'Application', icon: <Settings size={18} />, onExecute: () => { setIsAccountModalOpen(true); setIsCommandPaletteOpen(false); }, shortcut: ['⌘', ','] },
      { id: 'shortcuts', title: 'View Keyboard Shortcuts', category: 'Application', icon: <Info size={18} />, onExecute: () => { setIsShortcutsModalOpen(true); setIsCommandPaletteOpen(false); }, shortcut: ['?'] },
      { id: 'logout', title: 'Log Out', category: 'Application', icon: <LogOut size={18} />, onExecute: () => { supabase.auth.signOut(); setIsCommandPaletteOpen(false); } },
  ], [selectedCore]);

  if (!session) {
    return <AuthPage />;
  }
  
    const handleUpdateSectionData = async (updatedSection: Section) => {
     try {
        const newSection = await coreService.updateSection(updatedSection);
        setAllUserSections(prevSections => prevSections.map(s => s.id === newSection.id ? newSection : s));
    } catch(error: any) {
        setToast({ message: `Error updating section: ${error.message}`, type: 'error', show: true });
    }
  };

  const handleMapCoreSelection = (core: Core) => {
    setSelectedCore(core);
    setSidebarView('list');
  };

  const renderMainContent = () => {
    switch (sidebarView) {
        case 'list':
            return selectedCore ? 
                <CoreDashboard 
                  core={selectedCore}
                  allCores={cores}
                  allSections={allUserSections}
                  microfossils={microfossils} 
                  publications={publications}
                  corePublicationLinks={corePublicationLinks}
                  onLinkCoreToPublication={handleLinkCoreToPublication}
                  onUnlinkCoreFromPublication={handleUnlinkCoreFromPublication}
                  onOpenPublicationModal={handleOpenPublicationModal}
                  proxyLabels={mergedProxyLabels}
                  commonDataKeys={mergedCommonDataKeys}
                  onEditCore={handleOpenCoreModal} 
                  onDeleteCore={handleDeleteCore}
                  onGoToMap={() => setSidebarView('map')}
                  setToast={(t) => setToast(t)}
                  onAddFossil={(f) => { setFossilModalData(f); setIsFossilModalOpen(true); }}
                  userEmail={session.user.email || ''}
                  onOpenNearbyCores={handleOpenNearbyCoresModal}
                  synthesisShortcutTrigger={synthesisShortcutTrigger}
                  onOpenCustomProxiesModal={() => setIsCustomProxiesModalOpen(true)}
                  onUpdateSectionData={handleUpdateSectionData}
                  customProxies={customProxies}
                  setConfirmModalState={setConfirmModalState}
                  compareSelection={compareSelection}
                  onClearCompare={handleClearCompare}
                  onSelectForComparison={handleSelectForComparison}
                /> : 
                <div className="flex flex-col items-center justify-center h-full text-content-muted">
                    <BarChart3 size={48} className="mb-4" />
                    <h2 className="text-2xl font-bold text-content-primary">Select a core to begin</h2>
                    <p>Choose a core from the list on the left, or add a new one.</p>
                </div>;
        case 'map':
            return <CoreMap cores={cores} selectedCore={selectedCore} onSelectCore={handleMapCoreSelection} isSidebarOpen={isSidebarExpanded} setToast={setToast} folders={folders} allUserSections={allUserSections} microfossils={microfossils} />;
        case 'imageAnalysis':
            return <ImageAnalysisView onAddFossil={(f) => { setFossilModalData(f); setIsFossilModalOpen(true); }} setToast={setToast} />;
        case 'wiki':
            return <MicropaleontologyTab allFossils={microfossils} onAddFossil={() => { setFossilModalData(null); setIsFossilModalOpen(true); }} onEditFossil={handleEditFossil} onDeleteFossil={handleDeleteFossil} setToast={setToast} />;
        default:
            return null;
    }
  }

  return (
    <ToastProvider value={{ addToast }}>
      <div className="flex h-screen bg-background-primary text-content-primary overflow-hidden">
        <aside 
            className={`bg-background-secondary border-r border-border-primary flex flex-col transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-80' : 'w-20'}`}
            onMouseEnter={() => setIsSidebarExpanded(true)}
            onMouseLeave={() => setIsSidebarExpanded(false)}
        >
          <div className="p-4 border-b border-border-primary flex items-center gap-2 flex-shrink-0">
              <Logo size={28} className="text-accent-primary" />
              {isSidebarExpanded && <span className="font-bold text-xl text-content-primary">PaleoCore</span>}
          </div>
          
          <nav className={`flex items-center border-b border-border-primary flex-shrink-0 ${isSidebarExpanded ? 'p-2 flex-row justify-around' : 'py-2 flex-col space-y-2'}`}>
              {[
                { view: 'list', icon: List, label: 'List' },
                { view: 'map', icon: MapIcon, label: 'Map' },
                { view: 'imageAnalysis', icon: Image, label: 'Image AI' },
                { view: 'wiki', icon: Microscope, label: 'Wiki' },
              ].map(({ view, icon: Icon, label }) => (
                  <button 
                    key={view} 
                    onClick={() => setSidebarView(view as SidebarView)}
                    className={`p-2 rounded-lg transition-colors ${sidebarView === view ? 'bg-accent-primary/20 text-accent-primary' : 'text-content-muted hover:text-content-primary hover:bg-background-tertiary'}`}
                    title={label}
                  >
                      <Icon size={isSidebarExpanded ? 18 : 20} />
                  </button>
              ))}
          </nav>

          <div className={`flex-grow p-3 overflow-hidden transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {isSidebarExpanded && (
              <CoreSelector
                  cores={cores}
                  folders={folders}
                  onSelectCore={setSelectedCore}
                  selectedCoreId={selectedCore?.id}
                  onCreateFolder={handleCreateFolder}
                  onAddCore={() => handleOpenCoreModal(null)}
                  onRenameFolder={handleRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onMoveCore={handleMoveCore}
                  onExportFolder={handleExportFolder}
                  exportingFolderId={folderForExport ? folderForExport.id : null}
                  onBulkDelete={handleBulkDelete}
                  onBulkMove={handleBulkMove}
              />
            )}
          </div>

          <div className="p-3 border-t border-border-primary flex-shrink-0 space-y-2">
              <button onClick={() => setIsAccountModalOpen(true)} className={`w-full flex items-center gap-3 p-2 rounded-md text-sm ${isSidebarExpanded ? 'justify-start' : 'justify-center'} text-content-secondary hover:bg-background-tertiary hover:text-content-primary`}>
                  <Settings size={20} />
                  {isSidebarExpanded && 'Account Settings'}
              </button>
              <button onClick={() => supabase.auth.signOut()} className={`w-full flex items-center gap-3 p-2 rounded-md text-sm ${isSidebarExpanded ? 'justify-start' : 'justify-center'} text-content-secondary hover:bg-background-tertiary hover:text-content-primary`}>
                  <LogOut size={20} />
                  {isSidebarExpanded && 'Log Out'}
              </button>
          </div>
        </aside>

        <main className={`flex-1 ${sidebarView === 'map' ? 'overflow-hidden' : 'p-6 overflow-y-auto'}`}>
          <div className={sidebarView === 'map' ? 'h-full' : 'max-w-7xl mx-auto'}>
              {renderMainContent()}
          </div>
        </main>
        
        {isCoreModalOpen && <AddCoreModal mode="core" onClose={() => { setIsCoreModalOpen(false); setEditingCore(null); }} onSaveCore={handleSaveCore} coreToEdit={editingCore} folders={folders} />}
        {isFossilModalOpen && <AddFossilModal onSaveFossil={handleSaveFossil} onClose={() => { setIsFossilModalOpen(false); setFossilModalData(null); }} fossilData={fossilModalData} />}
        {isPublicationModalOpen && <AddPublicationModal isOpen={isPublicationModalOpen} onClose={() => {setIsPublicationModalOpen(false); setEditingPublication(null);}} onSave={handleSavePublication} publicationToEdit={editingPublication}/>}
        {isAccountModalOpen && <AccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} userEmail={session.user.email || ''} />}
        {isShortcutsModalOpen && <ShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />}
        <ConfirmModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))} {...confirmModalState} />
        {toast?.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {coreForNearbySearch && <NearbyCoresModal isOpen={isNearbyCoresModalOpen} onClose={() => setIsNearbyCoresModalOpen(false)} core={coreForNearbySearch} />}
        {isCustomProxiesModalOpen && <CustomProxiesModal isOpen={isCustomProxiesModalOpen} onClose={() => setIsCustomProxiesModalOpen(false)} initialProxies={customProxies} onSave={handleSaveCustomProxies} isSaving={isSavingProxies} />}
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} commands={commands} />
        {folderForExport && <ExportWizard isOpen={isExportWizardOpen} onClose={() => setIsExportWizardOpen(false)} folder={folderForExport} cores={cores.filter(c => c.folder_id === folderForExport.id)} allSections={allUserSections.filter(s => cores.some(c => c.id === s.core_id && c.folder_id === folderForExport.id))} customProxies={customProxies} />}
      </div>
    </ToastProvider>
  );
};

export default App;
