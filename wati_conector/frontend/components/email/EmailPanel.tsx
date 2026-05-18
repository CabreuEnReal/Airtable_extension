import { useState, useEffect } from 'react';
import type { EmailMessage, Notification } from '../../types/models';
import { getMockEmails } from '../../utils/mockEmails';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import { Toast } from '../common/Toast';

interface EmailPanelProps {
    contactEmail?: string;
}

const ME = { name: 'Carlos Abreu', email: 'carlosa@energiareal.mx' };

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

// ─── Email list item ─────────────────────────────────────────────────────────

function EmailListItem({
    email,
    onClick,
}: {
    email: EmailMessage;
    onClick: () => void;
}) {
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
                        <span
                            className={`text-[11px] truncate ${
                                email.isRead ? 'text-gray-600' : 'text-gray-900 font-semibold'
                            }`}
                        >
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
                    <div
                        className={`text-[11px] truncate mb-0.5 ${
                            email.isRead ? 'text-gray-500' : 'text-gray-800 font-medium'
                        }`}
                    >
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

// ─── Thread message bubble ───────────────────────────────────────────────────

function ThreadBubble({
    message,
    isFromContact,
}: {
    message: EmailMessage;
    isFromContact: boolean;
}) {
    return (
        <div className={`flex flex-col gap-1 ${isFromContact ? 'items-start' : 'items-end'}`}>
            <div className="flex items-center gap-1.5 px-1">
                {isFromContact && <Avatar name={message.from.name} size="sm" />}
                <span className="text-[10px] text-gray-400">
                    {message.from.name} · {formatFullDate(message.receivedDateTime)}
                </span>
            </div>
            <div
                className={`max-w-[88%] rounded-xl px-3 py-2.5 ${
                    isFromContact
                        ? 'bg-gray-100 text-gray-700 rounded-tl-sm'
                        : 'bg-primary text-white rounded-tr-sm'
                }`}
            >
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{message.body}</p>
                {message.hasAttachments && (
                    <div
                        className={`mt-2 text-[10px] flex items-center gap-1 ${
                            isFromContact ? 'text-gray-400' : 'text-green-100'
                        }`}
                    >
                        📎 Tiene adjuntos
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Thread view ─────────────────────────────────────────────────────────────

function ThreadView({
    email,
    contactEmail,
    onBack,
    onAddReply,
}: {
    email: EmailMessage;
    contactEmail: string;
    onBack: () => void;
    onAddReply: (reply: EmailMessage) => void;
}) {
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);

    const allMessages = [email, ...(email.replies ?? [])].sort(
        (a, b) =>
            new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime()
    );

    async function handleSend() {
        if (!replyText.trim() || isSending) return;

        setIsSending(true);

        const newReply: EmailMessage = {
            id: `reply-${Date.now()}`,
            subject: `RE: ${email.subject}`,
            bodyPreview: replyText.slice(0, 100),
            body: replyText,
            from: ME,
            isRead: true,
            receivedDateTime: new Date().toISOString(),
            hasAttachments: false,
        };

        await new Promise<void>(res => setTimeout(res, 1000));

        onAddReply(newReply);
        setReplyText('');
        setIsSending(false);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Back button */}
            <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors font-medium"
                >
                    ← Volver a la lista
                </button>
            </div>

            {/* Thread subject header */}
            <div className="px-4 py-2.5 border-b border-gray-100 shrink-0 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-800 leading-snug truncate">
                    {email.subject}
                </h3>
                <span className="text-[10px] text-gray-400">
                    {allMessages.length} mensaje{allMessages.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Messages — independent scroll */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
                {allMessages.map(msg => (
                    <ThreadBubble
                        key={msg.id}
                        message={msg}
                        isFromContact={msg.from.email === contactEmail}
                    />
                ))}
            </div>

            {/* Reply input — docked at bottom */}
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
                        {isSending ? (
                            <Spinner size="sm" />
                        ) : (
                            <span className="text-white text-base leading-none">↑</span>
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 px-1">
                    Enter para enviar · Shift+Enter nueva línea
                </p>
            </div>
        </div>
    );
}

// ─── Main EmailPanel ─────────────────────────────────────────────────────────

export function EmailPanel({ contactEmail }: EmailPanelProps) {
    const [isMsConnected, setIsMsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [notification, setNotification] = useState<Notification | null>(null);

    // Reset when contact changes
    useEffect(() => {
        setEmails(contactEmail ? getMockEmails(contactEmail) : []);
        setSelectedEmail(null);
    }, [contactEmail]);

    async function handleConnectAccount() {
        setIsConnecting(true);
        await new Promise<void>(res => setTimeout(res, 2000));
        setIsConnecting(false);
        setIsMsConnected(true);
        setNotification({
            id: Date.now().toString(),
            type: 'success',
            text: 'Cuenta de Microsoft vinculada exitosamente',
        });
    }

    if (!contactEmail) {
        return (
            <EmptyState
                icon="✉️"
                title="Sin correo vinculado"
                description="Este contacto no tiene dirección de correo. Actualiza el registro en Airtable para habilitar esta función."
            />
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
                <Toast
                    notification={notification}
                    onDismiss={() => setNotification(null)}
                    duration={3000}
                />
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

    function handleAddReply(newReply: EmailMessage) {
        if (!selectedEmail) return;

        const targetId = selectedEmail.id;

        const updatedEmail: EmailMessage = {
            ...selectedEmail,
            replies: [...(selectedEmail.replies ?? []), newReply],
        };

        setEmails(prev =>
            prev.map(e => (e.id === targetId ? updatedEmail : e))
        );
        setSelectedEmail(updatedEmail);
        setNotification({
            id: Date.now().toString(),
            type: 'success',
            text: 'Correo enviado exitosamente',
        });
    }

    // Thread view
    if (selectedEmail !== null) {
        return (
            <>
                <ThreadView
                    email={selectedEmail}
                    contactEmail={contactEmail}
                    onBack={() => setSelectedEmail(null)}
                    onAddReply={handleAddReply}
                />
                <Toast
                    notification={notification}
                    onDismiss={() => setNotification(null)}
                    duration={3000}
                />
            </>
        );
    }

    // List view
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
        </div>
    );
}
