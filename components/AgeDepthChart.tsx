import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { TiePoint, Section } from '../types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, Label } from 'recharts';
import { Plus, Minus } from 'lucide-react';

interface AgeDepthChartProps {
  tiePoints: TiePoint[];
  sections: Section[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28'];

const AgeDepthChart: React.FC<AgeDepthChartProps> = ({ tiePoints, sections }) => {
  const [domains, setDomains] = useState<{ x?: [number, number]; y?: [number, number] } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const chartDivRef = useRef<HTMLDivElement>(null);


  const tickFormatter = (value: any) => typeof value === 'number' ? parseFloat(value.toFixed(3)) : value;

  const getAxisDomain = (data: any[], key: string, padding: number = 0.05): [number, number] => {
    const values = data.map(p => p[key]).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    if (range === 0) return [min - 1, max + 1];
    return [min - range * padding, max + range * padding];
  };

  const originalDomains = useMemo(() => {
    if (tiePoints.length < 2) return null;
    return {
      x: getAxisDomain(tiePoints, 'age', 0.05),
      y: getAxisDomain(tiePoints, 'depth', 0.05),
    };
  }, [tiePoints]);

  useEffect(() => {
    setDomains(null);
  }, [tiePoints]);
  
  const handleResetZoom = () => setDomains(null);

  const handleZoom = (zoomFactor: number) => {
    if (!originalDomains) return;
    const { x: currentXDomain, y: currentYDomain } = domains || originalDomains;
    const zoomDomain = (domain: [number, number], originalDomain: [number, number]): [number, number] => {
      const [min, max] = domain;
      const center = (min + max) / 2;
      const newRange = (max - min) * zoomFactor;
      let newMin = center - newRange / 2;
      let newMax = center + newRange / 2;
      if (zoomFactor > 1 && newMin <= originalDomain[0] && newMax >= originalDomain[1]) {
        return originalDomain;
      }
      return [newMin, newMax];
    };
    setDomains({
      x: zoomDomain(currentXDomain, originalDomains.x),
      y: zoomDomain(currentYDomain, originalDomains.y),
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const isZoomInMode = keysPressed.has('a');
    const isZoomOutMode = keysPressed.has('d');
    if (!isZoomInMode && !isZoomOutMode) return;
    
    e.preventDefault();
    const zoomFactor = isZoomInMode ? 0.9 : 1.1;
    handleZoom(zoomFactor);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.key.toLowerCase();
    e.stopPropagation();
    if (['a', 'd', 'm'].includes(key) && !e.repeat) {
        e.preventDefault();
        setKeysPressed(prev => new Set(prev).add(key));
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.key.toLowerCase();
    e.stopPropagation();
    if (['a', 'd', 'm'].includes(key)) {
        e.preventDefault();
        setKeysPressed(prev => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
        });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !keysPressed.has('m')) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !panStart || !originalDomains) return;

    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    
    const { x: currentXDomain, y: currentYDomain } = domains || originalDomains;

    const panDomain = (domain: [number, number], delta: number, originalDomain: [number, number], scale: number): [number, number] => {
        let [min, max] = domain;
        let newMin = min - delta * scale;
        let newMax = max - delta * scale;
        
        const range = max - min;
        if (newMin < originalDomain[0]) {
            newMin = originalDomain[0];
            newMax = newMin + range;
        }
        if (newMax > originalDomain[1]) {
            newMax = originalDomain[1];
            newMin = newMax - range;
        }
        
        return [newMin, newMax];
    };
    
    const chartWidth = e.currentTarget.clientWidth;
    const chartHeight = e.currentTarget.clientHeight;
    
    if (chartWidth === 0 || chartHeight === 0) return;
    
    const xRange = currentXDomain[1] - currentXDomain[0];
    const yRange = currentYDomain[1] - currentYDomain[0];
    
    const xPanScale = xRange / chartWidth;
    const yPanScale = yRange / chartHeight;

    setDomains({
        x: panDomain(currentXDomain, dx, originalDomains.x, xPanScale),
        y: panDomain(currentYDomain, -dy, originalDomains.y, yPanScale),
    });
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsPanning(false);
    setPanStart(null);
  };

  if (tiePoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-content-muted">
        <p>Add tie-points to visualize the age-depth model.</p>
      </div>
    );
  }

  const sectionData = sections.map((section, index) => {
    const points = tiePoints
      .filter(tp => tp.sectionId === section.id)
      .sort((a, b) => a.depth - b.depth);
    return {
      name: section.name,
      data: points,
      color: COLORS[index % COLORS.length],
    };
  }).filter(s => s.data.length > 0);

  return (
    <div 
      ref={chartDivRef}
      tabIndex={-1}
      className="outline-none w-full h-full relative" 
      style={{ cursor: isPanning ? 'grabbing' : (keysPressed.has('m') ? 'grab' : 'crosshair') }} 
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={(e) => {
          handleMouseUpOrLeave(e);
          setKeysPressed(new Set());
      }}
      onDoubleClick={handleResetZoom}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onMouseEnter={() => chartDivRef.current?.focus()}
      onBlur={() => setKeysPressed(new Set())}
      title="Focus chart: A/D + scroll to zoom, M + drag to pan, double-click to reset."
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart 
            margin={{ top: 20, right: 20, bottom: 40, left: 30 }}
        >
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="age"
            name="Age"
            unit=" ka"
            domain={domains?.x || ['dataMin', 'dataMax']}
            reversed
            label={{ value: 'Age (ka)', position: 'insideBottom', offset: -25, fontSize: 14, fill: 'var(--recharts-axis-stroke)' }}
            tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }}
            tickFormatter={tickFormatter}
            stroke="var(--recharts-axis-stroke)"
            allowDataOverflow={true}
          />
          <YAxis
            type="number"
            dataKey="depth"
            name="Depth"
            unit=" mbsf"
            domain={domains?.y || ['dataMin', 'dataMax']}
            reversed
            tick={{ fontSize: 12, fill: 'var(--recharts-axis-stroke)' }}
            tickFormatter={tickFormatter}
            stroke="var(--recharts-axis-stroke)"
            allowDataOverflow={true}
          >
              <Label value="Depth (mbsf)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'var(--recharts-axis-stroke)' }} dx={-20} />
          </YAxis>
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ backgroundColor: 'var(--recharts-tooltip-bg)', border: '1px solid var(--recharts-tooltip-border)' }}
          />
          <Legend wrapperStyle={{ paddingTop: '30px' }} />
          
          {sectionData.map(s => (
            <Scatter key={s.name} name={s.name} data={s.data} fill={s.color} />
          ))}

          {sectionData.map(s => (
              <Line key={`line-${s.name}`} data={s.data} dataKey="depth" stroke={s.color} strokeWidth={2} dot={false} legendType="none" />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="absolute top-2 right-5 z-10 flex flex-col gap-1">
          <button onClick={() => handleZoom(0.9)} className="w-7 h-7 flex items-center justify-center bg-background-interactive/70 text-content-primary rounded-md hover:bg-background-interactive-hover transition-colors" title="Zoom In">
              <Plus size={16} />
          </button>
          <button onClick={() => handleZoom(1.1)} className="w-7 h-7 flex items-center justify-center bg-background-interactive/70 text-content-primary rounded-md hover:bg-background-interactive-hover transition-colors" title="Zoom Out">
              <Minus size={16} />
          </button>
      </div>
    </div>
  );
};

export default AgeDepthChart;