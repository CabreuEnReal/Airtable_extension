import { useState, useMemo } from 'react';
import { ConversationFilters } from './ConversationFilters';
import { ConversationItem } from './ConversationItem';
import type { Contact, Message, Conversation, ConversationFilter } from '../../types/models';

interface ConversationPanelProps {
    contacts: Contact[];
    messages: Message[];
    selectedContactId: string | null;
    onSelectContact: (id: string) => void;
}

function buildConversations(contacts: Contact[], messages: Message[]): Conversation[] {
    const msgByContact: Record<string, Message[]> = {};
    for (const m of messages) {
        if (!m.contactId) continue;
        if (!msgByContact[m.contactId]) msgByContact[m.contactId] = [];
        msgByContact[m.contactId].push(m);
    }

    return contacts.map((contact) => {
        const msgs = msgByContact[contact.id] ?? [];
        const sorted = [...msgs].sort((a, b) => {
            const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tb - ta;
        });
        const lastMessage = sorted[0] ?? null;
        const unreadCount = msgs.filter(
            (m) => m.direction === 'inbound' && m.readStatus === 'unread'
        ).length;

        return {
            contact,
            lastMessage,
            unreadCount,
            totalMessages: msgs.length,
            lastActivityAt: lastMessage?.timestamp ?? '',
        };
    }).sort((a, b) => {
        const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return tb - ta;
    });
}

export function ConversationPanel({
    contacts,
    messages,
    selectedContactId,
    onSelectContact,
}: ConversationPanelProps) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<ConversationFilter>('all');

    const conversations = useMemo(
        () => buildConversations(contacts, messages),
        [contacts, messages]
    );

    const filtered = useMemo(() => {
        let list = conversations;

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(
                (c) =>
                    c.contact.displayName.toLowerCase().includes(q) ||
                    c.contact.phone.includes(q) ||
                    c.contact.email.toLowerCase().includes(q)
            );
        }

        if (filter === 'unread') list = list.filter((c) => c.unreadCount > 0);
        if (filter === 'open') list = list.filter((c) => c.totalMessages > 0);
        if (filter === 'pending') list = list.filter((c) => c.unreadCount > 0);

        return list;
    }, [conversations, search, filter]);

    const counts = useMemo(() => ({
        all: conversations.length,
        open: conversations.filter((c) => c.totalMessages > 0).length,
        unread: conversations.filter((c) => c.unreadCount > 0).length,
        pending: conversations.filter((c) => c.unreadCount > 0).length,
    }), [conversations]);

    return (
        <div className="w-conversations flex flex-col border-r border-gray-100 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="text-card-heading font-semibold text-gray-800">Conversaciones</h2>
                <span className="text-label text-gray-400">{conversations.length} activas</span>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-100">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar contacto..."
                        className="w-full pl-9 pr-3 py-2 text-body border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                    />
                </div>
            </div>

            {/* Filters */}
            <ConversationFilters active={filter} onChange={setFilter} counts={counts} />

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {filtered.map((conv) => (
                    <ConversationItem
                        key={conv.contact.id}
                        conversation={conv}
                        isSelected={conv.contact.id === selectedContactId}
                        onClick={() => onSelectContact(conv.contact.id)}
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="p-6 text-center text-body text-gray-400">
                        {search ? 'Sin resultados' : 'No hay conversaciones'}
                    </div>
                )}
            </div>
        </div>
    );
}
