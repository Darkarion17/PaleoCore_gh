
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GitCompare, X, MapPin, Droplet, BrainCircuit } from 'lucide-react';
import type { Core, Section } from '../types';
import MultiSectionChart from './MultiSectionChart';
import { LR04_DATA } from '../data/lr04';
import AutomatedAgeModeler from './AutomatedAgeModeler';

// OpenLayers imports for mini map
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Circle, Fill, Stroke } from 'ol/style';

interface CoreComparisonViewProps {
    coreIds: string[];
    allSections: Section[];
    cores: Core[];
    proxyLabels: Record<string, string>;
    onClearCompare: () => void;
    onUpdateSectionData: (section: Section) => void;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28'];

const CoreDetailsMini: React.FC<{ core: Core }> = ({ core }) => {
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mapRef.current) return;
        const accentPrimaryColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim();
        const bgPrimaryColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();

        const map = new OLMap({
            target: mapRef.current,
            layers: [
                new TileLayer({ source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}' }) }),
                new VectorLayer({
                    source: new VectorSource({ features: [new Feature(new Point(fromLonLat([core.location.lon, core.location.lat])))] }),
                    style: new Style({ image: new Circle({ radius: 6, fill: new Fill({ color: accentPrimaryColor }), stroke: new Stroke({ color: bgPrimaryColor, width: 2 }) }) })
                })
            ],
            view: new View({ center: fromLonLat([core.location.lon, core.location.lat]), zoom: 4 }),
            controls: [],
            interactions: [],
        });
        return () => map.setTarget(undefined);
    }, [core]);

    return (
        <div className="bg-background-primary/50 p-4 rounded-lg border border-border-secondary flex-1">
            <h3 className="text-xl font-bold text-content-primary">{core.id}</h3>
            <p className="text-sm text-content-muted truncate">{core.name}</p>
            <div ref={mapRef} className="w-full h-32 rounded-md overflow-hidden my-3 border border-border-secondary"></div>
            <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2"><MapPin size={14} className="text-accent-secondary"/> <span>{core.location.lat.toFixed(3)}°, {core.location.lon.toFixed(3)}°</span></p>
                <p className="flex items-center gap-2"><Droplet size={14} className="text-accent-secondary"/> <span>{core.waterDepth} m water depth</span></p>
            </div>
        </div>
    );
};

const RangeInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div className="flex flex-col">
        <label className="text-[10px] uppercase font-bold text-content-muted mb-1">{label}</label>
        <input 
            type="number" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-20 bg-background-interactive border border-border-secondary rounded px-2 py-1 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent-primary placeholder-content-muted"
            placeholder="Auto"
        />
    </div>
);


const CoreComparisonView: React.FC<CoreComparisonViewProps> = ({ coreIds, allSections, cores, proxyLabels, onClearCompare, onUpdateSectionData }) => {
    const [showAgeModeler, setShowAgeModeler] = useState(false);
    const [selectedProxy, setSelectedProxy] = useState('delta18O');
    const [xAxisKey, setXAxisKey] = useState<'depth' | 'age'>('depth');
    const [yAxisReversed, setYAxisReversed] = useState(false);
    const [xAxisReversed, setXAxisReversed] = useState(false);

    // Axis Range State
    const [minX, setMinX] = useState('');
    const [maxX, setMaxX] = useState('');
    const [minY, setMinY] = useState('');
    const [maxY, setMaxY] = useState('');

    const core1 = useMemo(() => cores.find(c => c.id === coreIds[0]), [cores, coreIds]);
    const core2 = useMemo(() => cores.find(c => c.id === coreIds[1]), [cores, coreIds]);
    
    const sectionsForChart = useMemo(() => {
        const sectionsForCores = allSections.filter(s => coreIds.includes(s.core_id));
        return sectionsForCores.map(s => {
            const core = cores.find(c => c.id === s.core_id);
            return { ...s, name: core ? `${core.id} / ${s.name}` : s.name };
        });
    }, [coreIds, allSections, cores]);

    const dataSeries = useMemo(() => {
        if (!core1 || !core2) return [];
        const core1Sections = sectionsForChart.filter(s => s.core_id === core1.id);
        const core2Sections = sectionsForChart.filter(s => s.core_id === core2.id);

        return [
            ...core1Sections.map(s => ({ label: s.name, yAxisId: 'left' as const, color: COLORS[0] })),
            ...core2Sections.map(s => ({ label: s.name, yAxisId: 'right' as const, color: COLORS[1] }))
        ];
    }, [sectionsForChart, core1, core2]);

    const availableProxies = useMemo(() => {
        if (!core1 || !core2) return [];

        const getProxiesForCore = (coreId: string): Set<string> => {
            const coreProxies = new Set<string>();
            allSections
                .filter(s => s.core_id === coreId)
                .forEach(section => {
                    section.dataPoints.forEach(dp => {
                        Object.keys(dp).forEach(key => {
                            if (typeof dp[key] === 'number' && key !== 'qcFlag' && key !== 'depth' && key !== 'age') {
                                coreProxies.add(key);
                            }
                        });
                    });
                });
            return coreProxies;
        };

        const proxies1 = getProxiesForCore(core1.id);
        const proxies2 = getProxiesForCore(core2.id);

        const sharedProxies = [...proxies1].filter(p => proxies2.has(p));
        
        return sharedProxies.sort();

    }, [core1, core2, allSections]);

    const hasAgeData = useMemo(() => sectionsForChart.every(s => s.dataPoints.some(dp => dp.age != null)), [sectionsForChart]);

    useEffect(() => {
        if (!availableProxies.includes(selectedProxy)) {
            setSelectedProxy(availableProxies.includes('delta18O') ? 'delta18O' : availableProxies[0] || '');
        }
    }, [availableProxies, selectedProxy]);

    useEffect(() => {
        const newKey = hasAgeData ? 'age' : 'depth';
        setXAxisKey(newKey);
        setXAxisReversed(newKey === 'age');
    }, [hasAgeData]);

    useEffect(() => {
        setYAxisReversed(selectedProxy.includes('delta18O'));
    }, [selectedProxy]);

    const multiChartData = useMemo(() => {
        if (sectionsForChart.length === 0) return [];
        
        const combined = new Map<number, any>();
        
        sectionsForChart.forEach(section => {
            section.dataPoints.forEach(dp => {
                const key = dp[xAxisKey] as number;
                if (key !== undefined && dp[selectedProxy] !== undefined) {
                    if (!combined.has(key)) combined.set(key, { [xAxisKey]: key });
                    combined.get(key)[section.name] = dp[selectedProxy];
                }
            });
        });

        return Array.from(combined.values()).sort((a, b) => a[xAxisKey] - b[xAxisKey]);
    }, [sectionsForChart, selectedProxy, xAxisKey]);

    const manualXDomain = useMemo<[number | 'auto' | 'dataMin', number | 'auto' | 'dataMax']>(() => {
        const min = minX !== '' ? parseFloat(minX) : 'dataMin';
        const max = maxX !== '' ? parseFloat(maxX) : 'dataMax';
        return [min, max];
    }, [minX, maxX]);

    const manualYDomain = useMemo<[number | 'auto' | 'dataMin', number | 'auto' | 'dataMax']>(() => {
        const min = minY !== '' ? parseFloat(minY) : 'auto';
        const max = maxY !== '' ? parseFloat(maxY) : 'auto';
        return [min, max];
    }, [minY, maxY]);

    const selectClass = "w-full bg-background-interactive border border-border-secondary rounded-lg p-2 text-sm text-content-primary focus:ring-2 focus:ring-accent-primary focus:outline-none transition appearance-none bg-no-repeat bg-right pr-8";
    const selectIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='var(--text-muted)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;

    if (!core1 || !core2) {
        return <div className="flex flex-col items-center justify-center h-full text-content-muted"><p>Select two cores to start comparison.</p></div>;
    }
    
    if (showAgeModeler) {
        return <AutomatedAgeModeler core1={core1} core2={core2} allSections={allSections} proxyLabels={proxyLabels} onClose={() => setShowAgeModeler(false)} onApplyAgeModel={onUpdateSectionData} />
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-2xl font-bold text-content-primary flex items-center gap-3"><GitCompare /> Core Comparison</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowAgeModeler(true)} className="px-4 py-2 rounded-lg bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30 transition text-sm font-semibold flex items-center gap-2">
                        <BrainCircuit size={16}/> Automated Age Model
                    </button>
                    <button onClick={onClearCompare} className="px-4 py-2 rounded-lg bg-background-interactive text-content-primary hover:bg-background-interactive-hover transition text-sm font-semibold flex items-center gap-2">
                        <X size={16}/> Clear Comparison
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
                <CoreDetailsMini core={core1} />
                <CoreDetailsMini core={core2} />
            </div>

            <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
                 {/* Top Controls Row */}
                 <div className="flex flex-wrap justify-between items-end gap-4 mb-4">
                     {/* Axis Range Controls */}
                     <div className="flex flex-wrap items-center gap-4 p-3 bg-background-primary/30 rounded-lg border border-border-secondary">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-content-secondary mr-2">X-Axis ({xAxisKey}):</span>
                            <RangeInput label="Min" value={minX} onChange={setMinX} />
                            <span className="text-content-muted">-</span>
                            <RangeInput label="Max" value={maxX} onChange={setMaxX} />
                        </div>
                        <div className="w-px h-8 bg-border-secondary mx-2"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-content-secondary mr-2">Y-Axis:</span>
                            <RangeInput label="Min" value={minY} onChange={setMinY} />
                            <span className="text-content-muted">-</span>
                            <RangeInput label="Max" value={maxY} onChange={setMaxY} />
                        </div>
                    </div>

                    {/* Chart Settings */}
                    <div className="flex flex-wrap items-center gap-4">
                         <div>
                             <label className="text-xs font-medium text-content-muted mr-2">Shared Proxy:</label>
                             <select value={selectedProxy} onChange={e => setSelectedProxy(e.target.value)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em', minWidth: '160px' }}>
                                {availableProxies.length > 0 ? (
                                    availableProxies.map(p => <option key={p} value={p}>{proxyLabels[p] || p}</option>)
                                ) : (
                                    <option>No shared proxies</option>
                                )}
                             </select>
                        </div>
                         <div>
                             <label className="text-xs font-medium text-content-muted mr-2">Domain:</label>
                             <select value={xAxisKey} onChange={e => setXAxisKey(e.target.value as any)} className={selectClass} style={{ backgroundImage: selectIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em', minWidth: '100px' }}>
                                <option value="depth">Depth</option>
                                <option value="age" disabled={!hasAgeData}>Age</option>
                             </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-2 text-xs cursor-pointer text-content-secondary">
                                <input type="checkbox" checked={xAxisReversed} onChange={(e) => setXAxisReversed(e.target.checked)} className="h-3.5 w-3.5 rounded border-border-secondary bg-background-interactive text-accent-primary focus:ring-accent-primary" />
                                Reverse X
                            </label>
                             <label className="flex items-center gap-2 text-xs cursor-pointer text-content-secondary">
                                <input type="checkbox" checked={yAxisReversed} onChange={(e) => setYAxisReversed(e.target.checked)} className="h-3.5 w-3.5 rounded border-border-secondary bg-background-interactive text-accent-primary focus:ring-accent-primary"/>
                                Reverse Y
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ height: '500px' }}>
                    <MultiSectionChart
                        data={multiChartData}
                        dataSeries={dataSeries}
                        proxyKey={selectedProxy}
                        xAxisKey={xAxisKey}
                        proxyLabels={proxyLabels}
                        xAxisReversed={xAxisReversed}
                        yAxisReversed={yAxisReversed}
                        manualXDomain={manualXDomain}
                        manualYDomain={manualYDomain}
                    />
                </div>
            </div>
        </div>
    );
};

export default CoreComparisonView;
