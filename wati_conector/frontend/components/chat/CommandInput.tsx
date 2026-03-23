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
            className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10"
            onKeyDown={handleKeyDown}
        >
            {/* Header */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>🔍</span>
                    <span>Plantillas encontradas</span>
                </div>
            </div>

            {/* Suggestions list */}
            <div className="max-h-64 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                    <div
                        key={`${suggestion.template.id}-${suggestion.type}`}
                        className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                            index === selectedIndex
                                ? 'bg-blue-50 border-l-2 border-l-blue-500'
                                : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSuggestionClick(suggestion)}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
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
                                    <p className="text-xs text-gray-600 line-clamp-1 mb-1">
                                        {suggestion.template.content}
                                    </p>
                                )}
                                
                                {/* Matching keywords */}
                                {suggestion.keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {suggestion.keywords.map((keyword, i) => (
                                            <span
                                                key={i}
                                                className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded"
                                            >
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Action hint */}
                            <div className="text-xs text-gray-400 whitespace-nowrap">
                                {suggestion.type === 'meta' ? '↗️' : '📝'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex gap-3">
                        <span>↑↓ Navegar</span>
                        <span>Enter Seleccionar</span>
                        <span>Esc Cancelar</span>
                    </div>
                    <div>
                        <span>⚡ Meta envía | 📋 Airtable genera</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
