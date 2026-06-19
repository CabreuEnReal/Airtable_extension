import { useState, type ReactNode } from 'react';
import type { Contact, ActiveChannel, Interaction, Message, Template } from '../../types/models';
import type { ApiConversationResponse } from '../../types/api';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { InteractionList, InteractionDetailModal } from './InteractionList';
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

    // ── ChatPanel props ──────────────────────────────────────────────────────
    messages?: Message[];
    templates?: Template[];
    onSend?: (text: string) => void;
    onSendMedia?: (file: File) => void;
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
    messages = [],
    templates,
    onSend,
    onSendMedia,
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
    const galeaText = opp.companyDescription || opp.linkedInSummary || '';
    // Filter to the active contact only — each contact has independent notes/history.
    const contactInteractions = interactions.filter(
        (it) => it.isOptimistic || it.contactId === contact.id,
    );
    const latestGaleaInteraction = [...contactInteractions]
        .sort((a, b) => (b.dateExecuted || '').localeCompare(a.dateExecuted || ''))
        .find((it) => it.aiNotes);

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
                    <EmailPanel contactEmail={contact.email} contactId={contact.id} contactName={contact.displayName} opportunityId={opp.id} onInteractionCreated={onInteractionCreated} />
                )}
            </main>

            {/* ── RIGHT: files + notes (270px) ── */}
            <aside className="w-[270px] flex-shrink-0 border-l border-gray-100 flex flex-col overflow-hidden bg-white">
                {/* Files */}
                <ColumnTitle>Archivos relacionados</ColumnTitle>
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
                            className="w-full pl-8 pr-2.5 py-1.5 border-[1.5px] border-gray-100 rounded-lg text-xs bg-surface-light outline-none focus:border-primary focus:bg-white"
                            placeholder="Buscar archivo..."
                        />
                    </div>
                </div>
                <div className="max-h-[40%] overflow-y-auto">
                    <EmptyState icon="📎" title="Sin archivos" description="Los archivos adjuntos aparecerán aquí." />
                </div>

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
