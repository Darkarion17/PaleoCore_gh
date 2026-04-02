
import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, CornerDownLeft, Loader2, Shell, X, Minimize2, Maximize2 } from 'lucide-react';
import type { Core, Section, ChatMessage, Source } from '../types';
import { getAnalysisFromAIStream } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingAiAssistantProps {
  cores: Core[];
  selectedCore: Core | null;
  allSections: Section[];
}

const FloatingAiAssistant: React.FC<FloatingAiAssistantProps> = ({ cores, selectedCore, allSections }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: "I am the PaleoAI Neural Analysis Engine. I have access to all your core telemetry and geological data. How can I assist your research today?" }
    ]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, isOpen, isMinimized]);

    const handleSend = async () => {
        if (!query.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: query };
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setIsLoading(true);

        // Add a placeholder for the model's response
        setMessages(prev => [...prev, { role: 'model', content: '', sources: [] }]);

        try {
            // We use the first section of the selected core as context if available, 
            // otherwise we could pass a more general context.
            const relevantSection = allSections.find(s => s.core_id === selectedCore?.id) || allSections[0];
            
            if (!relevantSection) {
                throw new Error("No geological context available. Please add a core and section first.");
            }

            const stream = await getAnalysisFromAIStream(relevantSection, query);
            let sources: Source[] = [];
            
            for await (const chunk of stream) {
                const chunkText = chunk.text;
                const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
                if (groundingMetadata?.groundingChunks) {
                    sources = (groundingMetadata.groundingChunks || [])
                      .filter(c => c.web && c.web.uri && c.web.title)
                      .map(c => ({ uri: c.web!.uri!, title: c.web!.title! }));
                }

                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.role === 'model') {
                        const updatedMessage = {
                            ...lastMessage,
                            content: lastMessage.content + chunkText,
                            sources: sources.length > 0 ? sources : lastMessage.sources
                        };
                        return [...prev.slice(0, -1), updatedMessage];
                    }
                    return prev;
                });
            }
        } catch (error: any) {
            console.error(error);
            const isFetchError = error.message?.includes('fetch') || error.message?.includes('NetworkError');
            const errorMessage = isFetchError 
                ? 'Network connection failed. Please check your internet connection or API configuration.' 
                : (error.message || 'Sorry, I encountered an error. Please try again.');

            setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage.role === 'model') {
                    const updatedMessage = { ...lastMessage, content: errorMessage };
                    return [...prev.slice(0, -1), updatedMessage];
                }
                return prev;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && !isMinimized && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-96 h-[500px] bg-background-secondary border border-border-primary rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-border-primary bg-background-tertiary/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
                                   <Shell size={18} className="text-accent-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="micro-label">Neural Analysis Engine</span>
                                    <h2 className="text-sm font-bold text-content-primary tracking-tight">PaleoAI Assistant</h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setIsMinimized(true)}
                                    className="p-1.5 text-content-muted hover:text-content-primary transition-colors"
                                >
                                    <Minimize2 size={16} />
                                </button>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 text-content-muted hover:text-danger-primary transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-4 scrollbar-thin bg-background-primary/30">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                    <div className={`p-1.5 rounded-md flex-shrink-0 ${msg.role === 'model' ? 'bg-accent-primary/10 border border-accent-primary/20' : 'bg-background-tertiary border border-border-primary'}`}>
                                       {msg.role === 'model' ? <Shell size={14} className="text-accent-primary" /> : <User size={14} className="text-content-secondary"/>}
                                    </div>
                                    <div className={`p-3 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-accent-primary/10 text-content-primary border border-accent-primary/30' : 'bg-background-tertiary/80 text-content-secondary border border-border-primary shadow-sm'}`}>
                                       {msg.content === '' && msg.role === 'model' ? 
                                       (
                                            <div className="flex items-center space-x-2 font-mono text-[10px]">
                                                <Loader2 className="animate-spin text-accent-primary" size={12}/>
                                                <span className="text-content-muted uppercase tracking-widest">Analyzing...</span>
                                            </div>
                                       ) : (
                                           <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                                       )}
                                       {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-3 border-t border-border-primary/30 pt-2 space-y-1">
                                                <span className="micro-label !text-[8px]">Sources</span>
                                                <ul className="space-y-1">
                                                    {msg.sources.map((source, i) => (
                                                        <li key={i} className="truncate">
                                                            <a href={source.uri} target="_blank" rel="noopener noreferrer" title={source.title} className="text-accent-primary hover:underline font-mono text-[9px] flex items-center gap-1">
                                                                <span className="opacity-50">[{i+1}]</span> {source.title}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-border-primary bg-background-tertiary/30">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Query telemetry..."
                                    disabled={isLoading}
                                    className="w-full bg-background-interactive border border-border-primary rounded-xl py-3 pl-4 pr-12 text-xs font-mono text-content-primary placeholder-content-muted focus:ring-1 focus:ring-accent-primary focus:outline-none transition-all shadow-inner"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isLoading || !query.trim()}
                                    className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-content-muted hover:text-accent-primary disabled:opacity-30 transition-colors"
                                >
                                    <CornerDownLeft size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (isMinimized) setIsMinimized(false);
                    else setIsOpen(!isOpen);
                }}
                className={`flex items-center gap-2 px-4 py-4 rounded-full shadow-2xl border transition-all duration-300 ${
                    isOpen && !isMinimized 
                    ? 'bg-danger-primary/10 border-danger-primary/30 text-danger-primary' 
                    : 'bg-accent-primary border-accent-primary/50 text-white'
                }`}
            >
                <Shell size={24} className={isLoading ? 'animate-pulse' : ''} />
                <span className="font-bold text-sm tracking-widest uppercase">AI</span>
                {isMinimized && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-danger-primary rounded-full border-2 border-background-primary animate-bounce" />
                )}
            </motion.button>
        </div>
    );
};

export default FloatingAiAssistant;
