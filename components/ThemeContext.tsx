
import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';

// Define theme structure
export interface Theme {
  name: string;
  colors: Record<string, string>;
}

// Define available themes
export const themes: Theme[] = [
  {
    name: 'dark',
    colors: {
        '--bg-primary': '#1e293b', // slate-800
        '--bg-secondary': '#0f172a', // slate-900
        '--bg-tertiary': '#334155', // slate-700
        '--bg-interactive': '#475569', // slate-600
        '--bg-interactive-hover': '#64748b', // slate-500
        '--text-primary': '#f1f5f9', // slate-100
        '--text-secondary': '#cbd5e1', // slate-300
        '--text-muted': '#94a3b8', // slate-400
        '--text-inverted': '#0f172a', // slate-900
        '--border-primary': '#334155', // slate-700
        '--border-secondary': '#475569', // slate-600
        '--accent-primary': '#0ea5e9', // sky-500
        '--accent-primary-hover': '#0284c7', // sky-600
        '--accent-primary-text': '#ffffff',
        '--accent-secondary': '#38bdf8', // light-blue-400
        '--danger-primary': '#e11d48', // rose-600
        '--danger-secondary': '#be123c', // rose-700
        '--success-primary': '#16a34a', // green-600
        // Chart colors
        '--recharts-tooltip-bg': '#1e293b',
        '--recharts-tooltip-border': '#334155',
        '--recharts-tooltip-text': '#f1f5f9',
        '--recharts-grid-stroke': '#334155',
        '--recharts-axis-stroke': '#94a3b8',
    },
  },
  {
    name: 'light',
    colors: {
      '--bg-primary': '#ffffff', // white
      '--bg-secondary': '#f1f5f9', // slate-100
      '--bg-tertiary': '#e2e8f0', // slate-200
      '--bg-interactive': '#cbd5e1', // slate-300
      '--bg-interactive-hover': '#94a3b8', // slate-400
      '--text-primary': '#1e293b', // slate-800
      '--text-secondary': '#475569', // slate-600
      '--text-muted': '#64748b', // slate-500
      '--text-inverted': '#ffffff', // white
      '--border-primary': '#e2e8f0', // slate-200
      '--border-secondary': '#cbd5e1', // slate-300
      '--accent-primary': '#0891b2', // cyan-600
      '--accent-primary-hover': '#0e7490', // cyan-700
      '--accent-primary-text': '#ffffff',
      '--accent-secondary': '#0284c7', // sky-600
      '--danger-primary': '#e11d48', // rose-600
      '--danger-secondary': '#be123c', // rose-700
      '--success-primary': '#16a34a', // green-600
      // Chart colors
      '--recharts-tooltip-bg': '#1e293b', // slate-800
      '--recharts-tooltip-border': '#334155', // slate-700
      '--recharts-tooltip-text': '#f1f5f9', // slate-100
      '--recharts-grid-stroke': '#e2e8f0', // slate-200
      '--recharts-axis-stroke': '#64748b', // slate-500
    },
  },
  {
    name: 'oceanic',
    colors: {
        '--bg-primary': '#0c243b', // dark blue
        '--bg-secondary': '#123456',
        '--bg-tertiary': '#1a436b',
        '--bg-interactive': '#2a6f97',
        '--bg-interactive-hover': '#4a8fba',
        '--text-primary': '#e0f2fe', // light blue
        '--text-secondary': '#a5d8ff',
        '--text-muted': '#89c2d9',
        '--text-inverted': '#0c243b',
        '--border-primary': '#1a436b',
        '--border-secondary': '#2a6f97',
        '--accent-primary': '#00a6fb', // bright blue
        '--accent-primary-hover': '#0095e0',
        '--accent-primary-text': '#ffffff',
        '--accent-secondary': '#4cc9f0',
        '--danger-primary': '#ff4d6d',
        '--danger-secondary': '#c9184a',
        '--success-primary': '#52b788',
        '--recharts-tooltip-bg': 'rgba(18, 52, 86, 0.9)',
        '--recharts-tooltip-border': '#2a6f97',
        '--recharts-tooltip-text': '#e0f2fe',
        '--recharts-grid-stroke': '#1a436b',
        '--recharts-axis-stroke': '#89c2d9',
    },
  },
];

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    // Check for saved theme in localStorage or default to 'dark'
    try {
        const savedTheme = window.localStorage.getItem('paleocore-theme');
        return savedTheme && themes.some(t => t.name === savedTheme) ? savedTheme : 'dark';
    } catch {
        return 'dark';
    }
  });

  useEffect(() => {
    const selectedTheme = themes.find(t => t.name === theme);
    if (selectedTheme) {
      const root = document.documentElement;
      Object.entries(selectedTheme.colors).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      // Add a data-theme attribute for any CSS that needs it
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const setTheme = (newTheme: string) => {
    try {
        window.localStorage.setItem('paleocore-theme', newTheme);
    } catch (error) {
        console.warn('Could not save theme to localStorage.', error);
    }
    setThemeState(newTheme);
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
