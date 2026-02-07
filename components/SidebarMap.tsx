import React, { useEffect, useRef } from 'react';
import type { Core } from '../types';

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

interface SidebarMapProps {
  cores: Core[];
  hoveredCoreId: string | null;
}

const SidebarMap: React.FC<SidebarMapProps> = ({ cores, hoveredCoreId }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<Map | null>(null);
    const vectorSource = useRef(new VectorSource());

    // Use a ref for hoveredCoreId to be accessible in the style function closure
    const hoveredCoreIdRef = useRef(hoveredCoreId);
    hoveredCoreIdRef.current = hoveredCoreId;

    // Initialize map on component mount
    useEffect(() => {
        if (!mapContainerRef.current || mapInstance.current) return;
        
        // Resolve CSS variables to concrete color values for OpenLayers
        const rootStyle = getComputedStyle(document.documentElement);
        const bgPrimaryColor = rootStyle.getPropertyValue('--bg-primary').trim();
        const accentPrimaryColor = rootStyle.getPropertyValue('--accent-primary').trim();
        const textPrimaryColor = rootStyle.getPropertyValue('--text-primary').trim();
        
        const defaultStyle = new Style({
          image: new Circle({
            radius: 4,
            fill: new Fill({ color: 'var(--accent-secondary)' }), 
            stroke: new Stroke({ color: bgPrimaryColor || '#0f172a', width: 1 }),
          }),
        });

        const hoverStyle = new Style({
            image: new Circle({
                radius: 7,
                fill: new Fill({ color: accentPrimaryColor || '#22d3ee' }),
                stroke: new Stroke({ color: textPrimaryColor || '#f1f5f9', width: 2.5 }),
            }),
            zIndex: 10
        });

        const styleFunction = (feature: Feature<Point>) => {
            return feature.get('id') === hoveredCoreIdRef.current ? hoverStyle : defaultStyle;
        };

        const vectorLayer = new VectorLayer({
            source: vectorSource.current,
            style: styleFunction,
        });

        const map = new Map({
            target: mapContainerRef.current,
            layers: [
                new TileLayer({
                    source: new XYZ({
                        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
                    }),
                }),
                vectorLayer,
            ],
            view: new View({
                center: fromLonLat([-10, 30]),
                zoom: 1.5,
                minZoom: 1,
            }),
            controls: [], // No zoom/attribution controls
            interactions: [], // Make map non-interactive
        });
        mapInstance.current = map;

        return () => {
            mapInstance.current?.setTarget(undefined);
            mapInstance.current = null;
        };
    }, []);

    // Update features when cores data changes
    useEffect(() => {
        const source = vectorSource.current;
        source.clear();
        const features = cores.map(core => {
            const feature = new Feature({
                geometry: new Point(fromLonLat([core.location.lon, core.location.lat])),
            });
            feature.set('id', core.id);
            return feature;
        });
        source.addFeatures(features);
    }, [cores]);

    // Redraw layer when hover state changes
    useEffect(() => {
        vectorSource.current.changed();
    }, [hoveredCoreId]);

    return (
        <div 
            ref={mapContainerRef} 
            className="w-full h-32 bg-background-primary/20 rounded-lg overflow-hidden border border-border-secondary" 
            aria-label="Global mini-map of core locations"
        >
            {/* Map is rendered here */}
        </div>
    );
};

export default SidebarMap;
