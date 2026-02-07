import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Core, Folder, Section, Microfossil } from '../types';

// OpenLayers imports
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import Overlay from 'ol/Overlay';
import MapFilters from './MapFilters';
import { REGIONS } from '../constants';
import { Globe } from 'lucide-react';

const CoreMap: React.FC<{
  cores: Core[];
  selectedCore: Core | null;
  onSelectCore: (core: Core) => void;
  isSidebarOpen: boolean;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info'; show: boolean; }) => void;
  folders: Folder[];
  allUserSections: Section[];
  microfossils: Microfossil[];
}> = ({ cores, selectedCore, onSelectCore, isSidebarOpen, setToast, folders, allUserSections, microfossils }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<OLMap | null>(null);
  const userCoresVectorSource = useRef(new VectorSource());
  const tooltipOverlay = useRef<Overlay | null>(null);
  const tooltipElementRef = useRef<HTMLDivElement | null>(null);
  
  const [filteredCoreIds, setFilteredCoreIds] = useState<string[] | null>(null);
  const [activeNavRegion, setActiveNavRegion] = useState<string | null>(null);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  
  const coresRef = useRef(cores);
  coresRef.current = cores;
  const onSelectCoreRef = useRef(onSelectCore);
  onSelectCoreRef.current = onSelectCore;
  const selectedCoreRef = useRef(selectedCore);
  selectedCoreRef.current = selectedCore;
  
  const sectionsByCore = useMemo(() => {
    const map = new Map<string, number>();
    allUserSections.forEach(section => {
        map.set(section.core_id, (map.get(section.core_id) || 0) + 1);
    });
    return map;
  }, [allUserSections]);

  const sectionsByCoreRef = useRef(sectionsByCore);
  sectionsByCoreRef.current = sectionsByCore;

  const handleRegionSelect = (region: string | null) => {
    setActiveNavRegion(region);
    if (mapInstance.current) {
        const view = mapInstance.current.getView();
        if (region && REGIONS[region]) {
            const { minLon, maxLon, minLat, maxLat } = REGIONS[region];
            
            if (minLon > maxLon) {
                let centerLon = (minLon + (maxLon + 360)) / 2;
                if (centerLon > 180) centerLon -= 360;
                const centerLat = (minLat + maxLat) / 2;
                view.animate({ center: fromLonLat([centerLon, centerLat]), zoom: 3, duration: 1000 });
            } else {
                const extent = [minLon, minLat, maxLon, maxLat];
                view.fit(transformExtent(extent, 'EPSG:4326', 'EPSG:3857'), { duration: 1000, padding: [50, 50, 50, 50], maxZoom: 6 });
            }
        } else {
            view.animate({ zoom: 2, center: fromLonLat([0, 0]), duration: 1000 });
        }
    }
  };

  // Initialize map on component mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current) return;

    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'ol-tooltip ol-tooltip-hidden';
    mapContainerRef.current.appendChild(tooltipEl);
    tooltipElementRef.current = tooltipEl;
    tooltipOverlay.current = new Overlay({ element: tooltipEl, autoPan: { animation: { duration: 250 } } });

    const userCoreStyle = new Style({ image: new Circle({ radius: 7, fill: new Fill({ color: 'rgba(59, 130, 246, 0.9)' }), stroke: new Stroke({ color: '#ffffff', width: 2 }) }) });
    const selectedUserCoreStyle = new Style({ image: new Circle({ radius: 10, fill: new Fill({ color: 'rgba(234, 179, 8, 1)' }), stroke: new Stroke({ color: '#ffffff', width: 3 }) }), zIndex: 10 });

    const userCoresLayer = new VectorLayer({ source: userCoresVectorSource.current, style: (feature) => feature.get('id') === selectedCoreRef.current?.id ? selectedUserCoreStyle : userCoreStyle });
    
    const map = new OLMap({
      target: mapContainerRef.current,
      layers: [
        new TileLayer({ source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', attributions: 'Esri, GEBCO, NOAA' }) }),
        new TileLayer({ source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}' }), opacity: 0.7 }),
        userCoresLayer
      ],
      overlays: [tooltipOverlay.current],
      view: new View({ center: fromLonLat([0, 0]), zoom: 2, minZoom: 2 }),
    });
    mapInstance.current = map;

    map.on('singleclick', (event) => {
      let featureFound = false;
      map.forEachFeatureAtPixel(event.pixel, (feature) => {
        if (feature.get('type') === 'userCore') {
          const core = coresRef.current.find(c => c.id === feature.get('id'));
          if (core) onSelectCoreRef.current(core);
          featureFound = true;
        }
        return featureFound;
      });
    });

    map.on('pointermove', (event) => {
      const tooltip = tooltipElementRef.current;
      if (event.dragging || !tooltip) { tooltip.classList.add('ol-tooltip-hidden'); return; }
      const featureAtPixel = map.forEachFeatureAtPixel(event.pixel, f => f, { hitTolerance: 5 });
      map.getViewport().style.cursor = featureAtPixel ? 'pointer' : '';

      if (featureAtPixel) {
        const coreData = coresRef.current.find(c => c.id === featureAtPixel.get('id'));
        
        if (coreData && tooltip && tooltipOverlay.current) {
            const sectionCount = sectionsByCoreRef.current.get(coreData.id) || 0;
            const tooltipHtml = `
                <div class="tooltip-title">${coreData.id}</div>
                <div class="tooltip-line">${coreData.name}</div>
                <hr style="border-color: var(--border-secondary); margin: 4px 0;" />
                <div class="tooltip-line"><strong>Project:</strong> ${coreData.project}</div>
                <div class="tooltip-line"><strong>Location:</strong> ${coreData.location.lat.toFixed(3)}°, ${coreData.location.lon.toFixed(3)}°</div>
                <div class="tooltip-line"><strong>Depth:</strong> ${coreData.waterDepth}m</div>
                <div class="tooltip-line"><strong>Sections:</strong> ${sectionCount}</div>
            `;
          tooltip.innerHTML = tooltipHtml;
          tooltipOverlay.current.setPosition((featureAtPixel.getGeometry() as Point).getCoordinates());
          tooltip.classList.remove('ol-tooltip-hidden');
        } else {
            tooltip.classList.add('ol-tooltip-hidden');
        }
      } else {
        tooltip.classList.add('ol-tooltip-hidden');
      }
    });
    
    return () => { map.setTarget(undefined); mapInstance.current = null; };
  }, []);

  const coresToDisplay = useMemo(() => {
    if (filteredCoreIds === null) return cores;
    const idSet = new Set(filteredCoreIds);
    return cores.filter(c => idSet.has(c.id));
  }, [cores, filteredCoreIds]);

  // Update user core features
  useEffect(() => {
    userCoresVectorSource.current.clear();
    userCoresVectorSource.current.addFeatures(coresToDisplay.map(core => new Feature({ geometry: new Point(fromLonLat([core.location.lon, core.location.lat])), id: core.id, type: 'userCore' })));
  }, [coresToDisplay]);

  // Redraw layer when selected core changes
  useEffect(() => { userCoresVectorSource.current.changed(); }, [selectedCore]);

  // Update map size when sidebar opens/closes
  useEffect(() => { if (mapInstance.current) { const timer = setTimeout(() => mapInstance.current?.updateSize(), 310); return () => clearTimeout(timer); } }, [isSidebarOpen]);
  
  return (
    <div className="w-full h-full relative" ref={mapContainerRef}>
        <MapFilters 
            cores={cores}
            folders={folders}
            allUserSections={allUserSections}
            microfossils={microfossils}
            onFilterChange={setFilteredCoreIds}
        />

        <div 
            className="absolute bottom-4 left-4 z-10"
            onMouseEnter={() => setIsNavExpanded(true)}
            onMouseLeave={() => setIsNavExpanded(false)}
        >
            <div className={`bg-[#242e42] text-white rounded-lg shadow-lg transition-all duration-300 ease-in-out overflow-hidden ${isNavExpanded ? 'w-40' : 'w-10 h-10 flex items-center justify-center'}`}>
                {isNavExpanded ? (
                    <div className="p-1 space-y-px">
                        <div className="px-2 pt-1 flex items-center gap-1.5">
                            <Globe size={12}/>
                            <h4 className="text-xs font-bold uppercase text-white/80">Navigate</h4>
                        </div>
                        <button onClick={() => handleRegionSelect(null)} className={`w-full text-left text-xs font-semibold px-2 py-1 rounded-sm transition-colors ${!activeNavRegion ? 'bg-[#323f59]' : 'hover:bg-[#323f59]/80'}`}>
                            Global View
                        </button>
                        {Object.keys(REGIONS).map(regionName => (
                            <button key={regionName} onClick={() => handleRegionSelect(regionName)} className={`w-full text-left text-xs font-semibold px-2 py-1 rounded-sm transition-colors ${activeNavRegion === regionName ? 'bg-[#323f59]' : 'hover:bg-[#323f59]/80'}`}>
                                {regionName}
                            </button>
                        ))}
                    </div>
                ) : (
                    <Globe size={20}/>
                )}
            </div>
        </div>
    </div>
  );
};

export default CoreMap;
