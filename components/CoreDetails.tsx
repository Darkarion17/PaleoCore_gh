

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
    <div className="bg-background-primary p-6 rounded-lg shadow-md border border-border-primary">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h1 className="text-2xl font-bold text-content-primary">{core.id}</h1>
                <p className="text-content-muted">{core.name}</p>
                <p className="text-sm text-content-secondary mt-1">{core.project}</p>
            </div>
            <div className="flex items-center gap-1.5 pt-1 flex-shrink-0">
                  <button
                    onClick={onGenerateFullReport}
                    disabled={isGeneratingFullReport}
                    className="p-2 rounded-md bg-background-interactive text-content-secondary hover:bg-background-interactive-hover hover:text-content-primary transition-colors disabled:cursor-wait"
                    aria-label="Download Full Core Report"
                    title="Download Full Core Report"
                  >
                      {isGeneratingFullReport ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  </button>
                   <button
                    onClick={onOpenNearbyCores}
                    className="p-2 rounded-md bg-background-interactive text-content-secondary hover:bg-background-interactive-hover hover:text-content-primary transition-colors"
                    aria-label="Find Nearby Cores"
                    title="Find Nearby Cores from NOAA"
                  >
                      <Compass size={18} />
                  </button>
                  <button onClick={() => onEdit(core)} className="p-2 rounded-md bg-background-interactive text-content-secondary hover:bg-background-interactive-hover hover:text-content-primary transition-colors" aria-label="Edit Core" title="Edit Core">
                      <Pencil size={18} />
                  </button>
                  <button onClick={() => onDelete(core.id)} className="p-2 rounded-md bg-danger-primary/20 text-danger-primary hover:bg-danger-primary/40 hover:text-content-inverted transition-colors" aria-label="Delete Core" title="Delete Core">
                      <Trash2 size={18} />
                  </button>
              </div>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-6 justify-between items-start">
            <div className="space-y-3 flex-grow min-w-0">
                <div className="flex items-center text-sm">
                    <MapPin size={16} className="text-accent-secondary mr-3 flex-shrink-0" />
                    <div>
                        <span className="font-semibold text-content-primary">Location:</span>
                        <span className="text-content-secondary ml-2">{`${core.location.lat.toFixed(4)}°, ${core.location.lon.toFixed(4)}°`}</span>
                        <button onClick={onGoToMap} className="ml-2 p-1 rounded-md text-content-muted hover:bg-background-interactive hover:text-accent-primary transition-colors" title="Show on map">
                            <LocateFixed size={16}/>
                        </button>
                    </div>
                </div>
                 <div className="flex items-center text-sm">
                    <Droplet size={16} className="text-accent-secondary mr-3 flex-shrink-0" />
                    <div>
                        <span className="font-semibold text-content-primary">Water Depth:</span>
                        <span className="text-content-secondary ml-2">{`${core.waterDepth} m`}</span>
                    </div>
                </div>
                 <div className="flex items-start text-sm">
                    <BookCopy size={16} className="text-accent-secondary mr-3 flex-shrink-0 mt-1" />
                    <div className="flex-grow">
                        <span className="font-semibold text-content-primary">Linked Publications:</span>
                        {linkedPublications.length > 0 ? (
                            <ul className="space-y-1 mt-1">
                                {linkedPublications.map(pub => (
                                    <li key={pub.id} className="text-xs text-content-secondary flex items-center gap-2 group">
                                         <button onClick={() => onOpenPublicationModal(pub)} className="text-left hover:text-accent-primary transition-colors">
                                            {pub.authors.split(',')[0]} et al. ({pub.year}) - {pub.title}
                                        </button>
                                        <button
                                            onClick={() => onUnlinkCoreFromPublication(core.id, pub.id)}
                                            className="opacity-0 group-hover:opacity-100 text-danger-primary/70 hover:text-danger-primary transition-opacity"
                                            title="Unlink publication"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-content-muted mt-1">No publications linked.</p>
                        )}
                         <div className="flex items-center gap-4 mt-2">
                            <button onClick={() => setIsLinkModalOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold text-accent-primary hover:text-accent-primary-hover transition-colors">
                                <LinkIcon size={12}/> Link Publication
                            </button>
                             <button onClick={() => onOpenPublicationModal(null)} className="flex items-center gap-1.5 text-xs font-semibold text-accent-primary hover:text-accent-primary-hover transition-colors">
                                <PlusCircle size={12}/> Add Publication
                            </button>
                        </div>
                    </div>
                </div>
            </div>
             <div
                ref={mapContainerRef}
                className="w-full md:w-48 h-48 rounded-lg overflow-hidden bg-background-secondary border border-border-secondary flex-shrink-0"
                aria-label="Mini-map showing core location"
            >
                {/* Map is rendered here by OpenLayers */}
            </div>
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