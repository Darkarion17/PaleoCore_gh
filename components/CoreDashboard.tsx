
import React, { useState, useEffect, useMemo } from 'react';
import type { Core, Section, Microfossil, PartialMicrofossil, DataPoint, CustomProxy, CoreDashboardProps, Publication, CorePublicationLink } from '../types';
import * as coreService from '../services/coreService';
import { supabase } from '../services/supabaseClient';
import { generateFullCoreReport } from '../services/exportService';

import CoreDetails from './CoreDetails';
import DataEntryTab from './DataEntryTab';
import FossilRecordsTab from './FossilRecordsTab';
import { DashboardTab } from './DashboardTab';
import AddCoreModal from './AddCoreModal';
import CoreSynthesisView from './CoreSynthesisView';
import StratigraphicColumn from './StratigraphicColumn';
import ProcessingPipelineTab from './ProcessingPipelineTab';
import AdvancedAnalyticsTab from './AdvancedAnalyticsTab';
import AdvancedChartingTab from './AdvancedChartingTab';
import CountingSheetView from './CountingSheetView';
import CoreComparisonView from './CoreComparisonView';
import ComparisonSelector from './ComparisonSelector';


import { LayoutDashboard, Database, Bug, PlusCircle, Loader2, Pencil, Trash2, FileText, Filter, Blend, BarChartHorizontal, GitMerge, Clock, TestTube, BarChart3 as AnalysisIcon, LineChart, Sheet, Lightbulb, GitCompare } from 'lucide-react';
import { calculateAveragesFromDataPoints } from '../services/coreService';


const CoreDashboard: React.FC<CoreDashboardProps> = ({ core, allCores, allSections, microfossils, publications, corePublicationLinks, onLinkCoreToPublication, onUnlinkCoreFromPublication, onOpenPublicationModal, proxyLabels, commonDataKeys, onEditCore, onDeleteCore, onGoToMap, setToast, onAddFossil, userEmail, onOpenNearbyCores, synthesisShortcutTrigger, onOpenCustomProxiesModal, onUpdateSectionData, customProxies, setConfirmModalState, compareSelection, onClearCompare, onSelectForComparison }) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sections, setSections] = useState<Section[]>([]);
  const [calibratedSections, setCalibratedSections] = useState<Section[] | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [loadingSections, setLoadingSections] = useState(true);
  
  const [epochFilter, setEpochFilter] = useState('all');

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const [isGeneratingFullReport, setIsGeneratingFullReport] = useState(false);
  
  const [hoveredDepth, setHoveredDepth] = useState<number | null>(null);
  

  const availableEpochs = useMemo(() => {
    const epochs = new Set(sections.map(s => s.epoch));
    return ['all', ...Array.from(epochs)];
  }, [sections]);

  const filteredSections = useMemo(() => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const sorted = [...sections].sort((a, b) => collator.compare(a.name, b.name));

    if (epochFilter === 'all') {
      return sorted;
    }
    return sorted.filter(s => s.epoch === epochFilter);
  }, [sections, epochFilter]);

  useEffect(() => {
    if (synthesisShortcutTrigger > 0) {
        setActiveTab('synthesis');
    }
  }, [synthesisShortcutTrigger]);

  useEffect(() => {
    if (selectedSection && !filteredSections.some(s => s.id === selectedSection.id)) {
        setSelectedSection(filteredSections[0] || null);
    }
    if (!selectedSection && filteredSections.length > 0) {
        setSelectedSection(filteredSections[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSections, selectedSection]);


  const fetchSections = async () => {
    setLoadingSections(true);
    setCalibratedSections(null); // Reset synthesis data on re-fetch
    try {
      const fetchedSections = await coreService.fetchSectionsForCore(core.id);
      
      const sectionsWithAverages = fetchedSections.map(section => {
        if (section.dataPoints && section.dataPoints.length > 0) {
          const calculatedAverages = calculateAveragesFromDataPoints(section.dataPoints);
          return { ...section, labAnalysis: calculatedAverages };
        }
        return section;
      });

      setSections(sectionsWithAverages);
      
      const sectionToSelect = editingSection
          ? sectionsWithAverages.find(s => s.id === editingSection.id)
          : selectedSection 
              ? sectionsWithAverages.find(s => s.id === selectedSection.id)
              : null;
      
      setSelectedSection(sectionToSelect || sectionsWithAverages[0] || null);
      
    } catch (error: any) {
      setToast({ message: `Error fetching sections: ${error.message}`, type: 'error', show: true });
    } finally {
      setLoadingSections(false);
      setEditingSection(null);
    }
  };

  useEffect(() => {
    fetchSections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core.id]);
  
  const handleSaveSection = async (sectionToSave: Section) => {
    if (!supabase.auth.getSession()) return;
    const isEditing = sections.some(s => s.id === sectionToSave.id);

    try {
        const savedSection = await coreService.saveSection(sectionToSave, isEditing);
        if (isEditing) {
          setEditingSection(savedSection);
        }
        await fetchSections();
        setToast({ message: `Section "${savedSection.name}" saved.`, type: 'success', show: true });
        setIsSectionModalOpen(false);
    } catch (error: any) {
        setToast({ message: `Error: ${error.message}`, type: 'error', show: true });
    }
  };
  
  const handleDeleteSection = (sectionId: string) => {
      const section = sections.find(s => s.id === sectionId);
      setConfirmModalState({
          isOpen: true,
          title: `Delete Section ${section?.name}?`,
          message: `Are you sure you want to permanently delete this section and all its data? This action cannot be undone.`,
          onConfirm: async () => {
              try {
                  await coreService.deleteSection(sectionId);
                  setToast({ message: `Section "${section?.name}" deleted.`, type: 'success', show: true });
                  await fetchSections();
              } catch (error: any) {
                  setToast({ message: `Error deleting section: ${error.message}`, type: 'error', show: true });
              }
          }
      });
  };
  
  const handleUpdateSectionDataWrapper = async (updatedSection: Section) => {
    onUpdateSectionData(updatedSection);
    setSections(prev => prev.map(s => s.id === updatedSection.id ? updatedSection : s));
    if (selectedSection?.id === updatedSection.id) {
        setSelectedSection(updatedSection);
    }
  };

  const handleGenerateFullReport = async () => {
    if (sections.length === 0) {
        setToast({ message: 'Core has no sections to generate a report.', type: 'info', show: true });
        return;
    }
    setIsGeneratingFullReport(true);
    setToast({ message: 'Generating Full Core Report with Nano Banana...', type: 'info', show: true });
    try {
      await generateFullCoreReport(
          core, 
          sections, 
          microfossils, 
          userEmail, 
          proxyLabels,
          publications,
          corePublicationLinks
      );
    } catch (e: any) {
      console.error("Error generating full report:", e);
      setToast({ message: `Failed to generate full core report: ${e.message}`, type: 'error', show: true });
    } finally {
      setIsGeneratingFullReport(false);
    }
  };
  
  const TabButton: React.FC<{tabName: Tab, icon: React.ReactNode, label: string, disabled?: boolean}> = ({tabName, icon, label, disabled = false}) => (
      <button
          onClick={() => setActiveTab(tabName)}
          disabled={disabled || (tabName !== 'synthesis' && tabName !== 'countingSheet' && tabName !== 'comparison' && !selectedSection)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-all duration-200
              ${activeTab === tabName && !disabled
                  ? 'border-accent-primary text-accent-primary-hover bg-background-tertiary' 
                  : 'border-transparent text-content-muted hover:text-content-primary hover:bg-background-tertiary/50 disabled:text-content-muted/50 disabled:cursor-not-allowed disabled:hover:bg-transparent'}`
          }
          aria-current={activeTab === tabName}
          title={`${label}`}
      >
          {icon}
          {label}
      </button>
  );

  type Tab = 'dashboard' | 'charting' | 'data_entry' | 'fossils' | 'countingSheet' | 'processing' | 'synthesis' | 'comparison' | 'analysis';
  
  const renderContent = () => {
    if (loadingSections) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-content-muted">
                <Loader2 size={48} className="mb-4 animate-spin" />
            </div>
        )
    }
    if (!selectedSection && !['synthesis', 'countingSheet', 'comparison'].includes(activeTab)) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-content-muted bg-background-tertiary/20 rounded-xl border-2 border-dashed border-border-primary">
                <FileText size={48} className="mb-4" />
                <h3 className="text-xl font-semibold text-content-primary">No Section Available</h3>
                <p>{sections.length > 0 ? 'Select a different epoch filter to see more sections.' : 'This core has no sections. Add one to get started.'}</p>
            </div>
        );
    }
    
    switch (activeTab) {
      case 'dashboard':
        return selectedSection ? <DashboardTab core={core} section={selectedSection} microfossils={microfossils} proxyLabels={proxyLabels} onUpdateSection={handleUpdateSectionDataWrapper} userEmail={userEmail} hoveredDepth={hoveredDepth} setHoveredDepth={setHoveredDepth} /> : null;
      case 'charting':
        if (!selectedSection) return null;
        const sectionForCharting = calibratedSections?.find(s => s.id === selectedSection.id) || selectedSection;
        return <AdvancedChartingTab section={sectionForCharting} proxyLabels={proxyLabels} setToast={setToast} />;
      case 'data_entry':
        return selectedSection ? <DataEntryTab section={selectedSection} microfossils={microfossils} onUpdateSection={handleUpdateSectionDataWrapper} proxyLabels={proxyLabels} commonDataKeys={commonDataKeys} onOpenCustomProxiesModal={onOpenCustomProxiesModal} customProxies={customProxies} setConfirmModalState={setConfirmModalState} /> : null;
      case 'fossils':
        return selectedSection ? <FossilRecordsTab section={selectedSection} microfossils={microfossils} onUpdateSection={handleUpdateSectionDataWrapper} /> : null;
      case 'countingSheet':
        return <CountingSheetView sections={filteredSections} allFossils={microfossils} onUpdateSection={handleUpdateSectionDataWrapper} />;
      case 'processing':
        return selectedSection ? <ProcessingPipelineTab section={selectedSection} onUpdateSection={handleUpdateSectionDataWrapper} proxyLabels={proxyLabels} /> : null;
      case 'synthesis':
        return <CoreSynthesisView 
                  sections={sections} 
                  calibratedSections={calibratedSections} 
                  setToast={setToast}
                  onCaptureChart={() => {}} 
                  isChartCaptured={false} 
                  proxyLabels={proxyLabels}
               />;
      case 'comparison':
        if (compareSelection.length === 2) {
            return <CoreComparisonView
                coreIds={compareSelection}
                allSections={allSections}
                cores={allCores}
                proxyLabels={proxyLabels}
                onClearCompare={onClearCompare}
                onUpdateSectionData={onUpdateSectionData}
            />;
        } else {
            return <ComparisonSelector 
                      currentCore={core} 
                      otherCores={allCores.filter(c => c.id !== core.id)}
                      onSelectCore={onSelectForComparison}
                   />
        }
      case 'analysis':
        return selectedSection ? <AdvancedAnalyticsTab section={selectedSection} allCoreSections={sections} microfossils={microfossils} proxyLabels={proxyLabels} /> : null;
      default:
        return null;
    }
  }

  const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8 disabled:cursor-not-allowed disabled:bg-background-tertiary disabled:text-content-muted/50";
  const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;
  
  return (
    <div className="space-y-6">
      <CoreDetails 
        core={core} 
        publications={publications}
        corePublicationLinks={corePublicationLinks}
        onEdit={onEditCore} 
        onDelete={onDeleteCore} 
        onGoToMap={onGoToMap}
        onGenerateFullReport={handleGenerateFullReport}
        isGeneratingFullReport={isGeneratingFullReport}
        onOpenNearbyCores={() => onOpenNearbyCores(core)}
        onLinkCoreToPublication={onLinkCoreToPublication}
        onUnlinkCoreFromPublication={onUnlinkCoreFromPublication}
        onOpenPublicationModal={onOpenPublicationModal}
      />

      <div className="p-4 bg-background-tertiary/50 rounded-xl shadow-lg border border-border-primary/50">
          <StratigraphicColumn sections={filteredSections} microfossils={microfossils} hoveredDepth={hoveredDepth} setHoveredDepth={setHoveredDepth} />
      </div>
      
      <div className="p-6 bg-background-tertiary/50 rounded-xl shadow-lg border border-border-primary/50">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-content-primary">Sections ({filteredSections.length})</h3>
            <div className="flex items-center gap-2">
                <button onClick={() => { setEditingSection(null); setIsSectionModalOpen(true); }} className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors text-sm font-semibold">
                    <PlusCircle size={16}/> Add New Section
                </button>
                {selectedSection && 
                  <>
                    <button onClick={() => { setEditingSection(selectedSection); setIsSectionModalOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-interactive text-content-secondary hover:bg-background-interactive-hover hover:text-content-primary transition-colors text-sm font-semibold">
                        <Pencil size={14}/> Edit Section
                    </button>
                    <button onClick={() => handleDeleteSection(selectedSection.id)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-danger-primary/20 text-danger-primary hover:bg-danger-primary/30 transition-colors text-sm font-semibold">
                        <Trash2 size={14}/> Delete Section
                    </button>
                  </>
                }
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="md:col-span-1 flex items-center gap-2">
                <Filter size={14} className="text-content-muted flex-shrink-0"/>
                <select value={epochFilter} onChange={e => setEpochFilter(e.target.value)} className={selectClass} style={{backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}>
                  {availableEpochs.map(e => <option key={e} value={e}>{e === 'all' ? `All Epochs (${sections.length})` : e}</option>)}
                </select>
            </div>
            <div className="md:col-span-3">
                {loadingSections ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-content-muted" /></div>
                ) : filteredSections.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {filteredSections.map(s => (
                            <button 
                                key={s.id} 
                                onClick={() => setSelectedSection(s)}
                                className={`px-3 py-2 rounded-md transition-colors text-sm ${selectedSection?.id === s.id ? 'bg-accent-primary text-accent-primary-text' : 'text-content-secondary bg-background-interactive hover:bg-background-interactive-hover'}`}
                            >
                                <p className="font-semibold">{s.name}</p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-center text-content-muted py-4">No sections match filter.</p>
                )}
            </div>
        </div>
      </div>

      <div className="space-y-6">
            <div className="bg-background-tertiary/50 rounded-xl shadow-lg border border-border-primary/50">
                <nav className="flex items-center border-b border-border-primary flex-wrap -mb-px px-4">
                    <TabButton tabName="dashboard" icon={<LayoutDashboard size={16}/>} label="Dashboard"/>
                    <TabButton tabName="charting" icon={<LineChart size={16}/>} label="Charting"/>
                    <TabButton tabName="data_entry" icon={<Database size={16}/>} label="Data Entry"/>
                    <TabButton tabName="fossils" icon={<Bug size={16}/>} label="Fossils"/>
                    <TabButton tabName="countingSheet" icon={<Sheet size={16}/>} label="Counting"/>
                    <TabButton tabName="synthesis" icon={<Blend size={16}/>} label="Synthesis"/>
                    <TabButton tabName="comparison" icon={<GitCompare size={16} />} label="Comparison" />
                    <TabButton tabName="processing" icon={<TestTube size={16}/>} label="Processing" disabled={!selectedSection}/>
                    <TabButton tabName="analysis" icon={<AnalysisIcon size={16}/>} label="Analytics" disabled={!selectedSection}/>
                </nav>
                 <div className="p-6">
                     {renderContent()}
                 </div>
            </div>
      </div>
      
      {isSectionModalOpen && 
        <AddCoreModal 
            mode="section" 
            onClose={() => {setIsSectionModalOpen(false); setEditingSection(null);}} 
            parentCoreId={core.id}
            onSaveSection={handleSaveSection}
            sectionToEdit={editingSection}
            microfossils={microfossils}
            onAddFossil={onAddFossil}
        />}
    </div>
  );
};

export default CoreDashboard;
