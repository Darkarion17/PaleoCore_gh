
import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmButtonText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmButtonText = 'Confirm' }) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in-fast" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-md border border-slate-700 m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-900/50 rounded-full">
                            <AlertTriangle size={24} className="text-red-300" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                </div>
                <p className="text-slate-300 mb-8">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition font-semibold">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition font-semibold"
                    >
                        {confirmButtonText}
                    </button>
                </div>
            </div>
             <style>{`
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ConfirmModal;
