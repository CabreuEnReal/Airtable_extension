// ─── API Configuration ──────────────────────────────────────────────────────

export const AIRTABLE_CONFIG = {
    API_URL: 'https://api.airtable.com/v0',
    TOKEN: "TU_TOKEN_AQUI",
    BASE_ID: 'appbBxfX1DQto8MxR',
} as const;

// Dynamic API configuration - will be set at runtime
export const PYTHON_API = {
    BASE_URL: 'https://superelementary-unrefusable-bertha.ngrok-free.dev', // Fallback
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
    DATA_ACTIVE: 5_000,  // Reduced from 10s to 5s for more responsive updates
    DATA_IDLE: 15_000,   // Reduced from 30s to 15s
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
    { id: 'leads', label: 'Leads', icon: 'users' },
    { id: 'chat', label: 'Chat', icon: 'message-circle' },
    { id: 'pipeline', label: 'Pipeline', icon: 'bar-chart' },
    { id: 'opportunities', label: 'Opportunities', icon: 'target' },
    { id: 'reportes', label: 'Reportes', icon: 'file-text' },
    { id: 'automations', label: 'Automations', icon: 'zap' },
];
