import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Template } from '../../types/models';

interface CommandSuggestionsProps {
    templates: Template[];
    query: string;
    onSelect: (template: Template, type: 'meta' | 'airtable') => void;
    onClose: () => void;
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
}

interface CommandSuggestion {
    template: Template;
    type: 'meta' | 'airtable';
    keywords: string[];
}

export function CommandSuggestions({ 
    templates, 
    query, 
    onSelect, 
    onClose, 
    selectedIndex, 
    setSelectedIndex 
}: CommandSuggestionsProps) {
    // Filter and rank suggestions based on query
    const getSuggestions = useCallback((searchQuery: string): CommandSuggestion[] => {
        if (!searchQuery) return [];

        const q = searchQuery.toLowerCase();
        const results: CommandSuggestion[] = [];

        templates.forEach(template => {
            const type = template.source === 'meta' ? 'meta' : 'airtable';
            
            // Extract keywords from template name and content
            const keywords = [
                template.name.toLowerCase(),
                ...(template.content?.toLowerCase().split(' ') || []),
                ...(template.category?.toLowerCase().split(' ') || [])
            ].filter(Boolean);

            // Calculate relevance score
            let score = 0;
            
            // Exact name match gets highest score
            if (template.name.toLowerCase() === q) score += 100;
            else if (template.name.toLowerCase().includes(q)) score += 50;
            
            // Keyword matches
            keywords.forEach(keyword => {
                if (keyword === q) score += 30;
                else if (keyword.includes(q)) score += 10;
                else if (keyword.startsWith(q)) score += 20;
            });

            if (score > 0) {
                results.push({
                    template,
                    type,
                    keywords: keywords.filter(k => k.includes(q)).slice(0, 3)
                });
            }
        });

        // Sort by score (descending) and limit to 6 results
        return results
            .sort((a, b) => {
                const scoreA = calculateScore(a.template, q);
                const scoreB = calculateScore(b.template, q);
                return scoreB - scoreA;
            })
            .slice(0, 6);
    }, [templates]);

    const calculateScore = (template: Template, query: string): number => {
        const name = template.name.toLowerCase();
        const q = query.toLowerCase();
        
        if (name === q) return 100;
        if (name.startsWith(q)) return 80;
        if (name.includes(q)) return 50;
        if (template.content?.toLowerCase().includes(q)) return 30;
        if (template.category?.toLowerCase().includes(q)) return 20;
        
        return 10;
    };

    const suggestions = getSuggestions(query);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (suggestions[selectedIndex]) {
                    const { template, type } = suggestions[selectedIndex];
                    onSelect(template, type);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    };

    const handleSuggestionClick = (suggestion: CommandSuggestion) => {
        onSelect(suggestion.template, suggestion.type);
    };

    const getTypeIcon = (type: 'meta' | 'airtable') => {
        return type === 'meta' ? '⚡' : '📋';
    };

    const getTypeColor = (type: 'meta' | 'airtable') => {
        return type === 'meta' 
            ? 'text-blue-600 bg-blue-50' 
            : 'text-green-600 bg-green-50';
    };

    if (suggestions.length === 0) return null;

    return (
        <div 
            className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden"
            onKeyDown={handleKeyDown}
        >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <svg className="w-4 h-4 text-[#00811A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Plantillas encontradas</span>
                </div>
            </div>

            {/* Suggestions list */}
            <div className="max-h-64 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                    <div
                        key={`${suggestion.template.id}-${suggestion.type}`}
                        className={`cursor-pointer p-3 transition-colors flex flex-col gap-1 ${
                            index === selectedIndex
                                ? 'bg-[#00811A]/10 border-l-4 border-l-[#00811A]'
                                : 'hover:bg-[#00811A]/5 active:bg-[#00811A]/10 border-l-4 border-l-transparent'
                        }`}
                        onClick={() => handleSuggestionClick(suggestion)}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-sm">{getTypeIcon(suggestion.type)}</span>
                            <h4 className="font-medium text-gray-900 text-sm truncate">
                                {suggestion.template.name}
                            </h4>
                            <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${getTypeColor(suggestion.type)}`}>
                                {suggestion.type === 'meta' ? 'Meta' : 'Airtable'}
                            </span>
                        </div>
                        
                        {/* Preview content */}
                        {suggestion.template.content && (
                            <p className="text-xs text-gray-500 line-clamp-1 pl-6">
                                {suggestion.template.content}
                            </p>
                        )}
                        
                        {/* Matching keywords */}
                        {suggestion.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 pl-6">
                                {suggestion.keywords.map((keyword, i) => (
                                    <span
                                        key={i}
                                        className="px-1.5 py-0.5 text-xs bg-[#00811A]/5 text-[#00811A] rounded-md"
                                    >
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-center text-[11px] text-gray-400">
                    <div className="flex gap-3">
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">↑↓</kbd> Navegar</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">↵</kbd> Seleccionar</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Esc</kbd> Cancelar</span>
                    </div>
                    <div>
                        <span>⚡ Meta envía · 📋 Airtable genera</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
