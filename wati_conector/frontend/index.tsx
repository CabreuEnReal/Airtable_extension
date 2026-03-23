import {initializeBlock} from '@airtable/blocks/interface/ui';
import {useState, useCallback, useEffect, useMemo} from 'react';
import './style.css';

// ─── Services & types ───────────────────────────────────────
import type { Contact, Message, Template, Notification as AppNotification } from './types/models';
import { POLLING } from './constants/config';
import { detectBaseId, getContacts } from './services/airtable';
import {
    getDynamicApiConfig,
    getApiMessages, 
    getApiTemplates, 
    getApiContacts, 
    createApiContact, 
    checkHealth, 
    sendApiMessage, 
    sendMetaTemplate, 
    getAirtableTemplates, 
    renderAirtableTemplate, 
    sendMediaMessage, 
    retryMediaDownload 
} from './services/pythonApi';
import { adaptMessages } from './adapters/messageAdapter';
import { adaptMetaTemplates, adaptAirtableTemplates } from './adapters/templateAdapter';

// ─── Helpers ────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Layout & components
import { AppLayout } from './components/layout/AppLayout';
import { Sidebar } from './components/layout/Sidebar';
import { ConversationPanel } from './components/conversations/ConversationPanel';
import { ChatPanel } from './components/chat/ChatPanel';
import { DetailPanel } from './components/detail/DetailPanel';
import { NotesModal } from './components/modals/NotesModal';
import { Toast } from './components/common/Toast';
import { Spinner } from './components/common/Spinner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AutomationsPanel } from './components/automations/AutomationsPanel';

// ─── Phone normalisation (strip +, spaces, dashes) ─────────

function normalizePhone(raw: string): string {
    let phone = raw.replace(/[\s+\-()]/g, '');
    // Mexico mobile: 521XXXXXXXXXX → 52XXXXXXXXXX (strip the '1' after country code)
    if (phone.length === 13 && phone.startsWith('521')) {
        phone = '52' + phone.slice(3);
    }
    return phone;
}

// ─── Main App ──────────────────────────────────────────────

function SalesCRM() {
    useEffect(() => { detectBaseId(); }, []);

    // ─── State ──────────────────────────────────────────────
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [apiOnline, setApiOnline] = useState(true);
    const [notification, setNotification] = useState<AppNotification | null>(null);
    const [activeNav, setActiveNav] = useState('chat');
    const [showDetail, setShowDetail] = useState(true);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [debugMinimized, setDebugMinimized] = useState(false);
    const [pendingDraft, setPendingDraft] = useState<string | null>(null);
    const [apiConfigLoaded, setApiConfigLoaded] = useState(false);

    const addLog = useCallback((msg: string) => {
        setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ${msg}`]);
    }, []);

    // ─── Initialize Dynamic API Configuration ──────────────────
    const initializeApiConfig = useCallback(async () => {
        try {
            setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: Initializing API configuration...`]);
            
            const config = await getDynamicApiConfig();
            setApiConfigLoaded(true);
            
            setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ✅ API configuration loaded successfully`]);
            
            return config;
        } catch (error: any) {
            setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ❌ Failed to load API config: ${error.message}`]);
            setApiConfigLoaded(false);
            
            // Continue with fallback configuration
            setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ⚠️ Using fallback configuration`]);
            
            return null;
        }
    }, []);

    const notify = useCallback((type: 'success' | 'error' | 'info', text: string) => {
        setNotification({ id: Date.now().toString(), type, text });
    }, []);

    // ─── Phone → Airtable Contact lookup ────────────────────
    const phoneToContact = useMemo(() => {
        const map = new Map<string, Contact>();
        for (const c of contacts) {
            if (c.phone) map.set(normalizePhone(c.phone), c);
        }
        return map;
    }, [contacts]);

    // ─── Data Loading (hybrid: Airtable contacts + Python API messages/templates)
    const loadData = useCallback(async (priority: 'high' | 'normal' = 'normal') => {
        const startTime = performance.now();
        
        try {
            // Load Airtable contacts immediately (always works)
            const contactsPromise = getContacts();
            const [c] = await Promise.all([contactsPromise]);
            setContacts(c);
            
            const criticalTime = performance.now() - startTime;
            setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: Airtable contacts loaded in ${criticalTime.toFixed(0)}ms: ${c.length} contacts`]);
            
            // Try Python API - start with messages as the primary test
            try {
                const messagesStartTime = performance.now();
                const rawMsgs = await getApiMessages();
                const messagesTime = performance.now() - messagesStartTime;
                
                // If messages work, API is healthy - load everything else
                setApiOnline(true);
                setMessages(adaptMessages(rawMsgs));
                setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: API healthy - loaded ${rawMsgs.length} messages in ${messagesTime.toFixed(0)}ms`]);
                
                // Load templates in parallel (non-blocking)
                Promise.allSettled([
                    getApiTemplates(),
                    getAirtableTemplates()
                ]).then(([metaResult, airtableResult]) => {
                    const metaTemplates = metaResult.status === 'fulfilled' ? metaResult.value : [];
                    const airtableTemplates = airtableResult.status === 'fulfilled' ? airtableResult.value : [];
                    
                    const allTemplates = [
                        ...adaptMetaTemplates(metaTemplates),
                        ...adaptAirtableTemplates(airtableTemplates),
                    ];
                    setTemplates(allTemplates);
                    
                    setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: Loaded ${metaTemplates.length} meta tpl, ${airtableTemplates.length} airtable tpl`]);
                });
                
                // Sync contacts in background
                if (c.length > 0) {
                    setTimeout(() => syncContactsToPython(c), 100);
                }
                
            } catch (err: any) {
                // Messages failed - API is offline
                setApiOnline(false);
                setMessages([]);
                setTemplates([]);
                setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ⚠ Python API offline: ${(err as Error).message}`]);
            }
            
        } catch (err: any) {
            setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ERROR loadData: ${err.message}`]);
            setApiOnline(false);
        } finally {
            setLoading(false);
        }
    }, []); // Remove addLog dependency to prevent infinite re-renders

    // ─── Sync Airtable contacts to Python API ───────────────
    const syncContactsToPython = useCallback(async (airtableContacts: Contact[]) => {
        try {
            const apiContacts = await getApiContacts();

            const existingPhones = new Set(apiContacts.map((c) => normalizePhone(c.phone_number)));

            for (const contact of airtableContacts) {
                if (!contact.phone) continue;
                const norm = normalizePhone(contact.phone);
                if (existingPhones.has(norm)) continue;
                try {
                    await createApiContact(norm, contact.displayName);
                    setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: Synced contact → API: ${contact.displayName} (${norm})`]);
                } catch (err: any) {
                    setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: WARN syncContact: ${err.message}`]);
                }
            }
        } catch (err: any) {
            setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: WARN syncContacts: ${err.message}`]);
        }
    }, []); // Remove addLog dependency

    // ─── Initial load + polling ─────────────────────────────
    useEffect(() => {
        // Initialize API configuration first
        const initialize = async () => {
            await initializeApiConfig();
            
            // Start data loading after config is ready
            loadData('high');
            
            // Normal priority polling for updates
            const interval = setInterval(() => loadData('normal'), POLLING.DATA_ACTIVE);
            return () => clearInterval(interval);
        };

        initialize();
    }, [loadData, initializeApiConfig]); // Add dependencies

    // ─── Match messages to Airtable contacts by phone ───────
    const messagesWithAirtableIds = useMemo(() => {
        return messages.map((m: Message) => {
            // For inbound: match on fromNumber (the contact's phone)
            // For outbound: match on toNumber (we sent TO the contact)
            const matchPhone = m.direction === 'outbound'
                ? normalizePhone(m.toNumber || '')
                : normalizePhone(m.fromNumber || m.contactPhone || '');
            const contact = phoneToContact.get(matchPhone);
            return contact ? { ...m, contactId: contact.id } : m;
        });
    }, [messages, phoneToContact]);

    // ─── Derived state ──────────────────────────────────────
    const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null;
    const contactMessages = messagesWithAirtableIds.filter((m) => m.contactId === selectedContactId);

    // ─── Send Meta Template ─────────────────────────────────
    const handleSendMetaTemplate = useCallback(async (template: Template, parameters: string[]) => {
        if (!selectedContact || sending || !apiOnline) return;
        setSending(true);
        addLog(`Sending Meta template "${template.name}" to ${selectedContact.phone}`);

        const tempId = `temp_${Date.now()}`;
        const optimisticMsg: Message = {
            id: tempId,
            text: parameters.length > 0
                ? `📋 Plantilla "${template.name}" enviada con: ${parameters.join(', ')}`
                : `📋 Plantilla "${template.name}" enviada`,
            direction: 'outbound',
            timestamp: new Date().toISOString(),
            status: 'sending',
            readStatus: 'read',
            contactId: selectedContact.id,
            contactPhone: selectedContact.phone,
            fromNumber: '',
            toNumber: normalizePhone(selectedContact.phone),
            metaMessageId: '',
            attachments: [],
            isOptimistic: true,
        };
        setMessages((prev: Message[]) => [...prev, optimisticMsg]);

        try {
            const result = await sendMetaTemplate(
                template.name,
                normalizePhone(selectedContact.phone),
                parameters || [],
                template.language,
            );
            addLog(`Meta template sent OK: meta_id=${result.meta_message_id}`);
            setMessages((prev: Message[]) =>
                prev.map((m: Message) =>
                    m.id === tempId
                        ? { ...m, id: String(result.id), metaMessageId: result.meta_message_id, status: 'sent' as const, isOptimistic: false }
                        : m
                ),
            );
            notify('success', `Plantilla "${template.name}" enviada a ${selectedContact.displayName}`);
        } catch (err: any) {
            addLog(`ERROR sendMetaTemplate: ${err.message}`);
            setMessages((prev: Message[]) =>
                prev.map((m: Message) => (m.id === tempId ? { ...m, status: 'failed' as const, isOptimistic: false } : m)),
            );
            notify('error', `Error al enviar plantilla: ${err.message}`);
        } finally {
            setSending(false);
        }
    }, [selectedContact, sending, apiOnline, addLog, notify]);

    // ─── Select Airtable Template (render client-side with contact data) ──────
    const handleSelectAirtableTemplate = useCallback((template: Template) => {
        if (!selectedContact) return;
        addLog(`Rendering Airtable template "${template.name}" for ${selectedContact.displayName}`);
        const content = template.content || template.name;
        const fieldMap: Record<string, string> = {
            contact_name: selectedContact.displayName,
            first_name: selectedContact.firstName,
            last_name: selectedContact.lastName,
            empresa: selectedContact.company,
            email: selectedContact.email,
            phone: selectedContact.phone,
            job_title: '', // Job Title field exists but not in Contact model yet
            stage: selectedContact.stage,
            stage_status: selectedContact.stageStatus,
            business_unit: selectedContact.businessUnit,
            request_date: selectedContact.requestDate,
            tags: selectedContact.tags?.join(', ') || '',
            fecha_actual: new Date().toLocaleDateString('es-MX'),
        };
        const rendered = content.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => fieldMap[key] ?? match);
        setPendingDraft(rendered);
        notify('info', `Plantilla "${template.name}" cargada — edita y envía`);
    }, [selectedContact, apiOnline, addLog, notify]);

    // ─── Send Media Message ───────────────────────────────────────
    const handleSendMedia = useCallback(async (file: File) => {
        if (!selectedContact || sending || !apiOnline) return;
        setSending(true);
        addLog(`Sending media to ${selectedContact.phone}: ${file.name} (${formatFileSize(file.size)})`);

        // Optimistic UI — add temp message instantly with local preview URL
        const tempId = `temp_${Date.now()}`;
        let localPreviewUrl = '';
        
        // Try objectURL first, fallback to base64 for Airtable environment
        try {
            localPreviewUrl = URL.createObjectURL(file);
        } catch (err) {
            // Fallback: read file as base64 for image preview
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64Url = reader.result as string;
                    setMessages((prev) =>
                        prev.map((m) => (m.id === tempId ? {
                            ...m,
                            attachments: m.attachments.map(a => ({ ...a, url: base64Url }))
                        } : m))
                    );
                };
                reader.readAsDataURL(file);
            }
        }
        
        const optimisticMsg: Message = {
            id: tempId,
            text: '',
            direction: 'outbound',
            timestamp: new Date().toISOString(),
            status: 'sending',
            readStatus: 'read',
            contactId: selectedContact.id,
            contactPhone: selectedContact.phone,
            fromNumber: '',
            toNumber: normalizePhone(selectedContact.phone),
            metaMessageId: '',
            attachments: [{
                id: tempId,
                name: file.name,
                url: localPreviewUrl,
                mimeType: file.type,
                size: file.size,
            }],
            isOptimistic: true,
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        try {
            const result = await sendMediaMessage(
                normalizePhone(selectedContact.phone),
                file,
            );
            addLog(`Media sent OK: meta_id=${result.meta_message_id}`);
            
            // Update optimistic message with real data, keep local preview URL
            setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { 
                    ...m, 
                    id: result.meta_message_id,
                    status: 'sent',
                    isOptimistic: false,
                    attachments: m.attachments.map(a => ({
                        ...a,
                        url: a.url || localPreviewUrl,
                    })),
                } : m))
            );
            notify('success', 'Archivo enviado correctamente');
        } catch (err) {
            const error = err as Error;
            addLog(`ERROR sendMedia: ${error.message}`);
            setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, status: 'failed', isOptimistic: false } : m))
            );
            notify('error', `Error al enviar archivo: ${error.message}`);
        } finally {
            setSending(false);
        }
    }, [selectedContact, sending, apiOnline, addLog, notify]);

    // ─── Retry Media Download ────────────────────────────────
    const handleRetryMedia = useCallback(async (messageId: string) => {
        addLog(`Retrying media download for message ${messageId}`);
        try {
            const updated = await retryMediaDownload(Number(messageId));
            const [adaptedMsg] = adaptMessages([updated]);
            setMessages((prev: Message[]) =>
                prev.map((m: Message) => (m.id === messageId ? adaptedMsg : m))
            );
            if (adaptedMsg.mediaUnavailable) {
                notify('error', 'No se pudo descargar el archivo. Intenta de nuevo más tarde.');
            } else {
                notify('success', 'Archivo descargado correctamente');
            }
        } catch (err) {
            const error = err as Error;
            addLog(`ERROR retryMedia: ${error.message}`);
            notify('error', `Error al reintentar descarga: ${error.message}`);
        }
    }, [addLog, notify]);

    // ─── Send Message ───────────────────────────────────────
    const handleSend = useCallback(async (text: string) => {
        if (!selectedContact || sending || !apiOnline) return;
        setSending(true);
        addLog(`Sending to ${selectedContact.phone}: ${text.substring(0, 30)}...`);

        // Optimistic UI — add temp message instantly
        const tempId = `temp_${Date.now()}`;
        const optimisticMsg: Message = {
            id: tempId,
            text,
            direction: 'outbound',
            timestamp: new Date().toISOString(),
            status: 'sending',
            readStatus: 'read',
            contactId: selectedContact.id,
            contactPhone: selectedContact.phone,
            fromNumber: '',
            toNumber: normalizePhone(selectedContact.phone),
            metaMessageId: '',
            attachments: [],
            isOptimistic: true,
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        try {
            const result = await sendApiMessage(
                normalizePhone(selectedContact.phone),
                text,
            );
            addLog(`Sent OK: meta_id=${result.meta_message_id}`);

            // Replace optimistic with real message
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === tempId
                        ? { ...m, id: String(result.id), metaMessageId: result.meta_message_id, status: 'sent', isOptimistic: false }
                        : m
                ),
            );
            notify('success', `Mensaje enviado a ${selectedContact.displayName}`);
        } catch (err: any) {
            addLog(`ERROR send: ${err.message}`);
            // Mark optimistic as failed
            setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, status: 'failed', isOptimistic: false } : m)),
            );
            notify('error', `Error al enviar: ${err.message}`);
        } finally {
            setSending(false);
        }
    }, [selectedContact, sending, apiOnline, addLog, notify]);

    // ─── Loading state ──────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-surface-light">
                <Spinner size="lg" label="Cargando datos..." />
            </div>
        );
    }

    // ─── Render ─────────────────────────────────────────────
    return (
        <div className="h-screen w-full">
            {/* API offline banner */}
            {!apiOnline && (
                <div className="bg-orange text-white text-xs text-center py-1 px-2">
                    ⚠ API de WhatsApp no disponible — mostrando solo contactos de Airtable
                </div>
            )}

            <AppLayout
                sidebar={
                    <Sidebar
                        activeNav={activeNav}
                        onNavChange={setActiveNav}
                        userName="Carlos A."
                        userRole="Sales Admin"
                    />
                }
                fullContent={
                    activeNav === 'automations'
                        ? <AutomationsPanel onNotify={(type, text) => notify(type as any, text)} />
                        : undefined
                }
                conversations={
                    activeNav !== 'automations' ? (
                        <ConversationPanel
                            contacts={contacts}
                            messages={messagesWithAirtableIds}
                            selectedContactId={selectedContactId}
                            onSelectContact={setSelectedContactId}
                        />
                    ) : undefined
                }
                chat={
                    activeNav !== 'automations' ? (
                        <ChatPanel
                            contact={selectedContact}
                            messages={contactMessages}
                            templates={templates}
                            onSend={handleSend}
                            onSendMedia={handleSendMedia}
                            onSendMetaTemplate={handleSendMetaTemplate}
                            onSelectAirtableTemplate={handleSelectAirtableTemplate}
                            onRetryMedia={handleRetryMedia}
                            sending={sending}
                            onOpenDetail={() => setShowDetail(!showDetail)}
                            onOpenNotes={() => setShowNotesModal(true)}
                            pendingDraft={pendingDraft}
                            onPendingDraftConsumed={() => setPendingDraft(null)}
                        />
                    ) : undefined
                }
                detail={
                    activeNav !== 'automations' && showDetail && selectedContact ? (
                        <DetailPanel
                            contact={selectedContact}
                            messages={contactMessages}
                            onOpenNotes={() => setShowNotesModal(true)}
                            onClose={() => setShowDetail(false)}
                        />
                    ) : undefined
                }
            />

            {/* Notes Modal */}
            <NotesModal
                open={showNotesModal}
                onClose={() => setShowNotesModal(false)}
                contactName={selectedContact?.displayName ?? ''}
            />

            {/* Toast */}
            <Toast
                notification={notification}
                onDismiss={() => setNotification(null)}
            />

            {/* Debug log panel */}
            {debugLogs.length > 0 && (
                <div className={`fixed bottom-0 left-sidebar right-0 bg-gray-900/95 z-40 transition-all ${debugMinimized ? '' : 'max-h-28 overflow-y-auto p-2'}`}>
                    <div className={`flex justify-between items-center ${debugMinimized ? 'px-2 py-1' : 'mb-1'}`}>
                        <button onClick={() => setDebugMinimized(!debugMinimized)} className="text-xs text-gray-400 hover:text-white font-mono flex items-center gap-1">
                            <span>{debugMinimized ? '▲' : '▼'}</span> Debug Log ({debugLogs.length})
                        </button>
                        <div className="flex gap-2">
                            {!debugMinimized && <button onClick={() => setDebugLogs([])} className="text-xs text-gray-400 hover:text-white">Clear</button>}
                            <button onClick={() => { setDebugLogs([]); setDebugMinimized(false); }} className="text-xs text-gray-400 hover:text-white">✕</button>
                        </div>
                    </div>
                    {!debugMinimized && debugLogs.map((log: string, i: number) => (
                        <div key={i} className={`text-xs font-mono ${log.includes('ERROR') ? 'text-red' : 'text-green-light1'}`}>{log}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

initializeBlock({interface: () => <ErrorBoundary><SalesCRM /></ErrorBoundary>});
