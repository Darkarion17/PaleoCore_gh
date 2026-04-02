

import React, { useEffect, useRef, useState } from 'react';
import type { Core, Publication, CorePublicationLink } from '../types';
import { MapPin, Droplet, Pencil, LocateFixed, Trash2, Download, Loader2, Compass, BookCopy, Link as LinkIcon, PlusCircle } from 'lucide-react';
import LinkPublicationModal from './LinkPublicationModal';

// OpenLayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import { defaults as defaultControls } from 'ol/control';

interface CoreDetailsProps {
  core: Core;
  publications: Publication[];
  corePublicationLinks: CorePublicationLink[];
  onEdit: (core: Core) => void;
  onDelete: (coreId: string) => void;
  onGoToMap: () => void;
  onGenerateFullReport: () => void;
  isGeneratingFullReport: boolean;
  onOpenNearbyCores: () => void;
  onLinkCoreToPublication: (coreId: string, publicationId: string) => void;
  onUnlinkCoreFromPublication: (coreId: string, publicationId: string) => void;
  onOpenPublicationModal: (publication: Publication | null) => void;
}

const CoreDetails: React.FC<CoreDetailsProps> = ({ 
  core, 
  publications = [], 
  corePublicationLinks = [], 
  onEdit, 
  onDelete, 
  onGoToMap, 
  onGenerateFullReport, 
  isGeneratingFullReport, 
  onOpenNearbyCores, 
  onLinkCoreToPublication, 
  onUnlinkCoreFromPublication, 
  onOpenPublicationModal 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const featureRef = useRef<Feature<Point> | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const linkedPublications = React.useMemo(() => {
    const linkedPubIds = corePublicationLinks
      .filter(link => link.core_id === core.id)
      .map(link => link.publication_id);
    return publications.filter(pub => linkedPubIds.includes(pub.id));
  }, [core.id, publications, corePublicationLinks]);

  // Effect to initialize map
  useEffect(() => {
      if (!mapContainerRef.current || mapInstance.current) return;
      
      // Resolve CSS variables to concrete color values for OpenLayers
      const rootStyle = getComputedStyle(document.documentElement);
      const accentPrimaryColor = rootStyle.getPropertyValue('--accent-primary').trim();
      const bgPrimaryColor = rootStyle.getPropertyValue('--bg-primary').trim();
      
      featureRef.current = new Feature(new Point(fromLonLat([0,0])));
      const vectorSource = new VectorSource({ features: [featureRef.current] });

      const map = new Map({
          target: mapContainerRef.current,
          layers: [
              new TileLayer({
                  source: new XYZ({
                      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
                  }),
              }),
               new TileLayer({
                  source: new XYZ({
                    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
                    attributions: 'Esri, GEBCO, NOAA',
                  }),
                  opacity: 0.7,
              }),
              new VectorLayer({
                  source: vectorSource,
                  style: new Style({
                      image: new Circle({
                          radius: 8,
                          fill: new Fill({ color: accentPrimaryColor || '#22d3ee' }),
                          stroke: new Stroke({ color: bgPrimaryColor || '#0f172a', width: 2 }),
                      }),
                  }),
              })
          ],
          view: new View({
              center: fromLonLat([0, 0]),
              zoom: 2,
              minZoom: 2,
          }),
          controls: defaultControls({
            attribution: false,
            zoom: true,
            rotate: false,
          }),
      });
      mapInstance.current = map;
      
      return () => {
          mapInstance.current?.setTarget(undefined);
          mapInstance.current = null;
      };
  }, []); // Empty dependency array, runs once.

  // Effect to update map when core changes
  useEffect(() => {
      if (mapInstance.current && featureRef.current) {
          const newCenter = fromLonLat([core.location.lon, core.location.lat]);
          mapInstance.current.getView().animate({
              center: newCenter,
              duration: 600,
              zoom: 5,
          });
          (featureRef.current.getGeometry() as Point).setCoordinates(newCenter);
      }
      const timer = setTimeout(() => mapInstance.current?.updateSize(), 310);
      return () => clearTimeout(timer);
  }, [core]);

  return (
    <>
    <div className="bg-background-tertiary/20 p-6 rounded-xl border border-border-primary flex flex-col md:flex-row gap-6 animate-fade-in">
        <div className="flex-grow space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <span className="micro-label">Core Identifier</span>
                    <h1 className="text-3xl font-bold text-content-primary tracking-tighter font-mono">{core.id}</h1>
                    <p className="text-content-muted text-sm mt-1">{core.name} • <span className="font-mono">{core.project}</span></p>
                </div>
                <div className="flex items-center gap-2">
                      <button
                        onClick={onGenerateFullReport}
                        disabled={isGeneratingFullReport}
                        className="p-2 rounded-lg bg-background-interactive text-content-secondary hover:text-accent-primary border border-border-primary transition-all disabled:opacity-50"
                        title="Download Full Report"
                      >
                          {isGeneratingFullReport ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                      </button>
                       <button
                        onClick={onOpenNearbyCores}
                        className="p-2 rounded-lg bg-background-interactive text-content-secondary hover:text-accent-primary border border-border-primary transition-all"
                        title="NOAA Nearby Cores"
                      >
                          <Compass size={18} />
                      </button>
                      <button onClick={() => onEdit(core)} className="p-2 rounded-lg bg-background-interactive text-content-secondary hover:text-accent-primary border border-border-primary transition-all" title="Edit Metadata">
                          <Pencil size={18} />
                      </button>
                      <button onClick={() => onDelete(core.id)} className="p-2 rounded-lg bg-danger-primary/10 text-danger-primary hover:bg-danger-primary hover:text-white border border-danger-primary/20 transition-all" title="Delete Core">
                          <Trash2 size={18} />
                      </button>
                  </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <span className="micro-label block mb-1">Geospatial Coordinates</span>
                        <div className="flex items-center gap-3 bg-background-secondary/50 p-3 rounded-lg border border-border-secondary">
                            <MapPin size={16} className="text-accent-primary" />
                            <span className="text-sm font-mono text-content-primary">{`${core.location.lat.toFixed(6)}°, ${core.location.lon.toFixed(6)}°`}</span>
                            <button onClick={onGoToMap} className="ml-auto text-accent-primary hover:text-accent-primary-hover transition-colors" title="Locate on map">
                                <LocateFixed size={16}/>
                            </button>
                        </div>
                    </div>
                    <div>
                        <span className="micro-label block mb-1">Bathymetry</span>
                        <div className="flex items-center gap-3 bg-background-secondary/50 p-3 rounded-lg border border-border-secondary">
                            <Droplet size={16} className="text-accent-primary" />
                            <span className="text-sm font-mono text-content-primary">{core.waterDepth} <span className="text-[10px] text-content-muted uppercase">meters</span></span>
                        </div>
                    </div>
                </div>

                <div>
                    <span className="micro-label block mb-1">Scientific Documentation</span>
                    <div className="bg-background-secondary/50 p-3 rounded-lg border border-border-secondary min-h-[100px] flex flex-col">
                        {linkedPublications.length > 0 ? (
                            <ul className="space-y-2 mb-3">
                                {linkedPublications.map(pub => (
                                    <li key={pub.id} className="text-[11px] text-content-secondary flex items-start gap-2 group">
                                         <button onClick={() => onOpenPublicationModal(pub)} className="text-left hover:text-accent-primary transition-colors leading-tight">
                                            <span className="font-bold">{pub.authors.split(',')[0]} ({pub.year})</span>: {pub.title.length > 60 ? pub.title.substring(0, 60) + '...' : pub.title}
                                        </button>
                                        <button
                                            onClick={() => onUnlinkCoreFromPublication(core.id, pub.id)}
                                            className="opacity-0 group-hover:opacity-100 text-danger-primary hover:text-danger-primary transition-opacity mt-0.5"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-[11px] text-content-muted italic mb-3">No publications linked to this core.</p>
                        )}
                        <div className="mt-auto flex items-center gap-4 pt-2 border-t border-border-secondary/50">
                            <button onClick={() => setIsLinkModalOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-accent-primary hover:text-accent-primary-hover uppercase tracking-wider transition-colors">
                                <LinkIcon size={10}/> Link
                            </button>
                             <button onClick={() => onOpenPublicationModal(null)} className="flex items-center gap-1 text-[10px] font-bold text-accent-primary hover:text-accent-primary-hover uppercase tracking-wider transition-colors">
                                <PlusCircle size={10}/> New
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

         <div className="w-full md:w-64 flex flex-col gap-2">
            <span className="micro-label">Site Context</span>
            <div
                ref={mapContainerRef}
                className="w-full aspect-square rounded-xl overflow-hidden bg-background-secondary border border-border-primary grayscale hover:grayscale-0 transition-all duration-500"
                aria-label="Mini-map showing core location"
            >
                {/* Map is rendered here by OpenLayers */}
            </div>
            <p className="text-[10px] text-content-muted text-center font-mono uppercase tracking-widest">Interactive Satellite Reference</p>
        </div>
    </div>
    <LinkPublicationModal 
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        coreId={core.id}
        allPublications={publications}
        linkedPublicationIds={linkedPublications.map(p => p.id)}
        onLink={onLinkCoreToPublication}
    />
    </>
  );
};

export default CoreDetails;