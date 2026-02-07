import React from 'react';
import { Expand } from 'lucide-react';

interface PresentationButtonProps {
  targetRef: React.RefObject<HTMLElement>;
}

const PresentationButton: React.FC<PresentationButtonProps> = ({ targetRef }) => {
  const handlePresentationMode = () => {
    if (targetRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        targetRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      }
    }
  };

  return (
    <button
      onClick={handlePresentationMode}
      className="presentation-button-instance p-2 rounded-md bg-background-interactive text-content-secondary hover:bg-background-interactive-hover hover:text-content-primary transition-colors"
      title="Enter Presentation Mode (Esc to exit)"
    >
      <Expand size={16} />
    </button>
  );
};

export default PresentationButton;