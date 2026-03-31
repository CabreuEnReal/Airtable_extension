import React from 'react';
import type { WhatsAppNumber, NumberStats } from '../../types/whatsapp';

interface NumberSelectorProps {
    numbers: WhatsAppNumber[];
    selected: number | null;
    stats: Record<number, NumberStats>;
    onSelect: (phoneId: number) => void;
    onSync?: () => void;
    syncing?: boolean;
    loading?: boolean;
}

export const NumberSelector: React.FC<NumberSelectorProps> = ({
    numbers,
    selected,
    stats,
    onSelect,
    onSync,
    syncing = false,
    loading = false
}) => {
    const getStatusColor = (status: WhatsAppNumber['connection_status']) => {
        switch (status) {
            case 'connected': return 'bg-green-500';
            case 'disconnected': return 'bg-gray-400';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };

    const getStatusText = (status: WhatsAppNumber['connection_status']) => {
        switch (status) {
            case 'connected': return 'Conectado';
            case 'disconnected': return 'Desconectado';
            case 'error': return 'Error';
            default: return 'Desconocido';
        }
    };

    if (loading) {
        return (
            <div className="bg-white border rounded-lg p-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                    <div className="space-y-2">
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (numbers.length === 0) {
        return (
            <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Números WhatsApp</h3>
                <p className="text-gray-500 text-sm">No hay números configurados</p>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-lg">
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">Números WhatsApp</h3>
                    <p className="text-gray-500 text-sm">{numbers.length} números disponibles</p>
                </div>
                {onSync && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onSync(); }}
                        disabled={syncing}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                            syncing
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait'
                                : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                        }`}
                        title="Sincronizar números con Meta"
                    >
                        {syncing ? '⟳ Sync...' : '↻ Sync'}
                    </button>
                )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
                {numbers.map((number) => {
                    const numberStats = stats[number.id];
                    const isSelected = selected === number.id;
                    
                    return (
                        <div
                            key={number.id}
                            onClick={() => onSelect(number.id)}
                            className={`
                                p-4 border-b cursor-pointer transition-colors
                                ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}
                                ${!number.is_active ? 'opacity-50' : ''}
                            `}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(number.connection_status)}`}></div>
                                        <span className="font-medium text-gray-900">
                                            {number.display_name || `Número ${number.id}`}
                                        </span>
                                        {!number.is_active && (
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                Inactivo
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="text-sm text-gray-600 mb-2">
                                        {number.phone_number}
                                    </div>
                                    
                                    <div className="text-xs text-gray-500">
                                        {getStatusText(number.connection_status)}
                                    </div>
                                </div>
                                
                                {numberStats && (
                                    <div className="text-right ml-4">
                                        {numberStats.unread_count > 0 && (
                                            <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 mb-1">
                                                {numberStats.unread_count} sin leer
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            {numberStats.total_messages_today} mensajes hoy
                                        </div>
                                        {numberStats.response_rate > 0 && (
                                            <div className="text-xs text-green-600">
                                                {Math.round(numberStats.response_rate * 100)}% respuesta
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {isSelected && (
                                <div className="mt-2 pt-2 border-t border-blue-200">
                                    <div className="text-xs text-blue-600">
                                        ✓ Número seleccionado
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
