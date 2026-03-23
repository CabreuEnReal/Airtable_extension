import { useEffect, useRef, useMemo } from 'react';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { Contact, Message, Template } from '../../types/models';
import { formatDate } from '../../utils/formatters';
import { IconButton } from '../common/IconButton';

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
}: ChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-white gap-3">
                <Avatar name={contact.displayName} size="md" online />
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{contact.displayName}</div>
                    <div className="text-label text-primary">● En línea</div>
                </div>
                <div className="flex items-center gap-1">
                    <IconButton icon="🔍" label="Buscar" size="sm" />
                    {onOpenNotes && <IconButton icon="📝" label="Notas" size="sm" onClick={onOpenNotes} />}
                    {onOpenDetail && <IconButton icon="ℹ️" label="Detalle" size="sm" onClick={onOpenDetail} />}
                    <IconButton icon="⋮" label="Más" size="sm" />
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-surface-light">
                {dateGroups.map((group) => (
                    <div key={group.label}>
                        <div className="flex justify-center my-3">
                            <span className="bg-white text-label text-gray-400 px-3 py-1 rounded-full shadow-xs">
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
                        No hay mensajes aún. Envía un mensaje para iniciar la conversación.
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput onSend={onSend} onSendMedia={onSendMedia} onSendMetaTemplate={onSendMetaTemplate} onSelectAirtableTemplate={onSelectAirtableTemplate} templates={templates} sending={sending} pendingDraft={pendingDraft} onPendingDraftConsumed={onPendingDraftConsumed} />
        </div>
    );
}
