import React, { useRef, useEffect } from 'react';
import type { Core } from '../types';
import { GitCompare } from 'lucide-react';

// OpenLayers imports
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

interface ComparisonSelectorProps {
    currentCore: Core;
    otherCores: Core[];
    onSelectCore: (coreId: string) => void;
}

const ComparisonSelector: React.FC<ComparisonSelectorProps> = ({ currentCore, otherCores, onSelectCore }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<OLMap | null>(null);

    const onSelectCoreRef = useRef(onSelectCore);
    onSelectCoreRef.current = onSelectCore;

    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        const accentSecondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim();
        const textPrimaryColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();

        const vectorSource = new VectorSource();
        const features = otherCores.map(core => {
            const feature = new Feature({
                geometry: new Point(fromLonLat([core.location.lon, core.location.lat])),
            });
            feature.set('id', core.id);
            return feature;
        });
        vectorSource.addFeatures(features);

        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: new Style({
                image: new Circle({
                    radius: 7,
                    fill: new Fill({ color: accentSecondaryColor }),
                    stroke: new Stroke({ color: textPrimaryColor, width: 2 }),
                }),
            }),
        });

        const map = new OLMap({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new XYZ({
                        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
                        attributions: 'Esri, GEBCO, NOAA'
                    })
                }),
                vectorLayer
            ],
            view: new View({
                center: fromLonLat([0, 0]),
                zoom: 2,
                minZoom: 2,
            }),
        });
        mapInstance.current = map;

        map.on('pointermove', (evt) => {
            const hit = map.hasFeatureAtPixel(evt.pixel);
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        });
        
        map.on('singleclick', (event) => {
            map.forEachFeatureAtPixel(event.pixel, (feature) => {
                const coreId = feature.get('id');
                if (coreId) {
                    onSelectCoreRef.current(coreId);
                }
            });
        });

        return () => {
            map.setTarget(undefined);
            mapInstance.current = null;
        };
    }, [otherCores]);

    return (
        <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
            <h2 className="text-2xl font-bold text-content-primary flex items-center gap-3">
                <GitCompare /> Compare <span className="text-accent-primary">{currentCore.id}</span> with...
            </h2>
            <p className="text-content-muted mt-2 mb-4">Select another core from the map to begin a side-by-side comparison.</p>
            <div ref={mapRef} className="w-full h-[450px] rounded-lg overflow-hidden border border-border-secondary bg-background-primary" />
        </div>
    );
};

export default ComparisonSelector;