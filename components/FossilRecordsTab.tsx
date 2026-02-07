
import React, { useState, useMemo } from 'react';
import type { Section, SectionFossilRecord, Microfossil } from '../types';
import { Bug, BrainCircuit, Loader2, Sparkles } from 'lucide-react';
import { analyzeFossilAssemblage } from '../services/geminiService';

interface FossilRecordsTabProps {
  section: Section;
  microfossils: Microfossil[];
  onUpdateSection: (section: Section) => void;
}

interface FossilRecordCardProps {
    record: SectionFossilRecord;
    fossil: Microfossil | undefined;
    section: Section;
}

const FossilRecordCard: React.FC<FossilRecordCardProps> = ({ record, fossil, section }) => {
    
    if (!fossil) return null;

    const countData = useMemo(() => {
        if (!section?.dataPoints) return [];
        return section.dataPoints.map(dp => ({
            depth: dp.depth,
            count: dp[`${record.fossilId}_count`] as number | undefined,
            percentage: dp[`${record.fossilId}_percentage`] as number | undefined,
        })).filter(item => typeof item.count === 'number' && item.count > 0);
    }, [section, record.fossilId]);

    return (
        <div className="bg-background-tertiary/60 p-6 rounded-xl shadow-lg border border-border-primary/50 flex flex-col items-center text-center">
            <img src={fossil.imageUrl} alt={fossil.taxonomy.species} className="w-40 h-40 object-cover rounded-lg border-2 border-border-secondary mb-4" />
            
            <h3 className="text-xl font-bold text-content-primary italic">{fossil.taxonomy.genus} {fossil.taxonomy.species}</h3>
            <p className="text-md text-content-secondary">{fossil.taxonomy.family}</p>
            <p className="text-sm text-accent-primary mt-1 mb-6 font-semibold">{fossil.stratigraphicRange}</p>

            <div className="w-full space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="block text-sm font-medium text-content-secondary mb-1">Abundance</p>
                        <p className="w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-content-primary ">{record.abundance}</p>
                    </div>
                     <div>
                        <p className="block text-sm font-medium text-content-secondary mb-1">Preservation</p>
                         <p className="w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-content-primary ">{record.preservation}</p>
                    </div>
                </div>
                <div>
                    <p className="block text-sm font-medium text-content-secondary mb-1">Observations</p>
                    <p className="w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-content-primary min-h-[100px]">
                         {record.observations || "No observations recorded."}
                    </p>
                </div>
                {countData.length > 0 && (
                    <div className="w-full text-left mt-2">
                        <h4 className="text-sm font-medium text-content-secondary mb-2">Count Data</h4>
                        <div className="max-h-40 overflow-y-auto bg-background-interactive rounded-lg border border-border-secondary">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-background-tertiary">
                                    <tr>
                                        <th className="p-2 text-left font-semibold">Depth (m)</th>
                                        <th className="p-2 text-right font-semibold">Count</th>
                                        <th className="p-2 text-right font-semibold">%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-primary">
                                    {countData.map((data, index) => (
                                        <tr key={index} className="font-mono">
                                            <td className="p-2">{data.depth?.toFixed(2)}</td>
                                            <td className="p-2 text-right">{data.count}</td>
                                            <td className="p-2 text-right">{data.percentage?.toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FossilRecordsTab: React.FC<FossilRecordsTabProps> = ({ section, microfossils }) => {
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        setIsLoadingAnalysis(true);
        setAnalysisResult(null);
        setAnalysisError(null);
        try {
            const result = await analyzeFossilAssemblage(section, microfossils);
            setAnalysisResult(result);
        } catch (error: any) {
            setAnalysisError(error.message || 'Failed to get analysis.');
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    if (!section.microfossilRecords || section.microfossilRecords.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-background-tertiary/50 rounded-xl text-content-muted border border-border-primary/50">
                <Bug size={48} className="mb-4" />
                <h3 className="text-lg font-semibold text-content-primary">No Microfossils Associated</h3>
                <p>Edit this section to associate key microfossil species for analysis.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="bg-background-tertiary/50 p-4 rounded-xl shadow-lg border border-border-primary/50">
                <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2 mb-3"><BrainCircuit size={20} className="text-accent-primary"/> Assemblage Analysis</h3>
                <p className="text-xs text-content-muted mb-4">Use AI to interpret the paleoecological significance of the entire fossil assemblage in this section.</p>
                <button onClick={handleAnalyze} disabled={isLoadingAnalysis} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/80 text-accent-primary-text hover:bg-accent-primary transition-colors text-sm font-semibold disabled:bg-background-interactive disabled:cursor-wait">
                    {isLoadingAnalysis ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isLoadingAnalysis ? 'Analyzing...' : 'Analyze Assemblage with AI'}
                </button>
                {analysisResult && (
                    <div className="mt-4 p-4 bg-background-primary/50 rounded-lg prose prose-sm prose-invert max-w-none prose-p:my-2 text-content-secondary animate-fade-in-fast">
                        {analysisResult.split('\n').map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        ))}
                    </div>
                )}
                {analysisError && <p className="text-danger-primary text-xs mt-2">{analysisError}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {section.microfossilRecords.map(record => {
                   const fossilDetails = microfossils.find(f => f.id === record.fossilId);
                   return (
                        <FossilRecordCard 
                            key={record.fossilId} 
                            record={record}
                            fossil={fossilDetails}
                            section={section}
                        />
                    );
                })}
            </div>
             <style>{`
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default FossilRecordsTab;