import { useState, useMemo, type ReactNode } from 'react';
import type { Contact, ActiveChannel, Interaction, Message, Attachment, Template } from '../../types/models';
import type { ApiConversationResponse } from '../../types/api';
import { getMediaType, isImage } from '../../types/models';
import { formatFileSize } from '../../utils/fileUtils';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { InteractionList, InteractionDetailModal } from './InteractionList';
import { AttachmentPreview } from '../chat/AttachmentPreview';
import { ChatPanel } from '../chat/ChatPanel';
import { EmailPanel } from '../email/EmailPanel';

interface OpportunityDetailViewBProps {
    /** The parent opportunity (GALEA / company context lives here). */
    opportunity: Contact;
    /** The active contact whose conversation is open (breadcrumb leaf). */
    contact: Contact;
    /** Linked contacts of the opportunity (left column list). */
    linkedContacts: Contact[];
    /** Switch the active contact within the same opportunity. */
    onSelectContact: (id: string) => void;
    activeChannel: ActiveChannel;
    onChannelChange: (c: ActiveChannel) => void;
    /** Open the contact context modal (Module 3). */
    onViewContact?: (id: string) => void;
    /** Open the new-email composer modal (Module 4). */
    onNewEmail?: () => void;
    onAddInteraction?: () => void;
    onAddNote?: () => void;
    /** Interaction history for this opportunity (drives Notas + Historial). */
    interactions?: Interaction[];
    onInteractionCreated?: (it: Interaction) => void;
    /** Resolved Airtable People record ID for the current user (used by Galea). */
    myPeopleId?: string | null;

    // ── ChatPanel props ──────────────────────────────────────────────────────
    messages?: Message[];
    templates?: Template[];
    onSend?: (text: string) => void;
    onSendMedia?: (file: File) => void;
    onMediaError?: (error: string) => void;
    onSendMetaTemplate?: (template: Template, parameters: string[]) => void;
    onSelectAirtableTemplate?: (template: Template) => void;
    onRetryMedia?: (messageId: string) => Promise<void>;
    sending?: boolean;
    pendingDraft?: string | null;
    onPendingDraftConsumed?: () => void;
    onReopenConversation?: () => Promise<{ success: boolean; error?: string }>;
    onAnalyzeConversation?: () => Promise<void>;
    conversationActive?: boolean;
    windowStatusLoading?: boolean;
    conversationResponse?: ApiConversationResponse | null;
    summaryLoading?: boolean;
    summaryError?: string | null;
    /** True when the logged-in user's cellphone matches a registered Meta number. */
    isWhatsAppLinked?: boolean;
}

function ColumnTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex items-center justify-between px-3.5 py-2 bg-surface-light border-b border-gray-100 flex-shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{children}</span>
            {action}
        </div>
    );
}

const DASHED_BTN =
    'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-[1.5px] border-dashed border-gray-200 text-xs font-semibold text-gray-400 hover:border-primary hover:text-primary hover:bg-green-light3/50 transition-colors';

function FileRow({
    attachment,
    direction,
    timestamp,
    onPreview,
}: {
    attachment: Attachment;
    direction: 'inbound' | 'outbound';
    timestamp: string;
    onPreview: () => void;
}) {
    const isImg = isImage(attachment.mimeType);
    const dateStr = (() => {
        try { return new Date(timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }); }
        catch { return ''; }
    })();

    return (
        <button
            onClick={onPreview}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
        >
            {/* Icon / thumbnail placeholder */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                {isImg ? (
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-800 truncate">
                    {decodeURIComponent(attachment.name)}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-gray-400">{formatFileSize(attachment.size)}</span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className={`text-[10px] font-medium ${direction === 'outbound' ? 'text-primary' : 'text-gray-400'}`}>
                        {direction === 'outbound' ? 'Enviado' : 'Recibido'}
                    </span>
                    {dateStr && <><span className="text-[10px] text-gray-300">·</span><span className="text-[10px] text-gray-400">{dateStr}</span></>}
                </div>
            </div>
            <svg className="flex-shrink-0 w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
}

export function OpportunityDetailViewB({
    opportunity: opp,
    contact,
    linkedContacts,
    onSelectContact,
    activeChannel,
    onChannelChange,
    onViewContact,
    onNewEmail,
    onAddInteraction,
    onAddNote,
    interactions = [],
    onInteractionCreated,
    myPeopleId,
    messages = [],
    templates,
    onSend,
    onSendMedia,
    onMediaError,
    onSendMetaTemplate,
    onSelectAirtableTemplate,
    onRetryMedia,
    sending = false,
    pendingDraft,
    onPendingDraftConsumed,
    onReopenConversation,
    onAnalyzeConversation,
    conversationActive,
    windowStatusLoading,
    conversationResponse,
    summaryLoading,
    summaryError,
    isWhatsAppLinked = false,
}: OpportunityDetailViewBProps) {
    console.log('[VIEW B RENDER]', {
        contactId: contact?.id,
        contactName: contact?.displayName,
        isWhatsAppLinked,
        activeChannel,
        messagesCount: messages?.length,
        conversationActive,
        windowStatusLoading,
        conversationResponseStatus: conversationResponse?.status ?? null,
        summaryLoading,
        summaryError,
    });
    const [galeaModalInteraction, setGaleaModalInteraction] = useState<Interaction | null>(null);
    const [fileSearch, setFileSearch] = useState('');
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
    const galeaText = opp.companyDescription || opp.linkedInSummary || '';
    // Filter to the active contact only — each contact has independent notes/history.
    const contactInteractions = interactions.filter(
        (it) => it.isOptimistic || it.contactId === contact.id,
    );
    const latestGaleaInteraction = [...contactInteractions]
        .sort((a, b) => (b.dateExecuted || '').localeCompare(a.dateExecuted || ''))
        .find((it) => it.aiNotes);

    // Collect all image/document attachments from chat messages (both sent & received).
    // Voice notes excluded (isVoice or audio mimeType without image/document).
    const chatAttachments = useMemo(() => {
        const seen = new Set<string>();
        const result: Array<{ attachment: Attachment; direction: 'inbound' | 'outbound'; timestamp: string }> = [];
        for (const msg of messages) {
            for (const att of msg.attachments) {
                if (att.isVoice) continue;
                const mt = getMediaType(att.mimeType);
                if (mt === 'audio') continue; // skip non-voice audio too
                if (seen.has(att.id)) continue;
                seen.add(att.id);
                result.push({ attachment: att, direction: msg.direction as 'inbound' | 'outbound', timestamp: msg.timestamp });
            }
        }
        return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }, [messages]);

    const filteredAttachments = useMemo(() => {
        if (!fileSearch.trim()) return chatAttachments;
        const q = fileSearch.toLowerCase();
        return chatAttachments.filter(({ attachment }) =>
            decodeURIComponent(attachment.name).toLowerCase().includes(q)
        );
    }, [chatAttachments, fileSearch]);

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* ── LEFT: condensed opportunity context + contacts (290px) ── */}
            <aside className="w-[290px] flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden bg-white">
                {/* Opp header */}
                <div className="flex items-start gap-2.5 px-3.5 py-3 border-b border-gray-100 flex-shrink-0">
                    <Avatar name={opp.company || opp.displayName} size="sm" />
                    <div className="flex-1 min-w-0">
                        <div className="text-body font-bold text-gray-800 truncate">{opp.displayName}</div>
                        <div className="text-xs text-gray-400 truncate">{opp.company || '—'}</div>
                    </div>
                    <button
                        title="Contexto de la oportunidad"
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border-[1.5px] border-gray-100 text-gray-400 hover:border-primary hover:text-primary hover:bg-green-light3"
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                    </button>
                </div>

                {/* GALEA truncated */}
                <div className="px-3.5 py-2.5 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                            <path d="M12 2l2.09 6.26L20.18 9l-5.09 3.74L17.18 19 12 15.27 6.82 19l2.09-6.26L3.82 9l6.09-.74L12 2z" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Resumen de GALEA</span>
                    </div>
                    {latestGaleaInteraction ? (
                        <button
                            onClick={() => setGaleaModalInteraction(latestGaleaInteraction)}
                            className="w-full text-left group"
                        >
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 group-hover:text-gray-900 transition-colors">
                                {latestGaleaInteraction.aiNotes
                                    ?.split('\n')
                                    .filter((l) => l.trim())
                                    .slice(1)
                                    .join(' ') || latestGaleaInteraction.aiNotes}
                            </p>
                            <span className="text-[10px] text-primary font-semibold mt-0.5 inline-block">Ver análisis →</span>
                        </button>
                    ) : (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                            {galeaText || 'Sin resumen generado aún.'}
                        </p>
                    )}
                </div>
                {galeaModalInteraction && (
                    <InteractionDetailModal
                        it={galeaModalInteraction}
                        onClose={() => setGaleaModalInteraction(null)}
                    />
                )}

                {/* Channel pills */}
                <div className="flex gap-1.5 px-3.5 py-2.5 border-b border-gray-100 flex-shrink-0">
                    {(['whatsapp', 'correo'] as ActiveChannel[]).map((ch) => {
                        const active = activeChannel === ch;
                        return (
                            <button
                                key={ch}
                                onClick={() => onChannelChange(ch)}
                                className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border-[1.5px] transition-colors ${
                                    active
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-500 border-gray-100 hover:border-primary hover:text-primary'
                                }`}
                            >
                                {ch === 'whatsapp' ? 'WhatsApp' : 'Correo'}
                            </button>
                        );
                    })}
                </div>

                {/* Contacts list */}
                <ColumnTitle>Contactos</ColumnTitle>
                <div className="max-h-[220px] overflow-y-auto">
                    {linkedContacts.length === 0 ? (
                        <EmptyState icon="👤" title="Sin contactos vinculados" />
                    ) : (
                        linkedContacts.map((c) => {
                            const selected = c.id === contact.id;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => onSelectContact(c.id)}
                                    className={`w-full text-left flex items-center gap-2.5 px-3.5 py-2 border-b border-gray-75 last:border-b-0 transition-colors ${
                                        selected ? 'bg-green-light3' : 'hover:bg-green-light3/40'
                                    }`}
                                >
                                    <Avatar name={c.displayName} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold text-gray-800 truncate">{c.displayName}</div>
                                        <div className="text-[11px] text-gray-400 truncate">{c.jobTitle || c.email || '—'}</div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Emails (collapsed cap) */}
                <ColumnTitle
                    action={
                        <button
                            onClick={onNewEmail}
                            className="px-2 py-0.5 rounded-md border-[1.5px] border-primary text-primary text-[10px] font-semibold hover:bg-green-light3"
                        >
                            + Nuevo
                        </button>
                    }
                >
                    Correos
                </ColumnTitle>
                <div className="max-h-[180px] overflow-y-auto">
                    <EmptyState icon="✉️" title="Sin correos" />
                </div>

                {/* History */}
                <ColumnTitle>Historial</ColumnTitle>
                <InteractionList
                    items={contactInteractions}
                    maxHeightClass="max-h-[200px]"
                    emptyIcon="🕓"
                    emptyTitle="Sin interacciones"
                />

                {/* Footer action */}
                <div className="mt-auto p-2.5 border-t border-gray-100 flex-shrink-0">
                    <button onClick={onAddInteraction} className={DASHED_BTN}>
                        + Agregar interacción
                    </button>
                </div>
            </aside>

            {/* ── CENTER: conversation ── */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {activeChannel === 'whatsapp' ? (
                    isWhatsAppLinked ? (
                        <ChatPanel
                            contact={contact}
                            messages={messages}
                            templates={templates}
                            onSend={onSend ?? (() => {})}
                            onSendMedia={onSendMedia}
                            onSendMetaTemplate={onSendMetaTemplate}
                            onSelectAirtableTemplate={onSelectAirtableTemplate}
                            onRetryMedia={onRetryMedia}
                            sending={sending}
                            onOpenDetail={() => onViewContact?.(contact.id)}
                            onOpenNotes={onAddNote}
                            pendingDraft={pendingDraft}
                            onPendingDraftConsumed={onPendingDraftConsumed}
                            onReopenConversation={onReopenConversation}
                            onMediaError={onMediaError}
                            onAnalyzeConversation={onAnalyzeConversation}
                            conversationActive={conversationActive}
                            windowStatusLoading={windowStatusLoading}
                            conversationResponse={conversationResponse}
                            summaryLoading={summaryLoading}
                            summaryError={summaryError}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-[#e8ede8]">
                            <EmptyState
                                icon="🔒"
                                title="Canal no vinculado"
                                description="Debes realizar la vinculación de tu número con Meta para poder visualizar y enviar mensajes de WhatsApp."
                            />
                        </div>
                    )
                ) : (
                    <EmailPanel contactEmail={contact.email} contactId={contact.id} contactName={contact.displayName} opportunityId={opp.id} myPeopleId={myPeopleId} onInteractionCreated={onInteractionCreated} />
                )}
            </main>

            {/* ── RIGHT: files + notes (270px) ── */}
            <aside className="w-[270px] flex-shrink-0 border-l border-gray-100 flex flex-col overflow-hidden bg-white">
                {/* Files */}
                <ColumnTitle>
                    {`Archivos relacionados${chatAttachments.length > 0 ? ` (${chatAttachments.length})` : ''}`}
                </ColumnTitle>
                <div className="px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
                    <div className="relative">
                        <svg
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300"
                            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            value={fileSearch}
                            onChange={(e) => setFileSearch(e.target.value)}
                            className="w-full pl-8 pr-2.5 py-1.5 border-[1.5px] border-gray-100 rounded-lg text-xs bg-surface-light outline-none focus:border-primary focus:bg-white"
                            placeholder="Buscar archivo..."
                        />
                    </div>
                </div>
                <div className="max-h-[40%] overflow-y-auto">
                    {filteredAttachments.length === 0 ? (
                        <EmptyState icon="📎" title="Sin archivos" description="Los archivos del chat aparecerán aquí." />
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredAttachments.map(({ attachment, direction, timestamp }) => (
                                <FileRow
                                    key={attachment.id}
                                    attachment={attachment}
                                    direction={direction}
                                    timestamp={timestamp}
                                    onPreview={() => setPreviewAttachment(attachment)}
                                />
                            ))}
                        </div>
                    )}
                </div>
                {previewAttachment && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                        onClick={() => setPreviewAttachment(null)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-2xl p-4 max-w-md w-full mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-gray-800 truncate pr-2">
                                    {decodeURIComponent(previewAttachment.name)}
                                </span>
                                <button
                                    onClick={() => setPreviewAttachment(null)}
                                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                                >
                                    ✕
                                </button>
                            </div>
                            <AttachmentPreview attachment={previewAttachment} maxWidth={380} />
                        </div>
                    </div>
                )}

                {/* Notes */}
                <ColumnTitle>Notas</ColumnTitle>
                <InteractionList
                    items={contactInteractions}
                    maxHeightClass="flex-1"
                    emptyIcon="📝"
                    emptyTitle="Sin notas aún"
                />
                <div className="p-2.5 border-t border-gray-100 flex-shrink-0">
                    <button onClick={onAddNote} className={DASHED_BTN}>
                        + Agregar nota
                    </button>
                </div>
            </aside>
        </div>
    );
}
