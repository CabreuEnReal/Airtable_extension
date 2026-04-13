// ─── API Configuration ──────────────────────────────────────────────────────

export const AIRTABLE_CONFIG = {
    API_URL: 'https://api.airtable.com/v0',
    TOKEN: 'pat3dJ4qQIrtQyZVv.8c01aa7747537b56082909827abfb51c28a58e84b7931ca7c543948300e2947f',
    BASE_ID: 'apppzMiKVvd1F3gll', // ← Sales CRM (producción)
} as const;

// Dynamic API configuration - will be set at runtime
export const PYTHON_API = {
    BASE_URL: 'https://cloud.energiareal.mx/dev/airtable-whatsapp-er-svc-api', // Fallback
    API_KEY: 'er_whatsapp_2024',
} as const;

// Dynamic configuration from backend
let dynamicApiConfig: {
    base_url: string;
    media_base: string;
    webhook_url: string;
    docs_url: string;
} | null = null;

export function setApiConfig(config: typeof dynamicApiConfig) {
    dynamicApiConfig = config;
    // Update PYTHON_API.BASE_URL for immediate use
    (PYTHON_API as any).BASE_URL = config.base_url;
}

export function getApiConfig() {
    return dynamicApiConfig;
}

// ─── Polling Intervals (ms) ─────────────────────────────────────────────────

export const POLLING = {
    INBOX_MESSAGES: 7_000,   // Inbox messages: 7s for near-realtime
    INBOX_STATUS: 7_000,     // Inbox status/stats: 7s for unread badges
    CONTACTS: 30_000,        // Contacts list: 30s
    NUMBERS: 30_000,         // WhatsApp numbers: 30s (fast DB read)
    API_HEALTH: 15_000,      // API health check: 15s for near-realtime status
} as const;

// ─── UI Constants ───────────────────────────────────────────────────────────

export const UI = {
    MESSAGES_PER_CONVERSATION: 100,
    MAX_CONVERSATION_PREVIEW: 50,
    NOTIFICATION_DURATION: 3000,
    DEBOUNCE_SEARCH: 300,
} as const;

// ─── File Upload Constants ─────────────────────────────────────────────────────

export const FILE_UPLOAD = {
    // WhatsApp Cloud API limits per type
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,       // 5 MB
    MAX_DOCUMENT_SIZE: 100 * 1024 * 1024,   // 100 MB
    MAX_VIDEO_SIZE: 16 * 1024 * 1024,       // 16 MB
    MAX_AUDIO_SIZE: 16 * 1024 * 1024,       // 16 MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
    ],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/3gpp'],
    ALLOWED_AUDIO_TYPES: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
    MAX_IMAGE_WIDTH: 300,
    MAX_IMAGE_HEIGHT: 300,
} as const;

// ─── Sidebar Navigation ─────────────────────────────────────────────────────

export interface NavItem {
    id: string;
    label: string;
    icon: string;
    active?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'chat', label: 'Chat', icon: 'message-circle' },
    { id: 'automations', label: 'Automations', icon: 'zap' },
];
