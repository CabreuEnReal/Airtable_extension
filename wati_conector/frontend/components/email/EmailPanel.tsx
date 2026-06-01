import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from '@airtable/blocks/interface/ui';
import type { Conversation, ConversationMessage, Notification } from '../../types/models';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import { Toast } from '../common/Toast';

interface EmailPanelProps {
    contactEmail?: string;
}

const N8N_BASE = 'https://n8n.energiareal.mx';
const N8N_LOGIN_URL = `${N8N_BASE}/webhook/oauth/login`;
const N8N_GET_EMAILS_URL = `${N8N_BASE}/webhook/get-emails`;
const N8N_SEND_EMAIL_URL = `${N8N_BASE}/webhook/send-email`;

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatEmailDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffH = (now.getTime() - date.getTime()) / 3_600_000;
    if (diffH < 24) return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 48) return 'Ayer';
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─── Conversation list item ───────────────────────────────────────────────────

function ConversationListItem({ conversation, onClick }: { conversation: Conversation; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
            <div className="flex items-start gap-3">
                <Avatar name={conversation.subject} size="sm" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[11px] truncate text-gray-900 font-semibold">
                            {conversation.subject}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {conversation.messageCount > 1 && (
                                <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                                    {conversation.messageCount}
                                </span>
                            )}
                            {conversation.hasAttachments && (
                                <span className="text-[10px] text-gray-400">📎</span>
                            )}
                            <span className="text-[10px] text-gray-400">
                                {formatEmailDate(conversation.lastActivity)}
                            </span>
                        </div>
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{conversation.lastMessagePreview}</div>
                </div>
            </div>
        </button>
    );
}

// ─── Thread message bubble ────────────────────────────────────────────────────

function ThreadBubble({ message, contactEmail }: { message: ConversationMessage; contactEmail: string }) {
    const isSent = message.direction === 'sent'
        || (message.direction !== 'received' && message.from.email !== contactEmail);

    return (
        <div className={`flex flex-col gap-1 ${isSent ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-1.5 px-1">
                {!isSent && <Avatar name={message.from.name} size="sm" />}
                <span className="text-[10px] text-gray-400">
                    {message.from.name} · {formatFullDate(message.receivedDateTime)}
                </span>
            </div>
            <div
                className={`max-w-[88%] rounded-xl px-3 py-2.5 ${
                    isSent
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-700 rounded-tl-sm'
                } ${message.status === 'sending' ? 'opacity-70' : ''}`}
            >
                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                    {message.body || 'Sin contenido'}
                </p>
                {message.hasAttachments && (
                    <span className="text-[10px] opacity-60 ml-1 block mt-1">📎 Adjunto</span>
                )}
                {message.status === 'sending' && (
                    <div className="flex items-center gap-1 mt-1.5">
                        <Spinner size="sm" />
                        <span className="text-[10px] opacity-70">Enviando...</span>
                    </div>
                )}
                {message.status === 'failed' && (
                    <span className="text-[10px] text-red-300 mt-1 block">⚠ Error al enviar</span>
                )}
            </div>
        </div>
    );
}

// ─── File helpers ────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function fileIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼';
    if (type === 'application/pdf') return '📄';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    return '📎';
}

// ─── Thread view ──────────────────────────────────────────────────────────────

function ThreadView({
    conversation,
    contactEmail,
    onBack,
    onSendReply,
    replyText,
    setReplyText,
    attachments,
    setAttachments,
}: {
    conversation: Conversation;
    contactEmail: string;
    onBack: () => void;
    onSendReply: (replyText: string) => Promise<void>;
    replyText: string;
    setReplyText: (v: string) => void;
    attachments: File[];
    setAttachments: (files: File[]) => void;
}) {
    const [isSending, setIsSending] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleSend() {
        if (!replyText.trim() || isSending) return;
        setIsSending(true);
        try {
            await onSendReply(replyText);
        } finally {
            setIsSending(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function addFiles(files: FileList | null) {
        if (!files) return;
        setAttachments([...attachments, ...Array.from(files)]);
    }

    function removeAttachment(index: number) {
        setAttachments(attachments.filter((_, i) => i !== index));
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(true);
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors font-medium"
                >
                    ← Volver a la lista
                </button>
            </div>

            <div className="px-4 py-2.5 border-b border-gray-100 shrink-0 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-800 leading-snug truncate">
                    {conversation.subject}
                </h3>
                <span className="text-[10px] text-gray-400">
                    {conversation.messages.length} mensaje{conversation.messages.length !== 1 ? 's' : ''} en el hilo
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
                {conversation.messages.map(msg => (
                    <ThreadBubble
                        key={msg.id}
                        message={msg}
                        contactEmail={contactEmail}
                    />
                ))}
            </div>

            <div
                className={`px-3 py-2.5 border-t shrink-0 bg-white transition-colors ${isDragging ? 'border-primary bg-blue-50' : 'border-gray-100'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Attachment badges */}
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 mb-2">
                        {attachments.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1">
                                <span className="text-[11px] leading-none">{fileIcon(file.type)}</span>
                                <span className="text-[10px] text-gray-700 font-medium max-w-[120px] truncate">{file.name}</span>
                                <span className="text-[9px] text-gray-400 max-w-[80px] truncate">{file.type || 'archivo'}</span>
                                <button
                                    onClick={() => removeAttachment(idx)}
                                    className="text-gray-500 hover:text-red-500 cursor-pointer text-[11px] leading-none ml-0.5 transition-colors"
                                    title="Quitar adjunto"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-end gap-2 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primary transition-colors">
                    <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isDragging ? 'Suelta los archivos aquí...' : 'Escribe tu respuesta...'}
                        rows={2}
                        disabled={isSending}
                        className="flex-1 resize-none text-xs text-gray-700 placeholder-gray-400 outline-none bg-transparent leading-relaxed disabled:opacity-50"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending}
                        className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-primary disabled:opacity-40 transition-colors"
                        title="Adjuntar archivo"
                    >
                        📎
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending || !replyText.trim()}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSending ? <Spinner size="sm" /> : <span className="text-white text-base leading-none">↑</span>}
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 px-1">
                    Enter para enviar · Shift+Enter nueva línea · Arrastra archivos aquí
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => addFiles(e.target.files)}
                />
            </div>
        </div>
    );
}

// ─── Main EmailPanel ──────────────────────────────────────────────────────────

export function EmailPanel({ contactEmail }: EmailPanelProps) {
    const session = useSession();
    const airtableUserId = (session as any)?.currentUser?.id;
    const popupRef = useRef<Window | null>(null);

    // null = checking auth, false = disconnected, true = connected
    const [isMsConnected, setIsMsConnected] = useState<boolean | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLoadingEmails, setIsLoadingEmails] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [notification, setNotification] = useState<Notification | null>(null);
    const [replyText, setReplyText] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);

    // Reset when contact changes
    useEffect(() => {
        setConversations([]);
        setSelectedConversation(null);
        setIsMsConnected(null);
        setReplyText('');
        setAttachments([]);
    }, [contactEmail]);

    // ─── Phase 2: load conversations ──────────────────────────────────────────

    const loadEmails = useCallback(async () => {
        if (!contactEmail || !airtableUserId) return;
        setIsLoadingEmails(true);
        try {
            const res = await fetch(
                `${N8N_GET_EMAILS_URL}?contactEmail=${encodeURIComponent(contactEmail)}&airtableUserId=${encodeURIComponent(airtableUserId)}`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (res.status === 401) {
                setIsMsConnected(false);
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const convList: Conversation[] = data.conversations ?? [];
            setConversations(convList);
            setIsMsConnected(true);
        } catch (err: any) {
            setIsMsConnected(prev => prev ?? false);
            setNotification({
                id: Date.now().toString(),
                type: 'error',
                text: `Error al cargar correos: ${err.message}`,
            });
        } finally {
            setIsLoadingEmails(false);
        }
    }, [contactEmail, airtableUserId]);

    // Auto-check auth on mount / when contact or userId changes
    useEffect(() => {
        if (contactEmail && airtableUserId) loadEmails();
    }, [loadEmails]);

    // ─── Phase 1: OAuth popup + postMessage listener ──────────────────────────

    useEffect(() => {
        function handleMessage(event: MessageEvent) {
            const type = event.data?.type;
            if (type === 'OAUTH_SUCCESS') {
                popupRef.current?.close();
                setIsConnecting(false);
                loadEmails();
            } else if (type === 'OAUTH_ERROR') {
                popupRef.current?.close();
                setIsConnecting(false);
                setNotification({ id: Date.now().toString(), type: 'error', text: 'Error al conectar con Microsoft' });
            } else if (type === 'OAUTH_DENIED') {
                popupRef.current?.close();
                setIsConnecting(false);
                setNotification({ id: Date.now().toString(), type: 'info', text: 'Autorización cancelada' });
            }
        }
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [loadEmails]);

    function handleConnectAccount() {
        if (!airtableUserId) {
            setNotification({
                id: Date.now().toString(),
                type: 'error',
                text: 'No se pudo obtener el ID de usuario. Recarga la extensión.',
            });
            return;
        }
        setIsConnecting(true);
        const popup = window.open(
            `${N8N_LOGIN_URL}?airtableUserId=${encodeURIComponent(airtableUserId)}`,
            'microsoft-oauth',
            'popup=yes,width=600,height=700,left=100,top=100'
        );
        popupRef.current = popup;
        if (!popup || popup.closed) {
            setIsConnecting(false);
            setNotification({
                id: Date.now().toString(),
                type: 'error',
                text: 'Popup bloqueado. Permite ventanas emergentes para este sitio.',
            });
        }
    }

    // ─── Phase 3: send reply with optimistic update ───────────────────────────

    const handleSendReply = async (replyTextParam: string) => {
        if (!replyTextParam || replyTextParam.trim().length === 0) {
            setNotification({ id: Date.now().toString(), type: 'error', text: 'El mensaje no puede estar vacío' });
            return;
        }
        if (!selectedConversation) {
            setNotification({ id: Date.now().toString(), type: 'error', text: 'No hay conversación seleccionada' });
            return;
        }
        if (!contactEmail) {
            setNotification({ id: Date.now().toString(), type: 'error', text: 'Email del contacto no disponible' });
            return;
        }
        if (!airtableUserId) {
            setNotification({ id: Date.now().toString(), type: 'error', text: 'Usuario de Airtable no identificado' });
            return;
        }

        const formattedBodyText = replyTextParam.replace(/\n/g, '<br/>');

        // Convert attachments to Microsoft Graph Base64 format
        const formattedAttachments = await Promise.all(
            attachments.map(async (file) => ({
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: file.name,
                contentType: file.type || 'application/octet-stream',
                contentBytes: await fileToBase64(file),
            }))
        );

        const myEmail = (session as any)?.currentUser?.email ?? 'unknown@example.com';
        const myName = (session as any)?.currentUser?.name ?? 'Yo';

        const tempMessage: ConversationMessage = {
            id: `temp-${Date.now()}`,
            conversationId: selectedConversation.conversationId,
            hasAttachments: attachments.length > 0,
            body: replyTextParam,
            from: { name: myName, email: myEmail },
            receivedDateTime: new Date().toISOString(),
            direction: 'sent',
            status: 'sending',
        };

        const previousConversationState: Conversation = JSON.parse(JSON.stringify(selectedConversation));
        const previousReplyText = replyTextParam;

        const updatedConversation: Conversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, tempMessage],
        };

        setSelectedConversation(updatedConversation);
        setConversations(prev => prev.map(c =>
            c.conversationId === selectedConversation.conversationId ? updatedConversation : c
        ));
        setReplyText('');
        setNotification({ id: Date.now().toString(), type: 'info', text: 'Enviando mensaje...' });

        try {
            console.log('====================================');
            console.log('📤 Enviando a webhook:', N8N_SEND_EMAIL_URL);
            console.log('📦 Body a enviar:', {
                airtableUserId,
                toEmail: contactEmail,
                subject: `RE: ${selectedConversation.subject}`,
                bodyText: formattedBodyText,
                messageId: selectedConversation.latestMessageId,
                attachments: formattedAttachments.map(a => ({
                    name: a.name,
                    contentType: a.contentType,
                    contentBytesLength: a.contentBytes.length,
                })),
            });

            const response = await fetch(N8N_SEND_EMAIL_URL, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    airtableUserId,
                    toEmail: contactEmail,
                    subject: `RE: ${selectedConversation.subject}`,
                    bodyText: formattedBodyText,
                    messageId: selectedConversation.latestMessageId,
                    attachments: formattedAttachments,
                }),
            });

            console.log('✓ Respuesta HTTP:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✓ Respuesta JSON de n8n:', data);
            console.log('====================================');

            if (data.success === false) {
                throw new Error(data.error || data.errorMessage || 'Error desconocido del servidor');
            }

            const updatedConversationAfterSuccess: Conversation = {
                ...updatedConversation,
                messages: updatedConversation.messages.map(msg =>
                    msg.id === tempMessage.id ? { ...msg, status: 'sent' as const } : msg
                ),
            };
            setSelectedConversation(updatedConversationAfterSuccess);
            setConversations(prev => prev.map(c =>
                c.conversationId === selectedConversation.conversationId ? updatedConversationAfterSuccess : c
            ));

            setAttachments([]);
            setNotification({ id: Date.now().toString(), type: 'success', text: 'Mensaje enviado correctamente' });
            setTimeout(() => { loadEmails(); }, 1500);

        } catch (error) {
            console.error('❌ Error en el envío:', error);

            const rollbackConversation: Conversation = {
                ...previousConversationState,
                messages: previousConversationState.messages.filter(
                    (msg: ConversationMessage) => !msg.id.startsWith('temp-')
                ),
            };
            setSelectedConversation(rollbackConversation);
            setConversations(prev => prev.map(c =>
                c.conversationId === selectedConversation.conversationId ? rollbackConversation : c
            ));
            setReplyText(previousReplyText);

            const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
            setNotification({ id: Date.now().toString(), type: 'error', text: `Error al enviar: ${errorMsg}` });
        }
    };

    // ─── Guards ───────────────────────────────────────────────────────────────

    if (!contactEmail) {
        return (
            <EmptyState
                icon="✉️"
                title="Sin correo vinculado"
                description="Este contacto no tiene dirección de correo. Actualiza el registro en Airtable para habilitar esta función."
            />
        );
    }

    if (isMsConnected === null || (isLoadingEmails && conversations.length === 0)) {
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner size="md" label={isMsConnected === null ? 'Verificando conexión...' : 'Cargando correos...'} />
            </div>
        );
    }

    if (!isMsConnected) {
        return (
            <>
                <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
                    <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                        📧
                    </div>
                    <div>
                        <h3 className="text-card-heading font-semibold text-gray-800 mb-1">
                            Conecta tu buzón corporativo
                        </h3>
                        <p className="text-body text-gray-400 max-w-[240px]">
                            Vincula tu cuenta de Microsoft Outlook para sincronizar automáticamente
                            el historial de correos con este contacto.
                        </p>
                    </div>
                    <button
                        onClick={handleConnectAccount}
                        disabled={isConnecting}
                        className="flex items-center justify-center gap-2 w-full max-w-[220px] px-4 py-2.5 bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                        {isConnecting ? (
                            <>
                                <Spinner size="sm" />
                                <span>Conectando...</span>
                            </>
                        ) : (
                            <>
                                <span className="text-base leading-none">⊞</span>
                                <span>Iniciar sesión con Microsoft</span>
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-gray-400">
                        Solo lectura · No se enviarán correos sin tu confirmación
                    </p>
                </div>
                <Toast notification={notification} onDismiss={() => setNotification(null)} duration={3000} />
            </>
        );
    }

    if (conversations.length === 0) {
        return (
            <EmptyState
                icon="📭"
                title="Sin correos"
                description={`No hay correos registrados para ${contactEmail}`}
            />
        );
    }

    if (selectedConversation !== null) {
        return (
            <>
                <ThreadView
                    conversation={selectedConversation}
                    contactEmail={contactEmail}
                    onBack={() => setSelectedConversation(null)}
                    onSendReply={handleSendReply}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    attachments={attachments}
                    setAttachments={setAttachments}
                />
                <Toast notification={notification} onDismiss={() => setNotification(null)} duration={3000} />
            </>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 shrink-0 bg-gray-50">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Correos ({conversations.length})
                </span>
            </div>
            <div className="flex-1 overflow-y-auto">
                {conversations.map(conv => (
                    <ConversationListItem
                        key={conv.conversationId}
                        conversation={conv}
                        onClick={() => setSelectedConversation(conv)}
                    />
                ))}
            </div>
            <Toast notification={notification} onDismiss={() => setNotification(null)} duration={3000} />
        </div>
    );
}
