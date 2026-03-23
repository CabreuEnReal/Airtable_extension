import { useState, useEffect } from 'react';
import type { Template } from '../../types/models';
import { TemplateSelector } from './TemplateSelector';
import { FileUploadButton } from './FileUploadButton';
import { CommandSuggestions } from './CommandInput';
import { VoiceRecorder } from './VoiceRecorder';

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
            // Logs visibles en UI para debugging
            alert(`🎤 INICIO VOICE NOTE:\nTipo: ${blob.type}\nTamaño: ${blob.size}\nMimeType: ${(blob as any).detectedMimeType || blob.type}`);
            
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
        <div className="relative border-t border-gray-100 bg-white">
            {/* Template selector popup */}
            {showTemplates && (
                <TemplateSelector
                    templates={templates}
                    onSelectMeta={handleMetaSelect}
                    onSelectAirtable={handleAirtableSelect}
                    onClose={() => setShowTemplates(false)}
                />
            )}

            {/* Emoji Selector */}
            {showEmojis && (
                <div className="absolute bottom-full left-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                    <div className="grid grid-cols-8 gap-1">
                        {['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😱', '😨', '😰', '😱', '🥵', '🥶', '😱', '🤯', '😳', '🥺', '😭', '😤', '😠', '😡', '🤬', '🤮', '🤢', '🤧', '😇', '🥳', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤'].map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => handleEmojiSelect(emoji)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg"
                                title={emoji}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2 px-4 py-3">
            {/* Action buttons */}
            <button 
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${showEmojis ? 'bg-primary-light text-primary' : 'hover:bg-gray-75 text-gray-400'}`}
                title="Emoji"
                onClick={() => setShowEmojis(!showEmojis)}
            >
                😊
            </button>
            <button
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${showTemplates ? 'bg-primary-light text-primary' : 'hover:bg-gray-75 text-gray-400'}`}
                title="Plantillas"
                onClick={() => setShowTemplates(!showTemplates)}
            >
                📋
            </button>

            {/* Voice recorder button */}
            <button
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                disabled={sending || disabled}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Grabar nota de voz"
            >
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Input */}
            <input
                type="text"
                value={draft}
                onChange={handleInputChange}
                placeholder="Escribe un mensaje o / para buscar plantillas..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={disabled || showVoiceRecorder}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
            />

            {/* File upload button */}
            <FileUploadButton 
                onFileSelect={handleFileSelect} 
                disabled={sending || disabled}
            />

            {/* Send button */}
            <button
                onClick={handleSend}
                disabled={!draft.trim() || sending || disabled}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                {sending ? (
                    <span className="animate-spin text-sm">◌</span>
                ) : (
                    <span className="text-lg">➤</span>
                )}
            </button>
            </div>
            
            {/* Command Suggestions */}
            {showCommandSuggestions && (
                <div className="relative">
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
                <div className="mt-2">
                    <VoiceRecorder 
                        onSend={handleVoiceSend}
                        disabled={sending || disabled}
                    />
                </div>
            )}
        </div>
    );
}
