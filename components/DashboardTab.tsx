

import React, { useState, useMemo, useEffect } from 'react';
import type { Core, Section, Microfossil } from '../types';
import PaleoAiAssistant from './PaleoAiAssistant';
import SingleSectionChart from './SingleSectionChart';
import { FileText, Save, Info } from 'lucide-react';
import { useToast } from './useToast';

interface DashboardTabProps {
  core: Core;
  section: Section;
  microfossils: Microfossil[];
  proxyLabels: Record<string, string>;
  onUpdateSection: (updatedSection: Section) => void;
  userEmail: string;
  hoveredDepth: number | null;
  setHoveredDepth: (depth: number | null) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ core, section, microfossils, proxyLabels, onUpdateSection, userEmail, hoveredDepth, setHoveredDepth }) => {
  const [editedSummary, setEditedSummary] = useState(section.summary || '');
  const [activeProxy, setActiveProxy] = useState<string>('delta18O');
  const { addToast } = useToast();

  useEffect(() => {
      setEditedSummary(section.summary || '');
  }, [section.summary, section.id]);

  const handleSaveSummary = () => {
    onUpdateSection({ ...section, summary: editedSummary });
    addToast({ message: 'Summary saved.', type: 'success' });
  };

  const isSummaryDirty = editedSummary !== (section.summary || '');

  const availableProxies = useMemo(() => {
    const proxies = new Set<string>();
    section.dataPoints.forEach(dp => {
      Object.keys(dp).forEach(key => {
        if (typeof dp[key] === 'number' && key !== 'depth' && key !== 'age' && key !== 'subsection' && key !== 'qcFlag') {
          proxies.add(key);
        }
      });
    });
    return Array.from(proxies).sort();
  }, [section.dataPoints]);

  useEffect(() => {
    if (!availableProxies.includes(activeProxy)) {
      setActiveProxy(availableProxies.includes('delta18O') ? 'delta18O' : availableProxies[0] || '');
    }
  }, [availableProxies, activeProxy]);

  const chartData = useMemo(() => {
    if (!activeProxy) return [];
    return section.dataPoints.filter(dp => typeof dp[activeProxy] === 'number' && typeof dp.age === 'number');
  }, [section.dataPoints, activeProxy]);

  const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
  const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;


  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
        <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2 mb-2"><FileText size={20} className="text-accent-primary"/> Scientific Summary</h3>
             {isSummaryDirty && (
                <button 
                  onClick={handleSaveSummary} 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold bg-accent-primary/20 text-accent-primary-hover hover:bg-accent-primary/30 transition-colors animate-fade-in-fast"
                >
                    <Save size={14} />
                    Save Summary
                </button>
            )}
        </div>
        <textarea
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            placeholder="Enter a scientific summary for this section..."
            className="w-full h-40 bg-background-primary border border-border-secondary rounded-lg p-3 mt-1 text-sm text-content-secondary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition resize-y"
        />
      </div>
      
      {/* Chart Card */}
      <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-content-primary">Proxy Chart</h3>
          <div className="w-full max-w-xs">
            <select
              id="proxy-select"
              value={activeProxy}
              onChange={e => setActiveProxy(e.target.value)}
              className={selectClass}
              style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
              disabled={availableProxies.length === 0}
            >
              {availableProxies.length > 0
                ? availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)
                : <option>No proxies available</option>
              }
            </select>
          </div>
        </div>
        <SingleSectionChart
          section={section}
          chartData={chartData}
          xAxisKey="age"
          yAxisKey={activeProxy}
          proxyLabels={proxyLabels}
          hoveredValue={hoveredDepth}
          setHoveredValue={setHoveredDepth}
        />
      </div>

      <PaleoAiAssistant section={section} />
      <style>{`
        @keyframes fade-in-fast { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};