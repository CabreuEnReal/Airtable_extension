// ─── UI Models (decoupled from Airtable field names) ───────────────────────

export type MessageDirection = 'inbound' | 'outbound';

export type MessageStatus =
    | 'sending'
    | 'sent'
    | 'delivered'
    | 'read'
    | 'failed'
    | 'error';

export type ReadStatus = 'unread' | 'read';

export type ConversationFilter = 'all' | 'leads' | 'contacts' | 'opportunities' | 'open' | 'unread';

export interface Contact {
    id: string;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    jobTitle: string;
    department: string;
    stage: string;
    leadCode: string;
    leadSource: string;
    industry: string;
    ownerId: string;
    ownerName: string;
    contactType: 'lead' | 'contact' | 'opportunity';
    avatarUrl?: string;
    // ─── Contextual metadata (optional, for chat sidebar context) ────
    // Shared
    keyAccount?: boolean;
    products?: string[];
    isClient?: boolean;
    linkedInSummary?: string;
    // Lead-specific
    callInsights?: string;
    becameSQL?: boolean;
    companyDescription?: string;
    cltvTotal?: number;
    // Contact-specific
    isMainContact?: boolean;
    decisionLevel?: number;
    linkedIn?: string;
    partnerType?: string;
    airtableContactType?: string;
    sponsorIn?: string[];
    powerSponsorIn?: string[];
    // Opportunity-specific
    totalInstallPower?: string;
    financeScheme?: string[];
    internalProgress?: string;
    sharepointUrl?: string;
    priority?: string;
    cltv?: number;
    lastDoneActivity?: string;
    siteNames?: string[];
    linkedContactIds?: string[];
    sponsorIds?: string[];
    powerSponsorIds?: string[];
}

export interface Lead {
    id: string;
    leadId: number;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    email: string;
    leadCode: string;
    jobTitle: string;
    companyName: string;
    industry: string;
    stage: string;
    ownerId: string;
    leadSource: string;
    requestDate: string;
    firstContactDate: string;
    callInsights: string;
    notViableReason: string[];
}

export interface Interaction {
    id: string;
    name: string;
    type: string[];
    dateExecuted: string;
    notes: string;
    team: string[];
    accountId: string;
    contactId: string;
}

export interface Message {
    id: string;
    text: string;
    direction: MessageDirection;
    timestamp: string;
    status: MessageStatus;
    readStatus: ReadStatus;
    contactId: string;
    contactPhone: string;
    fromNumber: string;
    toNumber: string;
    metaMessageId: string;
    attachments: Attachment[];
    isOptimistic?: boolean;
    mediaUnavailable?: boolean;
}

export interface Attachment {
    id: string;
    name: string;
    url: string;
    mimeType: string;
    size: number;
    thumbnailUrl?: string;
    isVoice?: boolean;
}

export type MediaType = 'image' | 'document' | 'video' | 'audio';

export function getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

export function isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
}

export function isDocument(mimeType: string): boolean {
    return getMediaType(mimeType) === 'document';
}

export interface Conversation {
    contact: Contact;
    lastMessage: Message | null;
    unreadCount: number;
    totalMessages: number;
    lastActivityAt: string;
}

export interface Note {
    id: string;
    title: string;
    body: string;
    authorName: string;
    createdAt: string;
    contactId: string;
}

export type TemplateSource = 'meta' | 'airtable';

export interface Template {
    id: string;
    name: string;
    source: TemplateSource;
    // Unified template fields
    content: string;
    category: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    // Legacy Meta fields (backward compat)
    language?: string;
    status?: string;
    components?: unknown;
    parameterCount?: number;
    // Legacy Airtable fields (backward compat)
    variables?: string[];
}

// ─── App-level state ────────────────────────────────────────────────────────

export interface AppState {
    contacts: Contact[];
    messages: Message[];
    templates: Template[];
    selectedContactId: string | null;
    conversationFilter: ConversationFilter;
    searchQuery: string;
    isSending: boolean;
    isLoading: boolean;
    activeModal: 'notes' | 'contact-detail' | 'files' | null;
}

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'info';
    text: string;
}
