
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search } from 'lucide-react';

export interface Command {
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    category: string;
    onExecute: () => void;
    shortcut?: string[];
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    commands: Command[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLUListElement>(null);
    
    const filteredCommands = useMemo(() => {
        if (!searchTerm) return commands;
        const lowercasedTerm = searchTerm.toLowerCase();
        return commands.filter(
            cmd => cmd.title.toLowerCase().includes(lowercasedTerm) || 
                   cmd.subtitle?.toLowerCase().includes(lowercasedTerm) ||
                   cmd.category.toLowerCase().includes(lowercasedTerm)
        );
    }, [searchTerm, commands]);
    
    const groupedCommands: Record<string, Command[]> = useMemo(() => {
        return filteredCommands.reduce((acc, cmd) => {
            if (!acc[cmd.category]) {
                acc[cmd.category] = [];
            }
            acc[cmd.category].push(cmd);
            return acc;
        }, {} as Record<string, Command[]>);
    }, [filteredCommands]);

    // Flatten commands for indexing
    const flatCommands = useMemo(() => Object.values(groupedCommands).flat(), [groupedCommands]);

    useEffect(() => {
        setActiveIndex(0);
    }, [searchTerm]);
    
    useEffect(() => {
        const activeElement = resultsRef.current?.querySelector(`[data-index="${activeIndex}"]`);
        activeElement?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setSearchTerm('');
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % flatCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + flatCommands.length) % flatCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const command = flatCommands[activeIndex];
                if (command) {
                    command.onExecute();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeIndex, flatCommands, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" 
            role="dialog" 
            aria-modal="true"
        >
            <div className="command-palette-backdrop fixed inset-0 bg-black/60" onClick={onClose} />
            <div className={`command-palette-container w-full max-w-2xl bg-background-primary rounded-xl shadow-2xl border border-border-primary flex flex-col max-h-[70vh] command-palette-container-open`}>
                <div className="flex items-center gap-3 p-4 border-b border-border-primary flex-shrink-0">
                    <Search className="text-content-muted" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command or search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent text-content-primary placeholder-content-muted focus:outline-none text-lg"
                    />
                </div>
                <div className="overflow-y-auto flex-grow">
                    {flatCommands.length > 0 ? (
                        <ul ref={resultsRef} className="p-2">
                           {Object.entries(groupedCommands).map(([category, cmds]) => (
                                <li key={category}>
                                    <h3 className="text-xs font-semibold uppercase text-content-muted px-3 pt-3 pb-1">{category}</h3>
                                    <ul>
                                        {cmds.map((cmd) => {
                                            const currentIndex = flatCommands.indexOf(cmd);
                                            return (
                                                <li
                                                    key={cmd.id}
                                                    data-index={currentIndex}
                                                    onClick={cmd.onExecute}
                                                    className={`command-palette-item flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer ${activeIndex === currentIndex ? 'command-palette-item-active' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-content-secondary">{cmd.icon}</div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-content-primary">{cmd.title}</p>
                                                            {cmd.subtitle && <p className="text-xs text-content-muted">{cmd.subtitle}</p>}
                                                        </div>
                                                    </div>
                                                    {cmd.shortcut && (
                                                        <div className="flex items-center gap-1">
                                                            {cmd.shortcut.map((key, i) => (
                                                                <kbd key={i} className="font-sans text-xs font-semibold border border-border-secondary rounded px-1.5 py-0.5 bg-background-tertiary text-content-muted">{key}</kbd>
                                                            ))}
                                                        </div>
                                                    )}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </li>
                           ))}
                        </ul>
                    ) : (
                        <div className="flex items-center justify-center p-16 text-content-muted">
                            <p>No results found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;