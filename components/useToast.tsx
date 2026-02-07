
import React from 'react';
import type { ToastType } from '../types';

// The context should be created but not exported to avoid direct consumption.
// The hook is the public API.
const ToastContext = React.createContext<{ addToast: (toast: Omit<ToastType, 'show'>) => void } | undefined>(undefined);

// The provider component that will wrap the application or parts of it.
export const ToastProvider = ToastContext.Provider;

// The hook that components will use to get the `addToast` function.
export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
