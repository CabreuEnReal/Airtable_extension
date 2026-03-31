import { PYTHON_API, setApiConfig } from '../constants/config';
import type {
    ApiContactOut, ApiContactsStatus, ApiMessageOut, ApiTemplateOut, ApiPhoneNumber,
    ApiSendMessageRequest,
    ApiSendMessageResponse,
    ApiAirtableTemplateOut,
    ApiSendTemplateRequest, 
    ApiRenderTemplateRequest, 
    ApiRenderTemplateResponse,
    ApiCreateAirtableTemplateRequest, 
    ApiUpdateAirtableTemplateRequest,
    ApiSendMediaRequest,
    ApiUploadResponse
} from '../types/api';
import type {
    WhatsAppNumber,
    NumberStats,
    InboxStatus,
    MessageInbox,
    MessageWithNumber
} from '../types/whatsapp';

// ─── Low-level fetch ────────────────────────────────────────────────────────

// Request cache for GET requests
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2000; // 2 seconds cache - reduced for more responsive updates

// Clean expired cache entries
const cleanExpiredCache = () => {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            requestCache.delete(key);
        }
    }
};

// Clean cache every 10 seconds
setInterval(cleanExpiredCache, 10000);

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = (PYTHON_API as any).BASE_URL || PYTHON_API.BASE_URL;
    const url = `${baseUrl}${path}`;
    const method = options.method || 'GET';
    
    // Cache GET requests
    if (method === 'GET') {
        const cacheKey = `${method}:${path}`;
        const cached = requestCache.get(cacheKey);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < CACHE_TTL) {
            return cached.data;
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'X-API-Key': PYTHON_API.API_KEY,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        clearTimeout(timeoutId);

        // Stream JSON parsing for faster response
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API ${res.status}: ${errorText}`);
        }

        // Check if response is HTML (error page) instead of JSON
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            throw new Error(`API returned HTML instead of JSON. URL: ${url}`);
        }

        const data = await res.json();

        // Cache successful GET requests
        if (method === 'GET') {
            const cacheKey = `${method}:${path}`;
            requestCache.set(cacheKey, { data, timestamp: Date.now() });
        }

        return data;
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error(`Request timeout after 10s: ${url}`);
        }
        throw err;
    }
}

// ─── Dynamic Configuration ─────────────────────────────────────────────────────

interface ApiConfigResponse {
    base_url: string;
    media_base: string;
    webhook_url: string;
    docs_url: string;
}

export async function getDynamicApiConfig(): Promise<ApiConfigResponse> {
    const possibleUrls = [
        'http://localhost:8000',  // Local development
        'http://127.0.0.1:8000',  // Alternative localhost
        PYTHON_API.BASE_URL,      // Current fallback (ngrok)
    ];

    for (const baseUrl of possibleUrls) {
        console.log(`🔍 Trying config from: ${baseUrl}/api/config`);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${baseUrl}/api/config`, {
                signal: controller.signal,
                headers: {
                    'X-API-Key': PYTHON_API.API_KEY,
                    'Content-Type': 'application/json',
                },
            });

            clearTimeout(timeoutId);

            console.log(`📡 Response from ${baseUrl}: status=${response.status}`);

            if (response.ok) {
                const config = await response.json();
                
                // Update global configuration
                setApiConfig(config);
                
                console.log(`✅ Dynamic config loaded from: ${baseUrl}`);
                console.log('📡 API Configuration:', config);
                
                return config;
            } else {
                console.warn(`⚠ Non-OK response from ${baseUrl}: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.warn(`❌ Failed to get config from ${baseUrl}:`, error);
            if (error instanceof Error) {
                console.warn(`   Error name: ${error.name}, message: ${error.message}`);
            }
            continue;
        }
    }

    throw new Error('Unable to fetch API configuration from any available endpoint');
}

// ─── Health ─────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
    
    try {
        const baseUrl = (PYTHON_API as any).BASE_URL || PYTHON_API.BASE_URL;
        const res = await fetch(`${baseUrl}/health`, {
            signal: controller.signal,
            headers: {
                'X-API-Key': PYTHON_API.API_KEY,
            },
        });
        
        clearTimeout(timeoutId);
        return res.ok;
    } catch (err: any) {
        clearTimeout(timeoutId);
        
        if (err.name === 'AbortError') {
            console.warn('Health check timeout - API may be slow or unreachable');
            return false;
        }
        
        console.warn('Health check failed:', err.message);
        return false;
    }
}

// ─── Contacts ───────────────────────────────────────────────────────────────

export async function getApiContactsStatus(): Promise<ApiContactsStatus> {
    return apiFetch<ApiContactsStatus>('/api/v1/contacts/status');
}

export async function getApiContacts(): Promise<ApiContactOut[]> {
    return apiFetch<ApiContactOut[]>('/api/v1/contacts');
}

export async function createApiContact(phone_number: string, name: string): Promise<ApiContactOut> {
    return apiFetch<ApiContactOut>('/api/v1/contacts', {
        method: 'POST',
        body: JSON.stringify({ phone_number, name }),
    });
}

export async function updateApiContact(
    id: number,
    data: Partial<{ phone_number: string; name: string }>,
): Promise<ApiContactOut> {
    return apiFetch<ApiContactOut>(`/api/v1/contacts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function getApiMessages(contactId?: number): Promise<ApiMessageOut[]> {
    const qs = contactId != null ? `?contact_id=${contactId}` : '';
    return apiFetch<ApiMessageOut[]>(`/api/v1/messages${qs}`);
}

export async function sendApiMessage(toNumber: string, textContent: string): Promise<ApiSendMessageResponse> {
    const body: ApiSendMessageRequest = { to_number: toNumber, text_content: textContent };
    return apiFetch<ApiSendMessageResponse>('/api/v1/messages', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function markMessageAsRead(messageId: number): Promise<ApiMessageOut> {
    return apiFetch<ApiMessageOut>(`/api/v1/messages/${messageId}/read`, {
        method: 'PUT',
    });
}

export async function markMessagesAsRead(messageIds: number[]): Promise<void> {
    await Promise.all(messageIds.map((id) => markMessageAsRead(id)));
}

// ─── Templates (Unified) ───────────────────────────────────────────────────────

export async function getApiTemplates(): Promise<ApiTemplateOut[]> {
    return apiFetch<ApiTemplateOut[]>('/api/v1/templates');
}

export async function getMetaTemplates(): Promise<ApiTemplateOut[]> {
    const allTemplates = await getApiTemplates();
    return allTemplates.filter(t => t.source === 'meta');
}

export async function sendMetaTemplate(
    templateName: string,
    phoneNumber: string,
    parameters: string[] = [],
    language?: string,
): Promise<ApiSendMessageResponse> {
    const body: ApiSendTemplateRequest = {
        to_number: phoneNumber,
        template_name: templateName,
        language: language || 'es',
        parameters,
    };
    return apiFetch<ApiSendMessageResponse>('/api/v1/messages/send-template', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function uploadFile(file: File): Promise<ApiUploadResponse> {
    console.log('📤 === INICIO UPLOAD FILE ===');
    console.log('📦 Archivo recibido:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
    });

    const formData = new FormData();
    formData.append('file', file);
    
    // Detect media type from file
    let mediaType = file.type.startsWith('image/') ? 'image' :
                   file.type.startsWith('video/') ? 'video' :
                   file.type.startsWith('audio/') ? 'audio' : 'document';
    
    // For voice notes, always mark as audio to bypass backend validation
    if (file.name.startsWith('voice_')) {
        mediaType = 'audio';
        console.log('🎤 Voice note detectado, forzando media_type a audio');
    }
    
    formData.append('media_type', mediaType);
    
    const baseUrl = (PYTHON_API as any).BASE_URL || PYTHON_API.BASE_URL;
    const uploadUrl = `${baseUrl}/api/v1/upload`;
    
    console.log('🔧 Configuración upload:', {
        mediaType,
        baseUrl,
        uploadUrl,
        formDataEntries: Array.from(formData.entries()),
    });

    try {
        console.log('🚀 Enviando request al backend...');
        const res = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'X-API-Key': PYTHON_API.API_KEY,
            },
            body: formData,
        });

        console.log('📥 Response del backend:', {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            headers: Object.fromEntries(res.headers.entries())
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('❌ Upload failed response:', text);
            throw new Error(`Upload failed (${res.status}): ${text}`);
        }

        const result = await res.json();
        console.log('✅ Upload exitoso - Response del backend:', {
            url: result.url,
            filename: result.filename,
            media_type: result.media_type,
            mime_type: result.mime_type,
            size: result.size,
            is_voice: result.is_voice,
            backendProcessed: result.is_voice ? 'Sí, convertido a voice note' : 'No, audio normal',
            whatsappCompatibility: {
                extension: result.url.includes('.ogg') ? '✅ .ogg' : '❌ No .ogg',
                mime_type: result.mime_type === 'audio/ogg' ? '✅ audio/ogg' : '❌ ' + result.mime_type,
                is_voice: result.is_voice ? '✅ true' : '❌ false',
                issue: 'Si no se reproduce en WhatsApp, el problema está en la conversión OPUS del backend'
            }
        });
        console.log('📤 === FIN UPLOAD FILE ===');
        return result;

    } catch (error) {
        console.error('❌ Upload error:', error);
        console.log('📤 === FIN UPLOAD FILE (CON ERROR) ===');
        throw error;
    }
}

export async function sendMediaMessage(
    phoneNumber: string,
    file: File,
    caption?: string,
): Promise<ApiSendMessageResponse> {
    console.log('sendMediaMessage starting:', {
        phoneNumber,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        caption
    });

    try {
        console.log('📤 === INICIO SEND MEDIA MESSAGE ===');
        console.log('📋 Datos del mensaje:', {
            phoneNumber,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            caption
        });

        // 1. Upload file → get backend response with correct URL
        console.log('🚀 Step 1: Subiendo archivo al backend...');
        const upload = await uploadFile(file);
        console.log('✅ Upload completado - Response del backend:', upload);

        // 2. Use backend URL directly (backend handles conversion)
        const baseUrl = (PYTHON_API as any).BASE_URL || PYTHON_API.BASE_URL;
        const absoluteUrl = upload.url.startsWith('http') 
            ? upload.url 
            : `${baseUrl}${upload.url}`;

        console.log('🔗 Construyendo URL para Meta:', {
            backendUrl: upload.url,
            baseUrl: baseUrl,
            absoluteUrl: absoluteUrl,
            urlType: upload.url.startsWith('http') ? 'Completa' : 'Relativa'
        });

        // 3. Send media message via Meta with backend-processed data
        const body: ApiSendMediaRequest = {
            to_number: phoneNumber,
            media_url: absoluteUrl,
            media_type: upload.media_type,
            caption: caption || undefined,
            filename: upload.filename || file.name,
            voice: upload.is_voice || false, // Backend decides if it's voice note
        };

        console.log('📦 Payload para Meta API:', {
            to_number: body.to_number,
            media_url: body.media_url,
            media_type: body.media_type,
            caption: body.caption,
            filename: body.filename,
            voice: body.voice,
            backendProcessed: upload.is_voice ? 'Voice Note (OGG+OPUS)' : 'Audio Normal'
        });

        console.log('🚀 Step 3: Enviando a Meta API...');
        const result = await apiFetch<ApiSendMessageResponse>('/api/v1/messages/send-media', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        console.log('✅ sendMediaMessage completado exitosamente:', result);
        console.log('📤 === FIN SEND MEDIA MESSAGE ===');
        return result;

    } catch (error) {
        console.error('❌ sendMediaMessage failed:', error);
        console.log('📤 === FIN SEND MEDIA MESSAGE (CON ERROR) ===');
        throw error;
    }
}

export async function retryMediaDownload(messageId: number): Promise<ApiMessageOut> {
    return apiFetch<ApiMessageOut>(`/api/v1/messages/${messageId}/retry-media`, {
        method: 'POST',
    });
}

// ─── Templates (Airtable - now using unified endpoints) ───────────────────

export async function getAirtableTemplates(): Promise<ApiTemplateOut[]> {
    return apiFetch<ApiTemplateOut[]>('/api/v1/templates/airtable');
}

export async function renderAirtableTemplate(
    templateName: string,
    parameters: Record<string, string>,
): Promise<ApiRenderTemplateResponse> {
    const body: ApiRenderTemplateRequest = { template_name: templateName, parameters };
    return apiFetch<ApiRenderTemplateResponse>('/api/v1/templates/render', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function createAirtableTemplate(
    data: ApiCreateAirtableTemplateRequest,
): Promise<ApiTemplateOut> {
    return apiFetch<ApiTemplateOut>('/api/v1/templates/airtable', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateAirtableTemplate(
    id: string,
    data: ApiUpdateAirtableTemplateRequest,
): Promise<ApiTemplateOut> {
    return apiFetch<ApiTemplateOut>(`/api/v1/templates/airtable/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteAirtableTemplate(id: string): Promise<void> {
    await apiFetch<unknown>(`/api/v1/templates/airtable/${id}`, {
        method: 'DELETE',
    });
}

// ─── Meta Phone Numbers ─────────────────────────────────────────────────────

export async function getMetaPhoneNumbers(): Promise<ApiPhoneNumber[]> {
    return apiFetch<ApiPhoneNumber[]>('/api/v1/meta/phone-numbers');
}

// ─── WhatsApp Multi-Number Management ───────────────────────────────────────

export async function getWhatsAppNumbers(): Promise<WhatsAppNumber[]> {
    return apiFetch<WhatsAppNumber[]>('/api/v1/whatsapp/numbers');
}

// Force sync WhatsApp numbers with Meta API (use sparingly — on startup or manual refresh)
export async function syncWhatsAppNumbers(): Promise<WhatsAppNumber[]> {
    return apiFetch<WhatsAppNumber[]>('/api/v1/whatsapp/numbers/sync', {
        method: 'POST',
    });
}

export async function getWhatsAppNumberStats(phoneId: number): Promise<NumberStats> {
    return apiFetch<NumberStats>(`/api/v1/whatsapp/numbers/${phoneId}/stats`);
}

export async function getInboxStatus(phoneId: number): Promise<InboxStatus> {
    return apiFetch<InboxStatus>(`/api/v1/whatsapp/numbers/${phoneId}/inbox/status`);
}

export async function getInboxMessages(
    phoneId: number, 
    unreadOnly: boolean = false
): Promise<MessageWithNumber[]> {
    const query = unreadOnly ? '?unread_only=true' : '';
    return apiFetch<MessageWithNumber[]>(`/api/v1/whatsapp/numbers/${phoneId}/inbox${query}`);
}

export async function markInboxMessageAsRead(phoneId: number, messageId: number): Promise<void> {
    await apiFetch<unknown>(`/api/v1/whatsapp/numbers/${phoneId}/inbox/${messageId}/read`, {
        method: 'PUT',
    });
}

export async function bulkMarkInboxAsRead(phoneId: number, messageIds: number[]): Promise<{ status: string; updated: number }> {
    return apiFetch<{ status: string; updated: number }>(`/api/v1/whatsapp/numbers/${phoneId}/inbox/read-bulk`, {
        method: 'PUT',
        body: JSON.stringify({ message_ids: messageIds }),
    });
}

export async function assignMessageToAgent(
    phoneId: number, 
    messageId: number, 
    agentName: string
): Promise<void> {
    await apiFetch<unknown>(`/api/v1/whatsapp/numbers/${phoneId}/inbox/${messageId}/assign?agent_name=${encodeURIComponent(agentName)}`, {
        method: 'PUT',
    });
}

// Enhanced send message with optional from_phone_number_id
export async function sendApiMessageFromNumber(
    toNumber: string,
    textContent: string,
    fromPhoneNumberId?: string
): Promise<ApiSendMessageResponse> {
    const body: any = {
        to_number: toNumber,
        text_content: textContent,
    };
    
    if (fromPhoneNumberId) {
        body.from_phone_number_id = fromPhoneNumberId;
    }
    
    return apiFetch<ApiSendMessageResponse>('/api/v1/messages', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
