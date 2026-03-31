import { useState, useEffect } from 'react';
import type { Template } from '../../types/models';
import { TemplateSelector } from './TemplateSelector';
import { FileUploadButton } from './FileUploadButton';
import { CommandSuggestions } from './CommandInput';
import { VoiceRecorder } from './VoiceRecorder';
import { EmojiPicker } from './EmojiPicker';

interface ChatInputProps {
    onSend: (text: string) => void;
    onSendMedia?: (file: File) => void;
    onSendMetaTemplate?: (template: Template, parameters: string[]) => void;
    onSelectAirtableTemplate?: (template: Template) => void;
    templates?: Template[];
    sending: boolean;
    disabled?: boolean;
    pendingDraft?: string | null;
    onPendingDraftConsumed?: () => void;
}

export function ChatInput({ onSend, onSendMedia, onSendMetaTemplate, onSelectAirtableTemplate, templates = [], sending, disabled = false, pendingDraft, onPendingDraftConsumed }: ChatInputProps) {
    const [draft, setDraft] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
    const [commandQuery, setCommandQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

    useEffect(() => {
        if (pendingDraft) {
            setDraft(pendingDraft);
            if (onPendingDraftConsumed) onPendingDraftConsumed();
        }
    }, [pendingDraft, onPendingDraftConsumed]);

    const handleSend = () => {
        if (!draft.trim() || sending || disabled) return;
        onSend(draft.trim());
        setDraft('');
    };

    const handleEmojiSelect = (emoji: string) => {
        setDraft(prev => prev + emoji);
        setShowEmojis(false);
    };

    const handleMetaSelect = (template: Template, parameters: string[]) => {
        setShowTemplates(false);
        if (onSendMetaTemplate) {
            onSendMetaTemplate(template, parameters);
        }
    };

    const handleAirtableSelect = (template: Template) => {
        setShowTemplates(false);
        if (onSelectAirtableTemplate) {
            onSelectAirtableTemplate(template);
        } else if (template.content) {
            setDraft(template.content);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDraft(value);
        
        // Handle command mode
        if (value.startsWith('/')) {
            const query = value.substring(1);
            setCommandQuery(query);
            setShowCommandSuggestions(true);
            setSelectedIndex(0);
        } else {
            setShowCommandSuggestions(false);
            setCommandQuery('');
        }
    };

    const handleCommandSelect = (template: Template, type: 'meta' | 'airtable') => {
        setShowCommandSuggestions(false);
        setCommandQuery('');
        setDraft('');
        
        if (type === 'meta') {
            // Send Meta template directly
            if (onSendMetaTemplate) {
                onSendMetaTemplate(template, []);
            }
        } else {
            // Generate Airtable template content for manual sending
            if (onSelectAirtableTemplate) {
                onSelectAirtableTemplate(template);
            }
        }
    };

    const handleCommandClose = () => {
        setShowCommandSuggestions(false);
        setCommandQuery('');
        setDraft('');
    };

    const handleFileSelect = (file: File) => {
        if (onSendMedia) {
            onSendMedia(file);
        }
    };

    const handleVoiceSend = async (blob: Blob) => {
        try {
            console.log('🎤 === INICIO PROCESO VOICE NOTE ===');
            console.log('📦 Blob original:', {
                type: blob.type,
                size: blob.size,
                detectedMimeType: (blob as any).detectedMimeType,
                isVoiceNoteCompatible: (blob as any).isVoiceNoteCompatible
            });

            // SIMPLIFICADO: Enviar siempre como voice note, el backend se encarga de la conversión
            const detectedMimeType = (blob as any).detectedMimeType || blob.type;
            const fileName = `voice_${Date.now()}.webm`; // Enviar con extensión original

            // Crear File con formato original - backend hará la conversión
            const file = new File([blob], fileName, { 
                type: detectedMimeType 
            });

            console.log('📤 File creado para enviar al backend:', {
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified,
                backendExpectedAction: 'Convertir a .ogg con OPUS si es voice note'
            });

            console.log('🔄 Llamando a onSendMedia...');
            if (onSendMedia) {
                onSendMedia(file);
            }
            setShowVoiceRecorder(false);
            console.log('✅ === FIN PROCESO VOICE NOTE (frontend) ===');

        } catch (error) {
            console.error('❌ Error procesando voice note:', error);
            alert('No se pudo enviar la nota de voz. Intenta grabarla nuevamente.');
        }
    };

    return (
        <div className="relative bg-white border-t border-gray-100 p-4 pt-2">
            {/* ── Floating Menus (absolute, above toolbar) ── */}

            {/* Template selector popup */}
            {showTemplates && (
                <div className="absolute bottom-full left-0 right-0 mb-3 z-50">
                    <TemplateSelector
                        templates={templates}
                        onSelectMeta={handleMetaSelect}
                        onSelectAirtable={handleAirtableSelect}
                        onClose={() => setShowTemplates(false)}
                    />
                </div>
            )}

            {/* Emoji Selector */}
            {showEmojis && (
                <div className="absolute bottom-full left-4 mb-3 z-50">
                    <EmojiPicker
                        onSelect={handleEmojiSelect}
                        onClose={() => setShowEmojis(false)}
                    />
                </div>
            )}

            {/* Command Suggestions */}
            {showCommandSuggestions && (
                <div className="absolute bottom-full left-0 right-0 mb-3 z-50">
                    <CommandSuggestions
                        templates={templates}
                        query={commandQuery}
                        onSelect={handleCommandSelect}
                        onClose={handleCommandClose}
                        selectedIndex={selectedIndex}
                        setSelectedIndex={setSelectedIndex}
                    />
                </div>
            )}

            {/* Voice Recorder */}
            {showVoiceRecorder && (
                <div className="mb-3">
                    <VoiceRecorder 
                        onSend={handleVoiceSend}
                        disabled={sending || disabled}
                    />
                </div>
            )}

            {/* Input Toolbar */}
            <div className="flex items-end gap-3 bg-[#f8f9fb] rounded-[24px] px-4 py-2 border border-gray-100 focus-within:border-[#00811A]/30 focus-within:bg-white transition-all shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                    {/* Emoji button */}
                    <button 
                        className={`p-2 rounded-full transition-all active:scale-95 ${showEmojis ? 'bg-[#00811A]/10 text-[#00811A]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}
                        title="Emoji"
                        onClick={() => setShowEmojis(!showEmojis)}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    {/* Templates button */}
                    <button
                        className={`p-2 rounded-full transition-all active:scale-95 ${showTemplates ? 'bg-[#00811A]/10 text-[#00811A]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}
                        title="Plantillas"
                        onClick={() => setShowTemplates(!showTemplates)}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </button>
                    {/* File upload button */}
                    <FileUploadButton 
                        onFileSelect={handleFileSelect} 
                        disabled={sending || disabled}
                    />
                    {/* Voice recorder button */}
                    <button
                        onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                        disabled={sending || disabled}
                        className={`p-2 rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${showVoiceRecorder ? 'bg-red-50 text-red-500' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}
                        title="Grabar nota de voz"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Text input */}
                <input
                    type="text"
                    value={draft}
                    onChange={handleInputChange}
                    placeholder="Escribe un mensaje o / para plantillas..."
                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[14px] text-gray-700 placeholder-gray-400 py-2.5"
                    disabled={disabled || showVoiceRecorder}
                    onKeyDown={(e) => {
                        if (showCommandSuggestions) {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSelectedIndex((prev: number) => prev + 1);
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSelectedIndex((prev: number) => prev > 0 ? prev - 1 : prev);
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCommandClose();
                            } else if (e.key === 'Enter') {
                                e.preventDefault();
                                // Delegate to CommandSuggestions via a synthetic select
                                const filteredTemplates = templates.filter(t => {
                                    const q = commandQuery.toLowerCase();
                                    return t.name.toLowerCase().includes(q) ||
                                           (t.content?.toLowerCase().includes(q)) ||
                                           (t.category?.toLowerCase().includes(q));
                                }).slice(0, 6);
                                if (filteredTemplates[selectedIndex]) {
                                    const t = filteredTemplates[selectedIndex];
                                    handleCommandSelect(t, t.source === 'meta' ? 'meta' : 'airtable');
                                }
                            }
                            return;
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />

                {/* Send button */}
                <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sending || disabled}
                    className="mb-1 w-10 h-10 flex items-center justify-center rounded-full bg-[#00811A] text-white hover:bg-[#006615] shadow-md shadow-green-900/10 active:scale-90 transition-all disabled:bg-gray-200 disabled:shadow-none disabled:text-gray-400"
                >
                    {sending ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}
