
import React from 'react';
import type { Section } from '../types';
import QasTuningWorkspace from './QasTuningWorkspace';

interface ChronologyTabProps {
  sections: Section[];
  onCalibratedDataChange: (calibratedSections: Section[]) => void;
  setToast: (toast: any) => void;
}

const ChronologyTab: React.FC<ChronologyTabProps> = ({ sections, onCalibratedDataChange, setToast }) => {
  const [selectedSectionId, setSelectedSectionId] = React.useState(sections[0]?.id || '');

  const activeSection = React.useMemo(() => 
    sections.find(s => s.id === selectedSectionId) || sections[0], 
  [sections, selectedSectionId]);

  const handleUpdateModel = (calibratedSection: Section) => {
    const updatedSections = sections.map(s => s.id === calibratedSection.id ? calibratedSection : s);
    onCalibratedDataChange(updatedSections);
    setToast({ message: `Age model for ${calibratedSection.name} saved.`, type: 'success', show: true });
  };

  if (sections.length === 0) {
      return (
          <div className="h-64 flex flex-col items-center justify-center text-content-muted border-2 border-dashed border-border-primary rounded-xl">
              <p>No sections available to calibrate.</p>
          </div>
      );
  }

  return (
    <div className="space-y-4">
        <div className="flex items-center gap-4 border-b border-border-primary pb-2">
            <span className="text-xs font-bold text-content-muted uppercase">Select Section:</span>
            <div className="flex gap-2">
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSelectedSectionId(s.id)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${selectedSectionId === s.id ? 'bg-accent-primary text-white' : 'bg-background-interactive/40 text-content-muted hover:text-content-primary'}`}
                    >
                        {s.name}
                    </button>
                ))}
            </div>
        </div>

        <div className="h-[750px]">
            <QasTuningWorkspace 
                section={activeSection} 
                proxyLabels={{}} // App handles this globally
                onSaveModel={handleUpdateModel}
                setToast={setToast}
            />
        </div>
    </div>
  );
};

export default ChronologyTab;
