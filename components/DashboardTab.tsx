

import React, { useState, useMemo, useEffect } from 'react';
import type { Core, Section, Microfossil } from '../types';
import SingleSectionChart from './SingleSectionChart';
import MetricCard from './MetricCard';
import { FileText, Save, Info, Ruler, Database, Clock, Microscope, Activity } from 'lucide-react';
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
    const metadataKeys = ['subsection', 'depth', 'age', 'qcFlag'];
    section.dataPoints.forEach(dp => {
      Object.keys(dp).forEach(key => {
        if (!metadataKeys.includes(key)) {
          const val = dp[key];
          if (val !== null && val !== undefined && val !== '') {
            proxies.add(key);
          }
        }
      });
    });
    return Array.from(proxies).sort();
  }, [section.dataPoints]);

  useEffect(() => {
    if (activeProxy && !availableProxies.includes(activeProxy)) {
      setActiveProxy(availableProxies.includes('delta18O') ? 'delta18O' : availableProxies[0] || '');
    }
  }, [availableProxies, activeProxy]);

  const hasAgeData = useMemo(() => section.dataPoints.some(dp => typeof dp.age === 'number' && dp.age !== null), [section.dataPoints]);
  const xAxisKey = hasAgeData ? 'age' : 'depth';

  const chartData = useMemo(() => {
    if (!activeProxy) return [];
    return section.dataPoints
      .filter(dp => (typeof dp[activeProxy] === 'number' || typeof dp[activeProxy] === 'string') && typeof dp[xAxisKey] === 'number')
      .map(dp => ({
          ...dp,
          [activeProxy]: typeof dp[activeProxy] === 'string' ? parseFloat(dp[activeProxy] as string) : dp[activeProxy]
      }))
      .filter(dp => !isNaN(dp[activeProxy] as number))
      .sort((a, b) => (a[xAxisKey] as number) - (b[xAxisKey] as number));
  }, [section.dataPoints, activeProxy, xAxisKey]);

  const metrics = useMemo(() => {
    const depths = section.dataPoints.map(dp => dp.depth).filter(d => typeof d === 'number') as number[];
    const ages = section.dataPoints.map(dp => dp.age).filter(a => typeof a === 'number') as number[];
    
    return {
      depthRange: depths.length > 0 ? `${Math.min(...depths).toFixed(1)} - ${Math.max(...depths).toFixed(1)}` : 'N/A',
      ageRange: ages.length > 0 ? `${Math.min(...ages).toFixed(0)} - ${Math.max(...ages).toFixed(0)}` : 'N/A',
      sampleCount: section.dataPoints.length,
      fossilDiversity: microfossils.filter(f => f.section_id === section.id).length,
    };
  }, [section, microfossils]);

  const selectClass = "w-full bg-background-interactive border border-border-primary rounded-lg p-2 text-xs font-mono text-content-primary focus:ring-1 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
  const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--accent-primary)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
      {/* Metrics Row */}
      <MetricCard 
        label="Depth Range" 
        value={metrics.depthRange} 
        unit="m" 
        icon={<Ruler size={16}/>} 
      />
      <MetricCard 
        label="Age Range" 
        value={metrics.ageRange} 
        unit="ka" 
        icon={<Clock size={16}/>} 
      />
      <MetricCard 
        label="Total Samples" 
        value={metrics.sampleCount} 
        unit="points" 
        icon={<Database size={16}/>} 
      />
      <MetricCard 
        label="Fossil Diversity" 
        value={metrics.fossilDiversity} 
        unit="taxa" 
        icon={<Microscope size={16}/>} 
      />

      {/* Main Chart Area */}
      <div className="md:col-span-3 bg-background-tertiary/20 p-6 rounded-xl border border-border-primary flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="micro-label">High-Fidelity Analysis</span>
            <h3 className="text-lg font-bold text-content-primary tracking-tight">Proxy Abundance Profile</h3>
          </div>
          <div className="w-48">
            <select
              id="proxy-select"
              value={activeProxy}
              onChange={e => setActiveProxy(e.target.value)}
              className={selectClass}
              style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em 1.2em' }}
              disabled={availableProxies.length === 0}
            >
              {availableProxies.length > 0
                ? availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)
                : <option>No proxies available</option>
              }
            </select>
          </div>
        </div>
        
        <div className="flex-grow min-h-[400px]">
          <SingleSectionChart
            section={section}
            chartData={chartData}
            xAxisKey={xAxisKey}
            yAxisKey={activeProxy}
            proxyLabels={proxyLabels}
            hoveredValue={hoveredDepth}
            setHoveredValue={setHoveredDepth}
          />
        </div>
      </div>

      {/* Side Panel: Summary & AI */}
      <div className="md:col-span-1 flex flex-col gap-4">
        <div className="bg-background-tertiary/20 p-5 rounded-xl border border-border-primary flex flex-col gap-3 h-full">
          <div className="flex justify-between items-center">
            <span className="micro-label">Scientific Summary</span>
            {isSummaryDirty && (
              <button 
                onClick={handleSaveSummary} 
                className="text-[10px] font-bold text-accent-primary hover:text-accent-primary-hover uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                <Save size={12} /> Save
              </button>
            )}
          </div>
          <textarea
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            placeholder="Enter scientific observations..."
            className="w-full h-full min-h-[400px] bg-transparent border-none p-0 text-sm text-content-secondary placeholder-content-muted focus:ring-0 focus:outline-none transition resize-none font-sans leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};
