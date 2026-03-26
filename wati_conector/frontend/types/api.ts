// ─── Python FastAPI Response Types ──────────────────────────────────────────

export interface ApiContactOut {
    id: number;
    phone_number: string;
    name: string;
    email?: string;
    source: string;
    stage: string;
    owner_name?: string;
    airtable_record_id: string;
    created_at: string;
}

export interface ApiContactsStatus {
    count: number;
    last_updated: string;
}

export interface ApiMessageOut {
    id: number;
    meta_message_id: string;
    contact_id: number;
    contact_phone?: string;
    contact_airtable_id?: string;
    from_number: string;
    to_number: string;
    text_content: string;
    direction: 'inbound' | 'outbound';
    read_status: 'read' | 'unread';
    status: string;
    created_at: string;
    media_type: 'image' | 'document' | 'video' | 'audio' | null;
    media_url: string | null;
    media_filename: string | null;
    media_mime_type: string | null;
}

export interface ApiSendMessageRequest {
    to_number: string;
    text_content: string;
}

export interface ApiSendMessageResponse {
    id: number;
    meta_message_id: string;
    contact_id: number;
    contact_phone: string;
    from_number: string;
    to_number: string;
    text_content: string;
    direction: 'inbound' | 'outbound';
    read_status: 'read' | 'unread';
    status: string;
    created_at: string;
    media_type: 'image' | 'document' | 'video' | 'audio' | null;
    media_url: string | null;
    media_filename: string | null;
    media_mime_type: string | null;
}

export interface ApiTemplateOut {
    id: number;
    name: string;
    content: string;
    category: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    source?: 'meta' | 'local';
}

export interface ApiAirtableTemplateOut {
    id: string;
    name: string;
    content: string;
    category: string;
    variables: string[];
    source: 'airtable';
}

export interface ApiCreateAirtableTemplateRequest {
    name: string;
    content: string;
    category: string;
    is_active?: boolean;
}

export interface ApiUpdateAirtableTemplateRequest {
    name?: string;
    content?: string;
    category?: string;
    is_active?: boolean;
}

export interface ApiSendTemplateRequest {
    to_number: string;
    template_name: string;
    language: string;
    parameters: string[];
}

export interface ApiSendMediaRequest {
    to_number: string;
    media_url: string;
    media_type: 'image' | 'document' | 'video' | 'audio';
    caption?: string;
    filename?: string;
    voice?: boolean;
}

export interface ApiRenderTemplateRequest {
    template_name: string;
    parameters: Record<string, string>;
}

export interface ApiRenderTemplateResponse {
    rendered: string;
    variables_used: Record<string, string>;
}

export interface ApiUploadResponse {
    url: string;
    filename: string;
    media_type: 'image' | 'document' | 'video' | 'audio';
    mime_type: string;
    size: number;
    is_voice?: boolean; // Backend indicates if it's a voice note
}

export interface ApiPhoneNumber {
    id: string;
    display_phone_number: string;
    verified_name: string;
}
