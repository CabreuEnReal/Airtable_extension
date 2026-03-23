import { Avatar } from '../common/Avatar';
import { CountBadge } from '../common/Badge';
import type { Conversation } from '../../types/models';
import { formatTime, formatRelativeTime, truncate } from '../../utils/formatters';

const TEMPLATE_REGEX = /^\[template:([^\]]+)\]\s*params=\[([^\]]*)\]$/;

function formatMessagePreview(text: string): string {
    const match = text.match(TEMPLATE_REGEX);
    if (!match) return text;
    const name = match[1];
    const rawParams = match[2].trim();
    const params = rawParams ? rawParams.split(',').map((p: string) => p.trim()).filter(Boolean) : [];
    return params.length > 0
        ? `📋 Plantilla "${name}" enviada con: ${params.join(', ')}`
        : `📋 Plantilla "${name}" enviada`;
}

interface ConversationItemProps {
    conversation: Conversation;
    isSelected: boolean;
    onClick: () => void;
}

export function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
    const { contact, lastMessage, unreadCount } = conversation;
    const hasUnread = unreadCount > 0;
    const preview = lastMessage ? truncate(formatMessagePreview(lastMessage.text), 45) : 'Sin mensajes';
    const timeLabel = lastMessage?.timestamp
        ? formatRelativeTime(lastMessage.timestamp)
        : '';

    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b border-gray-100 transition-colors
                ${isSelected
                    ? 'bg-green-selected'
                    : 'hover:bg-gray-25'
                }`}
        >
            <Avatar name={contact.displayName} size="md" />

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${hasUnread || isSelected ? 'font-semibold' : ''} text-gray-800`}>
                        {contact.displayName}
                    </span>
                    <span className="text-label text-gray-400 flex-shrink-0 ml-2">{timeLabel}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <span className={`text-xs truncate ${hasUnread ? 'text-gray-700' : 'text-gray-400'}`}>
                        {preview}
                    </span>
                    <CountBadge count={unreadCount} />
                </div>
            </div>
        </div>
    );
}
