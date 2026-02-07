
import React from 'react';

// This component is now obsolete.
// PDF generation is handled programmatically by the pdfService.ts using jsPDF.
// This file is kept to avoid breaking imports, but it no longer renders a report.

const FullCoreReport = React.forwardRef<HTMLDivElement, any>((_props, ref) => {
    return <div ref={ref} style={{ display: 'none' }} />;
});

FullCoreReport.displayName = 'FullCoreReport';
export default FullCoreReport;
