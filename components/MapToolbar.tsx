import React from 'react';
import { MousePointer2, RectangleHorizontal, PenTool, Trash2, Loader2 } from 'lucide-react';
import type { MapInteractionMode } from '../types';

interface MapToolbarProps {
  interactionMode: MapInteractionMode;
  onInteractionChange: (mode: MapInteractionMode) => void;
  onClearNoaaCores: () => void;
  hasNoaaCores: boolean;
  isNoaaLoading: boolean;
}

const ToolButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, isActive, onClick, children }) => (
    <button
        onClick={onClick}
        title={label}
        aria-label={label}
        className={`p-2.5 rounded-md transition-colors ${
            isActive
                ? 'bg-accent-primary text-accent-primary-text'
                : 'text-content-muted hover:bg-background-interactive hover:text-content-primary'
        }`}
    >
        {children}
    </button>
);


const MapToolbar: React.FC<MapToolbarProps> = ({ interactionMode, onInteractionChange, onClearNoaaCores, hasNoaaCores, isNoaaLoading }) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background-primary/80 backdrop-blur-sm rounded-lg shadow-lg border border-border-primary text-content-primary flex items-center p-1 space-x-1">
        <ToolButton label="Pan & Select" isActive={interactionMode === 'pan'} onClick={() => onInteractionChange('pan')}>
            <MousePointer2 size={18} />
        </ToolButton>
        <ToolButton label="Search by Rectangle" isActive={interactionMode === 'draw-rect'} onClick={() => onInteractionChange('draw-rect')}>
            <RectangleHorizontal size={18} />
        </ToolButton>
        <ToolButton label="Search by Polygon" isActive={interactionMode === 'draw-poly'} onClick={() => onInteractionChange('draw-poly')}>
            <PenTool size={18} />
        </ToolButton>
        
        <div className="w-px h-6 bg-border-secondary mx-1" />

        <button
            onClick={onClearNoaaCores}
            title="Clear Search Results"
            aria-label="Clear Search Results"
            disabled={!hasNoaaCores && !isNoaaLoading}
            className="p-2.5 rounded-md text-content-muted hover:bg-danger-primary/20 hover:text-danger-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-content-muted"
        >
            {isNoaaLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
        </button>
    </div>
  );
};

export default MapToolbar;