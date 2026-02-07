

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Section, TiePoint, SpliceInterval, DataPoint } from '../types';
import MultiSectionChart from './MultiSectionChart';
import CorrelationChart from './CorrelationChart';
import ExportChartButton from './ExportChartButton';
import { Blend, Wand2, Loader2, AlertCircle, Camera, CheckCircle, XCircle, Globe, GitCompare } from 'lucide-react';
import html2canvas from 'html2canvas';
import { LR04_DATA } from '../data/lr04';
import PresentationButton from './PresentationButton';

interface CoreSynthesisViewProps {
  sections: Section[];
  calibratedSections: Section[] | null;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info'; show: boolean }) => void;
  onCaptureChart: (chartData: { dataUrl: string; aspectRatio: number } | null) => void;
  isChartCaptured: boolean;
  proxyLabels: Record<string, string>;
}

type AiSuggestion = { refDepth: number; targetDepth: number; confidence: number };

const suggestTiePointsMath = (
    referenceSection: Section, 
    targetSection: Section, 
    proxy: string,
    setToast: (toast: any) => void
): AiSuggestion[] => {
    const findFeatures = (series: { depth: number; value: number }[]) => {
        const features = [];
        const window = 2; // Look at 2 points on each side
        for (let i = window; i < series.length - window; i++) {
            const slice = series.slice(i - window, i + window + 1);
            const centerPoint = series[i];
            if (centerPoint.value === Math.max(...slice.map(p => p.value))) {
                features.push({ ...centerPoint, type: 'peak' });
            } else if (centerPoint.value === Math.min(...slice.map(p => p.value))) {
                features.push({ ...centerPoint, type: 'trough' });
            }
        }
        return features;
    };
    
    const refData = referenceSection.dataPoints
        .filter(dp => dp.depth != null && dp[proxy] != null)
        .map(dp => ({ depth: dp.depth!, value: dp[proxy] as number }));

    const targetData = targetSection.dataPoints
        .filter(dp => dp.depth != null && dp[proxy] != null)
        .map(dp => ({ depth: dp.depth!, value: dp[proxy] as number }));

    if (refData.length < 5 || targetData.length < 5) {
         setToast({ message: 'Both sections need at least 5 data points for feature detection.', type: 'info', show: true });
         return [];
    }
        
    const refFeatures = findFeatures(refData);
    const targetFeatures = findFeatures(targetData);

    const suggestions: AiSuggestion[] = [];
    
    refFeatures.forEach(refFeat => {
        const potentialMatches = targetFeatures.filter(targetFeat => targetFeat.type === refFeat.type);
        if (potentialMatches.length === 0) return;

        let bestMatch = potentialMatches[0];
        let smallestDiff = Math.abs(refFeat.value - bestMatch.value);

        for (let i = 1; i < potentialMatches.length; i++) {
            const diff = Math.abs(refFeat.value - potentialMatches[i].value);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                bestMatch = potentialMatches[i];
            }
        }
        
        const avgValue = (Math.abs(refFeat.value) + Math.abs(bestMatch.value)) / 2;
        if (avgValue === 0) return;

        const confidence = Math.max(0, 100 * (1 - smallestDiff / avgValue));

        if (confidence > 75) { // Confidence threshold
            suggestions.push({
                refDepth: refFeat.depth,
                targetDepth: bestMatch.depth,
                confidence: Math.round(confidence),
            });
        }
    });

    // Deduplicate suggestions (a target feature might be the best match for multiple ref features)
    const uniqueSuggestions = Array.from(new Map(suggestions.map(s => [s.targetDepth, s])).values());
    
    return uniqueSuggestions.sort((a,b) => b.confidence - a.confidence).slice(0, 5); // Return top 5
};


const CoreSynthesisView: React.FC<CoreSynthesisViewProps> = ({ sections, calibratedSections, setToast, onCaptureChart, isChartCaptured, proxyLabels }) => {
  const [error, setError] = useState<string | null>(null);
  const [selectedProxy, setSelectedProxy] = useState<string>('delta18O');
  
  const compositeChartRef = useRef<HTMLDivElement>(null);
  const presentationContainerRef = useRef<HTMLDivElement>(null);

  const [spliceIntervals, setSpliceIntervals] = useState<Record<string, SpliceInterval>>({});
  const [showLr04, setShowLr04] = useState(false);

  const [viewMode, setViewMode] = useState<'composite' | 'correlation'>('composite');
  const [referenceSectionId, setReferenceSectionId] = useState<string>('');
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[] | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [tiePoints, setTiePoints] = useState<TiePoint[]>([]);

  const dataToDisplay = calibratedSections || sections;
  
  useEffect(() => {
    setSpliceIntervals(
      Object.fromEntries(sections.map(s => [s.id, { sectionId: s.id, startAge: null, endAge: null }]))
    );
    setAiSuggestions(null);

    if (sections.length > 0) {
      setReferenceSectionId(sections[0].id);
      if (sections.length > 1) {
        const firstAvailableTarget = sections.find(s => s.id !== sections[0].id);
        setTargetSectionId(firstAvailableTarget ? firstAvailableTarget.id : '');
      } else {
        setTargetSectionId('');
      }
    } else {
      setReferenceSectionId('');
      setTargetSectionId('');
    }
  }, [sections]);

  useEffect(() => {
      if (calibratedSections) {
          const allTiePoints = calibratedSections.flatMap(s => s.ageModel?.tiePoints || []);
          setTiePoints(allTiePoints);
      }
  }, [calibratedSections]);

  const xAxisKeyForComposite = calibratedSections ? 'age' : 'depth';
  const yAxisKeyForCorrelation = calibratedSections ? 'age' : 'depth';
  
  const referenceSection = useMemo(() => sections.find(s => s.id === referenceSectionId), [sections, referenceSectionId]);
  const targetSection = useMemo(() => sections.find(s => s.id === targetSectionId), [sections, targetSectionId]);
  
  const availableTargetSections = useMemo(() => sections.filter(s => s.id !== referenceSectionId), [sections, referenceSectionId]);

  const availableProxies = useMemo(() => {
    const proxies = new Set<string>();
    dataToDisplay.forEach(section => {
      section.dataPoints.forEach(dp => {
        Object.keys(dp).forEach(key => {
            if (key !== 'depth' && key !== 'age' && key !== 'subsection') {
                proxies.add(key);
            }
        });
      });
    });
    return Array.from(proxies);
  }, [dataToDisplay]);
  
  React.useEffect(() => {
      if (!availableProxies.includes(selectedProxy) && availableProxies.length > 0) {
          setSelectedProxy(availableProxies[0]);
      } else if (availableProxies.length === 0) {
          setSelectedProxy('delta18O');
      }
  }, [availableProxies, selectedProxy]);

  const handleSuggestTiePoints = () => {
    if (!referenceSection || !targetSection) {
      setToast({ message: 'Please select both a reference and a target section.', type: 'error', show: true });
      return;
    }
    setIsSuggesting(true);
    setError(null);
    setAiSuggestions(null);
    setTimeout(() => {
        try {
            const results = suggestTiePointsMath(referenceSection, targetSection, selectedProxy, setToast);
            setAiSuggestions(results);
            if (results.length > 0) {
              setToast({ message: `Algorithm found ${results.length} potential correlation(s).`, type: 'info', show: true });
            } else {
              setToast({ message: 'Algorithm could not find strong correlations for this proxy.', type: 'info', show: true });
            }
        } catch(err: any) {
            setError(err.message);
            setToast({ message: `Error: ${err.message}`, type: 'error', show: true });
        } finally {
            setIsSuggesting(false);
        }
    }, 200);
  };

  const handleAcceptSuggestion = (suggestion: AiSuggestion) => {
    const { refDepth, targetDepth } = suggestion;

    const existingRefTiePoint = tiePoints.find(tp => tp.sectionId === referenceSectionId && Math.abs(tp.depth - refDepth) < 1);
    const existingTargetTiePoint = tiePoints.find(tp => tp.sectionId === targetSectionId && Math.abs(tp.depth - targetDepth) < 1);

    let ageToAssign: number | null = null;
    if (existingRefTiePoint) {
        ageToAssign = existingRefTiePoint.age;
    } else if (existingTargetTiePoint) {
        ageToAssign = existingTargetTiePoint.age;
    }

    if (ageToAssign !== null) {
        const newTiePoints: TiePoint[] = [...tiePoints];
        if (!existingRefTiePoint) {
            newTiePoints.push({ id: `ai-${Date.now()}-ref`, sectionId: referenceSectionId!, depth: refDepth, age: ageToAssign });
        }
        if (!existingTargetTiePoint) {
            newTiePoints.push({ id: `ai-${Date.now()}-target`, sectionId: targetSectionId!, depth: targetDepth, age: ageToAssign });
        }
        setTiePoints(newTiePoints);
        setToast({ message: `Tie-point created with age ${ageToAssign} ka. Go to the Chronology tab to manage it.`, type: 'success', show: true });
    } else {
        setToast({ message: 'Go to the Chronology tab to add an age-calibrated tie-point to one of the correlated depths first, then accept this suggestion to transfer its age.', type: 'info', show: true });
    }
  };

  const handleCaptureChart = async () => {
    if (!compositeChartRef.current) {
        setToast({ message: 'Chart element not found.', type: 'error', show: true });
        return;
    }
    setToast({ message: 'Capturing high-resolution chart image...', type: 'info', show: true });
    try {
        const chartBackgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-tertiary').trim();
        const canvas = await html2canvas(compositeChartRef.current, {
            useCORS: true,
            backgroundColor: chartBackgroundColor || '#334155',
            scale: 3,
        });
        const dataUrl = canvas.toDataURL('image/png');
        const aspectRatio = canvas.width / canvas.height;
        onCaptureChart({ dataUrl, aspectRatio });
        setToast({ message: 'Synthesis chart captured for PDF report.', type: 'success', show: true });
    } catch (error) {
        console.error('Error capturing chart:', error);
        setToast({ message: 'Failed to capture chart image.', type: 'error', show: true });
    }
  };

  const handleRemoveChartFromReport = () => {
      onCaptureChart(null);
      setToast({ message: 'Synthesis chart removed from PDF report.', type: 'info', show: true });
  }

  const handleSpliceIntervalChange = (sectionId: string, type: 'startAge' | 'endAge', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setSpliceIntervals(prev => ({
        ...prev,
        [sectionId]: {
            ...prev[sectionId],
            [type]: numValue,
        }
    }));
  };
  
  const compositeSplice = useMemo(() => {
      if (!calibratedSections) return [];
      
      const allPoints: DataPoint[] = [];

      calibratedSections.forEach(section => {
          const interval = spliceIntervals[section.id];
          if (interval && interval.startAge !== null && interval.endAge !== null) {
              const start = Math.min(interval.startAge, interval.endAge);
              const end = Math.max(interval.startAge, interval.endAge);

              section.dataPoints.forEach(point => {
                  if (point.age !== undefined && point.age >= start && point.age <= end) {
                      allPoints.push(point);
                  }
              });
          }
      });
      
      return allPoints.sort((a, b) => ((a.age as number) || 0) - ((b.age as number) || 0));
  }, [calibratedSections, spliceIntervals]);

  const multiChartData = useMemo(() => {
        const combined = new Map<number, any>();
        
        dataToDisplay.forEach(section => {
            section.dataPoints.forEach(dp => {
                const key = dp[xAxisKeyForComposite] as number;
                if (key !== undefined && dp[selectedProxy] !== undefined) {
                    if (!combined.has(key)) combined.set(key, { [xAxisKeyForComposite]: key });
                    combined.get(key)[section.name] = dp[selectedProxy];
                }
            });
        });
        
        compositeSplice.forEach(dp => {
            const key = dp[xAxisKeyForComposite] as number;
            if (key !== undefined && dp[selectedProxy] !== undefined) {
                 if (!combined.has(key)) combined.set(key, { [xAxisKeyForComposite]: key });
                 combined.get(key)['Composite Splice'] = dp[selectedProxy];
            }
        });
        
        if (showLr04 && xAxisKeyForComposite === 'age') {
            LR04_DATA.forEach(dp => {
                const key = dp.age;
                if (!combined.has(key)) combined.set(key, { [xAxisKeyForComposite]: key });
                combined.get(key)['LR04 Benthic Stack'] = dp.d18O;
            });
        }

        return Array.from(combined.values()).sort((a, b) => a[xAxisKeyForComposite] - b[xAxisKeyForComposite]);

    }, [dataToDisplay, compositeSplice, selectedProxy, xAxisKeyForComposite, showLr04]);

  const correlationChartData = useMemo(() => {
    if (!referenceSection || !targetSection) return [];
    
    const processData = (section: Section): DataPoint[] =>
        [...section.dataPoints].filter(dp => dp[yAxisKeyForCorrelation] != null && dp[selectedProxy] != null);

    const refData = processData(referenceSection);
    const targetData = processData(targetSection);
    
    if (refData.length === 0 || targetData.length === 0) return [];

    const data = [];
    for (const p of refData) {
        data.push({ [selectedProxy]: p[selectedProxy], refValue: p[yAxisKeyForCorrelation], targetValue: null });
    }
    for (const p of targetData) {
        data.push({ [selectedProxy]: p[selectedProxy], refValue: null, targetValue: p[yAxisKeyForCorrelation] });
    }
    
    return data.sort((a, b) => (a[selectedProxy] as number) - (b[selectedProxy] as number));
  }, [referenceSection, targetSection, selectedProxy, yAxisKeyForCorrelation]);

   const compositeChartConfig = useMemo(() => {
        const series = dataToDisplay.map(s => ({ label: s.name }));
        if (compositeSplice.length > 0) series.push({ label: 'Composite Splice' });
        if (showLr04 && xAxisKeyForComposite === 'age') series.push({ label: 'LR04 Benthic Stack' });

        return {
            xAxis: { key: xAxisKeyForComposite },
            yAxis: { key: selectedProxy },
            dataSeries: series
        };
    }, [xAxisKeyForComposite, dataToDisplay, compositeSplice, showLr04, selectedProxy]);

  const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8 disabled:cursor-not-allowed disabled:bg-background-tertiary";
  const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;

  const TabButton: React.FC<{
      onClick: () => void;
      active: boolean;
      icon: React.ReactNode;
      label: string;
    }> = ({ onClick, active, icon, label }) => (
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${active ? 'text-accent-primary border-accent-primary' : 'text-content-muted border-transparent hover:text-content-primary'}`}
      >
        {icon}
        {label}
      </button>
  );

  if (sections.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center p-12 bg-background-tertiary/50 rounded-xl text-content-muted border border-border-primary/50">
            <Blend size={48} className="mb-4" />
            <h3 className="text-lg font-semibold text-content-primary">No Sections to Synthesize</h3>
            <p>This core needs at least one section with data to begin synthesis.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="p-4 bg-background-tertiary/50 rounded-xl shadow-lg border border-border-primary/50 space-y-4">
             <h3 className="text-lg font-semibold text-content-primary">Composite Splice Intervals</h3>
             <p className="text-xs text-content-muted -mt-2">Define age intervals from each section to combine into a single composite record. Requires a generated age model from the Chronology tab.</p>
             <div className="max-h-60 overflow-y-auto space-y-3 pr-2 -mr-2">
                 {dataToDisplay.map(section => (
                     <div key={section.id} className="p-2 bg-background-primary/50 rounded-md">
                        <p className="text-sm font-bold text-content-secondary">{section.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="number"
                                placeholder="Start Age"
                                value={spliceIntervals[section.id]?.startAge ?? ''}
                                onChange={(e) => handleSpliceIntervalChange(section.id, 'startAge', e.target.value)}
                                className={selectClass}
                                disabled={!calibratedSections}
                             />
                             <span className="text-content-muted">-</span>
                             <input
                                type="number"
                                placeholder="End Age"
                                value={spliceIntervals[section.id]?.endAge ?? ''}
                                onChange={(e) => handleSpliceIntervalChange(section.id, 'endAge', e.target.value)}
                                className={selectClass}
                                disabled={!calibratedSections}
                             />
                        </div>
                     </div>
                 ))}
             </div>
        </div>

      <div ref={presentationContainerRef} className="presentation-container lg:col-span-2 bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
         <div className="presentation-controls">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div className="flex items-center border-b border-border-primary">
                   <TabButton onClick={() => setViewMode('composite')} active={viewMode === 'composite'} icon={<Blend size={16}/>} label="Composite Splice"/>
                   <TabButton onClick={() => setViewMode('correlation')} active={viewMode === 'correlation'} icon={<GitCompare size={16}/>} label="Correlation"/>
                </div>
                 <div className="flex items-center gap-2">
                    {viewMode === 'composite' && (
                      <>
                          <button
                            onClick={handleCaptureChart}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-semibold ${
                              isChartCaptured 
                                ? 'bg-success-primary/20 text-success-primary hover:bg-success-primary/30'
                                : 'bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/40'
                            }`}
                            title={isChartCaptured ? "Update captured chart" : "Add this chart to the full PDF report"}
                          >
                            {isChartCaptured ? <CheckCircle size={14} /> : <Camera size={14} />}
                            {isChartCaptured ? 'Update in Report' : 'Add to Report'}
                          </button>
                          {isChartCaptured && (
                            <button
                              onClick={handleRemoveChartFromReport}
                              className="p-2 rounded-lg bg-danger-primary/20 text-danger-primary hover:bg-danger-primary/40 transition-colors"
                              title="Remove chart from report"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                      </>
                    )}
                     <ExportChartButton
                        chartRef={compositeChartRef}
                        chartData={multiChartData}
                        chartConfig={compositeChartConfig}
                        proxyLabels={proxyLabels}
                        fileName={`Core_Synthesis_Chart`}
                        setToast={setToast}
                     />
                     <PresentationButton targetRef={presentationContainerRef} />
                </div>
            </div>

            {viewMode === 'composite' && (
                <div className="flex justify-end items-center gap-4 mb-4">
                     <div>
                         <label htmlFor="proxy-select" className="text-xs font-medium text-content-muted mr-2">Proxy:</label>
                         <select id="proxy-select" value={selectedProxy} onChange={e => setSelectedProxy(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }} disabled={availableProxies.length === 0}>
                            {availableProxies.length === 0 ? <option>No data</option> : availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                         </select>
                    </div>
                    <div className="flex items-center gap-2" title={xAxisKeyForComposite === 'depth' ? 'Generate an age model to enable LR04 overlay' : 'Toggle LR04 Overlay'}>
                        <span className="text-xs font-semibold text-content-secondary flex items-center gap-1.5"><Globe size={14}/> LR04</span>
                        <button onClick={() => setShowLr04(prev => !prev)} disabled={xAxisKeyForComposite === 'depth'} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed ${showLr04 ? 'bg-accent-primary' : 'bg-background-interactive'}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showLr04 ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
             )}
             
             {viewMode === 'correlation' && (
                 <div className="animate-fade-in-fast">
                    {error && <p className="text-danger-primary text-xs my-2 text-center">{error}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                         <div>
                            <label className="block text-xs font-medium text-content-muted mb-1">Reference Section</label>
                            <select value={referenceSectionId} onChange={e => { setReferenceSectionId(e.target.value); setAiSuggestions(null); }} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                               {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-content-muted mb-1">Target Section</label>
                            <select value={targetSectionId} onChange={e => { setTargetSectionId(e.target.value); setAiSuggestions(null); }} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }} disabled={availableTargetSections.length === 0}>
                               {availableTargetSections.length === 0 ? <option>No other section</option> : availableTargetSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-content-muted mb-1">Proxy</label>
                             <select value={selectedProxy} onChange={e => {setSelectedProxy(e.target.value); setAiSuggestions(null); }} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }} disabled={availableProxies.length === 0}>
                                {availableProxies.length === 0 ? <option>No data</option> : availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)}
                             </select>
                         </div>
                    </div>
                     <button onClick={handleSuggestTiePoints} disabled={isSuggesting || !referenceSection || !targetSection} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30 transition-colors text-sm font-semibold disabled:bg-background-interactive disabled:cursor-wait">
                         {isSuggesting ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                         {isSuggesting ? 'Suggesting...' : 'Suggest Tie-Points'}
                     </button>
                 </div>
             )}
         </div>
         
         <div className="presentation-chart-wrapper animate-fade-in-fast mt-4">
            <div ref={compositeChartRef} className="bg-background-tertiary p-2 rounded-lg h-full w-full">
                {viewMode === 'composite' && (
                    <>
                        {dataToDisplay.some(s => s.dataPoints?.length > 0) ? (
                            <MultiSectionChart data={multiChartData} sections={dataToDisplay} spliceData={compositeSplice} proxyKey={selectedProxy} xAxisKey={xAxisKeyForComposite} showLr04={showLr04} lr04Data={LR04_DATA} proxyLabels={proxyLabels} />
                        ) : (
                            <div className="flex items-center justify-center h-96 text-content-muted"><AlertCircle size={24} className="mr-2"/><span>No data points in sections to display.</span></div>
                        )}
                    </>
                )}
                {viewMode === 'correlation' && (
                    <>
                         {referenceSection && targetSection ? (
                            <CorrelationChart 
                                data={correlationChartData}
                                referenceSection={referenceSection} 
                                targetSection={targetSection} 
                                proxyKey={selectedProxy} 
                                yAxisKey={yAxisKeyForCorrelation} 
                                proxyLabels={proxyLabels}
                                suggestions={aiSuggestions}
                                onAcceptSuggestion={handleAcceptSuggestion}
                            />
                         ) : (
                            <div className="flex items-center justify-center h-96 text-content-muted"><AlertCircle size={24} className="mr-2"/><span>Please select two different sections to correlate.</span></div>
                         )}
                    </>
                )}
             </div>
         </div>
      </div>
       <style>{`
        @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
    `}</style>
    </div>
  );
};

export default CoreSynthesisView;