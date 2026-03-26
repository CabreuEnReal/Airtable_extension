import type { Message, MessageDirection, MessageStatus, Attachment } from '../types/models';
import type { ApiMessageOut } from '../types/api';
import { PYTHON_API } from '../constants/config';

// ─── Python API MessageOut → Message UI Model ───────────────────────────────

const VALID_STATUSES: MessageStatus[] = ['sending', 'sent', 'delivered', 'read', 'failed', 'error'];

function mapStatus(raw: string): MessageStatus {
    const normalized = raw.toLowerCase();
    if (normalized === 'received') return 'delivered';
    if (VALID_STATUSES.includes(normalized as MessageStatus)) return normalized as MessageStatus;
    return 'sent';
}

function deriveDirection(raw: ApiMessageOut): MessageDirection {
    if (raw.direction) return raw.direction as MessageDirection;
    return raw.status === 'received' ? 'inbound' : 'outbound';
}

function resolveMediaUrl(url: string | null): string {
    if (!url) return '';
    
    // Debug logging
    console.log('resolveMediaUrl input:', { url });
    
    // If it's already a full URL, use it directly (backend now returns complete URLs)
    if (url.startsWith('http')) {
        console.log('resolveMediaUrl using complete URL directly:', url);
        return url;
    }
    
    // If it's still a relative URL (fallback), prepend dynamic base URL
    const baseUrl = (PYTHON_API as any).BASE_URL || PYTHON_API.BASE_URL;
    const finalUrl = `${baseUrl}${url}`;
    
    console.log('resolveMediaUrl fallback - relative URL found:', {
        originalUrl: url,
        baseUrl,
        finalUrl
    });
    
    return finalUrl;
}

function inferMimeType(raw: ApiMessageOut): string {
    if (raw.media_mime_type) return raw.media_mime_type;

    // Infer from filename extension
    const ext = (raw.media_filename || '').split('.').pop()?.toLowerCase();
    const extMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        gif: 'image/gif', webp: 'image/webp',
        mp4: 'video/mp4', '3gpp': 'video/3gpp',
        mp3: 'audio/mpeg', ogg: 'audio/ogg', aac: 'audio/aac',
        pdf: 'application/pdf', doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    if (ext && extMap[ext]) return extMap[ext];

    // Fallback from media_type
    const typeMap: Record<string, string> = {
        image: 'image/jpeg', video: 'video/mp4',
        audio: 'audio/mpeg', document: 'application/octet-stream',
    };
    return typeMap[raw.media_type || ''] || '';
}

function buildAttachments(raw: ApiMessageOut): Attachment[] {
    if (!raw.media_type) return [];

    return [{
        id: `media_${raw.id}`,
        name: raw.media_filename || 'archivo',
        url: resolveMediaUrl(raw.media_url),
        mimeType: inferMimeType(raw),
        size: 0,
        thumbnailUrl: undefined,
        isVoice: (raw as any).is_voice || false,
    }];
}

export function adaptMessage(raw: ApiMessageOut): Message {
    return {
        id: String(raw.id),
        text: raw.text_content ?? '',
        direction: deriveDirection(raw),
        timestamp: raw.created_at ?? '',
        status: mapStatus(raw.status),
        readStatus: raw.read_status === 'unread' ? 'unread' : 'read',
        contactId: String(raw.contact_id),
        contactPhone: raw.from_number ?? '',
        fromNumber: raw.from_number ?? '',
        toNumber: raw.to_number ?? '',
        metaMessageId: raw.meta_message_id ?? '',
        attachments: buildAttachments(raw),
        isOptimistic: false,
        mediaUnavailable: raw.media_type != null && raw.media_url == null,
    };
}

export function adaptMessages(raws: ApiMessageOut[]): Message[] {
    return raws.map(adaptMessage);
}

export { resolveMediaUrl };
