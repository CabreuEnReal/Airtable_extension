import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { getContactInteractions, getApiContacts } from '../../services/pythonApi';
import type { ApiInteraction, ApiContactOut } from '../../types/api';

interface NotesModalProps {
    open: boolean;
    onClose: () => void;
    contactName: string;
    airtableContactId?: string;  // ← Airtable record ID (recXXXX)
}

export function NotesModal({ open, onClose, contactName, airtableContactId }: NotesModalProps) {
    const [draft, setDraft] = useState('');
    const [interactions, setInteractions] = useState<ApiInteraction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notLinked, setNotLinked] = useState(false);
    const [dbContactId, setDbContactId] = useState<number | undefined>();

    // Lookup dbContactId from airtableContactId when modal opens
    useEffect(() => {
        if (open && airtableContactId) {
            lookupAndLoadInteractions();
        } else if (open && !airtableContactId) {
            setNotLinked(true);
        }
    }, [open, airtableContactId]);

    const lookupAndLoadInteractions = async () => {
        if (!airtableContactId) return;
        
        setLoading(true);
        setError(null);
        setNotLinked(false);
        
        try {
            // Step 1: Get all contacts from backend and find the one with matching airtable_record_id
            const contacts = await getApiContacts();
            const matchingContact = contacts.find(
                (c: ApiContactOut) => c.airtable_record_id === airtableContactId
            );
            
            console.log('🔍 Contact lookup:', {
                airtableContactId,
                totalContacts: contacts.length,
                found: !!matchingContact,
                dbContactId: matchingContact?.id
            });
            
            if (!matchingContact) {
                setNotLinked(true);
                setDbContactId(undefined);
                setLoading(false);
                return;
            }
            
            setDbContactId(matchingContact.id);
            
            // Step 2: Load interactions using the DB contact_id
            const response = await getContactInteractions(matchingContact.id, 50);
            
            if (response.message?.includes('not linked') || response.message?.includes('sync')) {
                setNotLinked(true);
                setInteractions([]);
            } else {
                setInteractions(response.interactions || []);
                setNotLinked(false);
            }
        } catch (err: any) {
            setError(err?.message || 'Error al cargar interacciones');
            setInteractions([]);
        } finally {
            setLoading(false);
        }
    };

    // Classification badge color mapping
    const getBadgeColor = (classification: string): string => {
        const colors: Record<string, string> = {
            'Discovery': 'bg-blue-100 text-blue-700',
            'Demo': 'bg-purple-100 text-purple-700',
            'Propuesta': 'bg-green-100 text-green-700',
            'Legal': 'bg-orange-100 text-orange-700',
            'Cierre': 'bg-red-100 text-red-700',
            'Objecion': 'bg-yellow-100 text-yellow-700',
            'Seguimiento': 'bg-gray-100 text-gray-700',
        };
        return colors[classification] || 'bg-gray-100 text-gray-600';
    };

    return (
        <Modal open={open} onClose={onClose} title={`Notas de ${contactName}`} width="max-w-2xl">
            {/* AI Interactions Section */}
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
                <h4 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                    🤖 INTERACCIONES IA (Resúmenes automáticos)
                </h4>

                {/* Loading state */}
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-gray-500">Cargando interacciones...</span>
                    </div>
                )}

                {/* Error state */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-red-700">⚠️ {error}</p>
                        <button 
                            onClick={lookupAndLoadInteractions}
                            className="mt-2 text-xs text-red-600 underline hover:no-underline"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Not linked state */}
                {notLinked && !loading && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800">
                            ⚠️ Contacto no vinculado a Airtable o sin ID de base de datos.
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                            Ejecuta la sincronización primero para ver las interacciones IA.
                        </p>
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && !notLinked && interactions.length === 0 && (
                    <div className="text-center text-body text-gray-400 py-6">
                        No hay interacciones IA procesadas aún.
                        <p className="text-xs mt-2">
                            Las interacciones aparecerán cuando una conversación de 24h sea procesada por el agente IA.
                        </p>
                    </div>
                )}

                {/* Interactions list */}
                {!loading && !error && interactions.length > 0 && (
                    <div className="space-y-3">
                        {interactions.map((interaction) => (
                            <div 
                                key={interaction.id} 
                                className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                            >
                                {/* Header: Badge + Date + Confidence */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getBadgeColor(interaction.classification)}`}>
                                        {interaction.classification}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>Confianza: {Math.round(interaction.confidence * 100)}%</span>
                                        <span>•</span>
                                        <span>{new Date(interaction.date_executed).toLocaleDateString('es-MX')}</span>
                                    </div>
                                </div>

                                {/* Summary */}
                                <p className="text-sm text-gray-800 leading-relaxed mb-3">
                                    {interaction.summary}
                                </p>

                                {/* Next Steps */}
                                {interaction.next_steps && (
                                    <div className="bg-gray-50 rounded-lg p-3 mt-2">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">📋 Next Steps:</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-line">
                                            {interaction.next_steps}
                                        </p>
                                    </div>
                                )}

                                {/* Footer: Conversation ID */}
                                <div className="mt-3 pt-2 border-t border-gray-100">
                                    <p className="text-[10px] text-gray-400">
                                        Conversación: {interaction.conversation_id}
                                        {interaction.airtable_record_id && (
                                            <span className="ml-2">• Airtable: {interaction.airtable_record_id}</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-2"></div>

            {/* Manual Notes Section */}
            <div className="px-5 pb-5 pt-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                    📝 NOTA MANUAL
                </h4>
                {/* Toolbar */}
                <div className="flex gap-1 mb-2">
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-75 text-gray-500 text-sm font-bold">B</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-75 text-gray-500 text-sm italic">I</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-75 text-gray-500 text-sm">≡</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-75 text-gray-500 text-sm">🔗</button>
                </div>
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Agregar nota manual (no procesada por IA)"
                    rows={3}
                    className="w-full px-3 py-2 text-body border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-primary"
                />
                <div className="flex justify-end mt-2">
                    <button
                        disabled={!draft.trim()}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-40 transition-colors"
                    >
                        ➤
                    </button>
                </div>
            </div>
        </Modal>
    );
}
