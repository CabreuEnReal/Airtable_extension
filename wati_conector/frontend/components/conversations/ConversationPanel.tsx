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
    const [ownerFilter, setOwnerFilter] = useState<string>('all');

    const conversations = useMemo(
        () => buildConversations(contacts, messages),
        [contacts, messages]
    );

    // Collect unique owners (only from leads that have an owner)
    const owners = useMemo(() => {
        const map = new Map<string, string>();
        for (const c of contacts) {
            if (c.contactType === 'lead' && c.ownerId && c.ownerName) {
                map.set(c.ownerId, c.ownerName);
            }
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [contacts]);

    const filtered = useMemo(() => {
        let list = conversations;

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(
                (c) =>
                    c.contact.displayName.toLowerCase().includes(q) ||
                    c.contact.phone.includes(q) ||
                    c.contact.email.toLowerCase().includes(q) ||
                    c.contact.company.toLowerCase().includes(q)
            );
        }

        if (filter === 'unread') list = list.filter((c) => c.unreadCount > 0);
        if (filter === 'open') list = list.filter((c) => c.totalMessages > 0);
        if (filter === 'leads') list = list.filter((c) => c.contact.contactType === 'lead');
        if (filter === 'contacts') list = list.filter((c) => c.contact.contactType === 'contact');

        // Owner filter (only applies when viewing leads or all)
        if (ownerFilter !== 'all') {
            list = list.filter((c) => c.contact.ownerId === ownerFilter);
        }

        // Don't filter by phone number - show all contacts (including those without phone)
        // Phone validation will be handled in ChatPanel

        return list;
    }, [conversations, search, filter, ownerFilter]);

    const counts = useMemo(() => ({
        all: conversations.length,
        leads: conversations.filter((c) => c.contact.contactType === 'lead').length,
        contacts: conversations.filter((c) => c.contact.contactType === 'contact').length,
        open: conversations.filter((c) => c.totalMessages > 0).length,
        unread: conversations.filter((c) => c.unreadCount > 0).length,
    }), [conversations]);

    return (
        <div className="w-conversations flex flex-col border-r border-gray-100 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="text-card-heading font-semibold text-gray-800">Conversaciones</h2>
                <span className="text-label text-gray-400">{filtered.length} de {conversations.length}</span>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-100">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar contacto o empresa..."
                        className="w-full pl-9 pr-3 py-2 text-body border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                    />
                </div>
            </div>

            {/* Filters */}
            <ConversationFilters active={filter} onChange={setFilter} counts={counts} />

            {/* Owner filter (shown when viewing leads or all, and owners exist) */}
            {owners.length > 0 && (filter === 'leads' || filter === 'all') && (
                <div className="px-3 py-1.5 border-b border-gray-100">
                    <select
                        value={ownerFilter}
                        onChange={(e) => setOwnerFilter(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-primary text-gray-600"
                    >
                        <option value="all">Todos los owners</option>
                        {owners.map((o) => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                </div>
            )}

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
