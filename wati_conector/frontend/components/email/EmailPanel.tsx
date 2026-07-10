import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from '@airtable/blocks/interface/ui';
import type { Conversation, ConversationMessage, EmailAttachment, Notification, Interaction } from '../../types/models';
import { analyzeInteraction } from '../../services/pythonApi';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import { Toast } from '../common/Toast';

interface EmailPanelProps {
    contactEmail?: string;
    contactId?: string;
    contactName?: string;
    opportunityId?: string;
    myPeopleId?: string | null;
    onInteractionCreated?: (it: Interaction) => void;
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



// ─── Attachment chip + helpers ────────────────────────────────────────────────

function fileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return '🖼';
    if (contentType === 'application/pdf') return '📄';
    if (contentType.startsWith('video/')) return '🎬';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType.includes('word')) return '📝';
    if (contentType.includes('excel') || contentType.includes('sheet')) return '📊';
    return '📎';
}

function formatSize(bytes: number): string {
    if (bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

// ─── Attachment preview modal ─────────────────────────────────────────────────

function EmailPreviewModal({ att, onClose }: { att: EmailAttachment; onClose: () => void }) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;

        async function fetchBlob() {
            try {
                const res = await fetch(att.downloadUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status} — verifica n8n proxy`);

                // n8n returns JSON { contentBytes: base64, contentType, fileName }
                // Decode in browser → avoids n8n binary streaming encoding bugs
                const data = await res.json();
                if (cancelled) return;

                if (!data.contentBytes) throw new Error(`Sin contentBytes. Respuesta del proxy: ${JSON.stringify(Object.keys(data))}`);

                // Graph API wraps base64 at 76 chars — atob() throws on whitespace
                const raw = atob(data.contentBytes.replace(/[\r\n\s]/g, ''));
                const bytes = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
                const mimeType = data.contentType || att.contentType || 'application/octet-stream';
                const blob = new Blob([bytes], { type: mimeType });

                objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchBlob();
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [att.downloadUrl]);

    function handleDownload() {
        if (!blobUrl) return;
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = att.name;
        a.click();
    }

    const isImage = att.contentType.startsWith('image/');
    const isPdf = att.contentType === 'application/pdf';
    const isVideo = att.contentType.startsWith('video/');
    const canPreview = isImage || isPdf || isVideo;

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col ${
                    isPdf ? 'w-[90vw] h-[90vh] max-w-4xl' : 'max-w-3xl max-h-[90vh] w-full'
                }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm leading-none">{fileIcon(att.contentType)}</span>
                        <span className="text-xs font-semibold text-gray-700 truncate max-w-[260px]">{att.name}</span>
                        {att.size > 0 && (
                            <span className="text-[10px] text-gray-400 shrink-0">{formatSize(att.size)}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                        {blobUrl && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                ⬇ Descargar
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors text-xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className={`overflow-auto flex items-center justify-center ${isPdf ? 'flex-1' : 'p-4 min-h-[180px]'}`}>
                    {loading && (
                        <div className="flex flex-col items-center gap-2 py-10">
                            <Spinner size="md" />
                            <span className="text-xs text-gray-400">Cargando adjunto...</span>
                        </div>
                    )}
                    {error && (
                        <div className="flex flex-col items-center gap-2 py-10">
                            <span className="text-3xl">⚠️</span>
                            <p className="text-xs text-red-500 text-center max-w-[280px]">{error}</p>
                            <button
                                onClick={() => navigator.clipboard?.writeText(att.downloadUrl)}
                                className="mt-1 px-3 py-1.5 border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-gray-50"
                                title={att.downloadUrl}
                            >
                                Copiar URL del proxy
                            </button>
                        </div>
                    )}
                    {!loading && !error && blobUrl && (
                        <>
                            {isImage && (
                                <img src={blobUrl} alt={att.name} className="max-w-full h-auto rounded" />
                            )}
                            {isPdf && (
                                <iframe src={blobUrl} title={att.name} className="w-full h-full border-0" />
                            )}
                            {isVideo && (
                                <video src={blobUrl} controls className="max-w-full h-auto rounded" />
                            )}
                            {!canPreview && (
                                <div className="flex flex-col items-center gap-3 py-10">
                                    <span className="text-5xl">{fileIcon(att.contentType)}</span>
                                    <p className="text-xs text-gray-500">Vista previa no disponible</p>
                                    <button
                                        onClick={handleDownload}
                                        className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90"
                                    >
                                        ⬇ Descargar archivo
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Attachment chip ──────────────────────────────────────────────────────────

function EmailAttachmentChip({ att, isSent }: { att: EmailAttachment; isSent: boolean }) {
    const [showPreview, setShowPreview] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowPreview(true)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-left ${
                    isSent
                        ? 'bg-white/15 border-white/30 hover:bg-white/25'
                        : 'bg-white border-gray-200 hover:border-primary hover:bg-green-light3/40'
                }`}
            >
                <span className="text-sm leading-none">{fileIcon(att.contentType)}</span>
                <div className="min-w-0">
                    <div className={`text-[10px] font-semibold truncate max-w-[140px] ${isSent ? 'text-white' : 'text-gray-700'}`}>
                        {att.name}
                    </div>
                    {att.size > 0 && (
                        <div className={`text-[9px] ${isSent ? 'text-white/70' : 'text-gray-400'}`}>
                            {formatSize(att.size)}
                        </div>
                    )}
                </div>
                <span className={`text-[10px] shrink-0 ${isSent ? 'text-white/70' : 'text-gray-400'}`}>
                    👁
                </span>
            </button>

            {showPreview && (
                <EmailPreviewModal att={att} onClose={() => setShowPreview(false)} />
            )}
        </>
    );
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

    const htmlContent = message.body_html || '';
    const textContent = message.body_text || message.body || 'Sin contenido';
    const hasHtml = htmlContent.length > 0;
    const attachments = message.attachments || [];

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
                {hasHtml ? (
                    <iframe
                        srcDoc={`<style>
                            html,body{margin:0;padding:0;font-family:system-ui,sans-serif;font-size:12px;
                            color:${isSent ? '#fff' : '#374151'};word-break:break-word;overflow-wrap:break-word;}
                            a{color:${isSent ? '#bfdbfe' : '#0d6efd'};}
                            img{max-width:100%;height:auto;}
                            blockquote,div[id*="divRplyFwd"]{display:none;}
                        </style>${htmlContent}`}
                        className="w-full border-0 bg-transparent block"
                        style={{ minHeight: '32px', maxHeight: '320px' }}
                        sandbox="allow-same-origin"
                        onLoad={(e) => {
                            const iframe = e.currentTarget;
                            const body = iframe.contentDocument?.body;
                            if (body) {
                                iframe.style.height = `${Math.min(body.scrollHeight + 8, 320)}px`;
                            }
                        }}
                    />
                ) : (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{textContent}</p>
                )}

                {attachments.length > 0 && (
                    <div className={`flex flex-wrap gap-1.5 mt-2 pt-2 border-t ${isSent ? 'border-white/20' : 'border-gray-200'}`}>
                        {attachments.map(att => (
                            <EmailAttachmentChip key={att.id} att={att} isSent={isSent} />
                        ))}
                    </div>
                )}

                {message.status === 'sending' && (
                    <div className="flex items-center gap-1 mt-1.5">
                        <Spinner size="sm" /><span className="text-[10px] opacity-70">Enviando...</span>
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
    onAnalyze,
    isAnalyzing = false,
}: {
    conversation: Conversation;
    contactEmail: string;
    onBack: () => void;
    onSendReply: (replyText: string) => Promise<void>;
    replyText: string;
    setReplyText: (v: string) => void;
    attachments: File[];
    setAttachments: (files: File[]) => void;
    onAnalyze?: () => Promise<void>;
    isAnalyzing?: boolean;
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
            <div className="px-3 py-2.5 border-b border-gray-100 shrink-0 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors font-medium"
                >
                    ← Volver a la lista
                </button>
                {onAnalyze && (
                    <button
                        onClick={onAnalyze}
                        disabled={isAnalyzing}
                        title="Analizar conversación con Galea IA"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        {isAnalyzing ? <Spinner size="sm" /> : <span>🤖</span>}
                        <span>{isAnalyzing ? 'Analizando...' : 'Analizar con Galea'}</span>
                    </button>
                )}
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

export function EmailPanel({ contactEmail, contactId, contactName, opportunityId, myPeopleId, onInteractionCreated }: EmailPanelProps) {
    const session = useSession();
    const airtableUserId = (session as any)?.currentUser?.id;
    const userEmail = (session as any)?.currentUser?.email ?? '';
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
    const [isAnalyzing, setIsAnalyzing] = useState(false);

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
            from: { name: myName, email: myEmail },
            receivedDateTime: new Date().toISOString(),
            direction: 'sent',
            status: 'sending',
            body_html: '',
            body_text: replyTextParam,
            attachments: [],
            // legacy compat
            body: replyTextParam,
            hasAttachments: attachments.length > 0,
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

    // ─── Galea AI analysis ───────────────────────────────────────────────────

    const handleAnalyzeWithGalea = async () => {
        if (!selectedConversation || isAnalyzing || !contactId) return;
        setIsAnalyzing(true);
        try {
            const msgs = selectedConversation.messages
                .filter(msg => (msg.body_text || msg.body || '').trim())
                .map(msg => ({
                    direction: (msg.direction === 'sent' || msg.from.email !== contactEmail)
                        ? 'outbound' as const
                        : 'inbound' as const,
                    text: msg.body_text || msg.body || '',
                    date: msg.receivedDateTime,
                }));

            if (msgs.length === 0) throw new Error('No hay mensajes con texto para analizar.');

            const data = await analyzeInteraction({
                channel: 'email',
                contactId,
                contactName: contactName || contactEmail || 'Contacto',
                userEmail: userEmail || undefined,
                airtableUserId: myPeopleId || undefined,
                opportunityId: opportunityId || undefined,
                subject: selectedConversation.subject,
                messages: msgs,
            });

            if (!data.success) throw new Error(data.error || 'Error en el análisis');

            // Build aiNotes in canonical multi-line format
            const dateLabel = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
            const aiNotes = [
                `[Correo | ${dateLabel}]`,
                '',
                data.resumen,
                '',
                `Categorias: ${data.categoria}`,
                `Siguiente paso: ${data.siguiente_paso}`,
                `Urgencia: ${data.urgencia}`,
                `Resultado: ${data.resultado}`,
                `Direction: ${data.direction}`,
            ].join('\n');

            // Backend already wrote to Airtable — construct Interaction from response
            const saved: Interaction = {
                id: data.airtable_record_id,
                name: 'Análisis Galea',
                type: [data.categoria],
                dateExecuted: new Date().toISOString(),
                notes: '',
                aiNotes,
                team: [],
                accountId: '',
                contactId,
                opportunityId: opportunityId || '',
                channel: 'correo',
                isOptimistic: false,
            };
            onInteractionCreated?.(saved);

            setNotification({
                id: Date.now().toString(),
                type: 'success',
                text: `Galea: ${data.categoria} · ${data.resultado} · Urgencia ${data.urgencia}`,
            });
        } catch (err: any) {
            const msg = err.message?.includes('502')
                ? 'El análisis se generó pero no se guardó en Airtable. Intenta de nuevo.'
                : `Error en Galea: ${err.message}`;
            setNotification({ id: Date.now().toString(), type: 'error', text: msg });
        } finally {
            setIsAnalyzing(false);
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
                    onAnalyze={contactId ? handleAnalyzeWithGalea : undefined}
                    isAnalyzing={isAnalyzing}
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
