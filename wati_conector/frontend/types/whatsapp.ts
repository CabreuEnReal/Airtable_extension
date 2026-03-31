// ─── WhatsApp Multi-Number Types ───────────────────────────────────────

export interface WhatsAppNumber {
    id: number;
    phone_number_id: string;
    display_name: string | null;
    phone_number: string;
    is_active: boolean;
    connection_status: 'connected' | 'disconnected' | 'error';
    last_webhook_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface NumberStats {
    unread_count: number;
    total_messages_today: number;
    response_rate: number;
    last_activity: string | null;
}

export interface InboxStatus {
    count: number;
    unread_count: number;
    last_updated: string;
}

export interface MessageInbox {
    id: number;
    whatsapp_number_id: number;
    contact_id: number;
    message_id: number;
    is_read: boolean;
    assigned_to: string | null;
    priority: 1 | 2 | 3; // 1=low, 2=medium, 3=high
    tags: string | null; // JSON string
    created_at: string;
    updated_at: string;
}

// Extended Message with whatsapp_number_id
export interface MessageWithNumber {
    id: number;
    contact_id: number;
    contact_phone?: string;
    contact_name?: string;
    from_number: string;
    to_number: string;
    message_type?: 'text' | 'image' | 'document' | 'audio' | 'video' | null;
    media_type: 'image' | 'document' | 'video' | 'audio' | null;
    text_content: string | null;
    media_url: string | null;
    media_filename: string | null;
    media_mime_type: string | null;
    is_voice?: boolean;
    direction: 'inbound' | 'outbound';
    whatsapp_message_id: string | null;
    meta_message_id?: string;
    status: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
    read_status?: 'read' | 'unread';
    is_read: boolean;
    assigned_to: string | null;
    created_at: string;
    updated_at?: string;
    whatsapp_number_id: number | null;
}
