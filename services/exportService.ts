
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { jsPDF as jsPDFType } from 'jspdf';
import html2canvas from 'html2canvas';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Label } from 'recharts';
import { generateReportCoverImage } from './geminiService';

import type { Core, Section, Microfossil, Folder, DataPoint, CustomProxy, Publication, CorePublicationLink } from '../types';
import { ODV_PROXY_LABELS } from '../constants';

// OpenLayers imports for map capture
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


// =================================================================
// PDF STYLING & LAYOUT CONSTANTS
// =================================================================
const FONT_SIZES = { title: 24, h1: 18, h2: 14, h3: 12, body: 10, small: 8, tiny: 7 };
const MARGIN = 15;
const COLORS = {
    primary: '#1e293b', // slate-800
    secondary: '#64748b', // slate-500
    accent: '#0ea5e9',   // sky-500
    light: '#f1f5f9',    // slate-100
    bg_light: '#f8fafc', // slate-50
};

// =================================================================
// PDF HELPER FUNCTIONS
// =================================================================

const addFooter = (doc: jsPDFType, pageNumber: number, totalPages: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(FONT_SIZES.small);
    doc.setTextColor(COLORS.secondary);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - MARGIN / 2, { align: 'center' });
};

const addHeader = (doc: jsPDFType, text: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(FONT_SIZES.small).setTextColor(COLORS.secondary);
    doc.text(text, MARGIN, MARGIN);
    doc.setDrawColor(COLORS.secondary);
    doc.line(MARGIN, MARGIN + 2, pageWidth - MARGIN, MARGIN + 2);
    return MARGIN + 15;
}


const addAutoTable = (doc: jsPDFType, config: any) => {
    autoTable(doc, {
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.light },
        styles: { fontSize: FONT_SIZES.small, cellPadding: 2, lineColor: '#cbd5e1' },
        margin: { left: MARGIN, right: MARGIN },
        ...config,
    });
    return (doc as any).lastAutoTable.finalY;
};


// =================================================================
// ASYNC COMPONENT-TO-IMAGE HELPERS
// =================================================================

const captureMapAsImage = async (core: Core): Promise<string> => {
    const container = document.createElement('div');
    container.style.position = 'absolute'; container.style.left = '-9999px'; container.style.width = '250px'; container.style.height = '200px';
    document.body.appendChild(container);

    const map = new Map({
        target: container,
        layers: [
            new TileLayer({ source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}' }) }),
            new VectorLayer({
                source: new VectorSource({ features: [new Feature(new Point(fromLonLat([core.location.lon, core.location.lat])))] }),
                style: new Style({ image: new Circle({ radius: 6, fill: new Fill({ color: COLORS.accent }), stroke: new Stroke({ color: 'white', width: 2 }) }) })
            })
        ],
        view: new View({ center: fromLonLat([core.location.lon, core.location.lat]), zoom: 3 }),
        controls: [], interactions: [],
    });

    await new Promise(resolve => {
        const layer = map.getLayers().getArray()[0] as TileLayer<any>;
        const source = layer.getSource();
        if (source.getState() === 'ready') resolve(true); else source.on('tileloadend', () => resolve(true));
    });
    await new Promise(resolve => setTimeout(resolve, 500)); 

    const canvas = await html2canvas(container, { useCORS: true });
    document.body.removeChild(container);
    return canvas.toDataURL('image/jpeg', 1.0);
};

const MiniChart: React.FC<any> = ({ data, xKey, yKey, xLabel, yLabel }) => (
    React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
        React.createElement(LineChart, { data, margin: { top: 10, right: 20, bottom: 25, left: 35 } },
            React.createElement(CartesianGrid, { stroke: '#e2e8f0' }),
            React.createElement(XAxis, { dataKey: xKey, type: "number", domain: ['dataMin', 'dataMax'], tick: { fontSize: FONT_SIZES.small, fill: COLORS.secondary }, tickFormatter: (v: any) => v.toFixed(1), reversed: xKey === 'age' },
                React.createElement(Label, { value: xLabel, position: "insideBottom", offset: -15, style: { fontSize: FONT_SIZES.body, fill: COLORS.primary } })
            ),
            React.createElement(YAxis, { domain: ['auto', 'auto'], reversed: yKey.includes('delta18O'), tick: { fontSize: FONT_SIZES.small, fill: COLORS.secondary }, tickFormatter: (v: any) => v.toFixed(2) },
                React.createElement(Label, { value: yLabel, angle: -90, position: "insideLeft", style: { textAnchor: 'middle', fontSize: FONT_SIZES.body, fill: COLORS.primary }, dx: -25 })
            ),
            React.createElement(Line, { type: "monotone", dataKey: yKey, stroke: COLORS.accent, strokeWidth: 1.5, dot: false, connectNulls: true })
        )
    )
);

const renderComponentToJpeg = async (component: React.ReactElement, width: number, height: number): Promise<string> => {
    const container = document.createElement('div');
    container.style.position = 'absolute'; container.style.left = '-9999px'; container.style.width = `${width}px`; container.style.height = `${height}px`;
    container.style.backgroundColor = COLORS.bg_light;
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    root.render(component);
    
    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = await html2canvas(container, { backgroundColor: COLORS.bg_light, scale: 3 });
    root.unmount();
    document.body.removeChild(container);
    return canvas.toDataURL('image/jpeg', 0.95);
};


// =================================================================
// MAIN PDF GENERATION LOGIC
// =================================================================

export const generateFullCoreReport = async (
    core: Core, 
    sections: Section[], 
    microfossils: Microfossil[], 
    userEmail: string, 
    proxyLabels: Record<string, string>,
    publications: Publication[],
    corePublicationLinks: CorePublicationLink[]
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const creationDate = new Date().toLocaleDateString();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (MARGIN * 2);

    // --- Page 1: AI-Generated Cover Page ---
    const aiImageBase64 = await generateReportCoverImage(core);
    if (aiImageBase64) {
        doc.addImage(`data:image/png;base64,${aiImageBase64}`, 'PNG', 0, 0, pageWidth, pageHeight);
    } else {
        doc.setFillColor(COLORS.primary);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
    }
    
    // Add a semi-transparent overlay for text readability
    doc.setFillColor(20, 30, 40, 0.6);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setTextColor(COLORS.light);
    doc.setFontSize(36).setFont('helvetica', 'bold');
    doc.text('CORE REPORT', pageWidth / 2, 80, { align: 'center' });

    doc.setFontSize(24).setFont('helvetica', 'normal');
    doc.text(core.id, pageWidth / 2, 100, { align: 'center' });
    
    doc.setFontSize(16).setTextColor('#a5d8ff');
    doc.text(core.name, pageWidth / 2, 110, { align: 'center' });

    const mapImage = await captureMapAsImage(core);
    doc.addImage(mapImage, 'JPEG', (pageWidth - 80) / 2, 130, 80, 64);

    autoTable(doc, {
        startY: 200,
        body: [[core.project], [`${core.location.lat.toFixed(4)}°, ${core.location.lon.toFixed(4)}°`], [`${core.waterDepth} m water depth`]],
        theme: 'plain',
        styles: { fontSize: 11, textColor: COLORS.light, halign: 'center' },
        margin: { left: MARGIN, right: MARGIN },
    });
    
    doc.setFontSize(FONT_SIZES.tiny).setTextColor('#a5d8ff').setCharSpace(-0.1);
    doc.text(`Report generated by PaleoCore Analyst for ${userEmail} on ${creationDate}`, pageWidth/2, pageHeight - 20, {align: 'center'});
    if (aiImageBase64) {
        doc.text(`Cover art generated by Nano Banana (Gemini Image Model)`, pageWidth/2, pageHeight - 15, {align: 'center'});
    }

    // --- Page 2: Proxy Data Overview ---
    doc.addPage();
    let yPos = addHeader(doc, `Core Report: ${core.id} - Proxy Overview`);

    const allDataPoints = sections.flatMap(s => s.dataPoints);
    const hasAgeData = allDataPoints.every(dp => dp.age != null);
    const xAxisKey = hasAgeData ? 'age' : 'depth';
    const xAxisLabel = hasAgeData ? 'Age (ka)' : 'Depth (mbsf)';
    
    const allProxies = Array.from(new Set(allDataPoints.flatMap(dp => Object.keys(dp))))
        .filter(key => typeof allDataPoints[0]?.[key] === 'number' && !['depth', 'age', 'qcFlag'].includes(key))
        .sort();

    const chartWidth = (contentWidth - 5) / 2;
    const chartHeight = 80;

    for (let i = 0; i < allProxies.length; i++) {
        const proxy = allProxies[i];
        const chartData = allDataPoints.filter(dp => typeof dp[xAxisKey] === 'number' && typeof dp[proxy] === 'number');

        if (chartData.length > 1) {
            const chartImage = await renderComponentToJpeg(
                React.createElement(MiniChart, { data: chartData, xKey: xAxisKey, yKey: proxy, xLabel: xAxisLabel, yLabel: proxyLabels[proxy] || proxy }),
                chartWidth * 3.78, chartHeight * 3.78
            );
            
            const col = i % 2;
            const xPos = MARGIN + col * (chartWidth + 5);

            if (yPos + chartHeight > pageHeight - MARGIN) {
                doc.addPage();
                yPos = addHeader(doc, `Core Report: ${core.id} - Proxy Overview (cont.)`);
            }
            
            doc.addImage(chartImage, 'JPEG', xPos, yPos, chartWidth, chartHeight);
            
            if (col === 1 || i === allProxies.length - 1) {
                yPos += chartHeight + 5;
            }
        }
    }

    // --- Subsequent Section Pages ---
    const sortedSections = [...sections].sort((a, b) => a.sectionDepth - b.sectionDepth);

    for (const section of sortedSections) {
        doc.addPage();
        yPos = addHeader(doc, `Core Report: ${core.id}`);
        
        doc.setFontSize(FONT_SIZES.h1).setFont('helvetica', 'bold').setTextColor(COLORS.primary);
        doc.text(`Section: ${section.name}`, MARGIN, yPos);
        yPos += 10;
        
        yPos = addAutoTable(doc, {
            startY: yPos, body: [
                [{content: 'Section Metadata', colSpan: 4, styles: { fontStyle: 'bold', fillColor: COLORS.primary, textColor: COLORS.light }}],
                ['Recovery Date', section.recoveryDate, 'Epoch', section.epoch],
                ['Age Range', section.ageRange, 'Lithology', section.lithology || 'N/A']
            ]
        }) + 10;
        
        const summary: (string|number)[][] = [];
        const proxies = new Set<string>();
        section.dataPoints.forEach(dp => Object.keys(dp).forEach(key => { if (typeof dp[key] === 'number' && key !== 'qcFlag' && key !== 'depth' && key !== 'age') proxies.add(key); }));

        proxies.forEach(proxyKey => {
            const values = section.dataPoints.map(dp => dp[proxyKey] as number).filter(v => v != null && isFinite(v));
            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                summary.push([ proxyLabels[proxyKey] || proxyKey, values.length, Math.min(...values).toFixed(3), Math.max(...values).toFixed(3), (sum / values.length).toFixed(3) ]);
            }
        });

        if (summary.length > 0) {
             addAutoTable(doc, { startY: yPos, head: [['Data Summary', 'Count', 'Min', 'Max', 'Mean']], body: summary });
        }
    }

    // --- Publications Page ---
    const linkedPubs = publications.filter(pub => corePublicationLinks.some(link => link.core_id === core.id && link.publication_id === pub.id));
    if (linkedPubs.length > 0) {
        doc.addPage();
        yPos = addHeader(doc, `Core Report: ${core.id}`);
        
        doc.setFontSize(FONT_SIZES.h1).setFont('helvetica', 'bold').setTextColor(COLORS.primary);
        doc.text('Publications', MARGIN, yPos);
        yPos += 10;

        linkedPubs.forEach(pub => {
            // APA 7th Edition style formatting
            const authors = pub.authors.replace(/ et al\.$/, ' et al.');
            const fullCitation = `${authors} (${pub.year}). ${pub.title}. *${pub.journal}*.`;
            const doiLink = `https://doi.org/${pub.doi}`;

            const splitText = doc.splitTextToSize(fullCitation, contentWidth);
            if (yPos + (splitText.length * 5) + 5 > pageHeight - MARGIN) {
                doc.addPage();
                yPos = addHeader(doc, `Core Report: ${core.id}`);
                doc.setFontSize(FONT_SIZES.h1).setFont('helvetica', 'bold').setTextColor(COLORS.primary);
                doc.text('Publications (continued)', MARGIN, yPos);
                yPos += 10;
            }
            
            doc.setFontSize(FONT_SIZES.body);
            // Manually handle italics for journal title
            const parts = fullCitation.split('*');
            let currentX = MARGIN;
            parts.forEach((part, index) => {
                doc.setFont('helvetica', index % 2 === 1 ? 'italic' : 'normal');
                doc.text(part, currentX, yPos, { charSpace: -0.1 });
                currentX += doc.getTextWidth(part);
            });
            yPos += 6;

            doc.setFont('helvetica', 'normal').setTextColor(COLORS.accent);
            doc.textWithLink(doiLink, MARGIN, yPos, { url: doiLink });
            yPos += 10;
        });
    }

    // --- Finalization ---
    const totalPageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPageCount; i++) {
        doc.setPage(i);
        addFooter(doc, i, totalPageCount);
    }
    
    doc.save(`${core.id}_Report_NanoBanana.pdf`);
};

// ODV Export function (unmodified)
export const exportFolderToOdv = (folder: Folder, cores: Core[], allSections: Section[], customProxies: CustomProxy[], options: { variables: string[], excludeFlaggedData: boolean }) => {
    
    const sectionsToExport = allSections.filter(section => {
        const hasData = section.dataPoints && section.dataPoints.length > 0;
        const hasSelectedVariables = hasData && section.dataPoints.some(dp => options.variables.some(v => v in dp));
        return hasSelectedVariables;
    });

    if (sectionsToExport.length === 0) {
        throw new Error("No data points with the selected variables found in this folder.");
    }
    
    const delimiter = '\t'; // Tab-separated for ODV generic spreadsheet format

    const staticHeaders = ['Cruise', 'Station', 'Type', 'Longitude [degrees_east]', 'Latitude [degrees_north]', 'DEPTH [m]'];
    const customProxyMap = new Map(customProxies.map(p => [p.key, p]));
    const dynamicHeaders = options.variables.map(key => {
        if (ODV_PROXY_LABELS[key]) return ODV_PROXY_LABELS[key];
        const customProxy = customProxyMap.get(key);
        if (customProxy) return `${customProxy.label.replace(/\s/g, '_')}${customProxy.unit ? ` [${customProxy.unit}]` : ''}`;
        return key;
    });
    const allHeaders = [...staticHeaders, ...dynamicHeaders];

    let odvContent = `// Source File: PaleoCore Analyst Export (ODV Generic Spreadsheet Format)\n`;
    odvContent += `// Project: ${folder.name}\n// Generated on: ${new Date().toISOString()}\n//---\n`;
    odvContent += allHeaders.join(delimiter) + '\n';

    const coreMap = new Map(cores.map(c => [c.id, c]));

    sectionsToExport.forEach(section => {
        const core = coreMap.get(section.core_id);
        if (!core) return;
        const dataPoints = options.excludeFlaggedData ? section.dataPoints.filter(dp => dp.qcFlag === 0 || dp.qcFlag === undefined) : section.dataPoints;

        dataPoints.forEach(dp => {
            const staticValues = [core.project.replace(/\s/g, '_'), core.id.replace(/\s/g, '_'), 'C', core.location.lon, core.location.lat, core.waterDepth];
            const dynamicValues = options.variables.map(header => {
                const value = dp[header];
                return (value === null || value === undefined) ? '' : String(value);
            });
            if (dynamicValues.some(v => v !== '')) {
                odvContent += [...staticValues, ...dynamicValues].join(delimiter) + '\n';
            }
        });
    });

    const blob = new Blob([odvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PaleoCore_Export_${folder.name.replace(/\s/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};
