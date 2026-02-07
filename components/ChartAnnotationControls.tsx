import React from 'react';

// This component now acts as a simple container for chart-side controls like 'Export'.
const ChartAnnotationControls: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    return (
        <div className="p-3 h-full flex flex-col justify-end items-end">
            {children}
        </div>
    );
};

export default ChartAnnotationControls;
