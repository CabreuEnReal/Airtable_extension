import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { Contact, Message, Template } from '../../types/models';
import { formatDate } from '../../utils/formatters';
import { IconButton } from '../common/IconButton';
import { validateFile } from '../../utils/fileUtils';

interface ChatPanelProps {
    contact: Contact | null;
    messages: Message[];
    templates?: Template[];
    onSend: (text: string) => void;
    onSendMedia?: (file: File) => void;
    onSendMetaTemplate?: (template: Template, parameters: string[]) => void;
    onSelectAirtableTemplate?: (template: Template) => void;
    onRetryMedia?: (messageId: string) => Promise<void>;
    sending: boolean;
    onOpenDetail?: () => void;
    onOpenNotes?: () => void;
    pendingDraft?: string | null;
    onPendingDraftConsumed?: () => void;
    onReopenConversation?: () => Promise<{ success: boolean; error?: string }>;
    conversationActive?: boolean;
    windowStatusLoading?: boolean;
}

interface DateGroup {
    label: string;
    messages: Message[];
}

function groupByDate(messages: Message[]): DateGroup[] {
    const sorted = [...messages].sort((a, b) => {
        const da = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const db = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
    });

    const groups: DateGroup[] = [];
    let current: DateGroup | null = null;

    for (const msg of sorted) {
        const label = formatDate(msg.timestamp) || 'Sin fecha';
        if (!current || current.label !== label) {
            current = { label, messages: [] };
            groups.push(current);
        }
        current.messages.push(msg);
    }

    return groups;
}

function fileIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📈';
    return '📎';
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function ChatPanel({
    contact,
    messages,
    templates,
    onSend,
    onSendMedia,
    onSendMetaTemplate,
    onSelectAirtableTemplate,
    onRetryMedia,
    sending,
    onOpenDetail,
    onOpenNotes,
    pendingDraft,
    onPendingDraftConsumed,
    onReopenConversation,
    conversationActive,
    windowStatusLoading = false,
}: ChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ── 24h conversation window ─────────────────────────────────────────────
    const isWindowActive = conversationActive ?? true;
    const [reopening, setReopening] = useState(false);
    const [reopenError, setReopenError] = useState<string | null>(null);

    const handleReopen = useCallback(async () => {
        if (!onReopenConversation || reopening) return;
        setReopening(true);
        setReopenError(null);
        try {
            const result = await onReopenConversation();
            if (!result.success) {
                setReopenError(result.error || 'Error al reabrir la conversación');
            }
        } catch {
            setReopenError('Error inesperado al reabrir la conversación');
        } finally {
            setReopening(false);
        }
    }, [onReopenConversation, reopening]);

    // ── Drag & drop state ──────────────────────────────────────────────────
    const [isDragging, setIsDragging] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
    const [dropError, setDropError] = useState<string | null>(null);
    const dragCounter = useRef(0);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
            setDropError(null);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const file = files[0] as File;
        const validation = validateFile(file);
        if (!validation.valid) {
            setDropError(validation.error || 'Archivo no válido');
            return;
        }

        let previewUrl: string | null = null;
        if (file.type.startsWith('image/')) {
            try {
                previewUrl = URL.createObjectURL(file);
            } catch {
                previewUrl = null;
            }
        }

        setPendingPreviewUrl(previewUrl);
        setPendingFile(file);
    }, []);

    const handleConfirmDrop = useCallback(() => {
        if (pendingFile && onSendMedia) {
            onSendMedia(pendingFile);
        }
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
    }, [pendingFile, pendingPreviewUrl, onSendMedia]);

    const handleCancelDrop = useCallback(() => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
    }, [pendingPreviewUrl]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const dateGroups = useMemo(() => groupByDate(messages), [messages]);

    if (!contact) {
        return (
            <div className="flex-1 flex flex-col">
                <EmptyState
                    icon="💬"
                    title="Todas las conversaciones"
                    description="Selecciona un contacto para ver la conversación"
                />
            </div>
        );
    }

    return (
        <div
            className="flex-1 flex flex-col overflow-hidden bg-white relative"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* ── Drag overlay ─────────────────────────────────────────────── */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-[#00811A] rounded-lg m-2 transition-all">
                    <div className="w-16 h-16 rounded-2xl bg-[#00811A]/10 flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-[#00811A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="text-sm font-semibold text-[#00811A]">Suelta el archivo aquí</p>
                    <p className="text-xs text-gray-400 mt-1">Imágenes, documentos, video o audio</p>
                </div>
            )}

            {/* ── Drop error toast ─────────────────────────────────────────── */}
            {dropError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-2 rounded-lg shadow-md animate-fade-in">
                    ⚠️ {dropError}
                </div>
            )}

            {/* ── File confirmation dialog ─────────────────────────────────── */}
            {pendingFile && (
                <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full mx-4 animate-fade-in">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">Enviar archivo</h3>

                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                            {pendingPreviewUrl ? (
                                <img
                                    src={pendingPreviewUrl}
                                    alt={pendingFile.name}
                                    className="w-14 h-14 rounded-lg object-cover border border-gray-200"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                                    {fileIcon(pendingFile.type)}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{pendingFile.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {pendingFile.type.split('/').pop()?.toUpperCase()} · {formatFileSize(pendingFile.size)}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={handleCancelDrop}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-75 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDrop}
                                className="px-4 py-2 text-sm bg-[#00811A] text-white rounded-lg hover:bg-[#006615] transition-colors shadow-sm"
                            >
                                Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Avatar name={contact.displayName} size="md" />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-sm font-bold text-gray-900 truncate leading-tight">
                            {contact.displayName}
                        </h2>
                        {contact.phone ? (
                            <span className="text-[11px] font-medium text-[#00811A]">● En línea</span>
                        ) : (
                            <span className="text-[11px] font-medium text-orange-500">● Sin número asociado</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <IconButton icon="🔍" label="Buscar" size="sm" />
                    {onOpenNotes && <IconButton icon="📝" label="Notas" size="sm" onClick={onOpenNotes} />}
                    {onOpenDetail && <IconButton icon="ℹ️" label="Detalle" size="sm" onClick={onOpenDetail} />}
                    <IconButton icon="⋮" label="Más" size="sm" />
                </div>
            </header>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#f9fafb] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                {dateGroups.map((group) => (
                    <div key={group.label}>
                        <div className="flex justify-center my-4">
                            <span className="bg-white/90 backdrop-blur-sm text-[11px] font-medium text-gray-500 px-4 py-1.5 rounded-full shadow-sm border border-gray-100">
                                {group.label}
                            </span>
                        </div>
                        {group.messages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} contactName={contact?.displayName} onRetryMedia={onRetryMedia} />
                        ))}
                    </div>
                ))}

                {messages.length === 0 && (
                    <div className="text-center text-body text-gray-400 mt-8">
                        {contact.phone ? (
                            'No hay mensajes aún. Envía un mensaje para iniciar la conversación.'
                        ) : (
                            <div className="space-y-2">
                                <div className="text-orange-500 font-medium">⚠️ Sin número de teléfono</div>
                                <div className="text-sm">Este contacto no tiene un número asociado. Agrega un número en Airtable para poder enviar mensajes.</div>
                            </div>
                        )}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* 24h window expired banner */}
            {!isWindowActive && !windowStatusLoading && (
                <div className="bg-amber-50 border-t border-amber-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-800">La ventana de conversación ha expirado</p>
                            <p className="text-xs text-amber-600 mt-0.5">Han pasado más de 24h sin respuesta del contacto</p>
                        </div>
                        {onReopenConversation && (
                            <button
                                onClick={handleReopen}
                                disabled={reopening}
                                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00811A] text-white text-xs font-medium rounded-lg hover:bg-[#006615] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                {reopening ? (
                                    <>
                                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Reabriendo...
                                    </>
                                ) : (
                                    'Reabrir conversación'
                                )}
                            </button>
                        )}
                    </div>
                    {reopenError && (
                        <p className="text-xs text-red-600 mt-2 ml-11">{reopenError}</p>
                    )}
                </div>
            )}

            {/* Input — hidden when conversation expired */}
            {(isWindowActive || windowStatusLoading) && (
                <ChatInput 
                    onSend={onSend} 
                    onSendMedia={onSendMedia} 
                    onSendMetaTemplate={onSendMetaTemplate} 
                    onSelectAirtableTemplate={onSelectAirtableTemplate} 
                    templates={templates} 
                    sending={sending} 
                    disabled={!contact.phone}
                    pendingDraft={pendingDraft} 
                    onPendingDraftConsumed={onPendingDraftConsumed} 
                    contact={contact}
                />
            )}
        </div>
    );
}
