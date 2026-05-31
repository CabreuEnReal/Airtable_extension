import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from '@airtable/blocks/interface/ui';
import type { EmailMessage, ParsedMessage, Notification } from '../../types/models';
import { parseEmailThread } from '../../utils/emailParser';
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

// ─── Email list item ──────────────────────────────────────────────────────────

function EmailListItem({ email, onClick }: { email: EmailMessage; onClick: () => void }) {
    const replyCount = email.replies?.length ?? 0;

    return (
        <button
            onClick={onClick}
            className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
            <div className="flex items-start gap-3">
                <Avatar name={email.from.name} size="sm" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-[11px] truncate ${email.isRead ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
                            {email.from.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {replyCount > 0 && (
                                <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                                    {replyCount + 1}
                                </span>
                            )}
                            <span className="text-[10px] text-gray-400">
                                {formatEmailDate(email.receivedDateTime)}
                            </span>
                        </div>
                    </div>
                    <div className={`text-[11px] truncate mb-0.5 ${email.isRead ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                        {email.subject}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{email.bodyPreview}</div>
                </div>
                {!email.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                )}
            </div>
        </button>
    );
}

// ─── Thread message bubble ────────────────────────────────────────────────────

function ThreadBubble({ message, contactEmail }: { message: ParsedMessage; contactEmail: string }) {
    // direction takes precedence; fall back to email comparison
    const isSent = message.direction
        ? message.direction === 'sent'
        : message.from.email !== contactEmail;

    return (
        <div className={`flex flex-col gap-1 ${isSent ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-1.5 px-1">
                {!isSent && <Avatar name={message.from.name} size="sm" />}
                <span className="text-[10px] text-gray-400">
                    {message.from.name} · {formatFullDate(message.date)}
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
                    {message.content || 'Sin contenido'}
                </p>
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

// ─── Thread view ──────────────────────────────────────────────────────────────

function ThreadView({
    email,
    contactEmail,
    onBack,
    onSendReply,
    replyText,
    setReplyText,
}: {
    email: EmailMessage;
    contactEmail: string;
    onBack: () => void;
    onSendReply: (replyText: string) => Promise<void>;
    replyText: string;
    setReplyText: (v: string) => void;
}) {
    const [isSending, setIsSending] = useState(false);

    // parsedThread already includes optimistic messages injected by handleSendReply
    const allMessages: ParsedMessage[] = email.parsedThread && email.parsedThread.length > 0
        ? email.parsedThread
        : [{ id: email.id, content: email.body || email.bodyPreview || '', from: email.from, date: email.receivedDateTime, isOriginal: true }];

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
                    {email.subject}
                </h3>
                <span className="text-[10px] text-gray-400">
                    {allMessages.length} mensaje{allMessages.length !== 1 ? 's' : ''} en el hilo
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
                {allMessages.map(msg => (
                    <ThreadBubble
                        key={msg.id}
                        message={msg}
                        contactEmail={contactEmail}
                    />
                ))}
            </div>

            <div className="px-3 py-2.5 border-t border-gray-100 shrink-0 bg-white">
                <div className="flex items-end gap-2 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primary transition-colors">
                    <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe tu respuesta..."
                        rows={2}
                        disabled={isSending}
                        className="flex-1 resize-none text-xs text-gray-700 placeholder-gray-400 outline-none bg-transparent leading-relaxed disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isSending || !replyText.trim()}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSending ? <Spinner size="sm" /> : <span className="text-white text-base leading-none">↑</span>}
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 px-1">
                    Enter para enviar · Shift+Enter nueva línea
                </p>
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
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [notification, setNotification] = useState<Notification | null>(null);
    const [replyText, setReplyText] = useState('');

    // Reset when contact changes
    useEffect(() => {
        setEmails([]);
        setSelectedEmail(null);
        setIsMsConnected(null);
        setReplyText('');
    }, [contactEmail]);

    // ─── Phase 2: load emails ─────────────────────────────────────────────────

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
            const rawEmails: EmailMessage[] = Array.isArray(data) ? data : (data.emails ?? []);
            const withThreads = rawEmails.map(email => ({
                ...email,
                parsedThread: parseEmailThread(
                    email.body || email.bodyPreview || '',
                    email.from,
                    email.receivedDateTime
                ),
            }));
            setEmails(withThreads);
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
        if (!selectedEmail) {
            setNotification({ id: Date.now().toString(), type: 'error', text: 'No hay email seleccionado' });
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
        const myEmail = (session as any)?.currentUser?.email ?? 'unknown@example.com';
        const myName = (session as any)?.currentUser?.name ?? 'Yo';

        const tempParsedMessage: ParsedMessage = {
            id: `temp-${Date.now()}`,
            content: replyTextParam,
            from: { name: myName, email: myEmail },
            date: new Date().toISOString(),
            isOriginal: false,
            status: 'sending',
            direction: 'sent',
        };

        const previousEmailState: EmailMessage = JSON.parse(JSON.stringify(selectedEmail));
        const previousReplyText = replyTextParam;

        const updatedEmail: EmailMessage = {
            ...selectedEmail,
            parsedThread: [...(selectedEmail.parsedThread ?? []), tempParsedMessage],
        };

        setSelectedEmail(updatedEmail);
        setEmails(prevEmails => prevEmails.map(email => email.id === selectedEmail.id ? updatedEmail : email));
        setReplyText('');
        setNotification({ id: Date.now().toString(), type: 'info', text: 'Enviando mensaje...' });

        try {
            console.log('====================================');
            console.log('📤 Enviando a webhook:', N8N_SEND_EMAIL_URL);
            console.log('📦 Body a enviar:', {
                airtableUserId,
                toEmail: contactEmail,
                subject: `RE: ${selectedEmail.subject}`,
                bodyText: formattedBodyText,
                messageId: selectedEmail.id,
            });

            const response = await fetch(N8N_SEND_EMAIL_URL, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    airtableUserId: airtableUserId,
                    toEmail: contactEmail,
                    subject: `RE: ${selectedEmail.subject}`,
                    bodyText: formattedBodyText,
                    messageId: selectedEmail.id,
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

            const updatedEmailAfterSuccess: EmailMessage = {
                ...updatedEmail,
                parsedThread: (updatedEmail.parsedThread ?? []).map(msg =>
                    msg.id === tempParsedMessage.id ? { ...msg, status: 'sent' as const } : msg
                ),
            };
            setSelectedEmail(updatedEmailAfterSuccess);
            setEmails(prevEmails => prevEmails.map(email => email.id === selectedEmail.id ? updatedEmailAfterSuccess : email));

            setNotification({ id: Date.now().toString(), type: 'success', text: 'Mensaje enviado correctamente' });
            setTimeout(() => { loadEmails(); }, 1500);

        } catch (error) {
            console.error('❌ Error en el envío:', error);

            const rollbackEmail: EmailMessage = {
                ...previousEmailState,
                parsedThread: (previousEmailState.parsedThread ?? []).filter(
                    (msg: ParsedMessage) => !msg.id.startsWith('temp-')
                ),
            };
            setSelectedEmail(rollbackEmail);
            setEmails(prevEmails => prevEmails.map(email => email.id === selectedEmail.id ? rollbackEmail : email));
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

    if (isMsConnected === null || (isLoadingEmails && emails.length === 0)) {
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

    if (emails.length === 0) {
        return (
            <EmptyState
                icon="📭"
                title="Sin correos"
                description={`No hay correos registrados para ${contactEmail}`}
            />
        );
    }

    if (selectedEmail !== null) {
        return (
            <>
                <ThreadView
                    email={selectedEmail}
                    contactEmail={contactEmail}
                    onBack={() => setSelectedEmail(null)}
                    onSendReply={handleSendReply}
                    replyText={replyText}
                    setReplyText={setReplyText}
                />
                <Toast notification={notification} onDismiss={() => setNotification(null)} duration={3000} />
            </>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 shrink-0 bg-gray-50">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Correos ({emails.length})
                </span>
            </div>
            <div className="flex-1 overflow-y-auto">
                {emails.map(email => (
                    <EmailListItem
                        key={email.id}
                        email={email}
                        onClick={() => setSelectedEmail(email)}
                    />
                ))}
            </div>
            <Toast notification={notification} onDismiss={() => setNotification(null)} duration={3000} />
        </div>
    );
}
