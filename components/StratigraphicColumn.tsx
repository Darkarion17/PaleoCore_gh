

import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Section, Microfossil, SectionFossilRecord, FossilAbundance, DataPoint } from '../types';
import { Beaker, Bug, FileText, Scan, Wallpaper, X } from 'lucide-react';

const munsellMap: Record<string, string> = {
    '10YR 6/2': '#A99B8F', // Light Brownish Gray
    '10YR 4/10': '#D98A4A', // Brownish Yellow
    '5Y 5/1': '#8D9094',   // Gray
    'N5': '#7F7F7F',       // Medium Gray
};

const munsellToHex = (munsell: string | undefined): string | null => {
    if (!munsell) return null;
    if (/^#([0-9A-F]{3}){1,2}$/i.test(munsell)) return munsell;
    return munsellMap[munsell.toUpperCase()] || null;
};

const abundanceToValue: Record<FossilAbundance, number> = {
    'Abundant': 5,
    'Common': 4,
    'Few': 3,
    'Rare': 2,
    'Present': 1,
    'Barren': 0,
};

const ProxyStrip: React.FC<{
    dataPoints: DataPoint[];
    proxyKey: string;
    x: number;
    y: number;
    width: number;
    height: number;
    depthRange: { min: number, max: number };
}> = ({ dataPoints, proxyKey, x, y, width, height, depthRange }) => {
    const validPoints = useMemo(() =>
        dataPoints.reduce((acc: { depth: number, value: number }[], p) => {
            const value = p[proxyKey];
            if (typeof p.depth === 'number' && typeof value === 'number') {
                acc.push({ depth: p.depth, value: value });
            }
            return acc;
        }, []),
    [dataPoints, proxyKey]);

    if (validPoints.length < 2) return null;

    const values = validPoints.map(p => p.value);
    const minProxy = Math.min(...values);
    const maxProxy = Math.max(...values);
    const proxyRange = maxProxy - minProxy;

    if (proxyRange === 0) return null;

    const pathData = validPoints
        .map((p, i) => {
            const pointY = y + ((p.depth - depthRange.min) / (depthRange.max - depthRange.min)) * height;
            const pointX = x + ((p.value - minProxy) / proxyRange) * width;
            return `${i === 0 ? 'M' : 'L'} ${pointX.toFixed(2)} ${pointY.toFixed(2)}`;
        })
        .join(' ');

    return <path d={pathData} fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />;
};


const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string; colorSwatch?: string | null }> = ({ icon, label, value, colorSwatch }) => (
    <div className="bg-background-primary/50 p-2 rounded-md flex items-center">
        <div className="flex-shrink-0 text-accent-primary">{icon}</div>
        <div className="ml-2">
            <p className="text-xs text-content-muted">{label}</p>
            <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-content-secondary">{value}</p>
                {colorSwatch && <div className="w-4 h-4 rounded-full border border-border-primary" style={{ backgroundColor: colorSwatch }} />}
            </div>
        </div>
    </div>
);

const FossilAbundanceBar: React.FC<{ fossil: Microfossil; record: SectionFossilRecord }> = ({ fossil, record }) => {
    const value = abundanceToValue[record.abundance];
    const percentage = (value / 5) * 100;

    return (
        <div className="group space-y-1">
            <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-content-primary truncate italic" title={`${fossil.taxonomy.genus} ${fossil.taxonomy.species}`}>
                    {fossil.taxonomy.genus} {fossil.taxonomy.species}
                </p>
                <p className="text-xs text-content-muted font-mono">{record.abundance}</p>
            </div>
            <div className="w-full bg-background-interactive rounded-full h-2.5">
                <div
                    className="bg-accent-secondary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {record.observations && (
                 <p className="text-xs text-content-muted mt-1.5 italic opacity-0 group-hover:opacity-100 transition-opacity">
                    "{record.observations}"
                </p>
            )}
        </div>
    );
};


const SectionDetailPanel: React.FC<{ section: Section | null; microfossils: Microfossil[]; onClose: () => void }> = ({ section, microfossils, onClose }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'fossils'>('summary');

    useEffect(() => {
        setActiveTab('summary');
    }, [section?.id]);

    const groupedFossils = useMemo(() => {
        if (!section || !section.microfossilRecords || section.microfossilRecords.length === 0) {
            return {};
        }
        const groups: Record<string, { fossil: Microfossil, record: SectionFossilRecord }[]> = {};
        section.microfossilRecords.forEach(record => {
            const fossil = microfossils.find(f => f.id === record.fossilId);
            if (fossil) {
                const groupName = fossil.taxonomy.class || 'Unclassified';
                if (!groups[groupName]) {
                    groups[groupName] = [];
                }
                groups[groupName].push({ fossil, record });
            }
        });
        return groups;
    }, [section, microfossils]);
    
    if (!section) return null;
    
    const TabButton: React.FC<{tab: 'summary'|'fossils', label: string, icon: React.ReactNode}> = ({tab, label, icon}) => (
         <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${activeTab === tab ? 'text-accent-primary border-b-2 border-accent-primary bg-background-tertiary/60' : 'text-content-muted hover:text-content-primary border-b-2 border-transparent'}`}
        >
            {icon} {label}
        </button>
    );

    return (
        <div className="lg:w-2/3 flex-grow min-w-0 bg-background-tertiary/60 p-4 rounded-xl border border-border-primary/50 relative animate-fade-in-fast flex flex-col">
            <button
                onClick={onClose}
                className="absolute top-2 right-2 p-1.5 rounded-full text-content-muted hover:bg-background-interactive hover:text-content-primary transition-colors z-10"
                aria-label="Close details"
            >
                <X size={20} />
            </button>
            <h3 className="font-bold text-content-primary text-lg pb-1 mb-2">{section.name}</h3>

            <div className="border-b border-border-primary -mx-4 px-4">
                 <div className="flex">
                    <TabButton tab="summary" label="Summary" icon={<FileText size={16}/>} />
                    <TabButton tab="fossils" label="Fossils" icon={<Bug size={16}/>} />
                </div>
            </div>
            
            <div className="overflow-y-auto flex-grow mt-4 pr-2 -mr-2">
                 {activeTab === 'summary' && (
                    <div className="space-y-4 animate-fade-in-fast">
                        <InfoItem icon={<Wallpaper size={20}/>} label="Lithology" value={section.lithology || 'N/A'} />
                        <InfoItem icon={<Scan size={20}/>} label="Grain Size" value={section.grainSize || 'N/A'} />
                        <InfoItem icon={<Beaker size={20}/>} label="Munsell Color" value={section.munsellColor || 'N/A'} colorSwatch={munsellToHex(section.munsellColor)} />
                        {section.summary && (
                            <div>
                                <h4 className="font-bold text-content-secondary mt-4 mb-2">AI Summary</h4>
                                <div className="text-sm text-content-secondary bg-background-primary/40 p-3 rounded-md prose prose-sm prose-invert max-w-none prose-p:my-1">
                                    {section.summary.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                 {activeTab === 'fossils' && (
                     <div className="space-y-4 animate-fade-in-fast">
                        {Object.keys(groupedFossils).length > 0 ? (
                            // FIX: Replaced Object.entries with Object.keys to work around a TypeScript type inference issue with iterating over the grouped fossils object.
                            Object.keys(groupedFossils).map((groupName) => {
                                const items = groupedFossils[groupName];
                                // FIX: Added a type guard to ensure `items` is not undefined before rendering, preventing potential runtime errors.
                                if (!items) return null;
                                return (
                                <div key={groupName} className="bg-background-primary/40 p-3 rounded-md">
                                    <h4 className="font-bold text-content-secondary mb-3">{groupName}</h4>
                                    <div className="space-y-3">
                                        {items.map(({ fossil, record }) => (
                                            <FossilAbundanceBar key={fossil.id} fossil={fossil} record={record} />
                                        ))}
                                    </div>
                                </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-content-muted italic px-2">No microfossil records for this section.</p>
                        )}
                    </div>
                 )}
            </div>
        </div>
    );
};

type SectionLayout = {
    section: Section;
    startDepth: number;
    endDepth: number;
    sectionLength: number;
};

const StratigraphicColumn: React.FC<{ 
    sections: Section[]; 
    microfossils: Microfossil[];
    hoveredDepth: number | null;
    setHoveredDepth: (depth: number | null) => void;
}> = ({ sections, microfossils, hoveredDepth, setHoveredDepth }) => {
    const [infoPanelSection, setInfoPanelSection] = useState<Section | null>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);

    const sortedSections = useMemo(() => 
        [...sections].sort((a, b) => a.sectionDepth - b.sectionDepth), 
    [sections]);

    const totalCoreDepth = useMemo(() => 
        sortedSections.length > 0 ? sortedSections[sortedSections.length - 1].sectionDepth : 0,
    [sortedSections]);

    const sectionLayouts: SectionLayout[] = useMemo(() => {
        if (totalCoreDepth === 0) return [];
        let previousDepth = 0;
        return sortedSections.map(section => {
            const startDepth = previousDepth;
            const endDepth = section.sectionDepth;
            const sectionLength = endDepth - startDepth;
            previousDepth = endDepth;
            return {
                section,
                startDepth,
                endDepth,
                sectionLength,
            };
        });
    }, [sortedSections, totalCoreDepth]);
    

    const columnWidth = 60;
    const scaleHeight = 350;
    const padding = { top: 20, right: 60, bottom: 20, left: 10 };
    const svgHeight = scaleHeight + padding.top + padding.bottom;
    const svgWidth = columnWidth + padding.left + padding.right;
    
    const depthToY = (depth: number) => (depth / totalCoreDepth) * scaleHeight + padding.top;

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!e.currentTarget) return;
        const svgRect = e.currentTarget.getBoundingClientRect();
        const y_in_svg = e.clientY - svgRect.top;

        if (y_in_svg >= padding.top && y_in_svg <= padding.top + scaleHeight) {
            const depth = (y_in_svg - padding.top) / scaleHeight * totalCoreDepth;
            setHoveredDepth(depth);
        } else {
            setHoveredDepth(null);
        }
    };
    const handleMouseLeave = () => setHoveredDepth(null);

    const ticks = useMemo(() => {
        if (totalCoreDepth <= 0) return [];
        const numTicks = 8;
        const interval = totalCoreDepth / numTicks;
        return Array.from({ length: numTicks + 1 }, (_, i) => i * interval);
    }, [totalCoreDepth]);
    
    if (sections.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-content-muted text-sm p-4 text-center">
                <p>No sections available in this core.</p>
            </div>
        );
    }
     if (totalCoreDepth <= 0) {
        return (
            <div className="flex items-center justify-center h-full text-content-muted text-sm p-4 text-center">
                <p>Not enough data to display column (total core depth is 0 or undefined).</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col lg:flex-row gap-6">
            <div 
                ref={svgContainerRef}
                className="lg:w-1/3 flex-shrink-0 relative"
            >
                <div className="cursor-pointer">
                    <svg 
                        width="100%" 
                        height={svgHeight} 
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                        aria-label={`Stratigraphic column of the core`}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        <defs>
                            <filter id="inset-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
                                <feGaussianBlur stdDeviation="2"/><feOffset dx="3" dy="3" result="offsetblur"/>
                                <feFlood floodColor="rgba(0,0,0,0.5)" result="color"/><feComposite in2="offsetblur" operator="in"/>
                                <feComposite in2="SourceAlpha" operator="in" />
                                <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge>
                            </filter>
                        </defs>
                        
                        <g style={{ filter: 'url(#inset-shadow)' }} onClick={(e) => {
                            const svgElement = e.currentTarget;
                            const y_in_svg = e.clientY - svgElement.getBoundingClientRect().top;
                            const depth = (y_in_svg - padding.top) / scaleHeight * totalCoreDepth;
                            const clickedSectionLayout = sectionLayouts.find(l => depth >= l.startDepth && depth < l.endDepth);
                            if (clickedSectionLayout) {
                                setInfoPanelSection(clickedSectionLayout.section);
                            }
                        }}>
                             {sectionLayouts.map(({ section, startDepth, sectionLength }) => (
                                <g key={section.id}>
                                    <rect
                                        x={padding.left}
                                        y={depthToY(startDepth)}
                                        width={columnWidth}
                                        height={(sectionLength / totalCoreDepth) * scaleHeight}
                                        fill={munsellToHex(section.munsellColor) || 'var(--bg-secondary)'}
                                        stroke="var(--border-primary)"
                                    />
                                    <ProxyStrip
                                        dataPoints={section.dataPoints}
                                        proxyKey="delta18O"
                                        x={padding.left}
                                        y={depthToY(startDepth)}
                                        width={columnWidth}
                                        height={(sectionLength / totalCoreDepth) * scaleHeight}
                                        depthRange={{ min: startDepth, max: section.sectionDepth }}
                                    />
                                </g>
                            ))}
                        </g>

                         {sectionLayouts.map(({ section, startDepth }) => (
                            <g key={`label-${section.id}`} className="section-label" onClick={() => setInfoPanelSection(section)}>
                                <line x1={padding.left + columnWidth} y1={depthToY(startDepth)} x2={padding.left + columnWidth + 4} y2={depthToY(startDepth)} stroke="var(--text-muted)" strokeWidth="1" />
                                <text x={padding.left - 4} y={depthToY(startDepth) + 10} dy=".3em" fill="var(--text-primary)" fontSize="10" fontWeight="bold" writingMode="vertical-rl" textAnchor="start">{section.name}</text>
                            </g>
                        ))}

                        <g className="depth-axis" aria-hidden="true">
                            <line x1={padding.left + columnWidth} y1={padding.top} x2={padding.left + columnWidth} y2={padding.top + scaleHeight} stroke="var(--text-muted)" />
                            {ticks.map((depth, i) => (
                                <g key={i} transform={`translate(0, ${depthToY(depth)})`}>
                                    <line x1={padding.left + columnWidth} y1="0" x2={padding.left + columnWidth + 5} y2="0" stroke="var(--text-muted)" />
                                    <text x={padding.left + columnWidth + 8} y="0" dy=".3em" fill="var(--text-muted)" fontSize="10" textAnchor="start">{depth.toFixed(0)}</text>
                                </g>
                            ))}
                            <text x={padding.left + columnWidth + 35} y={padding.top + scaleHeight / 2} fill="var(--text-muted)" fontSize="12" transform={`rotate(-90, ${padding.left + columnWidth + 35}, ${padding.top + scaleHeight / 2})`} textAnchor="middle">Depth (mbsf)</text>
                        </g>

                        {hoveredDepth !== null && (
                            <g className="hover-indicator" style={{pointerEvents: 'none'}}>
                                <line 
                                    x1={padding.left} 
                                    y1={depthToY(hoveredDepth)} 
                                    x2={padding.left + columnWidth} 
                                    y2={depthToY(hoveredDepth)} 
                                    stroke="var(--accent-secondary)" 
                                    strokeWidth="1.5" 
                                    strokeDasharray="4 4"
                                />
                                 <text 
                                     x={padding.left + columnWidth + 8} 
                                     y={depthToY(hoveredDepth)} 
                                     dy=".3em" 
                                     fill="var(--accent-secondary)" 
                                     fontSize="10" 
                                     fontWeight="bold"
                                     textAnchor="start"
                                 >
                                    {hoveredDepth.toFixed(1)}
                                 </text>
                            </g>
                        )}
                    </svg>
                </div>
            </div>

            {infoPanelSection ? (
                <SectionDetailPanel section={infoPanelSection} microfossils={microfossils} onClose={() => setInfoPanelSection(null)} />
            ) : (
                <div className="hidden lg:flex lg:w-2/3 items-center justify-center h-full text-content-muted border-2 border-dashed border-border-primary rounded-lg p-4 min-h-[300px]">
                    <p className="text-center">Click on a segment of the stratigraphic column to see its details.</p>
                </div>
            )}
             <style>{`
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default StratigraphicColumn;