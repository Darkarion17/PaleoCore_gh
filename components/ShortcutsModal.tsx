
import React from 'react';
import { X, Keyboard } from 'lucide-react';
import ShortcutsList from './ShortcutsList';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-background-tertiary rounded-xl shadow-2xl p-8 w-full max-w-2xl border border-border-primary m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-content-primary flex items-center gap-3">
                        <Keyboard size={24} />
                        Keyboard Shortcuts
                    </h2>
                    <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <ShortcutsList />
            </div>
             <style>{`
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ShortcutsModal;