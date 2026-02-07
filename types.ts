
import type { Dispatch, SetStateAction } from 'react';

export type DataPoint = {
  subsection?: string;
  [key: string]: string | number | boolean | null | undefined;
  depth?: number;
  age?: number;
  qcFlag?: 0 | 1 | 2; // 0: OK, 1: Suspect, 2: Exclude
};

export interface Taxonomy {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
}

export interface EcologicalData {
    temperatureRange: string;
    depthHabitat: string;
    notes: string;
}

export interface Microfossil {
    id: string;
    taxonomy: Taxonomy;
    description: string;
    stratigraphicRange: string;
    ecology: EcologicalData;
    imageUrl: string;
}

export type PartialMicrofossil = Partial<Omit<Microfossil, 'taxonomy' | 'ecology'>> & {
  taxonomy?: Partial<Taxonomy>;
  ecology?: Partial<EcologicalData>;
};

export type FossilAbundance = 'Abundant' | 'Common' | 'Few' | 'Rare' | 'Barren' | 'Present';
export type FossilPreservation = 'Good' | 'Moderate' | 'Poor';

export interface SectionFossilRecord {
    fossilId: string;
    abundance: FossilAbundance;
    preservation: FossilPreservation;
    observations: string;
    count?: number;
    percentage?: number;
}

export interface LabAnalysis {
  delta18O?: number | null;
  delta13C?: number | null;
  mgCaRatio?: number | null;
  tex86?: number | null;
  alkenoneSST?: number | null;
  calculatedSST?: number | null;
  baCa?: number | null;
  srCa?: number | null;
  cdCa?: number | null;
  radiocarbonDate?: number | null;
}

export type CoreLocation = {
  lat: number;
  lon: number;
};

export interface PipelineStep {
    type: 'movingAverage';
    window: number;
}

export interface ProcessingPipeline {
    id: string;
    name: string;
    sourceProxy: string;
    steps: PipelineStep[];
}

export interface Core {
  id: string;
  name: string;
  location: CoreLocation;
  waterDepth: number;
  project: string;
  user_id?: string;
  folder_id?: string;
  createdAt?: string;
}

export interface Section {
  id:string;
  core_id: string;
  name: string;
  sectionDepth: number;
  sampleInterval?: number;
  recoveryDate: string;
  collectionTime?: string;
  epoch: string;
  geologicalPeriod: 'Glacial' | 'Interglacial' | 'Indeterminate';
  ageRange: string;
  dataPoints: DataPoint[];
  microfossilRecords: SectionFossilRecord[];
  labAnalysis?: LabAnalysis;
  summary?: string;
  sectionImage: string;
  collector?: string;
  lithology?: string;
  munsellColor?: string;
  grainSize?: string;
  tephraLayers?: string;
  paleomagneticReversals?: string;
  createdAt?: string;
  ageModel?: {
      tiePoints: TiePoint[];
  };
  pipelines?: ProcessingPipeline[];
}

export interface Folder {
    id: string;
    name: string;
    user_id: string;
    created_at: string;
}

export interface Source {
    uri: string;
    title: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    sources?: Source[];
}

export type SidebarView = 'list' | 'map' | 'imageAnalysis' | 'wiki';

export interface TiePoint {
    id: string;
    sectionId: string;
    depth: number;
    age: number;
}

export interface SpliceInterval {
    sectionId: string;
    startAge: number | null;
    endAge: number | null;
}

export interface NearbyCore {
    studyName: string;
    lat: number;
    lon: number;
    waterDepth: number | null;
    investigators: string;
    dataUrl: string;
}

export type SampleSection = Omit<Section, 'id' | 'core_id' | 'createdAt'>;
export type SampleCore = Omit<Core, 'user_id' | 'folder_id' | 'createdAt'> & { sections: SampleSection[] };

export interface CustomProxy {
  key: string;
  label: string;
  unit: string;
}

export interface Publication {
  id: string;
  user_id: string;
  doi: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  abstract?: string;
  link?: string;
  created_at: string;
}

export interface CorePublicationLink {
    core_id: string;
    publication_id: string;
}

export interface CoreDashboardProps {
  core: Core;
  allCores: Core[];
  allSections: Section[];
  microfossils: Microfossil[];
  publications: Publication[];
  corePublicationLinks: CorePublicationLink[];
  onLinkCoreToPublication: (coreId: string, publicationId: string) => void;
  onUnlinkCoreFromPublication: (coreId: string, publicationId: string) => void;
  onOpenPublicationModal: (publication: Publication | null) => void;
  proxyLabels: Record<string, string>;
  commonDataKeys: Record<string, string[]>;
  onEditCore: (core: Core) => void;
  onDeleteCore: (coreId: string) => void;
  onGoToMap: () => void;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info'; show: boolean; }) => void;
  onAddFossil: (fossil: PartialMicrofossil) => void;
  userEmail: string;
  onOpenNearbyCores: (core: Core) => void;
  synthesisShortcutTrigger: number;
  onOpenCustomProxiesModal: () => void;
  onUpdateSectionData: (section: Section) => void;
  customProxies: CustomProxy[];
  compareSelection: string[];
  onClearCompare: () => void;
  onSelectForComparison: (coreId: string) => void;
  setConfirmModalState: Dispatch<SetStateAction<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>>;
}

export type MapInteractionMode = 'pan' | 'draw-rect' | 'draw-poly';

export interface IdentifiedFossil {
    speciesName: string;
    confidenceScore: number;
    sourceImageUrl: string;
    analysis: {
        matchingFeatures: string[];
        distinguishingFeatures: string[];
    };
}

export interface FeedbackCorrection {
    incorrectSpecies: string;
    correctSpecies: string;
}

export interface ReinforcementFeedback {
    correctSpecies: string;
    image: {
        base64Data: string;
        mimeType: string;
    };
}

export interface PaleoEvent {
    eventName: string;
    startAge: number;
    endAge: number;
}

export type ToastType = {
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
};
export type useToastType = { addToast: (toast: Omit<ToastType, 'show'>) => void };
