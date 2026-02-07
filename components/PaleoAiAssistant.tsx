import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, CornerDownLeft, Loader2 } from 'lucide-react';
import type { Section, ChatMessage, Source } from '../types';
import { getAnalysisFromAIStream } from '../services/geminiService';

interface PaleoAiAssistantProps {
  section: Section;
}

const PaleoAiAssistant: React.FC<PaleoAiAssistantProps> = ({ section }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: `I am the PaleoAI Assistant. Ask me anything about section "${section.name}" from core ${section.core_id}.` }
    ]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    // Reset chat when section changes
    useEffect(() => {
        setMessages([
             { role: 'model', content: `I am the PaleoAI Assistant. Ask me anything about section "${section.name}" from core ${section.core_id}.` }
        ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section.id]);


    const handleSend = async () => {
        if (!query.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: query };
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setIsLoading(true);

        // Add a placeholder for the model's response
        setMessages(prev => [...prev, { role: 'model', content: '', sources: [] }]);

        try {
            const stream = await getAnalysisFromAIStream(section, query);
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
        } catch (error) {
            console.error(error);
            setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage.role === 'model') {
                    const errorMessage = { ...lastMessage, content: 'Sorry, I encountered an error. Please try again.' };
                    return [...prev.slice(0, -1), errorMessage];
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
        <div className="bg-background-tertiary/50 p-6 rounded-xl shadow-lg border border-border-primary/50">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-accent-primary/20">
                   <Bot size={24} className="text-accent-primary" />
                </div>
                <h2 className="text-xl font-bold text-content-primary">PaleoAI Assistant</h2>
            </div>
            <div className="h-96 bg-background-primary/70 rounded-lg p-4 overflow-y-auto mb-4 border border-border-primary flex flex-col space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 max-w-xl ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                        <div className={`p-2 rounded-full ${msg.role === 'model' ? 'bg-accent-primary/20' : 'bg-background-tertiary'}`}>
                           {msg.role === 'model' ? <Bot size={20} className="text-accent-primary" /> : <User size={20} className="text-content-secondary"/>}
                        </div>
                        <div className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-accent-primary text-accent-primary-text' : 'bg-background-tertiary text-content-secondary'}`}>
                           {msg.content === '' && msg.role === 'model' ? 
                           (
                                <div className="flex items-center space-x-2">
                                    <Loader2 className="animate-spin text-content-muted" size={16}/>
                                    <span className="text-sm text-content-muted">Analyzing...</span>
                                </div>
                           ) : (
                               <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                           )}
                           {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 border-t border-border-secondary pt-2 space-y-1">
                                    <h4 className="text-xs font-semibold text-content-muted">Sources:</h4>
                                    <ul className="list-decimal list-inside text-xs space-y-1">
                                        {msg.sources.map((source, i) => (
                                            <li key={i} className="truncate">
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" title={source.title} className="text-accent-secondary hover:underline">
                                                    {source.title}
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
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`e.g., 'What does the d18O trend suggest for ${section.name}?'`}
                    disabled={isLoading}
                    className="w-full bg-background-tertiary border border-border-secondary rounded-lg py-3 pl-4 pr-12 text-content-primary placeholder-content-muted focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !query.trim()}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-content-muted hover:text-accent-primary disabled:text-content-muted/50 disabled:cursor-not-allowed transition"
                >
                    <CornerDownLeft size={20} />
                </button>
            </div>
        </div>
    );
};

export default PaleoAiAssistant;