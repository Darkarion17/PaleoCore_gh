import React, { useState, useEffect } from 'react';
import { Shield, Loader2, AlertTriangle, X } from 'lucide-react';

interface MfaChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const MfaChallengeModal: React.FC<MfaChallengeModalProps> = ({ isOpen, onClose, onVerify, loading, error }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        // Reset code and focus input when modal opens
        setVerificationCode('');
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length === 6 && !loading) {
      onVerify(verificationCode);
    }
  };
  
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onMouseDown={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-md border border-slate-700 m-4" onMouseDown={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Shield /> Two-Factor Authentication</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
          </div>
          
          <p className="text-sm text-slate-400">
            For your security, please enter the 6-digit code from your authenticator app to complete sign in.
          </p>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="••••••"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg py-4 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition text-3xl tracking-[0.8em] text-center"
              required
              maxLength={6}
              inputMode="numeric"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading || verificationCode.length !== 6}
            className="w-full flex items-center justify-center gap-2 p-3 mt-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-all duration-200 shadow-lg hover:shadow-cyan-500/30 disabled:bg-slate-600 disabled:cursor-wait"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Sign In'}
          </button>
        </form>
      </div>
      <style>{`
        @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default MfaChallengeModal;
