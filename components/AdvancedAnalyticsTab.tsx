import React, { useState } from 'react';
import type { Section, Microfossil } from '../types';
import { AreaChart, GitCommit, SlidersHorizontal, GitMerge } from 'lucide-react';
import SpectralAnalysis from './SpectralAnalysis';
import CrossCorrelationAnalysis from './CrossCorrelationAnalysis';
import PcaAnalysis from './PcaAnalysis';
import ProxyCorrelationAnalysis from './ProxyCorrelationAnalysis';

interface AdvancedAnalyticsTabProps {
    section: Section;
    allCoreSections: Section[];
    microfossils: Microfossil[];
    proxyLabels: Record<string, string>;
}

type AnalysisView = 'spectral' | 'cross-correlation' | 'pca' | 'proxy-correlation';

const AdvancedAnalyticsTab: React.FC<AdvancedAnalyticsTabProps> = ({ section, allCoreSections, microfossils, proxyLabels }) => {
    const [activeView, setActiveView] = useState<AnalysisView>('spectral');

    const TabButton: React.FC<{ view: AnalysisView; label: string; icon: React.ReactNode }> = ({ view, label, icon }) => (
        <button
            onClick={() => setActiveView(view)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-all duration-200 ${
                activeView === view
                    ? 'border-accent-primary text-accent-primary-hover bg-background-tertiary'
                    : 'border-transparent text-content-muted hover:text-content-primary hover:bg-background-tertiary/50'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    const renderView = () => {
        switch (activeView) {
            case 'spectral':
                return <SpectralAnalysis section={section} proxyLabels={proxyLabels} />;
            case 'cross-correlation':
                return <CrossCorrelationAnalysis section={section} proxyLabels={proxyLabels} />;
            case 'pca':
                return <PcaAnalysis section={section} microfossils={microfossils} />;
            case 'proxy-correlation':
                return <ProxyCorrelationAnalysis allCoreSections={allCoreSections} proxyLabels={proxyLabels} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
                <nav className="flex items-center border-b border-border-primary mb-6 -mx-6 px-6">
                    <TabButton view="spectral" label="Spectral Analysis" icon={<AreaChart size={16} />} />
                    <TabButton view="cross-correlation" label="Cross-Correlation" icon={<GitCommit size={16} />} />
                    <TabButton view="pca" label="PCA Analysis" icon={<SlidersHorizontal size={16} />} />
                    <TabButton view="proxy-correlation" label="Proxy Correlation" icon={<GitMerge size={16} />} />
                </nav>
                <div className="animate-fade-in">
                    {renderView()}
                </div>
            </div>
        </div>
    );
};

export default AdvancedAnalyticsTab;