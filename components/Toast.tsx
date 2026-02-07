
import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-close after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const toastConfig = {
    success: {
      icon: <CheckCircle size={20} />,
      bgColor: 'bg-success-primary/20',
      textColor: 'text-success-primary',
      borderColor: 'border-success-primary/30',
    },
    error: {
      icon: <AlertTriangle size={20} />,
      bgColor: 'bg-danger-primary/20',
      textColor: 'text-danger-primary',
      borderColor: 'border-danger-primary/30',
    },
    info: {
      icon: <Info size={20} />,
      bgColor: 'bg-accent-secondary/20',
      textColor: 'text-accent-secondary',
      borderColor: 'border-accent-secondary/30',
    },
  };

  const { icon, bgColor, textColor, borderColor } = toastConfig[type];

  return (
    <div
      className={`fixed bottom-5 right-5 z-[200] w-full max-w-sm p-4 rounded-lg shadow-2xl border backdrop-blur-md flex items-start gap-4 animate-toast-in ${bgColor} ${textColor} ${borderColor}`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-grow text-sm font-semibold">{message}</div>
      <button onClick={onClose} className="p-1 -mr-2 -mt-2 text-content-muted hover:text-content-primary rounded-full">
        <X size={18} />
      </button>
      <style>{`
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-toast-in {
          animation: toast-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;
